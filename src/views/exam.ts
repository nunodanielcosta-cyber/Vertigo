import type { EyeSample, Exam, NystagmusFeatures, Recording, TestId, AnalysisResult } from '../types';
import { TESTS, TEST_GROUPS } from '../clinical/tests';
import { describe, evaluate, type Hypothesis, type EngineOutput } from '../clinical/engine';
import { analyzeRecording, emptyFeatures } from '../analysis/nystagmus';
import { generateSynthetic, DEMO_SCENARIOS } from '../demo/synthetic';
import { deleteExam, exportExam, loadExams, newExam, saveExam } from '../store';
import { $, esc, on } from '../ui/dom';
import { featuresFormHtml, readFeaturesForm } from '../ui/featuresForm';
import { LiveTrace, renderPlot } from '../ui/plot';
import { nystagmusGlyph } from '../ui/glyph';
import { icon } from '../ui/icons';
import { CloseupProcessor, FaceProcessor, type FrameProcessor, type Overlay } from '../tracking/processors';
import { CameraSource, processVideoFile } from '../tracking/sources';
import { onLeave } from '../core/router';
import { ask } from '../core/ui';

const app = document.getElementById('app')!;
let current: Exam | null = null;
let cleanup: (() => void) | null = null;

function go(fn: () => void) {
  cleanup?.();
  cleanup = null;
  window.scrollTo(0, 0);
  fn();
}

const DEMO_INFO: Record<string, { hint: string; glyph: Partial<NystagmusFeatures> }> = {
  'pc-right': { hint: 'Dix-Hallpike direito positivo: upbeat + torsional geotrópico, com latência e curta duração.', glyph: { vertical: 'up', torsional: 'right' } },
  'hc-geo-left': { hint: 'Roll test geotrópico bilateral, mais intenso com a cabeça à esquerda.', glyph: { horizontal: 'left' } },
  'central-dbn': { hint: 'Downbeat persistente sem latência em ambos os lados — sinal de alarme.', glyph: { vertical: 'down' } },
};

