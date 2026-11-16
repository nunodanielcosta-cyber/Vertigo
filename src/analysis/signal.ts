import type { EyeSample } from '../types';

export interface UniformSignal {
  fs: number;
  t: number[];
  h: number[];
  v: number[];
  tor: number[];
  valid: boolean[];
  torValid: boolean[];
}

/**
 * Reamostra as amostras (possivelmente irregulares) para uma grelha uniforme a `fs` Hz.
 * Lacunas maiores que `maxGap` segundos (pestanejos, perda de tracking) ficam inválidas.
 */
export function resample(samples: EyeSample[], fs: number, maxGap = 0.25): UniformSignal {
  const good = samples.filter((s) => s.valid && Number.isFinite(s.h) && Number.isFinite(s.v));
  const out: UniformSignal = { fs, t: [], h: [], v: [], tor: [], valid: [], torValid: [] };
  if (samples.length < 2) return out;
  const t0 = samples[0].t;
  const t1 = samples[samples.length - 1].t;
  const n = Math.max(0, Math.floor((t1 - t0) * fs) + 1);
  const torGood = good.filter((s) => Number.isFinite(s.tor));
  let j = 0;
  let k = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + i / fs;
    out.t.push(t);
    while (j < good.length - 2 && good[j + 1].t < t) j++;
    const a = good[j];
    const b = good[j + 1];
    if (a && b && a.t <= t && b.t >= t && b.t - a.t <= maxGap) {
      const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      out.h.push(a.h + f * (b.h - a.h));
      out.v.push(a.v + f * (b.v - a.v));
      out.valid.push(true);
    } else if (a && Math.abs(a.t - t) < 0.5 / fs) {
      out.h.push(a.h);
      out.v.push(a.v);
      out.valid.push(true);
    } else {
      out.h.push(NaN);
      out.v.push(NaN);
      out.valid.push(false);
    }
    while (k < torGood.length - 2 && torGood[k + 1].t < t) k++;
    const c = torGood[k];
    const d = torGood[k + 1];
    if (c && d && c.t <= t && d.t >= t && d.t - c.t <= maxGap) {
      const f = d.t === c.t ? 0 : (t - c.t) / (d.t - c.t);
      out.tor.push(c.tor + f * (d.tor - c.tor));
      out.torValid.push(true);
    } else {
      out.tor.push(NaN);
      out.torValid.push(false);
    }
  }
  return out;
}

/** Filtro de mediana de 3 seguido de média móvel de 3 — remove ruído impulsivo preservando as fases rápidas. */
export function smooth(x: number[], valid: boolean[]): number[] {
  const n = x.length;
  const med = x.slice();
  for (let i = 1; i < n - 1; i++) {
    if (valid[i - 1] && valid[i] && valid[i + 1]) {
      const a = x[i - 1], b = x[i], c = x[i + 1];
      med[i] = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }
  }
  const out = med.slice();
  for (let i = 1; i < n - 1; i++) {
    if (valid[i - 1] && valid[i] && valid[i + 1]) out[i] = (med[i - 1] + med[i] + med[i + 1]) / 3;
  }
  return out;
}

/** Velocidade por diferença central (unidades/s). NaN onde não há vizinhos válidos. */
export function velocity(x: number[], valid: boolean[], fs: number): number[] {
  const n = x.length;
  const v = new Array<number>(n).fill(NaN);
  for (let i = 1; i < n - 1; i++) {
    if (valid[i - 1] && valid[i + 1]) v[i] = ((x[i + 1] - x[i - 1]) * fs) / 2;
  }
  return v;
}

export function median(arr: number[]): number {
  const a = arr.filter(Number.isFinite).sort((p, q) => p - q);
  if (a.length === 0) return NaN;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Desvio absoluto mediano escalado (estimativa robusta do desvio-padrão). */
export function robustSigma(arr: number[]): number {
  const m = median(arr);
  return 1.4826 * median(arr.map((x) => Math.abs(x - m)));
}

/** Converte deslocamento normalizado (fração do raio do globo ocular) em graus. */
export function normToDeg(x: number): number {
  return (Math.asin(Math.max(-1, Math.min(1, x))) * 180) / Math.PI;
}

/** Apenas filtro de mediana de 3 (remove spikes isolados, preserva degraus). */
export function medianOnly(x: number[], valid: boolean[]): number[] {
  const out = x.slice();
  for (let i = 1; i < x.length - 1; i++) {
    if (valid[i - 1] && valid[i] && valid[i + 1]) {
      const a = x[i - 1], b = x[i], c = x[i + 1];
      out[i] = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }
  }
  return out;
}

/** Diferença progressiva (x[i+1]-x[i])·fs. */
export function fwdDiff(x: number[], valid: boolean[], fs: number): number[] {
  const d = new Array<number>(x.length).fill(NaN);
  for (let i = 0; i < x.length - 1; i++) {
    if (valid[i] && valid[i + 1] && Number.isFinite(x[i]) && Number.isFinite(x[i + 1])) d[i] = (x[i + 1] - x[i]) * fs;
  }
  return d;
}
