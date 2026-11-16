import type {
  AnalysisResult,
  FastPhase,
  HDir,
  NystagmusFeatures,
  Recording,
  TDir,
  VDir,
  WindowStat,
} from '../types';
import { fwdDiff, median, medianOnly, resample, robustSigma, smooth } from './signal';

export interface AnalysisOptions {
  /** frequência de reamostragem (Hz) */
  fs: number;
  /** limiar mínimo de velocidade para fase rápida (°/s) */
  minFastVel: number;
  /** SPV mínima para considerar nistagmo (°/s) */
  minSpv: number;
  /** janela de análise (s) */
  window: number;
  /** passo entre janelas (s) */
  step: number;
}

export const DEFAULT_OPTIONS: AnalysisOptions = {
  fs: 30,
  minFastVel: 20,
  minSpv: 2,
  window: 2,
  step: 0.5,
};

const ZERO_FEATURES: NystagmusFeatures = {
  present: false,
  horizontal: 'none',
  vertical: 'none',
  torsional: 'none',
  peakSpvH: 0,
  peakSpvV: 0,
  peakSpvT: 0,
  latency: null,
  duration: null,
  persistent: false,
  crescendoDecrescendo: false,
  directionChangesInPosition: false,
  frequency: 0,
  confidence: 0,
};

export function emptyFeatures(): NystagmusFeatures {
  return { ...ZERO_FEATURES };
}

/**
 * Analisa uma gravação de movimentos oculares e extrai as características do nistagmo.
 *
 * Abordagem:
 *  1. Reamostragem uniforme, filtragem leve e cálculo de velocidade por componente.
 *  2. Deteção de fases rápidas como picos de velocidade (limiar adaptativo: mediana + 5·σ robusto).
 *  3. Em janelas deslizantes, a SPV de cada componente é a MEDIANA da velocidade fora das
 *     fases rápidas — como a fase lenta ocupa a maior parte do tempo, a mediana é um
 *     estimador robusto da velocidade da fase lenta.
 *  4. Uma janela é "ativa" quando a SPV dominante é significativa e há fases rápidas
 *     em sentido oposto (padrão em dente de serra).
 *  5. A partir das janelas ativas: latência, duração, direção, perfil temporal.
 */