/* ================================================================== */
/* Início                                                              */
/* ================================================================== */
function home() {
  const exams = loadExams();
  app.innerHTML = `
  <header class="bar">
    <a class="icon-btn" href="#/" aria-label="Início" title="Início">${icon('back')}</a>
    <div class="bar-main"><h1 class="bar-title">Exame com vídeo — nistagmo e VPPB</h1></div>
  </header>
  <header class="hero hero-compact">
    <h1 class="hero-title">Reconhecer o nistagmo.<br><span>Escolher a manobra certa.</span></h1>
    <p class="lead">Grave os olhos do doente durante a prova posicional. A Vertigo mede o nistagmo por visão computacional e sugere o diagnóstico diferencial e a manobra de reposição.</p>
    <div class="steps3">
      <div>${icon('camera')}<b>Gravar</b><span>Dix-Hallpike, roll test, espontâneo</span></div>
      <div>${icon('wave')}<b>Analisar</b><span>Direção, SPV, latência, duração</span></div>
      <div>${icon('stethoscope')}<b>Orientar</b><span>Canal afetado e manobra</span></div>
    </div>
  </header>
  <main class="home-grid">
    <section class="card card-primary">
      <h2>Novo exame</h2>
      <p class="muted">Dê-lhe um nome para o encontrar depois. Não use dados pessoais do doente.</p>
      <div class="row">
        <input id="label" type="text" placeholder="p. ex. Consulta 14h — cama 3" aria-label="Identificação do exame">
        <button id="new" class="btn primary">${icon('plus')}Começar</button>
      </div>
      <p class="privacy">${icon('lock')}Os vídeos são processados só neste dispositivo.</p>
    </section>
    ${exams.length ? `<section class="card">
      <h2>Exames recentes</h2>
      <ul class="exam-list">${exams.slice(0, 8).map((e) => {
        const out = evaluate(e);
        const top = out.hypotheses[0];
        const n = Object.values(e.tests).filter((t) => t?.features).length;
        return `<li>
          <button class="exam-item" data-open="${e.id}">
            <span class="exam-item-title">${esc(e.label)}</span>
            <span class="exam-item-sub">${n} prova${n === 1 ? '' : 's'}${top ? ' · ' + esc(top.title) : ''}</span>
          </button>
          <button class="icon-btn" data-del="${e.id}" aria-label="Apagar ${esc(e.label)}" title="Apagar">${icon('trash')}</button>
        </li>`;
      }).join('')}</ul>
    </section>` : `<section class="card">
      <h2>Antes de começar</h2>
      <ul class="tips">
        <li>${icon('camera')}<span><b>Telemóvel perto dos olhos</b>Enquadre só a zona dos olhos, bem iluminada de frente. Use a câmara traseira (melhor qualidade).</span></li>
        <li>${icon('alert')}<span><b>Sem fixação visual</b>Sala escurecida ou óculos de Frenzel/vídeo com IV — modo «grande plano do olho».</span></li>
        <li>${icon('flag')}<span><b>Marque o fim da manobra</b>Carregue em «Posição atingida» para medir a latência.</span></li>
      </ul>
    </section>`}
    <section class="demos">
      <div class="section-head"><h2>Experimentar com casos simulados</h2><p class="muted">Sinais oculares sintéticos para conhecer o fluxo sem gravar um doente.</p></div>
      <div class="demo-grid">
        ${Object.entries(DEMO_SCENARIOS).map(([k, s]) => `
          <button class="demo-card" data-demo="${k}">
            ${nystagmusGlyph({ ...emptyFeatures(), present: true, ...DEMO_INFO[k]?.glyph }, 'md')}
            <span class="demo-title">${esc(s.label)}</span>
            <span class="demo-hint">${esc(DEMO_INFO[k]?.hint ?? '')}</span>
          </button>`).join('')}
      </div>
    </section>
    ${disclaimer()}
  </main>`;
  $('#new').onclick = () => {
    current = newExam(($('#label') as HTMLInputElement).value.trim());
    saveExam(current);
    go(examView);
  };
  ($('#label') as HTMLInputElement).onkeydown = (e) => { if (e.key === 'Enter') $('#new').click(); };
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
  on(app, '[data-del]', 'click', async (_, el) => {
    if (await ask('Apagar este exame deste dispositivo?', { ok: 'Apagar', danger: true })) { deleteExam(el.dataset.del!); go(home); }
  });
}

function disclaimer() {
  return `<aside class="disclaimer">
    ${icon('alert')}
    <p><strong>Ferramenta de apoio — não substitui o juízo clínico.</strong>
    A análise automática pode falhar (iluminação, pestanejo, fixação visual, resolução da câmara): confirme sempre o nistagmo visualmente.
    Protótipo de investigação, não certificado como dispositivo médico.</p>
  </aside>`;
}

export function logo() {
  return `<svg class="logo" viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="lgbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f74e0"/><stop offset="1" stop-color="#143d8c"/></linearGradient><marker id="lghead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="2.6" markerHeight="2.6" markerUnits="strokeWidth" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#5ee6c2"/></marker></defs><rect width="512" height="512" rx="114" fill="url(#lgbg)"/><path d="M84 284 Q256 116 428 284 Q256 452 84 284 Z" fill="none" stroke="#fff" stroke-width="22" stroke-linejoin="round"/><circle cx="256" cy="284" r="66" fill="#fff"/><circle cx="256" cy="284" r="28" fill="#143d8c"/><circle cx="276" cy="262" r="10" fill="#fff"/><path d="M352 196 A124 124 0 0 0 160 196" fill="none" stroke="#5ee6c2" stroke-width="24" stroke-linecap="round" marker-end="url(#lghead)"/></svg>`;
}

