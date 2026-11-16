/**
 * Animação 3D simplificada (SVG) das manobras e provas posicionais, com cronómetro por passo.
 * Projeção ortográfica a partir de uma câmara à frente-direita do doente.
 */
import type { Side } from '../types';
import { apply, bodyMatrix, headMatrix, lerpParams, params, type Keyframe, type PoseParams } from '../clinical/poses';
import { beep } from '../core/audio';
import { onLeave } from '../core/router';
import { esc } from './dom';
import { icon } from './icons';
import type { Vec3 } from '../core/sensors';

const cam = (() => {
  const a = (62 * Math.PI) / 180, e = (24 * Math.PI) / 180;
  const pos: Vec3 = [Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), Math.sin(e)];
  const f: Vec3 = [-pos[0], -pos[1], -pos[2]];
  const rgt: Vec3 = (() => { const c: Vec3 = [f[1] * 1 - f[2] * 0, f[2] * 0 - f[0] * 1, 0]; const n = Math.hypot(c[0], c[1]); return [c[0] / n, c[1] / n, 0]; })();
  const up: Vec3 = [rgt[1] * f[2] - rgt[2] * f[1], rgt[2] * f[0] - rgt[0] * f[2], rgt[0] * f[1] - rgt[1] * f[0]];
  return { f, rgt, up };
})();
const S = 150;
const CENTER: Vec3 = [0, 0.05, 0.15];
const proj = (p: Vec3) => {
  const q: Vec3 = [p[0] - CENTER[0], p[1] - CENTER[1], p[2] - CENTER[2]];
  return {
    x: 200 + S * (q[0] * cam.rgt[0] + q[1] * cam.rgt[1] + q[2] * cam.rgt[2]),
    y: 140 - S * (q[0] * cam.up[0] + q[1] * cam.up[1] + q[2] * cam.up[2]),
    d: q[0] * cam.f[0] + q[1] * cam.f[1] + q[2] * cam.f[2],
  };
};
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Desenha a figura numa pose (parâmetros contínuos). */
export function figureSvg(p: PoseParams, affected?: Side) {
  const B = bodyMatrix(p), Hm = headMatrix(p);
  const W = (v: Vec3) => apply(B, v);
  const hip: Vec3 = [0, 0, 0];
  const neck = W([0, 0, 0.5]);
  const hc = add(neck, apply(Hm, [0, 0, 0.17]));
  // sentado com as pernas estendidas na marquesa (posição de partida do Dix-Hallpike/Epley)
  const legs = [-0.08, 0.08].map((x) => {
    const knee = W(lerp3([x, 0.42, 0.02], [x, 0, -0.42], p.lying));
    const foot = W(lerp3([x, 0.86, 0], [x, 0, -0.86], p.lying));
    return { knee, foot };
  });
  // a cabeça fica pendente para lá da extremidade da marquesa (y < −0.5)
  const couch: Vec3[] = [[-0.32, -0.5, -0.1], [0.32, -0.5, -0.1], [0.32, 1.0, -0.1], [-0.32, 1.0, -0.1]];
  const P = (v: Vec3) => proj(v);
  const line = (a: Vec3, b: Vec3, cls: string) => { const A = P(a), Bq = P(b); return `<line class="${cls}" x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${Bq.x.toFixed(1)}" y2="${Bq.y.toFixed(1)}"/>`; };
  const hcp = P(hc);
  const feat = (local: Vec3, r: number, cls: string) => {
    const w = add(hc, apply(Hm, local));
    const q = P(w);
    const front = q.d < hcp.d; // mais perto da câmara que o centro da cabeça
    return { svg: `<circle class="${cls}${front ? '' : ' hidden-f'}" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${r}"/>`, front };
  };
  const nose = feat([0, 0.16, -0.01], 6, 'f-nose');
  const eyes = [feat([-0.05, 0.125, 0.035], 3.5, 'f-eye'), feat([0.05, 0.125, 0.035], 3.5, 'f-eye')];
  const earR = feat([0.14, 0, 0], 7, affected === 'right' ? 'f-ear f-aff' : 'f-ear');
  const earL = feat([-0.14, 0, 0], 7, affected === 'left' ? 'f-ear f-aff' : 'f-ear');
  const parts = [earR, earL, nose, ...eyes];
  // linha do nariz (direção do olhar)
  const noseTip = P(add(hc, apply(Hm, [0, 0.34, 0])));
  return `
    <polygon class="f-couch" points="${couch.map((c) => { const q = P(c); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(' ')}"/>
    ${legs.map((l) => line(hip, l.knee, 'f-limb') + line(l.knee, l.foot, 'f-limb')).join('')}
    ${line(hip, neck, 'f-torso')}
    ${parts.filter((x) => !x.front).map((x) => x.svg).join('')}
    <circle class="f-head" cx="${hcp.x.toFixed(1)}" cy="${hcp.y.toFixed(1)}" r="${(0.13 * S).toFixed(1)}"/>
    <line class="f-gaze" x1="${hcp.x.toFixed(1)}" y1="${hcp.y.toFixed(1)}" x2="${noseTip.x.toFixed(1)}" y2="${noseTip.y.toFixed(1)}"/>
    ${parts.filter((x) => x.front).map((x) => x.svg).join('')}
    `;
}

