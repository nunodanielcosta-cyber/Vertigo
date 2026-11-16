import { sampleBilinear, type GrayImage } from './image';

/**
 * Estimativa da torção ocular por correlação do padrão da íris em coordenadas polares.
 *
 * O anel da íris é "desenrolado" num perfil angular (média de vários raios). Uma rotação
 * do olho traduz-se num deslocamento circular desse perfil; o deslocamento é estimado por
 * correlação normalizada com um perfil de referência (com refinamento parabólico sub-bin).
 *
 * Ângulos no sentido ANTI-HORÁRIO visto pelo examinador (câmara de frente para o doente).
 * Rotação anti-horária vista pelo examinador = polo superior para a orelha DIREITA do doente
 * = torção positiva na convenção da app.
 */

export const N_ANGLES = 180; // resolução de 2°
const DEG_PER_BIN = 360 / N_ANGLES;

export interface ProfileOptions {
  /** rotação da cabeça (rad, anti-horário visto pelo examinador) — o perfil é expresso no referencial da cabeça */
  headRoll?: number;
  nRadii?: number;
  /** excluir o setor superior (pálpebra superior / pestanas) */
  excludeTop?: boolean;
  /** espelhamento horizontal da imagem */
  mirrored?: boolean;
}

export function irisProfile(img: GrayImage, cx: number, cy: number, r1: number, r2: number, o: ProfileOptions = {}): Float32Array {
  const nR = o.nRadii ?? 6;
  const roll = o.headRoll ?? 0;
  const prof = new Float32Array(N_ANGLES);
  for (let a = 0; a < N_ANGLES; a++) {
    const phiHead = (a * DEG_PER_BIN * Math.PI) / 180;
    const deg = a * DEG_PER_BIN;
    if (o.excludeTop !== false && deg > 35 && deg < 145) { prof[a] = NaN; continue; }
    let phi = phiHead + roll;
    if (o.mirrored) phi = Math.PI - phi;
    const c = Math.cos(phi), s = Math.sin(phi);
    let sum = 0, cnt = 0;
    for (let k = 0; k < nR; k++) {
      const r = r1 + ((r2 - r1) * (k + 0.5)) / nR;
      const val = sampleBilinear(img, cx + r * c, cy - r * s);
      if (Number.isFinite(val)) { sum += val; cnt++; }
    }
    prof[a] = cnt >= nR / 2 ? sum / cnt : NaN;
  }
  return highpass(prof);
}

/** Remove a tendência lenta (iluminação) com média móvel circular de ±15° e normaliza. */
function highpass(p: Float32Array): Float32Array {
  const n = p.length;
  const out = new Float32Array(n);
  const half = Math.round(15 / DEG_PER_BIN);
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(p[i])) { out[i] = NaN; continue; }
    let s = 0, c = 0;
    for (let k = -half; k <= half; k++) {
      const v = p[(i + k + n) % n];
      if (Number.isFinite(v)) { s += v; c++; }
    }
    out[i] = p[i] - s / c;
  }
  let m = 0, c = 0;
  for (const v of out) if (Number.isFinite(v)) { m += v; c++; }
  m /= c || 1;
  let sd = 0;
  for (const v of out) if (Number.isFinite(v)) sd += (v - m) ** 2;
  sd = Math.sqrt(sd / (c || 1)) || 1;
  for (let i = 0; i < n; i++) out[i] = (out[i] - m) / sd;
  return out;
}

/** Correlação normalizada entre cur[i] e ref[i - s]. */
function corrAt(ref: Float32Array, cur: Float32Array, s: number): number {
  const n = ref.length;
  let sxy = 0, sxx = 0, syy = 0, c = 0;
  for (let i = 0; i < n; i++) {
    const x = cur[i], y = ref[(i - s + n) % n];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    sxy += x * y; sxx += x * x; syy += y * y; c++;
  }
  if (c < n * 0.25 || sxx === 0 || syy === 0) return -1;
  return sxy / Math.sqrt(sxx * syy);
}

/** Deslocamento angular (graus) do perfil atual em relação à referência. */
export function angularShift(ref: Float32Array, cur: Float32Array, maxShiftDeg = 20): { shift: number; corr: number } {
  const m = Math.round(maxShiftDeg / DEG_PER_BIN);
  let best = -Infinity, bs = 0;
  const cs: number[] = [];
  for (let s = -m; s <= m; s++) {
    const c = corrAt(ref, cur, s);
    cs.push(c);
    if (c > best) { best = c; bs = s; }
  }
  let frac = 0;
  const k = bs + m;
  if (k > 0 && k < cs.length - 1) {
    const y0 = cs[k - 1], y1 = cs[k], y2 = cs[k + 1];
    const den = y0 - 2 * y1 + y2;
    if (den < 0) frac = Math.max(-0.5, Math.min(0.5, (0.5 * (y0 - y2)) / den));
  }
  return { shift: (bs + frac) * DEG_PER_BIN, corr: best };
}

/** Seguidor de torção com re-referenciação automática quando a correlação degrada. */
export class TorsionTracker {
  private ref: Float32Array | null = null;
  private offset = 0;
  constructor(private minCorr = 0.45, private rerefCorr = 0.7, private maxShift = 20) {}

  reset() { this.ref = null; this.offset = 0; }

  /** Devolve a torção acumulada (graus) ou NaN se a medição não for fiável. */
  update(profile: Float32Array): number {
    if (!this.ref) { this.ref = profile; this.offset = 0; return 0; }
    const { shift, corr } = angularShift(this.ref, profile, this.maxShift);
    if (corr < this.minCorr) return NaN;
    const total = this.offset + shift;
    if (corr < this.rerefCorr || Math.abs(shift) > this.maxShift * 0.6) {
      this.ref = profile;
      this.offset = total;
    }
    return total;
  }
}
