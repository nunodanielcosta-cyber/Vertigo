import { page, q, esc, icon, experimental, collection, uid, fmtDate, resultBox, fmt, toast, setting, num } from '../_shared';
import type { Rec } from '../../core/storage';
import { optotypeMm, dvaInterpret } from '../../clinical/sensorMetrics';
import { HeadTracker } from '../../core/headTracker';
import { Metronome, beep } from '../../core/audio';
import { onLeave } from '../../core/router';

export interface DvaRec extends Rec { staticLM: number; dynamicLM: number; loss: number; distanceCm: number; plane: 'yaw' | 'pitch'; meanVel: number | null }
export const dvaRecs = collection<DvaRec>('dva');
const cal = setting<{ pxPerMm: number; distanceCm: number; threshold: number }>('dva.cal', { pxPerMm: 0, distanceCm: 50, threshold: 80 });

const DIRS = ['right', 'down', 'left', 'up'] as const;
type Dir = (typeof DIRS)[number];
const ROT: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };

/** E de Snellen (5×5 unidades) como SVG. */
const tumblingE = (sizePx: number, dir: Dir) => `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 5 5" style="transform:rotate(${ROT[dir]}deg)"><path d="M0 0H5V1H1V2H5V3H1V4H5V5H0Z" fill="currentColor"/></svg>`;

