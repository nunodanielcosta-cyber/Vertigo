import { page, q, esc, icon, experimental, collection, uid, pills, toast, fmtDate } from '../_shared';
import type { Rec } from '../../core/storage';
import { listenOrientation, requestMotionPermission, upFromOrientation, rotationMatrix, mulMV, cross, dot, unit, sub, scale, angleDeg, keepAwake, type Vec3 } from '../../core/sensors';
import { gravityInHead, keyframesFor, params, type Keyframe } from '../../clinical/poses';
import { figureSvg } from '../../ui/maneuverPlayer';
import { beep, speak } from '../../core/audio';
import { onLeave } from '../../core/router';

export interface GuidedRec extends Rec { maneuver: string; steps: { label: string; held: number; target: number; meanErr: number | null }[]; completed: boolean }
export const guidedRecs = collection<GuidedRec>('guided-maneuvers');

const MANEUVERS: [string, string][] = [['epley-right', 'Epley direita'], ['epley-left', 'Epley esquerda'], ['semont-right', 'Semont direita'], ['semont-left', 'Semont esquerda'], ['gufoni-geo-right', 'Gufoni geo. (afetado dir.)'], ['gufoni-geo-left', 'Gufoni geo. (afetado esq.)']];
const TOL = 20; // graus

export function epleyGuidedView(app: HTMLElement) {
  page(app, { title: 'Manobra guiada por sensores', sub: 'Telemóvel preso à cabeça: ângulo e tempo de cada posição', back: '/' }, `
  ${experimental()}
  <div class="grid2">
    <section class="card">
      <h2>1. Escolher a manobra</h2>
      <p class="muted small">Faça só a manobra e o lado indicados pelo seu médico.</p>
      ${pills('mv', MANEUVERS, 'epley-right', 'pills-wrap')}
      <h2 class="mt">2. Prender o telemóvel</h2>
      <p class="small">Com uma fita elástica ou bandolete, na testa ou no topo da cabeça, bem firme (pode ser em qualquer orientação). Peça a alguém que acompanhe e veja o ecrã; a app também dá instruções por voz.</p>
      <h2 class="mt">3. Calibrar</h2>
      <ol class="timeline compact">
        <li>Sentado direito, a olhar em frente → <b>Calibrar A</b>.</li>
        <li>Incline a cabeça para a frente (queixo ao peito, ~30–40°) → <b>Calibrar B</b>. Volte a endireitar.</li>
      </ol>
      <div class="actionbar"><button class="btn" id="perm">${icon('phone')}Ativar sensores</button><button class="btn" id="calA" disabled>Calibrar A</button><button class="btn" id="calB" disabled>Calibrar B</button></div>
      <p class="small" id="calInfo"></p>
      <div class="actionbar"><button class="btn primary big" id="start" disabled>${icon('play')}Iniciar manobra</button></div>
    </section>
    <section class="card center guided">
      <span class="eyebrow" id="stepN">—</span>
      <p class="guided-label" id="label">Calibre para começar.</p>
      <svg viewBox="0 0 400 260" class="player-svg small"><g id="fig"></g></svg>
      <div class="gauge" id="gauge"><div class="bubble-wrap"><div class="bubble-target"></div><div class="bubble" id="bubble"></div></div><div class="gauge-num"><b id="err">—</b><small>° de erro</small></div></div>
      <div class="big-timer" id="hold">—</div>
      <div class="meter wide"><div id="holdBar" style="width:0%"></div></div>
      <div class="actionbar"><button class="btn" id="skip" disabled>${icon('chevron')}Passo seguinte</button><button class="btn" id="stop" disabled>${icon('stop')}Parar</button></div>
    </section>
  </div>
  <div id="hist"></div>`);

  // estado do sensor
  let cur: { beta: number; gamma: number; alpha: number } | null = null;
  let up0: Vec3 | null = null, fwd: Vec3 | null = null, right: Vec3 | null = null, top: Vec3 | null = null;
  let R0: ReturnType<typeof rotationMatrix> | null = null;
  const avg: Vec3[] = [];

  const upNow = (): Vec3 => upFromOrientation(cur!.beta, cur!.gamma);

  q('#perm').onclick = async () => {
    if (!(await requestMotionPermission())) { toast('Sensores de orientação indisponíveis'); return; }
    void keepAwake();
    listenOrientation((s) => { cur = s; avg.push(upFromOrientation(s.beta, s.gamma)); if (avg.length > 20) avg.shift(); });
    (q('#calA') as HTMLButtonElement).disabled = false;
    (q('#perm') as HTMLButtonElement).disabled = true;
    toast('Sensores ativos');
  };
  const meanUp = (): Vec3 => unit(avg.reduce<Vec3>((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]));

  q('#calA').onclick = () => {
    if (!cur) { toast('Sem leitura do sensor'); return; }
    up0 = meanUp();
    R0 = rotationMatrix(cur.alpha, cur.beta, cur.gamma);
    (q('#calB') as HTMLButtonElement).disabled = false;
    beep(880, 0.1);
    q('#calInfo').textContent = 'A calibrado. Agora incline a cabeça para a frente e carregue em Calibrar B.';
    speak('Agora incline a cabeça para a frente, queixo ao peito.');
  };
  q('#calB').onclick = () => {
    if (!up0) return;
    const u1 = meanUp();
    // ao fletir, o vetor "cima" no referencial do dispositivo afasta-se do eixo vertical da cabeça para trás:
    // a gravidade (−up) ganha componente na direção do nariz → nariz ∝ −(u1 − (u1·up0)·up0)
    const d = sub(u1, scale(up0, dot(u1, up0)));
    const tilt = angleDeg(u1, up0);
    if (tilt < 12) { toast('Incline mais a cabeça para a frente e repita'); return; }
    top = up0;
    fwd = unit(scale(d, -1));
    right = unit(cross(fwd, top));
    beep(1200, 0.12);
    q('#calInfo').textContent = `Calibração concluída (flexão de ${Math.round(tilt)}°). Endireite a cabeça.`;
    (q('#start') as HTMLButtonElement).disabled = false;
    speak('Calibração concluída.');
  };

  /** gravidade (para baixo) no referencial da cabeça */
  const gHead = (): Vec3 => { const g = scale(upNow(), -1); return [dot(g, right!), dot(g, fwd!), dot(g, top!)]; };
  /** rotação horizontal (yaw) da cabeça relativamente à calibração A, + = direita */
  const yawNow = () => {
    const R = rotationMatrix(cur!.alpha, cur!.beta, cur!.gamma);
    const f1 = mulMV(R, fwd!), f0 = mulMV(R0!, fwd!);
    let d = (Math.atan2(f1[1], f1[0]) - Math.atan2(f0[1], f0[0])) * (180 / Math.PI);
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return -d;
  };

  let raf = 0;
  let running = false;
  onLeave(() => { running = false; cancelAnimationFrame(raf); speechSynthesis?.cancel?.(); });

  q('#start').onclick = () => {
    const id = (app.querySelector('input[name="mv"]:checked') as HTMLInputElement).value;
    const frames = keyframesFor(id)!;
    const log: GuidedRec['steps'] = [];
    let step = 0, held = 0, last = performance.now(), lastSpeak = 0, errSum = 0, errN = 0;
    running = true;
    (q('#skip') as HTMLButtonElement).disabled = false;
    (q('#stop') as HTMLButtonElement).disabled = false;
    (q('#start') as HTMLButtonElement).disabled = true;

    const target = (k: Keyframe) => (k.transition ? 0.3 : k.hold || (k === frames[0] ? 3 : 1));
    const enter = () => {
      const k = frames[step];
      held = 0; errSum = 0; errN = 0;
      q('#stepN').textContent = `Passo ${step + 1} de ${frames.length}`;
      q('#label').textContent = k.label;
      q('#fig').innerHTML = figureSvg(params(k), id.includes('right') ? 'right' : 'left');
      speak(k.label);
      beep(700, 0.1);
    };
    const next = () => {
      log.push({ label: frames[step].label, held: Math.round(held), target: target(frames[step]), meanErr: errN ? Math.round(errSum / errN) : null });
      step++;
      if (step >= frames.length) return done(true);
      enter();
    };
    const done = (completed: boolean) => {
      running = false;
      cancelAnimationFrame(raf);
      guidedRecs.save({ id: uid(), date: new Date().toISOString(), maneuver: id, steps: log, completed });
      speak(completed ? 'Manobra concluída. Fique sentado alguns minutos.' : 'Manobra interrompida.');
      q('#label').textContent = completed ? 'Manobra concluída. Fique sentado alguns minutos antes de se levantar.' : 'Interrompida.';
      (q('#skip') as HTMLButtonElement).disabled = true;
      (q('#stop') as HTMLButtonElement).disabled = true;
      (q('#start') as HTMLButtonElement).disabled = false;
      renderHist();
    };
    q('#skip').onclick = next;
    q('#stop').onclick = () => { log.push({ label: frames[step].label, held: Math.round(held), target: target(frames[step]), meanErr: null }); done(false); };

    const loop = () => {
      if (!running || !cur) { raf = requestAnimationFrame(loop); return; }
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const k = frames[step];
      let err: number;
      let bx = 0, by = 0;
      if (k.yawOnly) {
        const y = yawNow();
        const g = gHead();
        err = Math.max(Math.abs(y - k.yaw), angleDeg(g, [0, 0, -1]) > 25 ? angleDeg(g, [0, 0, -1]) : 0);
        bx = Math.max(-1, Math.min(1, (y - k.yaw) / 45));
      } else {
        const g = gHead(), t = gravityInHead(k);
        err = angleDeg(g, t);
        const d = sub(g, t);
        bx = Math.max(-1, Math.min(1, d[0] * 1.5));
        by = Math.max(-1, Math.min(1, -d[1] * 1.5));
      }
      errSum += err; errN++;
      const ok = err <= TOL;
      if (ok) held += dt;
      q('#err').textContent = String(Math.round(err));
      q('#gauge').className = `gauge ${ok ? 'ok' : err < TOL * 2 ? 'near' : 'far'}`;
      q('#bubble').style.transform = `translate(${bx * 40}px, ${by * 40}px)`;
      const tgt = target(k);
      q('#hold').innerHTML = `${Math.max(0, Math.ceil(tgt - held))}<small> s</small>`;
      q('#holdBar').style.width = `${Math.min(100, (held / tgt) * 100)}%`;
      if (now - lastSpeak > 6000) {
        lastSpeak = now;
        speak(ok ? `Posição certa. Mantenha. Faltam ${Math.max(0, Math.ceil(tgt - held))} segundos.` : 'Ajuste a posição.');
      }
      if (held >= tgt) { beep(1100, 0.2); next(); }
      raf = requestAnimationFrame(loop);
    };
    enter();
    last = performance.now();
    loop();
  };

  const renderHist = () => {
    const all = guidedRecs.all();
    q('#hist').innerHTML = all.length ? `<div class="card mt"><h2>Registo de manobras</h2><ul class="rec-list">${all.slice(0, 20).map((r) => `<li><span><b>${fmtDate(r.date, true)}</b> · ${esc(MANEUVERS.find((m) => m[0] === r.maneuver)?.[1] ?? r.maneuver)} · ${r.completed ? 'concluída' : '<span class="chip chip-warn">interrompida</span>'}<br><small class="muted">${r.steps.map((s, i) => `P${i + 1}: ${s.held}/${s.target} s${s.meanErr !== null ? ` (erro médio ${s.meanErr}°)` : ''}`).join(' · ')}</small></span><button class="icon-btn" data-del="${r.id}" aria-label="Apagar">${icon('trash')}</button></li>`).join('')}</ul></div>` : '';
    app.querySelectorAll<HTMLElement>('[data-del]').forEach((b) => (b.onclick = () => { guidedRecs.remove(b.dataset.del!); renderHist(); }));
  };
  renderHist();
}
