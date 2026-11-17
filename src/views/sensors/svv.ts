import { page, q, esc, icon, experimental, collection, uid, fmtDate, resultBox, fmt, toast } from '../_shared';
import type { Rec } from '../../core/storage';
import { listenOrientation, requestMotionPermission, upFromOrientation, deg, keepAwake } from '../../core/sensors';
import { svvStats } from '../../clinical/sensorMetrics';
import { beep } from '../../core/audio';
import { onLeave } from '../../core/router';

export interface SvvRec extends Rec { mode: 'bucket' | 'screen'; trials: number[]; mean: number; sd: number }
export const svvRecs = collection<SvvRec>('svv');

/** Inclinação do dispositivo no plano do ecrã, em graus, sentido horário visto por quem olha para o ecrã. */
const rollCW = (beta: number, gamma: number) => { const u = upFromOrientation(beta, gamma); return deg(Math.atan2(-u[0], u[1])); };

export function svvView(app: HTMLElement) {
  page(app, { title: 'Vertical visual subjetiva (VVS)', sub: 'Teste do balde com o giroscópio, ou linha no ecrã', back: '/' }, `
  ${experimental()}
  <div class="seg" role="tablist"><button class="on" data-m="bucket">${icon('target')}Teste do balde</button><button data-m="screen">${icon('phone')}Linha no ecrã</button></div>
  <div id="body"></div>
  <div id="hist"></div>`);
  const renderHist = () => {
    const all = svvRecs.all();
    q('#hist').innerHTML = all.length ? `<div class="card mt"><h2>Histórico</h2><ul class="rec-list">${all.map((r) => `<li><span><b>${fmtDate(r.date, true)}</b> · ${r.mode === 'bucket' ? 'balde' : 'ecrã'} · média ${fmt(r.mean)}° (DP ${fmt(r.sd)}°, n=${r.trials.length})</span><button class="icon-btn" data-del="${r.id}" aria-label="Apagar">${icon('trash')}</button></li>`).join('')}</ul></div>` : '';
    app.querySelectorAll<HTMLElement>('[data-del]').forEach((b) => (b.onclick = () => { svvRecs.remove(b.dataset.del!); renderHist(); }));
  };
  const setMode = (m: 'bucket' | 'screen') => {
    app.querySelectorAll('[data-m]').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.m === m));
    if (m === 'bucket') bucket(q('#body'), renderHist); else screenMode(q('#body'), renderHist);
  };
  app.querySelectorAll<HTMLElement>('[data-m]').forEach((b) => (b.onclick = () => setMode(b.dataset.m as 'bucket')));
  setMode('bucket');
  renderHist();
}

