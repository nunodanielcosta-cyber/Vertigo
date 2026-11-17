import { askScore, page, q, icon, pills, uid, toast, setting, fmtDate, esc } from '../_shared';
import { sessionsCol } from './rehab';
import { keepAwake } from '../../core/sensors';
import { onLeave } from '../../core/router';

const st = setting<{ level: number; pattern: string; dir: string; minutes: number; vr: boolean }>('okn', { level: 1, pattern: 'stripes', dir: 'right', minutes: 2, vr: false });

/** Parâmetros por nível (1–10): velocidade (°/s aproximados no ecrã) e contraste/densidade. */
const levelParams = (l: number) => ({ speed: 20 + (l - 1) * 15, contrast: Math.min(1, 0.35 + l * 0.07), density: 6 + l });

/** Doseamento: sugere o nível seguinte em função dos sintomas antes/depois (0–10). */
export function nextLevel(level: number, before: number, after: number) {
  const inc = after - before;
  if (after >= 8 || inc >= 5) return { level: Math.max(1, level - 1), text: 'Sintomas fortes: baixar um nível na próxima sessão.' };
  if (inc <= 2 && after <= 5) return { level: Math.min(10, level + 1), text: 'Bem tolerado: subir um nível na próxima sessão.' };
  return { level, text: 'Manter o nível até se tornar mais fácil.' };
}

