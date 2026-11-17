/**
 * Assistente de diagnóstico da VPPB: converte as observações guiadas (Dix-Hallpike e supine roll test)
 * em características de nistagmo e reutiliza o motor clínico do exame.
 */
import type { Exam, NystagmusFeatures, Side, TestId } from '../types';
import { emptyFeatures } from '../analysis/nystagmus';
import { evaluate, type EngineOutput } from './engine';

export type DhFinding = 'none' | 'up-geo' | 'up-apo' | 'down' | 'horiz-geo' | 'horiz-apo' | 'unk';
export type RollFinding = 'none' | 'geo' | 'apo' | 'fixed-right' | 'fixed-left' | 'unk';

export interface WizardAnswers {
  dhRight: DhFinding;
  dhLeft: DhFinding;
  dhDuration: 'short' | 'long'; // < 60 s ou > 60 s (no lado positivo)
  dhLatency: 'yes' | 'no';
  roll: { right: RollFinding; left: RollFinding };
  rollStronger: 'right' | 'left' | 'equal';
  rollDuration: 'short' | 'long';
  spontaneous: 'none' | 'horizontal' | 'vertical';
  redFlags: boolean;
}

export const defaultAnswers = (): WizardAnswers => ({
  dhRight: 'unk', dhLeft: 'unk', dhDuration: 'short', dhLatency: 'yes',
  roll: { right: 'unk', left: 'unk' }, rollStronger: 'equal', rollDuration: 'short', spontaneous: 'none', redFlags: false,
});

const base = (p: Partial<NystagmusFeatures>): NystagmusFeatures => ({ ...emptyFeatures(), present: true, confidence: 1, crescendoDecrescendo: true, edited: true, ...p });

function dhFeatures(f: DhFinding, down: Side, a: WizardAnswers): NystagmusFeatures | undefined {
  if (f === 'unk') return undefined;
  if (f === 'none') return { ...emptyFeatures(), confidence: 1, edited: true };
  const other: Side = down === 'right' ? 'left' : 'right';
  const long = a.dhDuration === 'long';
  const timing = { latency: a.dhLatency === 'yes' ? 3 : 0, duration: long ? 90 : 20, persistent: long, crescendoDecrescendo: !long };
  switch (f) {
    case 'up-geo': return base({ vertical: 'up', torsional: down, peakSpvV: 10, peakSpvT: 15, ...timing });
    case 'up-apo': return base({ vertical: 'up', torsional: other, peakSpvV: 10, peakSpvT: 15, ...timing });
    case 'down': return base({ vertical: 'down', torsional: 'none', peakSpvV: 8, ...timing });
    case 'horiz-geo': return base({ horizontal: down, peakSpvH: 12, ...timing });
    case 'horiz-apo': return base({ horizontal: other, peakSpvH: 12, ...timing });
  }
}

function rollFeatures(f: RollFinding, down: Side, a: WizardAnswers): NystagmusFeatures | undefined {
  if (f === 'unk') return undefined;
  if (f === 'none') return { ...emptyFeatures(), confidence: 1, edited: true };
  const other: Side = down === 'right' ? 'left' : 'right';
  const strong = a.rollStronger === down ? 20 : a.rollStronger === 'equal' ? 14 : 8;
  const long = a.rollDuration === 'long';
  const timing = { latency: long ? 0 : 2, duration: long ? 90 : 25, persistent: long, crescendoDecrescendo: !long };
  switch (f) {
    case 'geo': return base({ horizontal: down, peakSpvH: strong, ...timing });
    case 'apo': return base({ horizontal: other, peakSpvH: strong, ...timing });
    case 'fixed-right': return base({ horizontal: 'right', peakSpvH: strong, ...timing, crescendoDecrescendo: false });
    case 'fixed-left': return base({ horizontal: 'left', peakSpvH: strong, ...timing, crescendoDecrescendo: false });
  }
}

export function wizardExam(a: WizardAnswers): Exam {
  const tests: Exam['tests'] = {};
  const put = (id: TestId, f?: NystagmusFeatures) => { if (f) tests[id] = { id, features: f }; };
  put('dh-right', dhFeatures(a.dhRight, 'right', a));
  put('dh-left', dhFeatures(a.dhLeft, 'left', a));
  put('roll-right', rollFeatures(a.roll.right, 'right', a));
  put('roll-left', rollFeatures(a.roll.left, 'left', a));
  if (a.spontaneous !== 'none') put('spontaneous', base(a.spontaneous === 'vertical' ? { vertical: 'down', persistent: true, latency: 0, duration: 60 } : { horizontal: 'right', persistent: true, latency: 0, duration: 60 }));
  return {
    id: 'wizard', label: 'Assistente VPPB', createdAt: new Date().toISOString(), tests,
    redFlags: { neuroSymptoms: a.redFlags, severeHeadache: false, cannotWalk: false, hearingLossAcute: false, vascularRisk: false },
  };
}

export function runWizard(a: WizardAnswers): EngineOutput {
  return evaluate(wizardExam(a));
}