export function analyzeRecording(rec: Recording, opts: Partial<AnalysisOptions> = {}): AnalysisResult {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const notes: string[] = [];
  const sig = resample(rec.samples, o.fs);
  const n = sig.t.length;
  if (n < o.fs * 2) {
    return {
      features: emptyFeatures(),
      fastPhases: [],
      windows: [],
      t: sig.t,
      h: sig.h,
      v: sig.v,
      tor: sig.tor,
      validFraction: 0,
      notes: ['Gravação demasiado curta para análise (mínimo 2 s).'],
    };
  }
  const validFraction = sig.valid.filter(Boolean).length / n;
  const torFraction = sig.torValid.filter(Boolean).length / n;
  const useTorsion = rec.torsionAvailable && torFraction > 0.4;
  if (rec.torsionAvailable && !useTorsion) notes.push('Componente torsional com qualidade insuficiente — não avaliado.');
  if (validFraction < 0.6) notes.push(`Apenas ${(validFraction * 100).toFixed(0)}% do sinal é válido (pestanejo / perda de tracking).`);

  const h = smooth(sig.h, sig.valid);
  const v = smooth(sig.v, sig.valid);
  const tor = smooth(sig.tor, sig.torValid);

  // ---- 1. fases rápidas ----
  // Deteção sobre a diferença amostra-a-amostra do sinal só com filtro de mediana
  // (a 30 fps uma fase rápida dura 1–2 frames: suavizar mais esbateria o salto).
  const hm = medianOnly(sig.h, sig.valid);
  const vm = medianOnly(sig.v, sig.valid);
  const tm = medianOnly(sig.tor, sig.torValid);
  const dH = fwdDiff(hm, sig.valid, o.fs);
  const dV = fwdDiff(vm, sig.valid, o.fs);
  const dT = useTorsion ? fwdDiff(tm, sig.torValid, o.fs) : new Array<number>(n).fill(NaN);
  // normaliza cada componente pelo seu ruído (σ robusto) — a torção é tipicamente mais ruidosa
  const sH = Math.max(robustSigma(dH), 1e-6);
  const sV = Math.max(robustSigma(dV), 1e-6);
  const sT = Math.max(robustSigma(dT), 1e-6);
  const mH0 = median(dH), mV0 = median(dV), mT0 = median(dT);
  const z = dH.map((x, k) => {
    if (!Number.isFinite(x) || !Number.isFinite(dV[k])) return NaN;
    const a = (x - mH0) / sH, b = (dV[k] - mV0) / sV;
    const c = Number.isFinite(dT[k]) ? (dT[k] - mT0) / sT : 0;
    return Math.sqrt(a * a + b * b + c * c);
  });
  const absSpeed = dH.map((x, k) => Math.hypot(x, dV[k], Number.isFinite(dT[k]) ? dT[k] : 0));
  const isFastSample = (k: number) => z[k] > 5 && absSpeed[k] > o.minFastVel;
  const isFast = new Array<boolean>(n).fill(false);
  const fastPhases: FastPhase[] = [];
  let i = 0;
  while (i < n - 1) {
    if (isFastSample(i)) {
      let j = i;
      while (j + 1 < n - 1 && isFastSample(j + 1)) j++;
      // segmento de deslocamento: de i (antes) a j+1 (depois)
      const a = i, b = j + 1;
      for (let k = a; k <= j; k++) isFast[k] = true;
      const dur = (b - a) / o.fs;
      if (dur <= 0.2 && sig.valid[a] && sig.valid[b]) {
        fastPhases.push({
          t: (sig.t[a] + sig.t[b]) / 2,
          dh: hm[b] - hm[a],
          dv: vm[b] - vm[a],
          dt: useTorsion && sig.torValid[a] && sig.torValid[b] ? tm[b] - tm[a] : 0,
        });
      }
      i = j + 1;
    } else i++;
  }

  // velocidade de fase lenta por amostra: média de 3 diferenças progressivas vizinhas,
  // só onde nenhuma é fase rápida (reduz ruído sem contaminar com os saltos)
  const slowVel = (d: number[]) => d.map((_, k) => {
    if (k < 1 || k >= n - 1 || isFast[k - 1] || isFast[k] || isFast[k + 1]) return NaN;
    const x = d[k - 1], y = d[k], w = d[k + 1];
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) ? (x + y + w) / 3 : NaN;
  });
  // (sobre o sinal NÃO filtrado: o filtro de mediana cria patamares que enviesam a mediana da velocidade para zero)
  const vh = slowVel(fwdDiff(sig.h, sig.valid, o.fs));
  const vv = slowVel(fwdDiff(sig.v, sig.valid, o.fs));
  const vt = useTorsion ? slowVel(fwdDiff(sig.tor, sig.torValid, o.fs)) : new Array<number>(n).fill(NaN);

  // ---- 2. janelas ----
  const windows: WindowStat[] = [];
  const half = o.window / 2;
  const tStart = sig.t[0];
  const tEnd = sig.t[n - 1];
  for (let c = tStart + half; c <= tEnd - half + 1e-9; c += o.step) {
    const ia = Math.max(0, Math.round((c - half - tStart) * o.fs));
    const ib = Math.min(n - 1, Math.round((c + half - tStart) * o.fs));
    // SPV a partir da diferença progressiva do sinal só com mediana (sem espalhar os saltos)
    const sh: number[] = [], sv: number[] = [], st: number[] = [];
    for (let k = ia; k <= ib; k++) {
      if (isFast[k]) continue;
      if (Number.isFinite(vh[k])) sh.push(vh[k]);
      if (Number.isFinite(vv[k])) sv.push(vv[k]);
      if (Number.isFinite(vt[k])) st.push(vt[k]);
    }
    const len = ib - ia + 1;
    const spvH = sh.length > len * 0.2 ? median(sh) : 0;
    const spvV = sv.length > len * 0.2 ? median(sv) : 0;
    const spvT = st.length > len * 0.2 ? median(st) : 0;
    // erro-padrão da mediana ≈ 1.253·σ/√n
    const seH = sh.length ? (1.253 * robustSigma(sh)) / Math.sqrt(sh.length) : Infinity;
    const seV = sv.length ? (1.253 * robustSigma(sv)) / Math.sqrt(sv.length) : Infinity;
    const seT = st.length ? (1.253 * robustSigma(st)) / Math.sqrt(st.length) : Infinity;
    const comps = [
      { spv: spvH, se: seH, key: 'dh' as const },
      { spv: spvV, se: seV, key: 'dv' as const },
      { spv: spvT, se: seT, key: 'dt' as const },
    ];
    const dom = comps.reduce((p, q) => (Math.abs(q.spv) > Math.abs(p.spv) ? q : p));
    // batimentos coerentes: fase rápida com sentido oposto à fase lenta dominante
    const fp = fastPhases.filter((f) => f.t >= c - half && f.t <= c + half);
    const beats = fp.filter((f) => f[dom.key] * dom.spv < 0 && Math.abs(f[dom.key]) > 0.3).length;
    const significant = Math.abs(dom.spv) >= o.minSpv && Math.abs(dom.spv) > 3 * dom.se;
    windows.push({ t: c, spvH, spvV, spvT, beats, active: significant && beats >= 1 });
  }

  // limpa janelas ativas isoladas (exige ≥2 consecutivas)
  for (let k = 0; k < windows.length; k++) {
    if (!windows[k].active) continue;
    const prev = windows[k - 1]?.active;
    const next = windows[k + 1]?.active;
    if (!prev && !next) windows[k].active = false;
  }

  const features = deriveFeatures(windows, fastPhases, rec, o, useTorsion, tEnd, validFraction);
  if (rec.t0 > tStart + 0.5) notes.push(`Análise considerada a partir de t0 = ${rec.t0.toFixed(1)} s (posição atingida).`);

  return { features, fastPhases, windows, t: sig.t, h, v, tor, validFraction, notes };
}

