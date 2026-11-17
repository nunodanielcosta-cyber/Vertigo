/**
 * Gráficos SVG leves (barras por data, linhas, pontos), com tooltip ao passar e tabela acessível.
 * Usam as cores de série do sistema visual (--series-1…3); texto sempre em tokens de texto.
 */
import { esc } from '../ui/dom';

export interface BarDatum { label: string; value: number; tip?: string; tone?: 'a' | 'b' | 'c' }

const W = 440;

export function barChart(data: BarDatum[], o: { height?: number; unit?: string; max?: number; title?: string } = {}) {
  const H = o.height ?? 180;
  const pad = { l: 34, r: 8, t: 10, b: 26 };
  const max = Math.max(o.max ?? 0, ...data.map((d) => d.value), 1);
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const bw = data.length ? iw / data.length : iw;
  const ticks = niceTicks(max);
  const y = (v: number) => pad.t + ih - (v / ticks[ticks.length - 1]) * ih;
  const step = Math.ceil(data.length / 7);
  return `<figure class="chart">${o.title ? `<figcaption>${esc(o.title)}</figcaption>` : ''}
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title ?? 'Gráfico')}">
    ${ticks.map((t) => `<line class="c-grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="c-axis" x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('')}
    ${data.map((d, i) => {
      const h = Math.max(0, pad.t + ih - y(d.value));
      const x = pad.l + i * bw + Math.max(1, bw * 0.15);
      const w = Math.max(2, bw * 0.7);
      return `<g class="c-hit"><title>${esc(d.tip ?? `${d.label}: ${d.value}${o.unit ?? ''}`)}</title>
        <rect x="${pad.l + i * bw}" y="${pad.t}" width="${bw}" height="${ih}" fill="transparent"/>
        ${d.value > 0 ? `<path class="c-bar c-${d.tone ?? 'a'}" d="${roundTop(x, y(d.value), w, h)}"/>` : ''}
        ${i % step === 0 ? `<text class="c-axis" x="${pad.l + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>` : ''}
      </g>`;
    }).join('')}
    <line class="c-base" x1="${pad.l}" x2="${W - pad.r}" y1="${pad.t + ih}" y2="${pad.t + ih}"/>
  </svg>
  ${tableFallback(data.map((d) => [d.label, d.value + (o.unit ?? '')]))}
  </figure>`;
}

export interface LineSeries { name: string; points: { x: number; y: number; tip?: string }[]; cls: 'a' | 'b' | 'c' }

/** Gráfico de linhas com eixo x temporal (ms epoch) ou numérico. */
export function lineChart(series: LineSeries[], o: { height?: number; yLabel?: string; title?: string; xTime?: boolean; yMin?: number; yMax?: number; invertY?: boolean; band?: [number, number] } = {}) {
  const H = o.height ?? 200;
  const pad = { l: 40, r: 10, t: 12, b: 26 };
  const pts = series.flatMap((s) => s.points);
  if (!pts.length) return `<p class="muted small">Sem dados suficientes para o gráfico.</p>`;
  let x0 = Math.min(...pts.map((p) => p.x)), x1 = Math.max(...pts.map((p) => p.x));
  if (x0 === x1) { x0 -= 1; x1 += 1; }
  let y0 = o.yMin ?? Math.min(...pts.map((p) => p.y)), y1 = o.yMax ?? Math.max(...pts.map((p) => p.y));
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const X = (x: number) => pad.l + ((x - x0) / (x1 - x0)) * iw;
  const Y = (v: number) => (o.invertY ? pad.t + ((v - y0) / (y1 - y0)) * ih : pad.t + ih - ((v - y0) / (y1 - y0)) * ih);
  const yt = linTicks(y0, y1, 4);
  const xt = linTicks(x0, x1, 4);
  const xl = (x: number) => (o.xTime ? new Date(x).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) : String(Math.round(x * 10) / 10));
  return `<figure class="chart">${o.title ? `<figcaption>${esc(o.title)}</figcaption>` : ''}
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title ?? 'Gráfico')}">
    ${o.band ? `<rect class="c-band" x="${pad.l}" width="${iw}" y="${Math.min(Y(o.band[0]), Y(o.band[1]))}" height="${Math.abs(Y(o.band[1]) - Y(o.band[0]))}"/>` : ''}
    ${yt.map((t) => `<line class="c-grid" x1="${pad.l}" x2="${W - pad.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="c-axis" x="${pad.l - 6}" y="${Y(t) + 4}" text-anchor="end">${fmtTick(t)}</text>`).join('')}
    ${xt.map((t) => `<text class="c-axis" x="${X(t)}" y="${H - 8}" text-anchor="middle">${xl(t)}</text>`).join('')}
    ${o.yLabel ? `<text class="c-axis" x="4" y="${pad.t - 2}">${esc(o.yLabel)}</text>` : ''}
    ${series.map((s) => {
      const p = [...s.points].sort((a, b) => a.x - b.x);
      return `<path class="c-line c-${s.cls}" d="${p.map((q, i) => `${i ? 'L' : 'M'}${X(q.x).toFixed(1)},${Y(q.y).toFixed(1)}`).join('')}"/>
      ${p.map((q) => `<g class="c-hit"><title>${esc(q.tip ?? `${s.name}: ${q.y}`)}</title><circle cx="${X(q.x)}" cy="${Y(q.y)}" r="12" fill="transparent"/><circle class="c-dot c-${s.cls}" cx="${X(q.x)}" cy="${Y(q.y)}" r="4"/></g>`).join('')}`;
    }).join('')}
  </svg>
  ${series.length > 1 ? `<p class="legend">${series.map((s) => `<span><span class="sw c-sw-${s.cls}"></span>${esc(s.name)}</span>`).join('')}</p>` : ''}
  ${tableFallback(series.flatMap((s) => s.points.map((p) => [`${series.length > 1 ? s.name + ' · ' : ''}${xl(p.x)}`, fmtTick(p.y)])))}
  </figure>`;
}

function tableFallback(rows: (string | number)[][]) {
  if (!rows.length) return '';
  return `<details class="chart-table"><summary>Ver dados em tabela</summary><table>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(String(c))}</td>`).join('')}</tr>`).join('')}</table></details>`;
}

function roundTop(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function niceTicks(max: number) {
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9 || out.length < 2; v += step) out.push(Math.round(v * 100) / 100);
  if (out[out.length - 1] < max) out.push(Math.round((out[out.length - 1] + step) * 100) / 100);
  return out;
}

function linTicks(a: number, b: number, n: number) {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
  return out;
}

const fmtTick = (v: number) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace('.', ',');