/* ================================================================== */
/* Exame                                                               */
/* ================================================================== */
function examView() {
  const ex = current!;
  const out = evaluate(ex);
  const rf = ex.redFlags;
  const done = Object.values(ex.tests).filter((t) => t?.features).length;
  app.innerHTML = `
  <header class="bar">
    <button class="icon-btn" id="back" aria-label="Início" title="Início">${icon('back')}</button>
    <div class="bar-main">
      <input class="title-input" id="exlabel" value="${esc(ex.label)}" aria-label="Nome do exame">
      <span class="bar-sub">${done} de ${Object.keys(TESTS).length} provas registadas</span>
    </div>
    <button class="icon-btn" id="print" aria-label="Imprimir" title="Imprimir">${icon('print')}</button>
    <button class="icon-btn" id="export" aria-label="Exportar JSON" title="Exportar">${icon('download')}</button>
  </header>
  ${out.redFlags.length ? `<div class="alert" role="alert">${icon('alert')}<div><h3>Sinais de alarme</h3><ul>${out.redFlags.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div></div>` : ''}
  ${summaryHero(out, done)}
  <main class="grid2">
    <section>
      <div class="section-head"><h2>Provas</h2><p class="muted">Toque numa prova para gravar ou rever.</p></div>
      ${TEST_GROUPS.map((g) => `
        <h3 class="group-title">${g.title}</h3>
        <div class="tiles">${g.ids.map((id) => testTile(id)).join('')}</div>`).join('')}
      <h3 class="group-title">${icon('flag')} Sinais de alarme clínicos</h3>
      <div class="card flags">
        ${flag('neuroSymptoms', 'Diplopia, disartria, disfagia, défice motor ou sensitivo', rf.neuroSymptoms)}
        ${flag('severeHeadache', 'Cefaleia intensa ou súbita', rf.severeHeadache)}
        ${flag('cannotWalk', 'Incapacidade de marcha / ataxia de tronco grave', rf.cannotWalk)}
        ${flag('hearingLossAcute', 'Hipoacusia súbita', rf.hearingLossAcute)}
        ${flag('vascularRisk', 'Fatores de risco vascular', rf.vascularRisk)}
      </div>
    </section>
    <section class="assessment" id="assessment">
      <div class="section-head"><h2>Avaliação detalhada</h2><p class="muted">Hipóteses ordenadas por probabilidade, com fundamentação.</p></div>
      ${out.hypotheses.length ? out.hypotheses.map(hypCard).join('') : `<div class="card empty">${nystagmusGlyph(undefined, 'lg')}<p>Ainda sem provas registadas.<br>Comece pelo <b>Dix-Hallpike</b> de ambos os lados.</p></div>`}
      ${out.nextSteps.length ? `<div class="card next"><h3>Próximos passos</h3><ul class="checklist">${out.nextSteps.map((s) => `<li>${icon('chevron')}<span>${esc(s)}</span></li>`).join('')}</ul></div>` : ''}
      ${disclaimer()}
    </section>
  </main>`;
  $('#back').onclick = () => go(home);
  $('#print').onclick = () => window.print();
  $('#export').onclick = () => exportExam(ex);
  $('#exlabel').onchange = (e) => { ex.label = (e.target as HTMLInputElement).value; saveExam(ex); };
  on(app, '[data-test]', 'click', (_, el) => go(() => testView(el.dataset.test as TestId)));
  on(app, '[data-goto]', 'click', () => $('#assessment').scrollIntoView({ behavior: 'smooth' }));
  on(app, '[data-flag]', 'change', (_, el) => {
    (ex.redFlags as unknown as Record<string, boolean>)[el.dataset.flag!] = (el as HTMLInputElement).checked;
    saveExam(ex);
    const y = window.scrollY;
    examView();
    window.scrollTo(0, y);
  });
}

function summaryHero(out: EngineOutput, done: number) {
  const top = out.hypotheses[0];
  if (!top || done === 0) return '';
  const m = top.maneuvers[0];
  const tone = top.category === 'central' ? 'danger' : top.category === 'info' ? 'neutral' : 'accent';
  return `<section class="summary-hero tone-${tone}">
    <div class="sh-text">
      <span class="eyebrow">Hipótese mais provável</span>
      <h2>${esc(top.title)}</h2>
      ${likelihood(top.likelihood)}
    </div>
    ${m ? `<div class="sh-action">
      <span class="eyebrow">Manobra sugerida</span>
      <b>${esc(m.name)}</b>
      <button class="btn small ghost-on-tone" data-goto>Ver passos ${icon('chevron')}</button>
    </div>` : top.category === 'central' ? `<div class="sh-action"><span class="eyebrow">Atitude</span><b>Avaliação neurológica / neuroimagem</b></div>` : ''}
  </section>`;
}

function likelihood(l: Hypothesis['likelihood']) {
  const n = { baixa: 1, moderada: 2, alta: 3 }[l];
  return `<span class="lik" aria-label="Probabilidade ${l}"><span class="lik-bars">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>probabilidade ${l}</span>`;
}

function flag(key: string, label: string, val: boolean) {
  return `<label class="switch"><input type="checkbox" data-flag="${key}"${val ? ' checked' : ''}><span class="track"></span>${label}</label>`;
}

function testTile(id: TestId) {
  const t = TESTS[id];
  const f = current!.tests[id]?.features;
  const state = !f ? 'todo' : f.present ? 'pos' : 'neg';
  const chip = !f ? 'Por fazer' : f.present ? 'Nistagmo' : 'Negativa';
  return `<button class="tile tile-${state}" data-test="${id}">
    ${nystagmusGlyph(f, 'sm')}
    <span class="tile-body">
      <span class="tile-name">${esc(t.name)}</span>
      <span class="tile-desc">${f ? esc(describe(f)) : 'Toque para gravar'}</span>
    </span>
    <span class="chip chip-${state}">${chip}${f?.edited ? ' · editado' : ''}</span>
  </button>`;
}

function hypCard(h: Hypothesis, i: number) {
  const cat = { vppb: 'VPPB', periferico: 'Periférico', central: 'Central', info: 'Informação' }[h.category];
  return `<article class="card hyp hyp-${h.category}">
    <div class="hyp-head"><span class="chip cat-${h.category}">${cat}</span>${likelihood(h.likelihood)}</div>
    <h3>${esc(h.title)}</h3>
    <ul class="rationale">${h.rationale.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    ${h.maneuvers.map((m, k) => `
      <details class="maneuver"${i === 0 && k === 0 ? ' open' : ''}>
        <summary><span class="mv-kind">${k === 0 ? 'Manobra sugerida' : 'Alternativa'}</span><span class="mv-name">${esc(m.name)}</span>${m.needsReview ? '<span class="chip chip-warn">validar protocolo</span>' : ''}${icon('chevron', 'mv-chev')}</summary>
        <ol class="timeline">${m.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
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
type CamState = 'off' | 'loading' | 'preview' | 'recording' | 'marked' | 'done';

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
    <button class="icon-btn" id="back" aria-label="Voltar ao exame" title="Voltar ao exame">${icon('back')}</button>
    <div class="bar-main">
      <h1 class="bar-title">${esc(def.name)}</h1>
      <span class="bar-sub">${esc(ex.label)}</span>
    </div>
  </header>
  <ol class="stepper" aria-label="Etapas">
    <li class="on" id="st1"><i>1</i>Preparar</li>
    <li id="st2"><i>2</i>Gravar</li>
    <li id="st3"><i>3</i>Confirmar</li>
  </ol>
  <main class="test-grid">
    <aside class="card instructions">
      <h2>Como realizar</h2>
      <ol class="timeline compact">${def.instructions.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="tip">${icon('alert')}<span>Ambiente escurecido e olhos bem abertos. Sem fixação visual o nistagmo periférico é mais evidente.</span></div>
    </aside>
    <section class="card capture-card">
      <div class="seg" role="tablist" aria-label="Origem">
        <button data-src="camera" class="on">${icon('camera')}Câmara</button>
        <button data-src="file">${icon('file')}Vídeo</button>
        <button data-src="manual">${icon('edit')}Manual</button>
      </div>
      <div id="modeRow" class="opts">
        <label class="field"><span>Enquadramento</span>
          <select id="mode">
            <option value="face">Rosto inteiro (telemóvel)</option>
            <option value="closeup">Grande plano do olho (IV / óculos)</option>
          </select>
        </label>
        <label class="field" id="facingLbl"><span>Câmara</span>
          <select id="facing"><option value="environment">Traseira</option><option value="user">Frontal</option></select>
        </label>
        <label class="field" id="fpsLbl" hidden><span>Frames/s a analisar</span><input type="number" id="fps" value="30" min="10" max="120" step="1"></label>
        <label class="switch" id="mirrorLbl" hidden><input type="checkbox" id="mirror"><span class="track"></span>Imagem espelhada</label>
      </div>
      <div id="capture">
        <div class="stage" id="stage">
          <video id="video" playsinline muted></video>
          <canvas id="overlay"></canvas>
          <div class="stage-msg" id="msg">${icon('camera')}<span>Câmara desligada</span></div>
          <div class="hud">
            <span class="hud-pill rec" id="recDot" hidden><i></i>REC <span id="recTime">0.0</span> s</span>
            <span class="hud-pill" id="t0Pill" hidden></span>
            <span class="hud-pill track" id="trackPill" hidden></span>
          </div>
        </div>
        <div class="live-wrap"><canvas class="live" id="live" aria-label="Traçado ao vivo"></canvas><span class="live-legend"><i class="s1"></i>H <i class="s2"></i>V · últimos 10 s</span></div>
        <div class="actionbar" id="camControls">
          <button id="camOn" class="btn primary big">${icon('camera')}Ligar câmara</button>
          <button id="recStart" class="btn rec big" hidden>${icon('rec')}Iniciar gravação</button>
          <button id="markT0" class="btn accent big" hidden>${icon('flag')}Posição atingida</button>
          <button id="recStop" class="btn big" hidden>${icon('stop')}Parar e analisar</button>
        </div>
        <div class="actionbar file-bar" id="fileControls" hidden>
          <label class="file-pick btn">${icon('file')}<span id="fileName">Escolher vídeo…</span><input type="file" id="file" accept="video/*"></label>
          <label class="field inline"><span>Posição atingida aos</span><span class="input-unit"><input type="number" id="t0" value="0" min="0" step="0.1"><em>s</em></span></label>
          <button id="analyzeFile" class="btn primary big" disabled>${icon('wave')}<span>Analisar vídeo</span></button>
          <div class="progress" id="prog" hidden><div id="progBar"></div></div>
        </div>
      </div>
    </section>
    <section id="results" class="results"></section>
  </main>`;

  const video = $('#video') as HTMLVideoElement;
  const overlay = $('#overlay') as HTMLCanvasElement;
  const msgEl = $('#msg');
  const setMsg = (text: string | null, ic = 'camera') => {
    if (text === null) { msgEl.hidden = true; return; }
    msgEl.innerHTML = `${icon(ic)}<span>${esc(text)}</span>`;
    msgEl.hidden = false;
  };
  const trackPill = $('#trackPill');
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

  const setStep = (n: 1 | 2 | 3) => {
    [1, 2, 3].forEach((k) => {
      const el = $(`#st${k}`);
      el.classList.toggle('on', k === n);
      el.classList.toggle('done', k < n);
    });
  };

  const setCam = (s: CamState) => {
    ($('#camOn') as HTMLButtonElement).hidden = !(s === 'off' || s === 'loading' || s === 'done');
    ($('#camOn') as HTMLButtonElement).disabled = s === 'loading';
    $('#camOn').innerHTML = `${icon(s === 'done' ? 'refresh' : 'camera')}${s === 'loading' ? 'A preparar…' : s === 'done' ? 'Gravar novamente' : 'Ligar câmara'}`;
    $('#recStart').hidden = s !== 'preview';
    $('#markT0').hidden = s !== 'recording';
    $('#recStop').hidden = !(s === 'recording' || s === 'marked');
    $('#recStop').classList.toggle('primary', s === 'marked');
    $('#recDot').hidden = !(s === 'recording' || s === 'marked');
    if (s === 'preview' || s === 'recording' || s === 'marked') setStep(2);
  };

  const setSource = (s: SourceKind) => {
    source = s;
    app.querySelectorAll('[data-src]').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.src === s));
    $('#capture').hidden = s === 'manual';
    $('#modeRow').hidden = s === 'manual';
    $('#camControls').hidden = s !== 'camera';
    $('#fileControls').hidden = s !== 'file';
    $('#facingLbl').hidden = s !== 'camera';
    $('#fpsLbl').hidden = s !== 'file';
    trackPill.hidden = true;
    if (s !== 'camera') {
      cam.stop();
      recording = false;
      setCam('off');
      setMsg(s === 'file' ? 'Escolha um ficheiro de vídeo' : '', 'file');
    } else if (!cam.stream) setMsg('Câmara desligada');
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
    setMsg(mode === 'face' ? 'A carregar o modelo de deteção facial…' : 'A preparar…', 'refresh');
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
    trackPill.hidden = false;
    trackPill.classList.toggle('bad', !!o.message);
    trackPill.innerHTML = `<i></i>${o.message ? esc(o.message) : mode === 'face' ? 'Olhos detetados' : 'Pupila detetada'}`;
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
      setCam('loading');
      setMsg('A ligar a câmara…', 'refresh');
      await cam.start(($('#facing') as HTMLSelectElement).value as 'user' | 'environment');
      await getProcessor();
      setMsg(null);
      samples = [];
      recording = false;
      processor!.reset();
      cam.record(onFrame); // pré-visualização com tracking, para enquadrar
      setCam('preview');
    } catch (err) {
      setMsg('Erro: ' + errText(err), 'alert');
      setCam('off');
    }
  };
  $('#recStart').onclick = async () => {
    await cam.finish(); // reinicia relógio e gravação a partir deste momento
    samples = [];
    t0Mark = null;
    $('#t0Pill').hidden = true;
    live.clear();
    processor!.reset();
    recording = true;
    cam.record(onFrame);
    setCam('recording');
  };
  $('#markT0').onclick = () => {
    t0Mark = cam.elapsed();
    const p = $('#t0Pill');
    p.textContent = `t0 ${t0Mark.toFixed(1)} s`;
    p.hidden = false;
    setCam('marked');
  };
  $('#recStop').onclick = async () => {
    recording = false;
    const blob = await cam.finish();
    cam.stop();
    overlay.getContext('2d')!.clearRect(0, 0, overlay.width, overlay.height);
    trackPill.hidden = true;
    setMsg('Gravação terminada', 'check');
    setCam('done');
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
    $('#fileName').textContent = f.name;
    video.srcObject = null;
    video.src = videoUrl;
    setMsg('Indique o instante em que a posição foi atingida e carregue em «Analisar».', 'flag');
    ($('#analyzeFile') as HTMLButtonElement).disabled = false;
    setStep(2);
    video.onloadeddata = () => setMsg(null);
  };
  $('#analyzeFile').onclick = async () => {
    const btn = $('#analyzeFile') as HTMLButtonElement;
    const label = btn.querySelector('span')!;
    if (btn.dataset.running) { stopFile = true; return; }
    btn.dataset.running = '1';
    label.textContent = 'Cancelar';
    const prog = $('#prog');
    const bar = $('#progBar');
    prog.hidden = false;
    samples = [];
    live.clear();
    stopFile = false;
    try {
      const p = await getProcessor();
      setMsg(null);
      p.reset();
      const fps = Number(($('#fps') as HTMLInputElement).value) || 30;
      await processVideoFile(video, fps, onFrame, (x) => (bar.style.width = `${(x * 100).toFixed(1)}%`), () => stopFile);
      const t0 = Number(($('#t0') as HTMLInputElement).value) || 0;
      finishAnalysis({ samples, t0, source: 'file', mode, fps, torsionAvailable: p.torsionCapable }, false);
    } catch (err) {
      setMsg('Erro: ' + errText(err), 'alert');
    } finally {
      delete btn.dataset.running;
      label.textContent = 'Analisar vídeo';
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

  function stat(label: string, value: string, unit = '') {
    return `<div class="stat"><span class="stat-label">${label}</span><span class="stat-value">${value}<small>${unit}</small></span></div>`;
  }

  function showResults(withAnalysis: boolean) {
    setStep(3);
    const r = $('#results');
    const a = withAnalysis ? lastAnalysis : undefined;
    const f = a?.features;
    const peak = f ? Math.max(f.peakSpvH, f.peakSpvV, f.peakSpvT) : 0;
    const conf = f ? Math.round(f.confidence * 100) : 0;
    r.innerHTML = `
      ${a && f ? `<div class="card result-card">
        <div class="result-head">
          ${nystagmusGlyph(f, 'lg')}
          <div>
            <span class="eyebrow">Análise automática</span>
            <p class="summary ${f.present ? 'pos' : 'neg'}">${esc(describe(f))}</p>
          </div>
        </div>
        <div class="stats">
          ${stat('Latência', f.latency !== null ? String(f.latency) : '—', f.latency !== null ? ' s' : '')}
          ${stat('Duração', f.duration !== null ? (f.persistent ? '≥ ' : '') + f.duration : '—', f.duration !== null ? ' s' : '')}
          ${stat('SPV pico', f.present ? peak.toFixed(1) : '—', f.present ? ' °/s' : '')}
          ${stat('Frequência', f.present ? f.frequency.toFixed(1) : '—', f.present ? ' /s' : '')}
        </div>
        <div class="confidence">
          <span>Confiança da análise</span>
          <div class="meter"><div style="width:${conf}%" class="${conf < 40 ? 'low' : conf < 70 ? 'mid' : 'high'}"></div></div>
          <b>${conf}%</b>
          <span class="muted small">sinal válido ${(a.validFraction * 100).toFixed(0)}% · ${a.fastPhases.length} fases rápidas</span>
        </div>
        ${a.notes.length ? `<ul class="notes">${a.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
        <div id="plot"></div>
        <p class="legend"><span class="sw s1"></span>Horizontal <span class="sw s2"></span>Vertical <span class="sw s3"></span>Torsional <span class="sw band"></span>Nistagmo ativo <span class="sw tick"></span>Fase rápida</p>
        ${videoUrl ? `<details class="review-box"><summary>${icon('file')}Rever vídeo gravado</summary><video src="${videoUrl}" controls playsinline class="review"></video>
          <a class="btn small" href="${videoUrl}" download="vertigo-${id}.webm">${icon('download')}Descarregar vídeo</a></details>` : ''}
      </div>` : ''}
      <div class="card confirm-card">
        <h2>${a ? 'Confirmar características' : 'Características do nistagmo'}</h2>
        <p class="muted">${a ? 'Corrija o que divergir da sua observação — a avaliação usa os valores confirmados aqui.' : 'Registe o que observou (p. ex. com óculos de Frenzel).'}</p>
        ${featuresFormHtml(features)}
        <div class="actionbar"><button id="save" class="btn primary big">${icon('check')}Guardar e voltar ao exame</button></div>
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
  setCam('off');
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

/** Ponto de entrada do módulo (rota #/exame). */
export function examHome() {
  onLeave(() => { cleanup?.(); cleanup = null; });
  home();
}

/** Abre diretamente um exame guardado. */
export function openExam(id: string) {
  onLeave(() => { cleanup?.(); cleanup = null; });
  current = loadExams().find((e) => e.id === id) ?? null;
  if (current) examView(); else home();
}
