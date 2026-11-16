import './styles.css';
import type { EyeSample, Exam, NystagmusFeatures, Recording, TestId, AnalysisResult } from './types';
import { TESTS, TEST_GROUPS } from './clinical/tests';
import { describe, evaluate, type Hypothesis } from './clinical/engine';
import { analyzeRecording, emptyFeatures } from './analysis/nystagmus';
import { generateSynthetic, DEMO_SCENARIOS } from './demo/synthetic';
import { deleteExam, exportExam, loadExams, newExam, saveExam } from './store';
import { $, esc, on } from './ui/dom';
import { featuresFormHtml, readFeaturesForm } from './ui/featuresForm';
import { LiveTrace, renderPlot } from './ui/plot';
import { CloseupProcessor, FaceProcessor, type FrameProcessor, type Overlay } from './tracking/processors';
import { CameraSource, processVideoFile } from './tracking/sources';

const app = document.getElementById('app')!;
let current: Exam | null = null;
let cleanup: (() => void) | null = null;

function go(fn: () => void) {
  cleanup?.();
  cleanup = null;
  window.scrollTo(0, 0);
  fn();
}

/* ================================================================== */
/* Início                                                              */
/* ================================================================== */
function home() {
  const exams = loadExams();
  app.innerHTML = `
  <header class="hero">
    <div class="brand">${logo()}<h1>Vertigo</h1></div>
    <p class="lead">Análise do nistagmo por visão computacional durante as provas posicionais, com sugestão de diagnóstico diferencial e da manobra de reposição adequada.</p>
  </header>
  <main class="stack">
    <section class="card">
      <h2>Novo exame</h2>
      <div class="row">
        <input id="label" type="text" placeholder="Identificação (opcional, sem dados pessoais)" aria-label="Identificação do exame">
        <button id="new" class="primary">Começar</button>
      </div>
    </section>
    <section class="card">
      <h2>Demonstração</h2>
      <p class="muted">Exames com sinais oculares simulados, para conhecer o fluxo sem gravar um doente.</p>
      <div class="chips">
        ${Object.entries(DEMO_SCENARIOS).map(([k, s]) => `<button class="chip" data-demo="${k}">${esc(s.label)}</button>`).join('')}
      </div>
    </section>
    ${exams.length ? `<section class="card">
      <h2>Exames guardados neste dispositivo</h2>
      <ul class="list">${exams.map((e) => `<li><button class="link" data-open="${e.id}">${esc(e.label)}</button>
        <span class="muted small">${Object.keys(e.tests).length} prova(s)</span>
        <button class="ghost small" data-del="${e.id}" aria-label="Apagar">Apagar</button></li>`).join('')}</ul>
    </section>` : ''}
    ${disclaimer()}
  </main>`;
  $('#new').onclick = () => {
    current = newExam(($('#label') as HTMLInputElement).value.trim());
    saveExam(current);
    go(examView);
  };
  on(app, '[data-demo]', 'click', (_, el) => {
    const sc = DEMO_SCENARIOS[el.dataset.demo!];
    const ex = newExam(`Demo — ${sc.label}`);
    for (const [id, spec] of Object.entries(sc.tests)) {
      if (!spec) continue;
      const rec = generateSynthetic(spec);
      const analysis = analyzeRecording(rec);
      ex.tests[id as TestId] = { id: id as TestId, analysis, features: analysis.features, t0: rec.t0, recordedAt: new Date().toISOString() };
    }
    current = ex;
    saveExam(ex);
    go(examView);
  });
  on(app, '[data-open]', 'click', (_, el) => {
    current = loadExams().find((e) => e.id === el.dataset.open) ?? null;
    if (current) go(examView);
  });
  on(app, '[data-del]', 'click', (_, el) => {
    if (confirm('Apagar este exame deste dispositivo?')) { deleteExam(el.dataset.del!); go(home); }
  });
}

function disclaimer() {
  return `<aside class="disclaimer">
    <strong>Ferramenta de apoio — não substitui o juízo clínico.</strong>
    A análise automática pode falhar (iluminação, pestanejo, fixação visual, resolução da câmara). Confirme sempre o nistagmo visualmente.
    Protótipo de investigação, não certificado como dispositivo médico. Os vídeos são processados apenas neste dispositivo.
  </aside>`;
}

function logo() {
  return `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 20 L10 12 L12 16 L18 8 L20 12 L28 4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="22" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="22" r="2.4" fill="currentColor"/></svg>`;
}

