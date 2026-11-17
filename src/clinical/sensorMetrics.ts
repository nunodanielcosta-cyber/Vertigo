/**
 * Métricas das medições com o telemóvel (experimentais): posturografia por acelerómetro,
 * vertical visual subjetiva (VVS) e acuidade visual dinâmica.
 */

/* ---------------- Posturografia ---------------- */
export interface AccSample { t: number; x: number; y: number; z: number }

export interface SwayMetrics {
  n: number;
  duration: number;
  fs: number;
  rmsML: number; // mG
  rmsAP: number; // mG
  rms: number;
  area95: number; // mG² (elipse de confiança a 95 %)
  jerk: number; // mG/s (média do valor absoluto da derivada)
  meanFreq: number; // Hz (frequência média por passagens por zero)
}

const G = 9.80665;

/** Média móvel centrada (passa-baixo simples). */
function smooth(x: number[], w: number) {
  if (w <= 1) return x.slice();
  const h = Math.floor(w / 2);
  const out = new Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let s = 0, n = 0;
    for (let j = Math.max(0, i - h); j <= Math.min(x.length - 1, i + h); j++) { s += x[j]; n++; }
    out[i] = s / n;
  }
  return out;
}

/**
 * Calcula a oscilação a partir da aceleração COM gravidade (m/s²), telemóvel na cintura em retrato
 * (y vertical). ML = eixo x do dispositivo; AP = eixo z. Remove a gravidade/inclinação por média
 * móvel lenta (2 s) e filtra acima de ~5 Hz.
 */
export function swayMetrics(s: AccSample[], trim = 1): SwayMetrics | null {
  const t0 = s.length ? s[0].t + trim : 0;
  const tEnd = s.length ? s[s.length - 1].t - trim : 0;
  const d = s.filter((p) => p.t >= t0 && p.t <= tEnd && Number.isFinite(p.x) && Number.isFinite(p.z));
  if (d.length < 30) return null;
  const duration = d[d.length - 1].t - d[0].t;
  const fs = (d.length - 1) / duration;
  const hp = (arr: number[]) => { const slow = smooth(arr, Math.round(fs * 2)); return smooth(arr.map((v, i) => v - slow[i]), Math.max(1, Math.round(fs / 10))); };
  const ml = hp(d.map((p) => p.x)).map((v) => (v / G) * 1000);
  const ap = hp(d.map((p) => p.z)).map((v) => (v / G) * 1000);
  const rmsOf = (a: number[]) => Math.sqrt(a.reduce((x, v) => x + v * v, 0) / a.length);
  const rmsML = rmsOf(ml), rmsAP = rmsOf(ap);
  // covariância → elipse 95 %: área = π · 5.991 · sqrt(det Σ)
  const n = ml.length;
  const mx = ml.reduce((a, b) => a + b, 0) / n, my = ap.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { const dx = ml[i] - mx, dy = ap[i] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  sxx /= n; syy /= n; sxy /= n;
  const area95 = Math.PI * 5.991 * Math.sqrt(Math.max(0, sxx * syy - sxy * sxy));
  let jerk = 0;
  for (let i = 1; i < n; i++) jerk += Math.hypot(ml[i] - ml[i - 1], ap[i] - ap[i - 1]) * fs;
  jerk /= n - 1;
  const mag = ml.map((v, i) => Math.hypot(v, ap[i]));
  const mm = mag.reduce((a, b) => a + b, 0) / n;
  let zc = 0;
  for (let i = 1; i < n; i++) if ((mag[i - 1] - mm) * (mag[i] - mm) < 0) zc++;
  return { n, duration, fs, rmsML, rmsAP, rms: Math.hypot(rmsML, rmsAP), area95, jerk, meanFreq: zc / 2 / duration };
}

export const MCTSIB = [
  { id: 'eo-firm', name: 'Olhos abertos, superfície firme', short: 'OA firme' },
  { id: 'ec-firm', name: 'Olhos fechados, superfície firme', short: 'OF firme' },
  { id: 'eo-foam', name: 'Olhos abertos, espuma', short: 'OA espuma' },
  { id: 'ec-foam', name: 'Olhos fechados, espuma', short: 'OF espuma' },
] as const;
export type CondId = (typeof MCTSIB)[number]['id'];

/** Interpretação sensorial (padrões tipo SOT) a partir das áreas relativas. */
export function sensoryAnalysis(a: Partial<Record<CondId, number>>) {
  const out: string[] = [];
  const r = (x?: number, y?: number) => (x && y ? y / x : null);
  const romberg = r(a['eo-firm'], a['ec-firm']);
  const vis = r(a['eo-firm'], a['eo-foam']);
  const vest = r(a['eo-firm'], a['ec-foam']);
  if (romberg !== null) out.push(`Quociente de Romberg (OF/OA, firme): ${romberg.toFixed(1).replace('.', ',')}${romberg > 2.5 ? ' — dependência da visão aumentada (somatossensorial/vestibular)' : ''}.`);
  if (vis !== null) out.push(`Espuma/firme (OA): ${vis.toFixed(1).replace('.', ',')}.`);
  if (vest !== null) out.push(`Espuma de olhos fechados / OA firme: ${vest.toFixed(1).replace('.', ',')}${vest > 6 ? ' — padrão de dependência vestibular (a condição 4 depende sobretudo do sistema vestibular)' : ''}.`);
  return out;
}

/* ---------------- VVS ---------------- */
export function svvStats(trials: number[]) {
  const n = trials.length;
  if (!n) return null;
  const mean = trials.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(trials.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  const abnormal = Math.abs(mean) > 2.5;
  const dir = mean > 0 ? 'direita (horário, visto pelo doente)' : 'esquerda (anti-horário, visto pelo doente)';
  return {
    n, mean, sd, abnormal,
    text: abnormal
      ? `Desvio médio de ${Math.abs(mean).toFixed(1).replace('.', ',')}° para a ${dir} — fora do normal (> 2,5°). Na fase aguda de uma lesão vestibular periférica o desvio é habitualmente para o lado lesado; lesões centrais podem desviar para qualquer lado (ipsilateral se bulbo/ponte baixa, contralateral se acima).`
      : `Desvio médio de ${Math.abs(mean).toFixed(1).replace('.', ',')}° — dentro do normal (≤ 2,5°).`,
  };
}

/* ---------------- Acuidade visual dinâmica ---------------- */
/** Tamanho do optótipo (altura da letra E em mm) para um dado logMAR à distância d (mm): 5 minutos de arco × MAR. */
export function optotypeMm(logMAR: number, distMm: number) {
  const mar = Math.pow(10, logMAR); // minutos de arco por traço
  const angle = ((5 * mar) / 60) * (Math.PI / 180);
  return 2 * distMm * Math.tan(angle / 2);
}

export function dvaInterpret(staticLM: number | null, dynamicLM: number | null) {
  if (staticLM === null || dynamicLM === null) return null;
  const loss = dynamicLM - staticLM;
  return {
    loss,
    text: loss >= 0.2
      ? `Perda de ${loss.toFixed(1).replace('.', ',')} logMAR (≥ 0,2 = 2 linhas) com o movimento da cabeça — sugere défice do VOR (oscilopsia).`
      : `Perda de ${loss.toFixed(1).replace('.', ',')} logMAR — dentro do esperado (< 0,2).`,
    abnormal: loss >= 0.2,
  };
}
