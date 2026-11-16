import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/clinical/engine';
import { emptyFeatures } from '../src/analysis/nystagmus';
import type { Exam, NystagmusFeatures, TestId } from '../src/types';

const F = (p: Partial<NystagmusFeatures>): NystagmusFeatures => ({ ...emptyFeatures(), present: true, latency: 3, duration: 20, crescendoDecrescendo: true, confidence: 1, ...p });
const exam = (tests: Partial<Record<TestId, NystagmusFeatures>>): Exam => ({
  id: 'x', label: 'x', createdAt: '',
  tests: Object.fromEntries(Object.entries(tests).map(([k, f]) => [k, { id: k as TestId, features: f }])),
  redFlags: { neuroSymptoms: false, severeHeadache: false, cannotWalk: false, hearingLossAcute: false, vascularRisk: false },
});

describe('motor clínico', () => {
  it('CP direito canalolitíase → Epley direita', () => {
    const o = evaluate(exam({ 'dh-right': F({ vertical: 'up', torsional: 'right', peakSpvV: 8, peakSpvT: 12 }), 'dh-left': emptyFeatures() }));
    expect(o.hypotheses[0].id).toBe('pc-canalo-right');
    expect(o.hypotheses[0].likelihood).toBe('alta');
    expect(o.hypotheses[0].maneuvers[0].id).toBe('epley-right');
  });
  it('CP esquerdo persistente → cupulolitíase, Semont esquerda', () => {
    const o = evaluate(exam({ 'dh-left': F({ vertical: 'up', torsional: 'left', persistent: true, duration: 75 }) }));
    expect(o.hypotheses[0].id).toBe('pc-cupulo-left');
    expect(o.hypotheses[0].maneuvers[0].id).toBe('semont-left');
  });
  it('CH geotrópico: lado mais intenso é o afetado', () => {
    const o = evaluate(exam({ 'roll-right': F({ horizontal: 'right', peakSpvH: 8 }), 'roll-left': F({ horizontal: 'left', peakSpvH: 18 }) }));
    expect(o.hypotheses[0].id).toBe('hc-geo-left');
    expect(o.hypotheses[0].maneuvers[0].id).toBe('lempert-left');
  });
  it('CH apogeotrópico: lado menos intenso é o afetado', () => {
    const o = evaluate(exam({ 'roll-right': F({ horizontal: 'left', peakSpvH: 20 }), 'roll-left': F({ horizontal: 'right', peakSpvH: 9 }) }));
    expect(o.hypotheses.find((h) => h.category === 'vppb')!.id).toBe('hc-apo-left');
  });
  it('direção fixa no roll test não é VPPB', () => {
    const o = evaluate(exam({ 'roll-right': F({ horizontal: 'left', peakSpvH: 5 }), 'roll-left': F({ horizontal: 'left', peakSpvH: 9 }) }));
    expect(o.hypotheses.some((h) => h.id === 'direction-fixed')).toBe(true);
  });
  it('downbeat posicional puro → alerta central', () => {
    const o = evaluate(exam({ 'dh-right': F({ vertical: 'down', torsional: 'none', persistent: true, latency: 0 }) }));
    expect(o.redFlags.length).toBeGreaterThan(0);
    expect(o.hypotheses[0].category).toBe('central');
  });
  it('nistagmo evocado pelo olhar com direção alternante → central', () => {
    const o = evaluate(exam({ 'gaze-right': F({ horizontal: 'right' }), 'gaze-left': F({ horizontal: 'left' }) }));
    expect(o.hypotheses[0].id).toBe('central-gaze');
  });
  it('DH negativo bilateral sugere roll test', () => {
    const o = evaluate(exam({ 'dh-right': emptyFeatures(), 'dh-left': emptyFeatures() }));
    expect(o.nextSteps.join(' ')).toMatch(/roll test/);
  });
});
