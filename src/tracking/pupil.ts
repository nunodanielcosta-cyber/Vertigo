import type { GrayImage } from './image';

/**
 * Deteção da pupila escura em vídeo de grande plano do olho (óculos de videonistagmografia,
 * Frenzel com câmara, telemóvel muito próximo com iluminação IV).
 *
 *  1. Redução para ~160 px de largura (média por blocos).
 *  2. Limiar escuro adaptativo: min + 0.35·(mediana − min).
 *  3. Componentes ligados; escolhe o mais "pupila" (área × circularidade, próximo da posição anterior,
 *     sem tocar nos bordos).
 *  4. Refinamento à resolução total: preenchimento por linhas (elimina reflexos corneanos) e centróide.
 */
export interface PupilResult {
  ok: boolean;
  x: number;
  y: number;
  r: number;
  /** limiar usado (útil para depuração) */
  thr: number;
}

export function findPupil(img: GrayImage, prev?: { x: number; y: number; r: number }): PupilResult {
  const { width: W, height: H, data } = img;
  const step = Math.max(1, Math.floor(W / 160));
  const w = Math.floor(W / step), h = Math.floor(H / step);
  const small = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let dy = 0; dy < step; dy++) {
        const row = (y * step + dy) * W + x * step;
        for (let dx = 0; dx < step; dx++) s += data[row + dx];
      }
      small[y * w + x] = s / (step * step);
    }
  }
  // desfoque 3x3
  const blur = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, c = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h) { s += small[yy * w + xx]; c++; }
    }
    blur[y * w + x] = s / c;
  }
  let mn = Infinity;
  for (const v of blur) if (v < mn) mn = v;
  const sorted = Float32Array.from(blur).sort();
  const med = sorted[sorted.length >> 1];
  const thr = mn + 0.35 * (med - mn);
  const fail: PupilResult = { ok: false, x: NaN, y: NaN, r: NaN, thr };
  if (med - mn < 15) return fail; // sem contraste (olho fechado?)

  // componentes ligados (4-conectividade)
  const label = new Int32Array(w * h).fill(-1);
  const stack: number[] = [];
  let best: { score: number; cx: number; cy: number; area: number } | null = null;
  const total = w * h;
  let id = 0;
  for (let p = 0; p < total; p++) {
    if (label[p] !== -1 || blur[p] > thr) continue;
    let area = 0, sx = 0, sy = 0, minx = w, maxx = 0, miny = h, maxy = 0, border = false;
    stack.push(p); label[p] = id;
    while (stack.length) {
      const q = stack.pop()!;
      const x = q % w, y = (q / w) | 0;
      area++; sx += x; sy += y;
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
      const nb = [q - 1, q + 1, q - w, q + w];
      for (let k = 0; k < 4; k++) {
        const r = nb[k];
        if (r < 0 || r >= total) continue;
        if ((k === 0 && x === 0) || (k === 1 && x === w - 1)) continue;
        if (label[r] === -1 && blur[r] <= thr) { label[r] = id; stack.push(r); }
      }
    }
    id++;
    if (area < total * 0.0008 || area > total * 0.3) continue;
    const bw = maxx - minx + 1, bh = maxy - miny + 1;
    const circ = area / ((Math.PI * Math.max(bw, bh) ** 2) / 4);
    const aspect = Math.min(bw, bh) / Math.max(bw, bh);
    let score = area * circ * circ * aspect * (border ? 0.1 : 1);
    const cx = sx / area, cy = sy / area;
    if (prev && Number.isFinite(prev.x)) {
      const d = Math.hypot(cx * step - prev.x, cy * step - prev.y);
      score *= Math.exp(-(d * d) / (2 * (0.15 * W) ** 2));
    }
    if (!best || score > best.score) best = { score, cx, cy, area };
  }
  if (!best) return fail;

  // refinamento a resolução total numa caixa à volta do candidato
  const rr = Math.sqrt(best.area / Math.PI) * step;
  const X0 = Math.max(0, Math.floor(best.cx * step - 2 * rr)), X1 = Math.min(W - 1, Math.ceil(best.cx * step + 2 * rr + step));
  const Y0 = Math.max(0, Math.floor(best.cy * step - 2 * rr)), Y1 = Math.min(H - 1, Math.ceil(best.cy * step + 2 * rr + step));
  let A = 0, SX = 0, SY = 0;
  for (let y = Y0; y <= Y1; y++) {
    let left = -1, right = -1;
    for (let x = X0; x <= X1; x++) {
      if (data[y * W + x] <= thr) { if (left < 0) left = x; right = x; }
    }
    if (left < 0 || right - left > 4 * rr) continue;
    // preenche reflexos entre o primeiro e o último pixel escuro da linha
    const n = right - left + 1;
    A += n; SX += ((left + right) / 2) * n; SY += y * n;
  }
  if (A < 4) return fail;
  return { ok: true, x: SX / A, y: SY / A, r: Math.sqrt(A / Math.PI), thr };
}
