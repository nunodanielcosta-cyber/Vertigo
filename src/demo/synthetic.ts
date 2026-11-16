import type { EyeSample, Recording } from '../types';

/**
 * Gerador de nistagmo sintético em dente de serra, para demonstração e testes.
 * As SPV são dadas como velocidade da FASE LENTA (°/s) por componente;
 * a direção do nistagmo (fase rápida) é oposta.
 */
export interface SyntheticSpec {
  duration: number; // s total da gravação
  t0: number; // posição atingida
  /** velocidade da fase lenta de pico (°/s) — sinal no referencial do doente */
  spvH: number;
  spvV: number;
  spvT: number;
  latency: number; // s após t0
  nystDuration: number; // s (Infinity = persistente)
  /** amplitude da fase rápida que dispara o reset (°) */
  beatAmplitude?: number;
  envelope?: 'crescendo-decrescendo' | 'constant';
  noise?: number; // desvio-padrão do ruído de posição (°)
  torNoise?: number;
  fs?: number;
  blinkEvery?: number; // s entre pestanejos (0 = nenhum)
  seed?: number;
  /** inverte H a meio (nistagmo que muda de direção) */
  reverseAt?: number;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export function generateSynthetic(spec: SyntheticSpec): Recording {
  const fs = spec.fs ?? 30;
  const rand = rng(spec.seed ?? 42);
  const gauss = () => {
    const u = Math.max(1e-9, rand()), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const noise = spec.noise ?? 0.15;
  const torNoise = spec.torNoise ?? 0.3;
  const amp = spec.beatAmplitude ?? 2.5;
  const onset = spec.t0 + spec.latency;
  const offset = onset + spec.nystDuration;
  const samples: EyeSample[] = [];
  let h = 0, v = 0, tor = 0;
  let blinkUntil = -1;
  const peakTotal = Math.hypot(spec.spvH, spec.spvV, spec.spvT) || 1;
  for (let i = 0; i < spec.duration * fs; i++) {
    const t = i / fs;
    let env = 0;
    if (t >= onset && t < offset) {
      if (spec.envelope === 'constant' || !Number.isFinite(spec.nystDuration)) env = 1;
      else {
        const x = (t - onset) / spec.nystDuration; // 0..1
        env = x < 0.3 ? 0.25 + 0.75 * (x / 0.3) : 1 - 0.85 * ((x - 0.3) / 0.7);
      }
    }
    const rev = spec.reverseAt !== undefined && t > spec.reverseAt ? -1 : 1;
    h += (rev * spec.spvH * env) / fs;
    v += (spec.spvV * env) / fs;
    tor += (spec.spvT * env) / fs;
    // fase rápida quando o deslocamento total (em relação ao centro) excede a amplitude
    const disp = Math.hypot(h, v, tor);
    if (env > 0 && disp > amp * (peakTotal / Math.max(peakTotal, 1)) * (0.8 + 0.4 * rand())) {
      h = -h * 0.3; v = -v * 0.3; tor = -tor * 0.3;
    }
    if (spec.blinkEvery && rand() < 1 / (spec.blinkEvery * fs)) blinkUntil = t + 0.2;
    const blink = t < blinkUntil;
    samples.push({
      t,
      h: h + noise * gauss(),
      v: v + noise * gauss(),
      tor: tor + torNoise * gauss(),
      valid: !blink,
    });
  }
  return { samples, t0: spec.t0, source: 'synthetic', mode: 'synthetic', fps: fs, torsionAvailable: true };
}

/** Cenários de demonstração: VPPB do canal posterior direito. */
export const DEMO_SCENARIOS: Record<string, { label: string; tests: Record<string, SyntheticSpec | null> }> = {
  'pc-right': {
    label: 'VPPB canal posterior direito (canalolitíase)',
    tests: {
      'dh-right': { duration: 45, t0: 3, spvH: 0, spvV: -8, spvT: -12, latency: 4, nystDuration: 22, seed: 1, blinkEvery: 6 },
      'dh-left': { duration: 35, t0: 3, spvH: 0, spvV: 0, spvT: 0, latency: 0, nystDuration: 0, seed: 2, blinkEvery: 6 },
    },
  },
  'hc-geo-left': {
    label: 'VPPB canal horizontal esquerdo, geotrópico',
    tests: {
      'roll-right': { duration: 40, t0: 2, spvH: -9, spvV: 0, spvT: 0, latency: 1, nystDuration: 25, seed: 3 },
      'roll-left': { duration: 40, t0: 2, spvH: 18, spvV: 0, spvT: 0, latency: 1, nystDuration: 30, seed: 4 },
    },
  },
  'central-dbn': {
    label: 'Nistagmo posicional central (downbeat persistente)',
    tests: {
      'dh-right': { duration: 40, t0: 3, spvH: 0, spvV: 6, spvT: 0, latency: 0, nystDuration: Infinity, envelope: 'constant', seed: 5 },
      'dh-left': { duration: 40, t0: 3, spvH: 0, spvV: 6, spvT: 0, latency: 0, nystDuration: Infinity, envelope: 'constant', seed: 6 },
    },
  },
};
