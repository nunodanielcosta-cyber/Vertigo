import { describe, it, expect } from 'vitest';
import { evaluateHints } from '../src/clinical/hints';
import { abcd2, triage, type TriageInput } from '../src/clinical/triage';
import { evaluateIcvd, evaluateDx, DIAGNOSES, questionsFor } from '../src/clinical/icvd';
import { getScale } from '../src/clinical/scales';
import { caloric, vhit, vemp, integrate } from '../src/clinical/labtests';
import { stage, vertigoClass, pta4 } from '../src/clinical/meniere';
import { gravityInHead, keyframesFor } from '../src/clinical/poses';
import { runWizard, defaultAnswers } from '../src/clinical/bppvWizard';
import { svvStats, swayMetrics, optotypeMm } from '../src/clinical/sensorMetrics';
import { prophylaxisResponse, factorAssociation, type Attack, type DayLog } from '../src/clinical/diary';

describe('HINTS', () => {
  it('padrão periférico completo', () => {
    const r = evaluateHints({ continuousVertigo: true, hit: 'abnormal-unilateral', nystagmus: 'unidirectional-horizontal', skew: 'absent', hearing: 'none' });
    expect(r.verdict).toBe('peripheral');
  });
  it('HIT normal → central', () => {
    expect(evaluateHints({ continuousVertigo: true, hit: 'normal-bilateral', nystagmus: 'unidirectional-horizontal', skew: 'absent', hearing: 'none' }).verdict).toBe('central');
  });
  it('hipoacusia nova (HINTS+) → central mesmo com HIT alterado', () => {
    expect(evaluateHints({ continuousVertigo: true, hit: 'abnormal-unilateral', nystagmus: 'unidirectional-horizontal', skew: 'absent', hearing: 'new-loss' }).verdict).toBe('central');
  });
  it('incompleto → indeterminado', () => {
    expect(evaluateHints({ continuousVertigo: true, hit: 'abnormal-unilateral', nystagmus: 'unk', skew: 'absent', hearing: 'unk' }).verdict).toBe('indeterminate');
  });
});

describe('Triagem', () => {
  const base: TriageInput = {
    timing: 'acute-continuous',
    hints: { continuousVertigo: true, hit: 'abnormal-unilateral', nystagmus: 'unidirectional-horizontal', skew: 'absent', hearing: 'none' },
    abcd2: { age60: false, bp140: false, clinical: 'none', duration: '>=60', diabetes: false },
    gait: 1,
    redFlags: { suddenHeadache: false, neuroDeficit: false, ataxia: false, consciousness: false, trauma: false, anticoag: false },
    vascular: { hypertension: false, diabetes: false, smoking: false, dyslipidemia: false, atrialFib: false, priorStroke: false },
    positionalTypical: false,
  };
  it('ABCD2', () => {
    expect(abcd2({ age60: true, bp140: true, clinical: 'weakness', duration: '>=60', diabetes: true }).score).toBe(7);
  });
  it('periférico sem alarmes → padrão', () => expect(triage(base).level).toBe('standard'));
  it('marcha grau 3 → emergente', () => expect(triage({ ...base, gait: 3 }).level).toBe('emergent'));
  it('cefaleia súbita → emergente', () => expect(triage({ ...base, redFlags: { ...base.redFlags, suddenHeadache: true } }).level).toBe('emergent'));
});

describe('ICVD', () => {
  it('Ménière definitiva', () => {
    const r = evaluateIcvd('episodic-spontaneous', { men_v12: 'yes', men_audio: 'yes', men_aural: 'yes', other: 'no' });
    expect(r[0].dx.id).toBe('meniere');
    expect(r[0].status).toBe('definite');
  });
  it('Ménière provável sem audiograma', () => {
    const dx = DIAGNOSES.find((d) => d.id === 'meniere')!;
    expect(evaluateDx(dx, { men_v24: 'yes', men_aural: 'yes', men_audio: 'no', other: 'no' }).status).toBe('probable');
  });
  it('migrânea vestibular provável', () => {
    const dx = DIAGNOSES.find((d) => d.id === 'vm')!;
    expect(evaluateDx(dx, { vm_5: 'yes', vm_mig: 'no', vm_feat: 'yes', other: 'no' }).status).toBe('probable');
  });
  it('critério negado → não cumprido', () => {
    const dx = DIAGNOSES.find((d) => d.id === 'pppd')!;
    expect(evaluateDx(dx, { pppd_3m: 'no' }).status).toBe('unlikely');
  });
  it('perguntas por padrão terminam no critério comum', () => {
    const q = questionsFor('chronic');
    expect(q[q.length - 1].id).toBe('other');
    expect(q.some((x) => x.id === 'bvp_lab')).toBe(true);
  });
});

describe('Escalas', () => {
  it('DHI total e subescalas', () => {
    const s = getScale('dhi')!;
    const r = s.score(new Array(25).fill(4));
    expect(r.total).toBe(100);
    expect(r.subs[0].value).toBe('28/28');
  });
  it('MSSQ corrige itens não experimentados', () => {
    const s = getScale('mssq')!;
    const v = [3, 3, 3, -1, -1, -1, -1, -1, -1, ...new Array(9).fill(0)];
    expect(s.score(v).total).toBe(27);
  });
  it('Berg risco', () => {
    expect(getScale('berg')!.score(new Array(14).fill(3)).total).toBe(42);
  });
});

