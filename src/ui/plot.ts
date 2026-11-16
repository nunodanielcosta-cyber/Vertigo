import type { AnalysisResult } from '../types';

/**
 * Gráfico do registo oculomotor: painéis empilhados (H, V, T, intensidade da fase lenta),
 * eixo temporal partilhado, marca de t0, zona de nistagmo ativo e fases rápidas.
 * Inclui cursor com leitura de valores (hover/toque).
 */
interface Panel {
  key: 'h' | 'v' | 'tor' | 'spv';
  label: string;
  unit: string;
  color: string; // variável CSS
}

const PANELS: Panel[] = [
  { key: 'h', label: 'Horizontal (+ = direita do doente)', unit: '°', color: '--series-1' },
  { key: 'v', label: 'Vertical (+ = cima)', unit: '°', color: '--series-2' },
  { key: 'tor', label: 'Torsional (+ = polo sup. p/ orelha direita)', unit: '°', color: '--series-3' },
  { key: 'spv', label: 'Velocidade da fase lenta (|SPV|)', unit: '°/s', color: '--text-secondary' },
];

export function renderPlot(container: HTMLElement, a: AnalysisResult, t0: number) {
  container.innerHTML = '';
  container.classList.add('plot');
  const canvas = document.createElement('canvas');
  const tip = document.createElement('div');
  tip.className = 'plot-tip';
  tip.hidden = true;
  container.append(canvas, tip);

  const css = getComputedStyle(container);
  const col = (v: string) => css.getPropertyValue(v).trim() || '#888';
  const panels = PANELS.filter((p) => p.key !== 'tor' || a.tor.some(Number.isFinite));
  const spvT = a.windows.map((w) => w.t);
  const spvV = a.windows.map((w) => Math.hypot(w.spvH, w.spvV, w.spvT));

  const draw = (hoverX: number | null) => {
    const W = container.clientWidth;
    const PH = 92, GAP = 26, TOP = 22, BOTTOM = 26, LEFT = 44, RIGHT = 10;
    const H = TOP + panels.length * (PH + GAP) + BOTTOM - GAP;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const tMin = a.t[0] ?? 0, tMax = a.t[a.t.length - 1] ?? 1;
    const X = (t: number) => LEFT + ((t - tMin) / (tMax - tMin || 1)) * (W - LEFT - RIGHT);
    ctx.font = '11px system-ui, sans-serif';

    // zona ativa
    const act = a.windows.filter((w) => w.active && w.t >= t0);
    panels.forEach((p, k) => {
      const y0 = TOP + k * (PH + GAP);
      const xs = p.key === 'spv' ? spvT : a.t;
      const ys = p.key === 'spv' ? spvV : (a[p.key] as number[]);
      const finite = ys.filter(Number.isFinite);
      let lo = Math.min(...finite), hi = Math.max(...finite);
      if (!finite.length) { lo = -1; hi = 1; }
      if (p.key === 'spv') lo = 0;
      if (hi - lo < 2) { const m = (hi + lo) / 2; lo = p.key === 'spv' ? 0 : m - 1; hi = p.key === 'spv' ? 2 : m + 1; }
      const pad = (hi - lo) * 0.08;
      lo -= p.key === 'spv' ? 0 : pad; hi += pad;
      const Y = (v: number) => y0 + PH - ((v - lo) / (hi - lo)) * PH;

      // fundo da zona ativa
      ctx.fillStyle = col('--active-band');
      for (const w of act) ctx.fillRect(X(w.t - 0.25), y0, X(w.t + 0.25) - X(w.t - 0.25), PH);

      // grelha recessiva
      ctx.strokeStyle = col('--grid');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(LEFT, y0 + PH + 0.5); ctx.lineTo(W - RIGHT, y0 + PH + 0.5);
      ctx.stroke();
      ctx.fillStyle = col('--text-muted');
      ctx.textAlign = 'right';
      ctx.fillText(hi.toFixed(0), LEFT - 6, y0 + 9);
      ctx.fillText(lo.toFixed(0), LEFT - 6, y0 + PH);
      ctx.textAlign = 'left';
      ctx.fillStyle = col('--text-secondary');
      ctx.fillText(`${p.label} (${p.unit})`, LEFT, y0 - 6);

      // linha
      ctx.strokeStyle = col(p.color);
      ctx.lineWidth = p.key === 'spv' ? 2 : 1.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < xs.length; i++) {
        const v = ys[i];
        if (!Number.isFinite(v)) { pen = false; continue; }
        if (!pen) { ctx.moveTo(X(xs[i]), Y(v)); pen = true; } else ctx.lineTo(X(xs[i]), Y(v));
      }
      ctx.stroke();

      // fases rápidas
      if (p.key !== 'spv') {
        ctx.fillStyle = col('--text-muted');
        for (const f of a.fastPhases) ctx.fillRect(X(f.t) - 0.5, y0 + PH - 5, 1, 5);
      }
    });

    // t0 e eixo temporal
    ctx.strokeStyle = col('--accent');
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(X(t0), TOP); ctx.lineTo(X(t0), H - BOTTOM + 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col('--accent');
    ctx.textAlign = 'center';
    ctx.fillText('posição atingida', X(t0), H - 4);
    ctx.fillStyle = col('--text-muted');
    const stepT = tMax - tMin > 60 ? 10 : 5;
    for (let t = Math.ceil(tMin / stepT) * stepT; t <= tMax; t += stepT) {
      if (Math.abs(X(t) - X(t0)) > 50) ctx.fillText(`${t}s`, X(t), H - 4);
    }

    if (hoverX !== null) {
      ctx.strokeStyle = col('--text-secondary');
      ctx.beginPath(); ctx.moveTo(hoverX, TOP); ctx.lineTo(hoverX, H - BOTTOM); ctx.stroke();
      const t = tMin + ((hoverX - LEFT) / (W - LEFT - RIGHT)) * (tMax - tMin);
      const i = Math.max(0, Math.min(a.t.length - 1, Math.round((t - tMin) * ((a.t.length - 1) / (tMax - tMin || 1)))));
      const w = a.windows.reduce((b, x) => (Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b), a.windows[0] ?? { t, spvH: 0, spvV: 0, spvT: 0 });
      const f = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '—');
      tip.innerHTML = `<b>${t.toFixed(1)} s</b><br>H ${f(a.h[i])}° · V ${f(a.v[i])}°${panels.some((p) => p.key === 'tor') ? ` · T ${f(a.tor[i])}°` : ''}<br>SPV H ${f(w?.spvH)} · V ${f(w?.spvV)} · T ${f(w?.spvT)} °/s`;
      tip.hidden = false;
      tip.style.left = Math.min(W - 190, Math.max(0, hoverX + 10)) + 'px';
    } else tip.hidden = true;
  };

  draw(null);
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    draw(e.clientX - r.left);
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onMove);
  canvas.addEventListener('pointerleave', () => draw(null));
  const ro = new ResizeObserver(() => draw(null));
  ro.observe(container);
}

/** Traço ao vivo simples durante a gravação. */
export class LiveTrace {
  private ctx: CanvasRenderingContext2D;
  private data: { t: number; h: number; v: number }[] = [];
  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }
  push(t: number, h: number, v: number) {
    this.data.push({ t, h, v });
    if (this.data.length > 600) this.data.shift();
  }
  clear() { this.data = []; }
  draw() {
    const c = this.canvas, ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth, H = c.clientHeight;
    if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (this.data.length < 2) return;
    const css = getComputedStyle(c);
    const tEnd = this.data[this.data.length - 1].t, tStart = tEnd - 10;
    const pts = this.data.filter((d) => d.t >= tStart);
    for (const [k, color] of [['h', '--series-1'], ['v', '--series-2']] as const) {
      const vals = pts.map((p) => p[k]).filter(Number.isFinite);
      if (!vals.length) continue;
      const m = vals.reduce((s, x) => s + x, 0) / vals.length;
      ctx.strokeStyle = css.getPropertyValue(color).trim();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let pen = false;
      for (const p of pts) {
        const val = p[k];
        if (!Number.isFinite(val)) { pen = false; continue; }
        const x = ((p.t - tStart) / 10) * W;
        const y = H / 2 - (val - m) * (H / 24);
        if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}