export function habituationView(app: HTMLElement) {
  const s = st.get();
  const recent = sessionsCol.all().filter((x) => x.kind === 'okn').slice(0, 8);
  page(app, { title: 'Habituação visual', sub: 'Estímulos optocinéticos progressivos para PPPD e vertigem visual', back: '/doente/reabilitacao' }, `
  <div class="grid2">
    <section class="card">
      <div class="q-block"><b>Nível: <output id="lvO">${s.level}</output>/10</b><input type="range" id="lv" min="1" max="10" value="${s.level}"></div>
      <div class="q-block"><b>Padrão</b>${pills('pattern', [['stripes', 'Riscas'], ['dots', 'Pontos (campo de estrelas)'], ['checker', 'Xadrez'], ['rotate', 'Rotação (roll)']], s.pattern, 'pills-wrap')}</div>
      <div class="q-block"><b>Direção</b>${pills('dir', [['right', '→'], ['left', '←'], ['up', '↑'], ['down', '↓'], ['alt', 'Alternar']], s.dir)}</div>
      <label class="field"><span>Duração</span><select id="min">${[1, 2, 3, 5, 8, 10].map((m) => `<option value="${m}"${m === s.minutes ? ' selected' : ''}>${m} min</option>`).join('')}</select></label>
      <label class="switch"><input type="checkbox" id="vr"${s.vr ? ' checked' : ''}><span class="track"></span><span>Modo VR (ecrã dividido para óculos tipo cartão)</span></label>
      <div class="q-block"><b>Tontura antes: <output id="bO">0</output>/10</b><input type="range" id="before" min="0" max="10" value="0"></div>
      <div class="actionbar"><button class="btn primary big" id="go">${icon('play')}Começar</button></div>
      <div class="tip">${icon('alert')}<span>Sentado, em segurança. Pare se tiver náuseas fortes. O objetivo é sentir um <b>ligeiro</b> aumento dos sintomas (até ~3–4/10) que passa depois. Comece pelo nível mais baixo.</span></div>
    </section>
    <section class="card">
      <h2>Sessões recentes</h2>
      ${recent.length ? `<ul class="rec-list">${recent.map((r) => `<li><span><b>${fmtDate(r.date, true)}</b> · nível ${r.level} · ${r.minutes} min · sintomas ${r.before}→${r.after}${r.detail ? `<br><small>${esc(r.detail)}</small>` : ''}</span></li>`).join('')}</ul>` : '<p class="muted">Ainda sem sessões.</p>'}
      <p class="ref">Pavlou M et al. J Neurol 2004 (dessensibilização com estímulos optocinéticos); Popkirov S, Staab JP, Stone J. Pract Neurol 2018 (PPPD).</p>
    </section>
  </div>
  <div class="okn" id="okn" hidden><canvas id="cv"></canvas><button class="okn-stop" id="stop">Parar</button><div class="okn-time" id="ot"></div></div>`);

  q('#lv').oninput = (e) => (q('#lvO').textContent = (e.target as HTMLInputElement).value);
  q('#before').oninput = (e) => (q('#bO').textContent = (e.target as HTMLInputElement).value);

  let raf = 0;
  let running = false;
  onLeave(() => { running = false; cancelAnimationFrame(raf); });

  q('#go').onclick = async () => {
    const level = Number((q('#lv') as HTMLInputElement).value);
    const pattern = (app.querySelector('input[name="pattern"]:checked') as HTMLInputElement).value;
    const dir = (app.querySelector('input[name="dir"]:checked') as HTMLInputElement).value;
    const minutes = Number((q('#min') as HTMLSelectElement).value);
    const vr = (q('#vr') as HTMLInputElement).checked;
    const before = Number((q('#before') as HTMLInputElement).value);
    st.set({ level, pattern, dir, minutes, vr });
    void keepAwake();
    const box = q('#okn');
    box.hidden = false;
    try { await box.requestFullscreen?.(); } catch { /* opcional */ }
    const cv = q<HTMLCanvasElement>('#cv');
    const ctx = cv.getContext('2d')!;
    const p = levelParams(level);
    const dpr = window.devicePixelRatio || 1;
    const resize = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
    resize();
    window.addEventListener('resize', resize);
    const stars = Array.from({ length: 60 * p.density }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3 }));
    const t0 = performance.now();
    running = true;
    const draw = (W: number, H: number, ox: number, t: number) => {
      const pxPerDeg = W / 40;
      let off = t * p.speed * pxPerDeg;
      let d = dir;
      if (dir === 'alt') d = Math.floor(t / 20) % 2 ? 'left' : 'right';
      const fg = `rgba(255,255,255,${p.contrast})`;
      ctx.save();
      ctx.beginPath(); ctx.rect(ox, 0, W, H); ctx.clip();
      ctx.fillStyle = '#000'; ctx.fillRect(ox, 0, W, H);
      ctx.fillStyle = fg;
      if (pattern === 'rotate') {
        ctx.translate(ox + W / 2, H / 2);
        ctx.rotate(((d === 'left' || d === 'up' ? -1 : 1) * t * p.speed * Math.PI) / 180);
        const n = p.density * 2;
        for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, Math.hypot(W, H), (i / n) * 2 * Math.PI, ((i + 0.5) / n) * 2 * Math.PI); ctx.fill(); }
      } else {
        const horiz = d === 'left' || d === 'right';
        if (d === 'left' || d === 'up') off = -off;
        const period = (horiz ? W : H) / p.density;
        if (pattern === 'stripes' || pattern === 'checker') {
          const o = ((off % period) + period) % period;
          for (let k = -1; k <= p.density + 1; k++) {
            const a = k * period + o;
            if (horiz) {
              if (pattern === 'stripes') ctx.fillRect(ox + a, 0, period / 2, H);
              else for (let j = 0; j * period / 2 < H; j++) if (j % 2 === (k & 1)) ctx.fillRect(ox + a, j * period / 2, period / 2, period / 2);
            } else {
              if (pattern === 'stripes') ctx.fillRect(ox, a, W, period / 2);
              else for (let j = 0; j * period / 2 < W; j++) if (j % 2 === (k & 1)) ctx.fillRect(ox + j * period / 2, a, period / 2, period / 2);
            }
          }
        } else {
          for (const s of stars) {
            let x = s.x * W, y = s.y * H;
            if (horiz) x = (((x + off * (0.5 + s.r / 4)) % W) + W) % W; else y = (((y + off * (0.5 + s.r / 4)) % H) + H) % H;
            ctx.beginPath(); ctx.arc(ox + x, y, s.r * dpr, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      ctx.restore();
    };
    const loop = () => {
      if (!running) return;
      const t = (performance.now() - t0) / 1000;
      const left = minutes * 60 - t;
      q('#ot').textContent = `${Math.floor(Math.max(0, left) / 60)}:${String(Math.floor(Math.max(0, left) % 60)).padStart(2, '0')}`;
      if (vr) { draw(cv.width / 2, cv.height, 0, t); draw(cv.width / 2, cv.height, cv.width / 2, t); }
      else draw(cv.width, cv.height, 0, t);
      if (left <= 0) { void end(true); return; }
      raf = requestAnimationFrame(loop);
    };
    const end = async (complete: boolean) => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      box.hidden = true;
      if (document.fullscreenElement) void document.exitFullscreen();
      const elapsed = Math.max(1, Math.round((performance.now() - t0) / 60000));
      const after = await askScore('Tontura agora:', before);
      const nx = nextLevel(level, before, Number.isFinite(after) ? after : before);
      st.set({ ...st.get(), level: nx.level });
      sessionsCol.save({ id: uid(), date: new Date().toISOString(), kind: 'okn', exercises: ['okn'], minutes: elapsed, before, after, level, detail: `${pattern}, ${dir}${complete ? '' : ' (interrompida)'} · ${nx.text}` });
      toast(nx.text);
      habituationView(app);
    };
    q('#stop').onclick = () => void end(false);
    loop();
  };
}