/* ================================================================== */
/* Exame                                                               */
/* ================================================================== */
function examView() {
  const ex = current!;
  const out = evaluate(ex);
  const rf = ex.redFlags;
  app.innerHTML = `
  <header class="bar">
    <button class="ghost" id="back">← Início</button>
    <input class="title-input" id="exlabel" value="${esc(ex.label)}" aria-label="Nome do exame">
    <div class="bar-actions">
      <button class="ghost" id="print">Imprimir</button>
      <button class="ghost" id="export">Exportar</button>
    </div>
  </header>
  <main class="grid2">
    <section>
      <h2 class="section-title">Provas</h2>
      ${TEST_GROUPS.map((g) => `
        <h3 class="group-title">${g.title}</h3>
        <div class="tests">${g.ids.map((id) => testCard(id)).join('')}</div>`).join('')}
      <h2 class="section-title">Sinais de alarme clínicos</h2>
      <div class="card flags">
        ${flag('neuroSymptoms', 'Diplopia, disartria, disfagia, défice motor/sensitivo', rf.neuroSymptoms)}
        ${flag('severeHeadache', 'Cefaleia intensa ou súbita', rf.severeHeadache)}
        ${flag('cannotWalk', 'Incapacidade de marcha / ataxia de tronco grave', rf.cannotWalk)}
        ${flag('hearingLossAcute', 'Hipoacusia súbita', rf.hearingLossAcute)}
        ${flag('vascularRisk', 'Fatores de risco vascular', rf.vascularRisk)}
      </div>
    </section>
    <section class="assessment">
      <h2 class="section-title">Avaliação</h2>
      ${out.redFlags.length ? `<div class="alert" role="alert"><h3>⚠ Sinais de alarme</h3><ul>${out.redFlags.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}
      ${out.hypotheses.length ? out.hypotheses.map(hypCard).join('') : `<div class="card muted">Grave pelo menos uma prova para obter sugestões.</div>`}
      ${out.nextSteps.length ? `<div class="card"><h3>Próximos passos</h3><ul>${out.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
      ${disclaimer()}
    </section>
  </main>`;
  $('#back').onclick = () => go(home);
  $('#print').onclick = () => window.print();
  $('#export').onclick = () => exportExam(ex);
  $('#exlabel').onchange = (e) => { ex.label = (e.target as HTMLInputElement).value; saveExam(ex); };
  on(app, '[data-test]', 'click', (_, el) => go(() => testView(el.dataset.test as TestId)));
  on(app, '[data-flag]', 'change', (_, el) => {
    (ex.redFlags as any)[el.dataset.flag!] = (el as HTMLInputElement).checked;
    saveExam(ex);
    examView();
  });
}

function flag(key: string, label: string, val: boolean) {
  return `<label class="chk"><input type="checkbox" data-flag="${key}"${val ? ' checked' : ''}> ${label}</label>`;
}

function testCard(id: TestId) {
  const t = TESTS[id];
  const rec = current!.tests[id];
  const f = rec?.features;
  const status = !f ? '<span class="muted">Não realizada</span>' : `<span class="${f.present ? 'pos' : 'neg'}">${f.present ? '● ' : '○ '}${esc(describe(f))}</span>`;
  return `<button class="test-card${f ? (f.present ? ' is-pos' : ' is-neg') : ''}" data-test="${id}">
    <span class="test-name">${esc(t.name)}</span>
    <span class="test-status">${status}${f?.edited ? ' <span class="badge">editado</span>' : ''}</span>
  </button>`;
}

function hypCard(h: Hypothesis) {
  const cls = { alta: 'high', moderada: 'mid', baixa: 'low' }[h.likelihood];
  const cat = { vppb: 'VPPB', periferico: 'Periférico', central: 'Central', info: 'Info' }[h.category];
  return `<article class="card hyp hyp-${h.category}">
    <div class="hyp-head"><span class="badge cat-${h.category}">${cat}</span><span class="badge lik-${cls}">probabilidade ${h.likelihood}</span></div>
    <h3>${esc(h.title)}</h3>
    <ul class="rationale">${h.rationale.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    ${h.maneuvers.map((m, i) => `
      <details class="maneuver"${i === 0 ? ' open' : ''}>
        <summary>${i === 0 ? 'Manobra sugerida: ' : 'Alternativa: '}<b>${esc(m.name)}</b>${m.needsReview ? ' <span class="badge warn">validar protocolo</span>' : ''}</summary>
        <ol>${m.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        ${m.notes?.length ? `<ul class="notes">${m.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
        <p class="ref">${esc(m.reference)}</p>
      </details>`).join('')}
  </article>`;
}

/* ================================================================== */
/* Prova: gravação / ficheiro / manual                                 */
/* ================================================================== */
type SourceKind = 'camera' | 'file' | 'manual';
type ModeKind = 'face' | 'closeup';

function testView(id: TestId) {
  const ex = current!;
  const def = TESTS[id];
  const existing = ex.tests[id];
  let source: SourceKind = 'camera';
  let mode: ModeKind = 'face';
  let lastAnalysis: AnalysisResult | undefined = existing?.analysis;
  let lastT0 = existing?.t0 ?? 0;
  let features: NystagmusFeatures = existing?.features ?? emptyFeatures();
  let videoUrl: string | undefined = existing?.videoUrl;

  app.innerHTML = `
  <header class="bar">
    <button class="ghost" id="back">← Exame</button>
    <h1 class="bar-title">${esc(def.name)}</h1>
  </header>
  <main class="stack">
    <details class="card instructions" ${existing?.features ? '' : 'open'}>
      <summary>Como realizar</summary>
      <ol>${def.instructions.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    </details>
    <section class="card">
      <div class="seg" role="tablist" aria-label="Origem">
        <button data-src="camera" class="on">Câmara</button>
        <button data-src="file">Ficheiro de vídeo</button>
        <button data-src="manual">Registo manual</button>
      </div>
      <div id="modeRow" class="row wrap">
        <label>Enquadramento
          <select id="mode">
            <option value="face">Rosto inteiro (câmara do telemóvel)</option>
            <option value="closeup">Grande plano do olho (óculos de vídeo / IV)</option>
          </select>
        </label>
        <label id="facingLbl">Câmara
          <select id="facing"><option value="environment">Traseira</option><option value="user">Frontal</option></select>
        </label>
        <label id="mirrorLbl" class="chk" hidden><input type="checkbox" id="mirror"> Imagem espelhada</label>
        <label id="fpsLbl" hidden>Frames/s a analisar <input type="number" id="fps" value="30" min="10" max="120" step="1"></label>
      </div>
      <div id="capture">
        <div class="stage" id="stage">
          <video id="video" playsinline muted></video>
          <canvas id="overlay"></canvas>
          <div class="stage-msg" id="msg">Câmara desligada</div>
          <div class="rec-dot" id="recDot" hidden>● REC <span id="recTime">0.0</span> s</div>
        </div>
        <canvas class="live" id="live" aria-label="Traçado ao vivo"></canvas>
        <div class="row wrap controls" id="camControls">
          <button id="camOn">Ligar câmara</button>
          <button id="recStart" class="primary" disabled>Iniciar gravação</button>
          <button id="markT0" class="accent" disabled>Posição atingida</button>
          <button id="recStop" disabled>Parar e analisar</button>
        </div>
        <div class="row wrap controls" id="fileControls" hidden>
          <input type="file" id="file" accept="video/*">
          <label>Posição atingida aos (s) <input type="number" id="t0" value="0" min="0" step="0.1"></label>
          <button id="analyzeFile" class="primary" disabled>Analisar vídeo</button>
          <progress id="prog" max="1" value="0" hidden></progress>
        </div>
      </div>
    </section>
    <section id="results"></section>
  </main>`;

  const video = $('#video') as HTMLVideoElement;
  const overlay = $('#overlay') as HTMLCanvasElement;
  const msg = $('#msg');
  const live = new LiveTrace($('#live') as HTMLCanvasElement);
  video.addEventListener('loadedmetadata', () => {
    if (video.videoWidth) $('#stage').style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
  });
  const cam = new CameraSource(video);
  let processor: FrameProcessor | null = null;
  let samples: EyeSample[] = [];
  let t0Mark: number | null = null;
  let recording = false;
  let stopFile = false;

  const setSource = (s: SourceKind) => {
    source = s;
    app.querySelectorAll('[data-src]').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.src === s));
    $('#capture').hidden = s === 'manual';
    $('#modeRow').hidden = s === 'manual';
    $('#camControls').hidden = s !== 'camera';
    $('#fileControls').hidden = s !== 'file';
    $('#facingLbl').hidden = s !== 'camera';
    $('#fpsLbl').hidden = s !== 'file';
    if (s !== 'camera') { cam.stop(); msg.textContent = s === 'file' ? 'Escolha um ficheiro de vídeo' : ''; msg.hidden = false; }
    if (s === 'manual') showResults(false);
  };
  on(app, '[data-src]', 'click', (_, el) => setSource(el.dataset.src as SourceKind));
  ($('#mode') as HTMLSelectElement).onchange = (e) => {
    mode = (e.target as HTMLSelectElement).value as ModeKind;
    $('#mirrorLbl').hidden = mode !== 'closeup';
    processor = null;
  };

  const getProcessor = async () => {
    if (processor) return processor;
    msg.textContent = mode === 'face' ? 'A carregar modelo de deteção facial…' : 'A preparar…';
    msg.hidden = false;
    const p = mode === 'face'
      ? new FaceProcessor()
      : new CloseupProcessor({ mirrored: ($('#mirror') as HTMLInputElement).checked, eyeRadiusFrac: 0.32, maxWidth: 480 });
    await p.init();
    processor = p;
    return p;
  };

  const drawOverlay = (o: Overlay) => {
    const W = video.clientWidth, H = video.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (overlay.width !== W * dpr || overlay.height !== H * dpr) { overlay.width = W * dpr; overlay.height = H * dpr; }
    const ctx = overlay.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const sx = W / o.width, sy = H / o.height;
    ctx.lineWidth = 2;
    for (const l of o.lines) { ctx.strokeStyle = l.color; ctx.beginPath(); ctx.moveTo(l.x1 * sx, l.y1 * sy); ctx.lineTo(l.x2 * sx, l.y2 * sy); ctx.stroke(); }
    for (const c of o.circles) { ctx.strokeStyle = c.color; ctx.beginPath(); ctx.arc(c.x * sx, c.y * sy, c.r * sx, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#eb6834';
    for (const p of o.points) { ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, 3, 0, Math.PI * 2); ctx.fill(); }
    if (o.message) { msg.textContent = o.message; msg.hidden = false; } else msg.hidden = true;
  };

  const onFrame = (v: HTMLVideoElement, t: number) => {
    if (!processor || !v.videoWidth) return;
    try {
      const { sample, overlay: o } = processor.process(v, v.videoWidth, v.videoHeight, t);
      drawOverlay(o);
      if (recording || source === 'file') {
        samples.push(sample);
        live.push(t, sample.valid ? sample.h : NaN, sample.valid ? sample.v : NaN);
        live.draw();
      }
      if (recording) $('#recTime').textContent = t.toFixed(1);
    } catch (err) {
      console.error(err);
    }
  };

  // ----- câmara -----
  $('#camOn').onclick = async () => {
    try {
      msg.textContent = 'A ligar câmara…';
      await cam.start(($('#facing') as HTMLSelectElement).value as 'user' | 'environment');
      await getProcessor();
      msg.hidden = true;
      ($('#recStart') as HTMLButtonElement).disabled = false;
      // pré-visualização com tracking (sem gravar) para enquadrar
      samples = [];
      recording = false;
      processor!.reset();
      cam.record(onFrame);
    } catch (err) {
      msg.textContent = 'Erro: ' + errText(err);
      msg.hidden = false;
    }
  };
  $('#recStart').onclick = async () => {
    // reinicia o relógio e a gravação a partir deste momento
    await cam.finish();
    samples = [];
    t0Mark = null;
    live.clear();
    processor!.reset();
    recording = true;
    cam.record(onFrame);
    $('#recDot').hidden = false;
    ($('#recStart') as HTMLButtonElement).disabled = true;
    ($('#markT0') as HTMLButtonElement).disabled = false;
    ($('#recStop') as HTMLButtonElement).disabled = false;
  };
  $('#markT0').onclick = () => {
    t0Mark = cam.elapsed();
    ($('#markT0') as HTMLButtonElement).disabled = true;
    $('#markT0').textContent = `t0 = ${t0Mark.toFixed(1)} s`;
  };
  $('#recStop').onclick = async () => {
    recording = false;
    const blob = await cam.finish();
    cam.stop();
    $('#recDot').hidden = true;
    overlay.getContext('2d')!.clearRect(0, 0, overlay.width, overlay.height);
    msg.textContent = 'Gravação terminada';
    msg.hidden = false;
    ($('#recStop') as HTMLButtonElement).disabled = true;
    ($('#markT0') as HTMLButtonElement).disabled = true;
    if (blob) videoUrl = URL.createObjectURL(blob);
    finishAnalysis({
      samples, t0: t0Mark ?? 0, source: 'camera', mode, fps: estimateFps(samples), torsionAvailable: processor!.torsionCapable,
    }, t0Mark === null);
  };

  // ----- ficheiro -----
  ($('#file') as HTMLInputElement).onchange = (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(f);
    video.srcObject = null;
    video.src = videoUrl;
    video.controls = false;
    msg.textContent = 'Use o vídeo para identificar o instante em que a posição foi atingida.';
    ($('#analyzeFile') as HTMLButtonElement).disabled = false;
    video.onloadeddata = () => { msg.hidden = true; };
  };
  $('#analyzeFile').onclick = async () => {
    const btn = $('#analyzeFile') as HTMLButtonElement;
    if (btn.dataset.running) { stopFile = true; return; }
    btn.dataset.running = '1';
    btn.textContent = 'Cancelar';
    const prog = $('#prog') as HTMLProgressElement;
    prog.hidden = false;
    samples = [];
    live.clear();
    stopFile = false;
    try {
      const p = await getProcessor();
      p.reset();
      const fps = Number(($('#fps') as HTMLInputElement).value) || 30;
      await processVideoFile(video, fps, onFrame, (x) => (prog.value = x), () => stopFile);
      const t0 = Number(($('#t0') as HTMLInputElement).value) || 0;
      finishAnalysis({ samples, t0, source: 'file', mode, fps, torsionAvailable: p.torsionCapable }, false);
    } catch (err) {
      msg.textContent = 'Erro: ' + errText(err);
      msg.hidden = false;
    } finally {
      delete btn.dataset.running;
      btn.textContent = 'Analisar vídeo';
      prog.hidden = true;
    }
  };

  function estimateFps(s: EyeSample[]) {
    if (s.length < 2) return 30;
    return Math.round((s.length - 1) / (s[s.length - 1].t - s[0].t));
  }

  function finishAnalysis(rec: Recording, noT0: boolean) {
    const fs = Math.min(60, Math.max(15, rec.fps));
    lastAnalysis = analyzeRecording(rec, { fs });
    if (noT0) lastAnalysis.notes.unshift('«Posição atingida» não foi marcada — a latência é medida desde o início da gravação.');
    lastT0 = rec.t0;
    features = lastAnalysis.features;
    showResults(true);
  }

  function showResults(withAnalysis: boolean) {
    const r = $('#results');
    const a = withAnalysis ? lastAnalysis : undefined;
    r.innerHTML = `
      ${a ? `<div class="card">
        <h2>Registo oculomotor</h2>
        <p class="summary ${a.features.present ? 'pos' : 'neg'}">${esc(describe(a.features))}</p>
        <p class="muted small">Confiança da análise automática: ${(a.features.confidence * 100).toFixed(0)}% · sinal válido ${(a.validFraction * 100).toFixed(0)}% · ${a.fastPhases.length} fases rápidas</p>
        ${a.notes.length ? `<ul class="notes">${a.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
        <div id="plot"></div>
        <p class="legend"><span class="sw s1"></span>Horizontal <span class="sw s2"></span>Vertical <span class="sw s3"></span>Torsional <span class="sw band"></span>Nistagmo ativo · traços na base = fases rápidas</p>
        ${videoUrl ? `<details><summary>Rever vídeo gravado</summary><video src="${videoUrl}" controls playsinline class="review"></video>
          <a class="small" href="${videoUrl}" download="vertigo-${id}.webm">Descarregar vídeo</a></details>` : ''}
      </div>` : ''}
      <div class="card">
        <h2>${a ? 'Confirmar características' : 'Características do nistagmo'}</h2>
        <p class="muted small">${a ? 'Verifique e corrija se a observação clínica divergir da análise automática.' : 'Registe o que observou (p. ex. com óculos de Frenzel).'}</p>
        ${featuresFormHtml(features)}
        <div class="row"><button id="save" class="primary">Guardar e voltar ao exame</button></div>
      </div>`;
    if (a) renderPlot($('#plot'), a, lastT0);
    $('#save').onclick = () => {
      const form = r.querySelector('form') as HTMLFormElement;
      const edited = readFeaturesForm(form, features);
      const changed = JSON.stringify({ ...edited, edited: false }) !== JSON.stringify({ ...features, edited: false });
      ex.tests[id] = {
        id,
        analysis: lastAnalysis,
        features: changed ? edited : { ...features, edited: features.edited ?? false },
        recordedAt: new Date().toISOString(),
        t0: lastT0,
        videoUrl,
      };
      saveExam(ex);
      go(examView);
    };
    r.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  setSource('camera');
  msg.textContent = 'Câmara desligada';
  if (existing?.features) {
    if (lastAnalysis) showResults(true);
    else setSource('manual');
  }

  $('#back').onclick = () => go(examView);
  cleanup = () => { recording = false; stopFile = true; cam.stop(); };
}

function errText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'type' in err) return `falha ao carregar recurso (${(err as Event).type})`;
  return String(err);
}

home();
