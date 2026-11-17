import { ask, page, q, icon, pills, uid, toast, fmt } from '../_shared';
import { sessionsCol } from './rehab';
import { HeadTracker } from '../../core/headTracker';
import { Metronome, beepEnd } from '../../core/audio';
import { keepAwake } from '../../core/sensors';
import { onLeave } from '../../core/router';

export function vorView(app: HTMLElement) {
  page(app, { title: 'Estabilização do olhar (VOR)', sub: 'Alvo no ecrã, metrónomo e confirmação do movimento pela câmara', back: '/doente/reabilitacao' }, `
  <div class="grid2">
    <section class="card">
      <div class="q-block"><b>Exercício</b>${pills('type', [['x1', 'VOR x1 — alvo parado'], ['x2', 'VOR x2 — alvo move-se ao contrário']], 'x1')}</div>
      <div class="q-block"><b>Plano</b>${pills('plane', [['yaw', 'Horizontal (dizer «não»)'], ['pitch', 'Vertical (dizer «sim»)']], 'yaw')}</div>
      <div class="field-grid">
        <label class="field"><span>Ritmo (batidas/min)</span><input type="number" id="bpm" value="120" min="40" max="240" step="10"></label>
        <label class="field"><span>Duração</span><select id="dur"><option value="30">30 s</option><option value="60" selected>1 min</option><option value="90">1,5 min</option><option value="120">2 min</option></select></label>
      </div>
      <label class="switch"><input type="checkbox" id="cam" checked><span class="track"></span><span>Confirmar o movimento com a câmara frontal</span></label>
      <ol class="timeline compact mt">
        <li>Telemóvel à altura dos olhos, a ~40 cm (ou num suporte). Fixe a letra.</li>
        <li>Rode a cabeça ~20° para cada lado, uma vez por batida, mantendo a letra <b>nítida</b>. Se ficar desfocada, abrande.</li>
        <li>Aumente o ritmo de sessão para sessão (objetivo: ~2 Hz, 240 batidas/min).</li>
      </ol>
      <div class="actionbar"><button class="btn primary big" id="go">${icon('play')}Começar</button></div>
    </section>
    <section class="card center">
      <div class="vor-stage" id="stage"><span class="vor-target" id="tg">X</span></div>
      <div class="big-timer" id="tm">—</div>
      <div class="vor-check" id="chk"><span class="dot"></span><span id="chkT">Câmara desligada</span></div>
      <video id="vid" class="vor-cam" playsinline muted></video>
    </section>
  </div>`);

  let running = false;
  let raf = 0, timer = 0;
  const metro = new Metronome(120);
  let tracker: HeadTracker | null = null;
  const okSamples: boolean[] = [];
  onLeave(() => { running = false; cancelAnimationFrame(raf); clearInterval(timer); metro.stop(); });

  q('#go').onclick = async () => {
    if (running) { void stop(false); return; }
    const type = (app.querySelector('input[name="type"]:checked') as HTMLInputElement).value;
    const plane = (app.querySelector('input[name="plane"]:checked') as HTMLInputElement).value as 'yaw' | 'pitch';
    const bpm = Number((q('#bpm') as HTMLInputElement).value) || 120;
    let left = Number((q('#dur') as HTMLSelectElement).value);
    void keepAwake();
    if ((q('#cam') as HTMLInputElement).checked && !tracker) {
      q('#chkT').textContent = 'A ligar a câmara…';
      try { tracker = new HeadTracker(q<HTMLVideoElement>('#vid')); await tracker.start(); } catch { tracker = null; toast('Câmara indisponível — continua sem confirmação'); }
    }
    running = true;
    okSamples.length = 0;
    q('#go').innerHTML = `${icon('stop')}Parar`;
    metro.bpm = bpm;
    metro.start();
    const t0 = performance.now();
    const cycleHz = bpm / 120; // 2 batidas por ciclo (ida e volta)
    const loop = () => {
      if (!running) return;
      const t = (performance.now() - t0) / 1000;
      const tg = q('#tg');
      if (type === 'x2') {
        const amp = 35; // % da área
        const pos = Math.sin(2 * Math.PI * cycleHz * t) * amp;
        tg.style.transform = plane === 'yaw' ? `translateX(${pos}vmin)` : `translateY(${pos * 0.6}vmin)`;
      } else tg.style.transform = '';
      if (tracker) {
        const o = tracker.oscillation(2.5, plane);
        const moving = o.amp >= 8 && o.freq > cycleHz * 0.5 && o.freq < cycleHz * 1.6;
        okSamples.push(moving);
        q('#chk').className = `vor-check ${moving ? 'ok' : 'bad'}`;
        q('#chkT').textContent = moving ? `Cabeça a mover-se ✓ (${fmt(o.amp, 0)}°, ${fmt(o.freq)} Hz)` : o.amp < 8 ? `Mexa mais a cabeça (${fmt(o.amp, 0)}°)` : `Ritmo: ${fmt(o.freq)} Hz (alvo ${fmt(cycleHz)} Hz)`;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    q('#tm').innerHTML = `${left}<small> s</small>`;
    timer = window.setInterval(() => { left--; q('#tm').innerHTML = `${Math.max(0, left)}<small> s</small>`; if (left <= 0) void stop(true); }, 1000);
  };

  const stop = async (complete: boolean) => {
    running = false;
    cancelAnimationFrame(raf);
    clearInterval(timer);
    metro.stop();
    beepEnd();
    q('#go').innerHTML = `${icon('play')}Começar`;
    const type = (app.querySelector('input[name="type"]:checked') as HTMLInputElement).value;
    const plane = (app.querySelector('input[name="plane"]:checked') as HTMLInputElement).value;
    const pct = okSamples.length ? Math.round((okSamples.filter(Boolean).length / okSamples.length) * 100) : null;
    const detail = `${type.toUpperCase()} ${plane === 'yaw' ? 'horizontal' : 'vertical'} · ${(q('#bpm') as HTMLInputElement).value} bpm${pct !== null ? ` · movimento confirmado ${pct} %` : ''}`;
    if (complete || (await ask('Registar esta sessão incompleta?', { ok: 'Registar', cancel: 'Não registar' }))) {
      sessionsCol.save({ id: uid(), date: new Date().toISOString(), kind: 'vor', exercises: [type === 'x2' ? 'vor2' : plane === 'yaw' ? 'vor1-h' : 'vor1-v'], minutes: Math.max(1, Math.round(Number((q('#dur') as HTMLSelectElement).value) / 60)), detail });
      toast('Sessão registada');
    }
    q('#chkT').textContent = detail;
  };
}
