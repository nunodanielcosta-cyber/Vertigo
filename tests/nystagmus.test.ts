import { describe, it, expect } from 'vitest';
import { analyzeRecording } from '../src/analysis/nystagmus';
import { generateSynthetic, DEMO_SCENARIOS } from '../src/demo/synthetic';

describe('análise de nistagmo', () => {
  it('deteta nistagmo upbeat + torsional para a direita (VPPB CP direito)', () => {
    const r = analyzeRecording(generateSynthetic(DEMO_SCENARIOS['pc-right'].tests['dh-right']!));
    const f = r.features;
    expect(f.present).toBe(true);
    expect(f.vertical).toBe('up');
    expect(f.torsional).toBe('right');
    expect(f.horizontal).toBe('none');
    expect(f.latency!).toBeGreaterThanOrEqual(2);
    expect(f.latency!).toBeLessThanOrEqual(7);
    expect(f.duration!).toBeGreaterThan(12);
    expect(f.duration!).toBeLessThan(32);
    expect(f.persistent).toBe(false);
    expect(f.crescendoDecrescendo).toBe(true);
    // SPV de pico simulada: V 8 °/s, T 12 °/s
    expect(f.peakSpvT).toBeGreaterThan(8);
    expect(f.peakSpvT).toBeLessThan(14.5);
    expect(f.peakSpvV).toBeGreaterThan(6);
    expect(f.peakSpvV).toBeLessThan(10);
  });

  it('não deteta nistagmo num registo só com ruído', () => {
    const r = analyzeRecording(generateSynthetic(DEMO_SCENARIOS['pc-right'].tests['dh-left']!));
    expect(r.features.present).toBe(false);
  });

  it('nistagmo horizontal geotrópico (bate para a direita)', () => {
    const r = analyzeRecording(generateSynthetic(DEMO_SCENARIOS['hc-geo-left'].tests['roll-right']!));
    expect(r.features.present).toBe(true);
    expect(r.features.horizontal).toBe('right');
    expect(r.features.vertical).toBe('none');
  });

  it('downbeat persistente sem latência', () => {
    const r = analyzeRecording(generateSynthetic(DEMO_SCENARIOS['central-dbn'].tests['dh-right']!));
    expect(r.features.vertical).toBe('down');
    expect(r.features.persistent).toBe(true);
    expect(r.features.latency!).toBeLessThan(2);
    expect(r.features.crescendoDecrescendo).toBe(false);
  });

  it('deteta mudança de direção na mesma posição', () => {
    const r = analyzeRecording(generateSynthetic({ duration: 40, t0: 1, spvH: 8, spvV: 0, spvT: 0, latency: 0, nystDuration: Infinity, envelope: 'constant', reverseAt: 20, seed: 9 }));
    expect(r.features.directionChangesInPosition).toBe(true);
  });

  it('é robusto a ruído maior (tracking por telemóvel)', () => {
    const r = analyzeRecording(generateSynthetic({ duration: 40, t0: 2, spvH: 0, spvV: -6, spvT: -9, latency: 3, nystDuration: 20, noise: 0.4, torNoise: 0.8, seed: 11, blinkEvery: 4 }));
    expect(r.features.present).toBe(true);
    expect(r.features.vertical).toBe('up');
    expect(r.features.torsional).toBe('right');
  });

  it('sem torção disponível → torsional desconhecido', () => {
    const rec = generateSynthetic(DEMO_SCENARIOS['pc-right'].tests['dh-right']!);
    rec.torsionAvailable = false;
    const r = analyzeRecording(rec);
    expect(r.features.torsional).toBe('unknown');
    expect(r.features.vertical).toBe('up');
  });
});