describe('Provas', () => {
  it('Jongkees: paresia direita', () => {
    const r = caloric({ rw: 5, rc: 5, lw: 20, lc: 20 });
    expect(Math.round(r.uw)).toBe(60);
    expect(r.weakSide).toBe('right');
  });
  it('preponderância direcional', () => {
    const r = caloric({ rw: 30, rc: 10, lw: 10, lc: 30 });
    expect(r.dpSide).toBe('right');
    expect(r.weakSide).toBe(null);
  });
  it('bilateral', () => expect(caloric({ rw: 2, rc: 2, lw: 2, lc: 1 }).bilateral).toBe(true));
  it('vHIT nevrite superior esquerda', () => {
    const r = vhit({ LH: { gain: 0.4, covert: true, overt: true }, RH: { gain: 0.95, covert: false, overt: false }, LA: { gain: 0.5, covert: false, overt: true }, LP: { gain: 0.9, covert: false, overt: false } });
    expect(r.nerve).toEqual([{ side: 'left', superior: true, inferior: false }]);
  });
  it('VEMP terceira janela', () => {
    const r = vemp({ c: { right: { amp: 200, threshold: 60, absent: false }, left: { amp: 180, threshold: 85, absent: false } }, o: { right: { amp: 25, threshold: null, absent: false }, left: { amp: 8, threshold: null, absent: false } } });
    expect(r.scdSides).toEqual(['right']);
  });
  it('integrado: central prevalece', () => {
    const r = integrate({ caloric: caloric({ rw: 5, rc: 5, lw: 20, lc: 20 }), central: { saccades: true, pursuit: false, gazeNystagmus: false, skew: false, failedFixation: false, verticalNystagmus: false } });
    expect(r.tone).toBe('bad');
  });
});

describe('Ménière AAO-HNS', () => {
  it('estádio e classe', () => {
    expect(stage(pta4(30, 40, 45, 50)).stage).toBe(3);
    expect(vertigoClass(4, 1, false).cls).toBe('B');
    expect(vertigoClass(4, 0, false).cls).toBe('A');
  });
});

describe('Poses (sensores)', () => {
  it('Epley direita passo 2: gravidade aponta para a orelha direita e para o vértex', () => {
    const g = gravityInHead(keyframesFor('epley-right')![1]);
    expect(g[0]).toBeGreaterThan(0.3); // orelha direita para baixo
    expect(g[1]).toBeLessThan(-0.5); // nariz para cima → gravidade para o occipital (−y)
    expect(g[2]).toBeGreaterThan(0.2); // cabeça pendente → componente para o vértex
  });
  it('Epley direita passo 4: nariz para o chão', () => {
    const g = gravityInHead(keyframesFor('epley-right')![3]);
    expect(g[1]).toBeGreaterThan(0.6); // gravidade alinhada com o nariz
  });
});

describe('Assistente VPPB', () => {
  it('DH direito upbeat-geotrópico → Epley direita', () => {
    const o = runWizard({ ...defaultAnswers(), dhRight: 'up-geo', dhLeft: 'none' });
    expect(o.hypotheses[0].maneuvers[0].id).toBe('epley-right');
  });
  it('roll apogeotrópico mais forte à direita → afetado esquerdo', () => {
    const o = runWizard({ ...defaultAnswers(), roll: { right: 'apo', left: 'apo' }, rollStronger: 'right', rollDuration: 'long' });
    expect(o.hypotheses[0].id).toBe('hc-apo-left');
  });
});

describe('Sensores', () => {
  it('VVS', () => {
    expect(svvStats([3, 4, 5])!.abnormal).toBe(true);
    expect(svvStats([1, -1, 0.5])!.abnormal).toBe(false);
  });
  it('oscilação sintética', () => {
    const s = Array.from({ length: 1500 }, (_, i) => ({ t: i / 50, x: 0.1 * Math.sin(i / 50 * 2 * Math.PI), y: 9.8, z: 0.05 * Math.sin(i / 50 * 2 * Math.PI * 1.5) }));
    const m = swayMetrics(s)!;
    expect(m.rmsML).toBeGreaterThan(m.rmsAP);
  });
  it('optótipo 0 logMAR a 40 cm ≈ 0,58 mm', () => expect(optotypeMm(0, 400)).toBeCloseTo(0.58, 1));
});

describe('Diário', () => {
  it('resposta à profilaxia', () => {
    const now = Date.parse('2026-06-01');
    const start = Date.parse('2026-02-01');
    const atk = (t: number): Attack => ({ id: String(t), date: new Date(t).toISOString(), durationMin: 60, severity: 5, kind: 'rotatory', ear: 'none', symptoms: [], triggers: [], meds: '', notes: '' });
    const attacks = [...Array.from({ length: 9 }, (_, i) => atk(start - (i + 1) * 9 * 864e5)), atk(start + 70 * 864e5)];
    const r = prophylaxisResponse({ id: 'p', date: new Date(start).toISOString(), drug: 'x', dose: '', notes: '' }, attacks, now);
    expect(r.reduction!).toBeGreaterThan(50);
  });
  it('associação de fator', () => {
    const days: DayLog[] = ['2026-01-01', '2026-01-03', '2026-01-05', '2026-01-07'].map((d, i) => ({ id: d, date: d, salt: (i % 2 ? 3 : 0) as DayLog['salt'], caffeine: 0, alcohol: 0, stress: 0, sleep: 7, sleepQuality: 5, hearing: 10, tinnitus: 0, fullness: 0, headache: false, menstruation: false, dizziness: 0, notes: '' }));
    const attacks = [{ date: '2026-01-03T10:00:00Z' }, { date: '2026-01-07T10:00:00Z' }] as Attack[];
    const r = factorAssociation(days, attacks, (d) => d.salt >= 2);
    expect(r.rateExposed).toBe(1);
    expect(r.rateUnexposed).toBe(0);
  });
});