export function dvaView(app: HTMLElement) {
  const c = cal.get();
  page(app, { title: 'Acuidade visual dinâmica', sub: 'Optótipos com a cabeça parada e em movimento', back: '/' }, `
  ${experimental()}
  <div class="grid2">
    <section class="card">
      <h2>1. Calibrar o ecrã</h2>
      <p class="small muted">Encoste um cartão bancário (85,6 mm) ao ecrã e ajuste a barra até ter a mesma largura.</p>
      <div class="card-cal"><div id="cardbar" class="cardbar"></div></div>
      <input type="range" id="calR" min="150" max="900" value="${c.pxPerMm ? Math.round(c.pxPerMm * 85.6) : 330}" aria-label="Largura do cartão">
      ${num('dist', 'Distância dos olhos ao ecrã', c.distanceCm, 'cm', 'step="5" min="20" max="400" id="distI"')}
      ${num('thr', 'Velocidade mínima da cabeça para mostrar o optótipo', c.threshold, '°/s', 'step="10" min="20" max="300" id="thrI"')}
      <p class="small muted">Com o telemóvel use 40–50 cm; com tablet/computador, 1–3 m. A câmara frontal mede a rotação da cabeça.</p>
    </section>
    <section class="card">
      <h2>2. Teste</h2>
      <ol class="timeline compact">
        <li><b>Estático:</b> cabeça parada; o doente diz a direção das «pernas» do E e o examinador toca na seta correspondente.</li>
        <li><b>Dinâmico:</b> o doente roda a cabeça de um lado para o outro (~2 Hz, ao ritmo do metrónomo). O E só aparece quando a cabeça atinge a velocidade mínima.</li>
        <li>Cada linha tem 5 optótipos; passa se acertar ≥ 3. O teste para quando falha uma linha.</li>
      </ol>
      <div class="actionbar"><button class="btn primary big" data-run="static">${icon('eye')}Estático</button><button class="btn primary big" data-run="dynamic">${icon('rotate')}Dinâmico</button></div>
      <div id="res"></div>
    </section>
  </div>
  <div class="dva-stage" id="stage" hidden>
    <div class="dva-top"><span id="lineInfo"></span><span id="vel"></span><button class="btn small" id="exit">Terminar</button></div>
    <div class="dva-opto" id="opto"></div>
    <div class="dva-ans">${DIRS.map((d) => `<button data-ans="${d}" aria-label="${d}">${{ right: '→', down: '↓', left: '←', up: '↑' }[d]}</button>`).join('')}<button data-ans="skip" class="skip">Não vê</button></div>
  </div>
  <div id="hist"></div>`);

  const calR = q<HTMLInputElement>('#calR');
  const syncCal = () => {
    q('#cardbar').style.width = `${calR.value}px`;
    cal.set({ pxPerMm: Number(calR.value) / 85.6, distanceCm: Number((q('#distI') as HTMLInputElement).value) || 50, threshold: Number((q('#thrI') as HTMLInputElement).value) || 80 });
  };
  calR.oninput = syncCal;
  q('#distI').oninput = syncCal;
  q('#thrI').oninput = syncCal;
  syncCal();

  let results: { static: number | null; dynamic: number | null; vel: number | null } = { static: null, dynamic: null, vel: null };
  const showRes = () => {
    const i = dvaInterpret(results.static, results.dynamic);
    q('#res').innerHTML = `
      ${results.static !== null ? `<p>Estático: <b>${fmt(results.static)} logMAR</b></p>` : ''}
      ${results.dynamic !== null ? `<p>Dinâmico: <b>${fmt(results.dynamic)} logMAR</b>${results.vel ? ` · velocidade média ${Math.round(results.vel)} °/s` : ''}</p>` : ''}
      ${i ? resultBox('Perda dinâmica', `<p>${esc(i.text)}</p>`, i.abnormal ? 'warn' : 'ok') + `<button class="btn" id="save">${icon('check')}Guardar</button>` : ''}`;
    const sv = app.querySelector<HTMLElement>('#save');
    if (sv && i) sv.onclick = () => {
      dvaRecs.save({ id: uid(), date: new Date().toISOString(), staticLM: results.static!, dynamicLM: results.dynamic!, loss: i.loss, distanceCm: cal.get().distanceCm, plane: 'yaw', meanVel: results.vel });
      results = { static: null, dynamic: null, vel: null }; showRes(); renderHist(); toast('Guardado');
    };
  };
  const renderHist = () => {
    const all = dvaRecs.all();
    q('#hist').innerHTML = all.length ? `<div class="card mt"><h2>Histórico</h2><ul class="rec-list">${all.map((r) => `<li><span><b>${fmtDate(r.date)}</b> · estático ${fmt(r.staticLM)} · dinâmico ${fmt(r.dynamicLM)} · perda ${fmt(r.loss)} logMAR</span><button class="icon-btn" data-del="${r.id}" aria-label="Apagar">${icon('trash')}</button></li>`).join('')}</ul></div>` : '';
    app.querySelectorAll<HTMLElement>('[data-del]').forEach((b) => (b.onclick = () => { dvaRecs.remove(b.dataset.del!); renderHist(); }));
  };

  app.querySelectorAll<HTMLElement>('[data-run]').forEach((b) => (b.onclick = () => run(b.dataset.run as 'static' | 'dynamic')));

  async function run(kind: 'static' | 'dynamic') {
    const c2 = cal.get();
    if (!c2.pxPerMm) { toast('Calibre primeiro o ecrã'); return; }
    const stage = q('#stage');
    stage.hidden = false;
    let tracker: HeadTracker | null = null;
    const metro = new Metronome(240);
    onLeave(() => metro.stop());
    const vels: number[] = [];
    if (kind === 'dynamic') {
      q('#opto').innerHTML = '<p class="muted">A ligar a câmara frontal…</p>';
      try { tracker = new HeadTracker(); await tracker.start(); } catch { tracker = null; toast('Câmara indisponível: o E aparece ao ritmo do metrónomo (o examinador move a cabeça do doente).'); }
      metro.start();
    }
    let lm = 1.0; // começa em 1.0 logMAR
    let shown = 0, correct = 0, best: number | null = null;
    let current: Dir = 'right';
    let visible = false;
    let raf = 0;
    const sizePx = () => Math.max(4, optotypeMm(lm, c2.distanceCm * 10) * c2.pxPerMm);
    const present = () => {
      current = DIRS[Math.floor(Math.random() * 4)];
      q('#lineInfo').textContent = `Linha ${fmt(lm)} logMAR · ${shown + 1}/5`;
      if (kind === 'static') { q('#opto').innerHTML = tumblingE(sizePx(), current); visible = true; }
      else { q('#opto').innerHTML = ''; visible = false; waitForMotion(); }
    };
    const waitForMotion = () => {
      const t0 = performance.now();
      const loop = () => {
        const v = tracker ? Math.abs(tracker.yawVelocity()) : 999;
        q('#vel').textContent = tracker ? `${Math.round(v)} °/s` : 'sem câmara';
        const ready = tracker ? v >= c2.threshold : performance.now() - t0 > 600;
        if (ready) {
          vels.push(v);
          q('#opto').innerHTML = tumblingE(sizePx(), current);
          visible = true;
          setTimeout(() => { if (visible) q('#opto').innerHTML = '<span class="dva-done">?</span>'; }, 120);
          return;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    const finish = () => {
      cancelAnimationFrame(raf);
      metro.stop();
      tracker?.stop();
      stage.hidden = true;
      const score = best ?? 1.1;
      if (kind === 'static') results.static = score; else { results.dynamic = score; results.vel = vels.length ? vels.reduce((a, b) => a + b, 0) / vels.length : null; }
      showRes();
    };
    stage.querySelectorAll<HTMLElement>('[data-ans]').forEach((b) => (b.onclick = () => {
      if (!visible && kind === 'dynamic') return;
      visible = false;
      shown++;
      if (b.dataset.ans === current) correct++;
      beep(b.dataset.ans === current ? 1000 : 400, 0.05, 0.15);
      if (shown >= 5 || correct >= 3 || shown - correct >= 3) {
        if (correct >= 3) { best = Math.round(lm * 10) / 10; lm = Math.round((lm - 0.1) * 10) / 10; shown = 0; correct = 0; if (lm < -0.3) { finish(); return; } }
        else { finish(); return; }
      }
      present();
    }));
    q('#exit').onclick = finish;
    present();
  }
  renderHist();
  showRes();
}