export interface PlayerOpts { affected?: Side; realTime?: boolean; title?: string; onStep?: (i: number) => void }

/** Monta um leitor de manobra num elemento. */
export function mountPlayer(el: HTMLElement, frames: Keyframe[], o: PlayerOpts = {}) {
  let step = 0;
  let playing = false;
  let realTime = o.realTime ?? false;
  let anim = { from: params(frames[0]), to: params(frames[0]), t0: 0, dur: 1 };
  let holdStart = 0;
  let raf = 0;

  el.innerHTML = `
  <div class="player">
    <svg class="player-svg" viewBox="0 0 400 260" role="img" aria-label="Animação da manobra"><g id="fig"></g></svg>
    <div class="player-info">
      <div class="player-step"><span class="eyebrow" id="pStepN"></span><p id="pLabel"></p></div>
      <div class="player-timer" id="pTimer" aria-live="polite"></div>
    </div>
    <ol class="player-dots" id="pDots">${frames.map((_, i) => `<li><button data-i="${i}" aria-label="Passo ${i + 1}"></button></li>`).join('')}</ol>
    <div class="player-ctl">
      <button class="icon-btn" id="pPrev" aria-label="Passo anterior">${icon('back')}</button>
      <button class="btn primary" id="pPlay">${icon('play')}<span>Reproduzir</span></button>
      <button class="icon-btn" id="pNext" aria-label="Passo seguinte">${icon('chevron')}</button>
      <label class="switch small"><input type="checkbox" id="pReal"${realTime ? ' checked' : ''}><span class="track"></span><span>Tempos reais</span></label>
    </div>
    ${o.affected ? `<p class="hint"><span class="f-legend"></span> orelha afetada · a linha indica a direção do nariz</p>` : '<p class="hint">A linha indica a direção do nariz.</p>'}
  </div>`;
  const fig = el.querySelector('#fig') as SVGGElement;
  const $ = (s: string) => el.querySelector(s) as HTMLElement;

  const holdOf = (i: number) => (frames[i].transition ? 0.2 : realTime ? frames[i].hold : Math.min(frames[i].hold, 3) || 1.2);

  const showStep = () => {
    const k = frames[step];
    $('#pStepN').textContent = `Passo ${step + 1} de ${frames.length}`;
    $('#pLabel').innerHTML = esc(k.label) + (k.uncertain ? ' <span class="chip chip-warn">validar protocolo</span>' : '');
    el.querySelectorAll('#pDots button').forEach((b, i) => b.classList.toggle('on', i === step));
    o.onStep?.(step);
  };

  const goTo = (i: number, animate = true) => {
    step = Math.max(0, Math.min(frames.length - 1, i));
    anim = { from: animate ? currentParams() : params(frames[step]), to: params(frames[step]), t0: performance.now(), dur: animate ? 1100 : 1 };
    holdStart = performance.now() + anim.dur;
    showStep();
  };

  const currentParams = () => {
    const t = Math.min(1, (performance.now() - anim.t0) / anim.dur);
    return lerpParams(anim.from, anim.to, t);
  };

  const setPlaying = (v: boolean) => {
    playing = v;
    $('#pPlay').innerHTML = v ? `${icon('pause')}<span>Pausa</span>` : `${icon('play')}<span>Reproduzir</span>`;
    if (v) holdStart = performance.now();
  };

  const loop = () => {
    const now = performance.now();
    fig.innerHTML = figureSvg(currentParams(), o.affected);
    const hold = holdOf(step);
    const moving = now < anim.t0 + anim.dur;
    if (playing && !moving) {
      const left = hold - (now - holdStart) / 1000;
      $('#pTimer').innerHTML = frames[step].hold ? `<b>${Math.max(0, Math.ceil(left))}</b><small>s</small>` : '';
      if (left <= 0) {
        if (step < frames.length - 1) { if (realTime) beep(880, 0.15); goTo(step + 1); }
        else { setPlaying(false); if (realTime) beep(660, 0.3); }
      }
    } else if (!playing) {
      $('#pTimer').innerHTML = frames[step].hold ? `<b>${frames[step].hold}</b><small>s</small>` : '';
    }
    raf = requestAnimationFrame(loop);
  };

  $('#pPlay').onclick = () => {
    if (!playing && step === frames.length - 1) goTo(0, false);
    setPlaying(!playing);
  };
  $('#pPrev').onclick = () => goTo(step - 1);
  $('#pNext').onclick = () => goTo(step + 1);
  ($('#pReal') as HTMLInputElement).onchange = (e) => { realTime = (e.target as HTMLInputElement).checked; };
  el.querySelectorAll<HTMLButtonElement>('#pDots button').forEach((b) => (b.onclick = () => goTo(Number(b.dataset.i))));

  goTo(0, false);
  loop();
  const destroy = () => cancelAnimationFrame(raf);
  onLeave(destroy);
  return { goTo, destroy, get step() { return step; } };
}