function deriveFeatures(
  windows: WindowStat[],
  fastPhases: FastPhase[],
  rec: Recording,
  o: AnalysisOptions,
  useTorsion: boolean,
  tEnd: number,
  validFraction: number,
): NystagmusFeatures {
  const f = emptyFeatures();
  const w = windows.filter((x) => x.t >= rec.t0);
  const act = w.filter((x) => x.active);
  if (act.length === 0) {
    f.torsional = useTorsion ? 'none' : 'unknown';
    f.confidence = Math.min(1, validFraction);
    return f;
  }
  f.present = true;
  const mean = (k: 'spvH' | 'spvV' | 'spvT') => act.reduce((s, x) => s + x[k], 0) / act.length;
  const mH = mean('spvH'), mV = mean('spvV'), mT = mean('spvT');
  const dom = Math.max(Math.abs(mH), Math.abs(mV), Math.abs(mT));
  const compThr = Math.max(o.minSpv * 0.75, dom * 0.25);
  // direção da fase rápida = oposta à fase lenta
  f.horizontal = (Math.abs(mH) >= compThr ? (mH < 0 ? 'right' : 'left') : 'none') as HDir;
  f.vertical = (Math.abs(mV) >= compThr ? (mV < 0 ? 'up' : 'down') : 'none') as VDir;
  f.torsional = (!useTorsion ? 'unknown' : Math.abs(mT) >= compThr ? (mT < 0 ? 'right' : 'left') : 'none') as TDir;
  const peak = (k: 'spvH' | 'spvV' | 'spvT', m: number) =>
    act.reduce((p, x) => (Math.sign(x[k]) === Math.sign(m) ? Math.max(p, Math.abs(x[k])) : p), 0);
  f.peakSpvH = round1(peak('spvH', mH));
  f.peakSpvV = round1(peak('spvV', mV));
  f.peakSpvT = useTorsion ? round1(peak('spvT', mT)) : 0;

  // início / fim
  const half = o.window / 2;
  const onset = Math.max(rec.t0, act[0].t - half);
  const end = Math.min(tEnd, act[act.length - 1].t + half);
  f.latency = round1(Math.max(0, onset - rec.t0));
  f.duration = round1(end - onset);
  f.persistent = act[act.length - 1].t + half >= tEnd - o.step - 1e-6;

  // perfil temporal: intensidade = SPV total na janela
  const span = w.filter((x) => x.t >= act[0].t && x.t <= act[act.length - 1].t);
  const inten = span.map((x) => Math.hypot(x.spvH, x.spvV, x.spvT));
  if (inten.length >= 4) {
    let pk = 0;
    inten.forEach((x, k) => { if (x > inten[pk]) pk = k; });
    const first = inten[0], last = inten[inten.length - 1];
    const rise = pk > 0 && inten[pk] >= 1.4 * first;
    const fall = pk < inten.length - 1 && (inten[pk] >= 1.4 * last || !f.persistent);
    f.crescendoDecrescendo = rise && fall && !f.persistent;
  }

  // mudança de direção dentro da mesma posição (H ou V)
  const changes = (k: 'spvH' | 'spvV') => {
    const strong = act.filter((x) => Math.abs(x[k]) >= Math.max(o.minSpv, dom * 0.3));
    const pos = strong.filter((x) => x[k] > 0).length;
    const neg = strong.filter((x) => x[k] < 0).length;
    return pos >= 2 && neg >= 2;
  };
  f.directionChangesInPosition = changes('spvH') || changes('spvV');

  const beats = fastPhases.filter((x) => x.t >= onset && x.t <= end).length;
  f.frequency = round1(f.duration > 0 ? beats / f.duration : 0);

  // confiança: qualidade do sinal × relação sinal/ruído × número de janelas ativas
  const snr = dom / o.minSpv;
  f.confidence = round2(Math.min(1, validFraction) * Math.min(1, snr / 4) * Math.min(1, act.length / 6));
  return f;
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const round2 = (x: number) => Math.round(x * 100) / 100;
