import { page, q, esc, icon, experimental, collection, uid, fmtDate, pills, toast, download } from '../_shared';
import type { Rec } from '../../core/storage';
import { putBlob, getBlob, delBlob } from '../../core/idb';
import { CameraSource } from '../../tracking/sources';
import { FaceProcessor } from '../../tracking/processors';
import { analyzeRecording } from '../../analysis/nystagmus';
import { describe } from '../../clinical/engine';
import { nystagmusGlyph } from '../../ui/glyph';
import { LiveTrace } from '../../ui/plot';
import { keepAwake } from '../../core/sensors';
import type { EyeSample, NystagmusFeatures } from '../../types';

export interface NystRec extends Rec { position: string; note: string; seconds: number; videoId?: string; features?: NystagmusFeatures; mime?: string }
export const nystRecs = collection<NystRec>('nyst-recordings', 200);

const POS: [string, string][] = [['sentado', 'Sentado, olhar em frente'], ['olhar-dir', 'Olhar à direita'], ['olhar-esq', 'Olhar à esquerda'], ['deitado-dir', 'Deitado sobre a direita'], ['deitado-esq', 'Deitado sobre a esquerda'], ['deitado-costas', 'Deitado de costas'], ['outra', 'Outra']];

export function nystagmusRecView(app: HTMLElement) {
  page(app, { title: 'Gravar o nistagmo', sub: 'Vídeo dos olhos durante a crise — fica só neste dispositivo', back: '/' }, `
  ${experimental()}
  <div class="grid2">
    <section class="card">
      <div class="opts">
        <label class="field"><span>Câmara</span><select id="facing"><option value="user">Frontal (o próprio)</option><option value="environment">Traseira (outra pessoa filma)</option></select></label>
        <label class="switch"><input type="checkbox" id="track" checked><span class="track"></span><span>Estimar a direção (tracking ocular)</span></label>
      </div>
      <div class="stage"><video id="v" playsinline muted></video><div class="stage-msg" id="msg">${icon('camera')}<span>Aproxime a câmara dos olhos (15–20 cm), com luz de frente.</span></div>
        <div class="hud"><span class="hud-pill rec" id="rec" hidden><i></i>REC <span id="rt">0</span> s</span></div></div>
      <div class="live-wrap"><canvas class="live" id="live"></canvas><span class="live-legend"><i class="s1"></i>H <i class="s2"></i>V</span></div>
      <div class="q-block mt"><b>Posição</b>${pills('pos', POS, 'sentado', 'pills-wrap')}</div>
      <label class="field"><span>Nota (sintomas, há quanto tempo começou…)</span><input type="text" id="note"></label>
      <div class="actionbar">
        <button class="btn primary big" id="on">${icon('camera')}Ligar câmara</button>
        <button class="btn rec big" id="start" hidden>${icon('rec')}Gravar</button>
        <button class="btn big" id="stop" hidden>${icon('stop')}Parar e guardar</button>
      </div>
    </section>
    <section class="stack"><div id="result"></div><div id="list"></div></section>
  </div>`);

  const video = q<HTMLVideoElement>('#v');
  const cam = new CameraSource(video);
  const live = new LiveTrace(q<HTMLCanvasElement>('#live'));
  let proc: FaceProcessor | null = null;
  let samples: EyeSample[] = [];
  let recording = false;

  const setMsg = (t: string | null) => { const m = q('#msg'); m.hidden = t === null; if (t) m.innerHTML = `${icon('camera')}<span>${esc(t)}</span>`; };

  q('#on').onclick = async () => {
    try {
      setMsg('A ligar a câmara…');
      await cam.start((q('#facing') as HTMLSelectElement).value as 'user' | 'environment');
      if ((q('#track') as HTMLInputElement).checked) {
        setMsg('A carregar o modelo de deteção…');
        try { proc = new FaceProcessor(); await proc.init(); } catch { proc = null; toast('Tracking indisponível — só será gravado o vídeo'); }
      }
      setMsg(null);
      q('#on').hidden = true; q('#start').hidden = false;
      void keepAwake();
    } catch (e) { setMsg('Erro: ' + (e instanceof Error ? e.message : String(e))); }
  };
  q('#start').onclick = () => {
    samples = []; live.clear(); proc?.reset(); recording = true;
    cam.record((v, t) => {
      q('#rt').textContent = t.toFixed(0);
      if (!proc || !v.videoWidth) return;
      try {
        const { sample } = proc.process(v, v.videoWidth, v.videoHeight, t);
        samples.push(sample);
        live.push(t, sample.valid ? sample.h : NaN, sample.valid ? sample.v : NaN);
        live.draw();
      } catch { /* ignorar frame */ }
    });
    q('#start').hidden = true; q('#stop').hidden = false; q('#rec').hidden = false;
  };
  q('#stop').onclick = async () => {
    if (!recording) return;
    recording = false;
    const blob = await cam.finish();
    cam.stop();
    q('#stop').hidden = true; q('#rec').hidden = true; q('#on').hidden = false;
    const pos = (app.querySelector('input[name="pos"]:checked') as HTMLInputElement)?.value ?? 'outra';
    let features: NystagmusFeatures | undefined;
    if (samples.length > 30) {
      const fps = Math.round((samples.length - 1) / (samples[samples.length - 1].t - samples[0].t));
      features = analyzeRecording({ samples, t0: 0, source: 'camera', mode: 'face', fps, torsionAvailable: true }, { fs: Math.min(60, Math.max(15, fps)) }).features;
    }
    const rec: NystRec = { id: uid(), date: new Date().toISOString(), position: pos, note: (q('#note') as HTMLInputElement).value, seconds: samples.length ? samples[samples.length - 1].t : 0, features };
    if (blob) {
      try { await putBlob(rec.id, blob); rec.videoId = rec.id; rec.mime = blob.type; } catch { toast('Não foi possível guardar o vídeo (espaço?)'); }
    }
    nystRecs.save(rec);
    q('#result').innerHTML = features ? `<div class="card"><div class="result-head">${nystagmusGlyph(features, 'lg')}<div><span class="eyebrow">Estimativa automática</span><p class="summary">${esc(describe(features))}</p></div></div>
      <p class="small muted">Estimativa sem validação clínica — o médico deve ver o vídeo.</p></div>` : '';
    renderList();
    toast('Gravação guardada');
  };

  const renderList = () => {
    const all = nystRecs.all();
    const lab = (p: string) => POS.find((x) => x[0] === p)?.[1] ?? p;
    q('#list').innerHTML = all.length ? `<div class="card"><h2>Gravações (${all.length})</h2><ul class="rec-list">${all.map((r) => `
      <li><span><b>${fmtDate(r.date, true)}</b> · ${esc(lab(r.position))} · ${Math.round(r.seconds)} s
        ${r.features ? `<br><small>${esc(describe(r.features))}</small>` : ''}${r.note ? `<br><small class="muted">${esc(r.note)}</small>` : ''}</span>
        <span class="row">${r.videoId ? `<button class="icon-btn" data-play="${r.id}" aria-label="Ver">${icon('play')}</button><button class="icon-btn" data-dl="${r.id}" aria-label="Descarregar">${icon('download')}</button>` : ''}<button class="icon-btn" data-del="${r.id}" aria-label="Apagar">${icon('trash')}</button></span>
      </li><li class="player-slot" id="ps-${r.id}" hidden></li>`).join('')}</ul></div>` : '';
    app.querySelectorAll<HTMLElement>('[data-play]').forEach((b) => (b.onclick = async () => {
      const slot = q(`#ps-${b.dataset.play}`);
      if (!slot.hidden) { slot.hidden = true; slot.innerHTML = ''; return; }
      const blob = await getBlob(b.dataset.play!);
      if (!blob) { toast('Vídeo não encontrado'); return; }
      slot.hidden = false;
      slot.innerHTML = `<video class="review" controls playsinline src="${URL.createObjectURL(blob)}"></video>`;
    }));
    app.querySelectorAll<HTMLElement>('[data-dl]').forEach((b) => (b.onclick = async () => {
      const r = nystRecs.get(b.dataset.dl!);
      const blob = await getBlob(b.dataset.dl!);
      if (blob && r) download(`nistagmo-${r.date.slice(0, 16).replace(/[:T]/g, '-')}.${(r.mime ?? '').includes('mp4') ? 'mp4' : 'webm'}`, blob);
    }));
    app.querySelectorAll<HTMLElement>('[data-del]').forEach((b) => (b.onclick = async () => {
      if (!confirm('Apagar esta gravação?')) return;
      try { await delBlob(b.dataset.del!); } catch { /* ignorar */ }
      nystRecs.remove(b.dataset.del!);
      renderList();
    }));
  };
  renderList();
}