function resultsHtml(trials: number[]) {
  const s = svvStats(trials);
  if (!s) return '';
  return resultBox(`VVS média ${fmt(s.mean)}° (DP ${fmt(s.sd)}°, ${s.n} ensaios)`, `<p>${esc(s.text)}</p><p class="small muted">+ = linha inclinada para a direita (sentido horário) vista pelo doente. Normal: |média| ≤ 2,5°.</p>
    <p class="small">${trials.map((t, i) => `#${i + 1}: ${fmt(t)}°`).join(' · ')}</p>`, s.abnormal ? 'warn' : 'ok');
}

function bucket(el: HTMLElement, onSave: () => void) {
  let trials: number[] = [];
  let angle = 0, offset = 0, have = false;
  el.innerHTML = `<div class="grid2">
    <section class="card">
      <ol class="timeline compact">
        <li>Fixe o telemóvel ao fundo exterior de um balde opaco, com o ecrã virado para fora e o topo alinhado com a linha reta desenhada no interior do fundo.</li>
        <li>O doente, sentado, olha para dentro do balde (sem ver referências exteriores).</li>
        <li>O examinador roda o balde para uma posição aleatória e depois, devagar, em direção à vertical. O doente diz «pare» quando acha a linha vertical.</li>
        <li>Carregue em «Registar». Faça 6–10 ensaios, alternando o sentido de partida.</li>
      </ol>
      <button class="btn small" id="perm">${icon('phone')}Ativar sensores</button>
      <button class="btn small" id="cal" title="Com a linha alinhada a um fio de prumo">Calibrar zero</button>
    </section>
    <section class="card center">
      <div class="angle-dial"><svg viewBox="-100 -100 200 200"><circle r="92" class="dial-c"/><line y1="-92" y2="92" class="dial-v"/><line id="needle" y1="-85" y2="85" class="dial-n"/></svg></div>
      <div class="big-timer" id="ang">—</div>
      <p class="muted small">Ângulo visto pelo doente (+ = horário)</p>
      <div class="actionbar"><button class="btn primary big" id="rec" disabled>${icon('check')}Registar ensaio</button><button class="btn big" id="undo">${icon('back')}Desfazer</button></div>
      <div id="res"></div>
      <button class="btn mt" id="save" disabled>${icon('check')}Guardar sessão</button>
    </section></div>`;
  const show = () => {
    q('#res', el).innerHTML = resultsHtml(trials);
    (q('#save', el) as HTMLButtonElement).disabled = trials.length < 3;
  };
  q('#perm', el).onclick = async () => {
    if (!(await requestMotionPermission())) { toast('Sensores de movimento indisponíveis'); return; }
    void keepAwake();
    listenOrientation((s) => {
      // telemóvel com o ecrã virado para o examinador; o doente vê o fundo pelo lado oposto → sinal invertido
      angle = -rollCW(s.beta, s.gamma) - offset;
      have = true;
      q('#ang', el).textContent = `${angle >= 0 ? '+' : ''}${fmt(angle)}°`;
      q('#needle', el).setAttribute('transform', `rotate(${angle})`);
      (q('#rec', el) as HTMLButtonElement).disabled = false;
    });
    (q('#perm', el) as HTMLButtonElement).disabled = true;
  };
  q('#cal', el).onclick = () => { if (have) { offset += angle; toast('Zero calibrado'); } };
  q('#rec', el).onclick = () => { trials.push(Math.round(angle * 10) / 10); beep(880, 0.08); show(); };
  q('#undo', el).onclick = () => { trials.pop(); show(); };
  q('#save', el).onclick = () => { const s = svvStats(trials)!; svvRecs.save({ id: uid(), date: new Date().toISOString(), mode: 'bucket', trials, mean: s.mean, sd: s.sd }); trials = []; show(); onSave(); toast('Guardado'); };
}

function screenMode(el: HTMLElement, onSave: () => void) {
  let trials: number[] = [];
  let lineAngle = 0, devRoll = 0;
  let running = false;
  el.innerHTML = `<div class="card">
    <p>Num quarto escuro, o doente segura o telemóvel na vertical à frente dos olhos (ou dentro de um tubo/cone escuro), com o ecrã a ocupar o campo visual. Com os botões, roda a linha até a achar vertical. A app corrige a inclinação do próprio telemóvel pelo sensor.</p>
    <div class="actionbar"><button class="btn primary" id="go">${icon('play')}Começar (ecrã inteiro)</button></div>
    <div id="res"></div><button class="btn mt" id="save" disabled>${icon('check')}Guardar sessão</button>
  </div>
  <div class="svv-screen" id="scr" hidden>
    <svg viewBox="-100 -100 200 200" class="svv-svg"><circle r="96" class="svv-ring"/><line id="ln" y1="-80" y2="80" class="svv-line"/></svg>
    <div class="svv-ctl"><button id="l" aria-label="Rodar para a esquerda">⟲</button><button id="ok">OK</button><button id="r" aria-label="Rodar para a direita">⟳</button></div>
    <button class="svv-exit" id="x">Terminar</button>
  </div>`;
  const draw = () => q('#ln', el).setAttribute('transform', `rotate(${lineAngle})`);
  const newTrial = () => { lineAngle = (Math.random() < 0.5 ? -1 : 1) * (15 + Math.random() * 20); draw(); };
  const show = () => { q('#res', el).innerHTML = resultsHtml(trials); (q('#save', el) as HTMLButtonElement).disabled = trials.length < 3; };
  let hold = 0;
  const press = (d: number) => { lineAngle += d; draw(); };
  const bindHold = (b: HTMLElement, d: number) => {
    const startH = (e: Event) => { e.preventDefault(); press(d); hold = window.setInterval(() => press(d), 80); };
    const stopH = () => clearInterval(hold);
    b.addEventListener('pointerdown', startH); b.addEventListener('pointerup', stopH); b.addEventListener('pointerleave', stopH);
  };
  bindHold(q('#l', el), -0.5); bindHold(q('#r', el), 0.5);
  q('#go', el).onclick = async () => {
    await requestMotionPermission();
    listenOrientation((s) => { devRoll = rollCW(s.beta, s.gamma); });
    running = true;
    q('#scr', el).hidden = false;
    try { await q('#scr', el).requestFullscreen?.(); } catch { /* opcional */ }
    newTrial();
  };
  q('#ok', el).onclick = () => { if (!running) return; trials.push(Math.round((lineAngle + devRoll) * 10) / 10); beep(880, 0.06); newTrial(); show(); };
  q('#x', el).onclick = () => { running = false; q('#scr', el).hidden = true; if (document.fullscreenElement) void document.exitFullscreen(); show(); };
  q('#save', el).onclick = () => { const s = svvStats(trials)!; svvRecs.save({ id: uid(), date: new Date().toISOString(), mode: 'screen', trials, mean: s.mean, sd: s.sd }); trials = []; show(); onSave(); toast('Guardado'); };
  onLeave(() => clearInterval(hold));
}
