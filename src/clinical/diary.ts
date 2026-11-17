/**
 * Diário do doente (crises, registo diário, audição, profilaxia) e estatísticas para a consulta.
 */
import type { Rec } from '../core/storage';

export interface Attack extends Rec {
  durationMin: number;
  severity: number; // 0–10
  kind: 'rotatory' | 'unsteady' | 'lightheaded' | 'positional';
  ear: 'none' | 'right' | 'left' | 'both';
  symptoms: string[];
  triggers: string[];
  meds: string;
  notes: string;
  videoId?: string;
}

export interface DayLog extends Rec {
  // date = AAAA-MM-DD
  salt: 0 | 1 | 2 | 3; // 0 baixo … 3 muito alto
  caffeine: number; // chávenas
  alcohol: number; // bebidas
  stress: number; // 0–10
  sleep: number; // horas
  sleepQuality: number; // 0–10
  hearing: number; // 0–10 (10 = ouve normalmente)
  tinnitus: number; // 0–10
  fullness: number; // 0–10
  headache: boolean;
  menstruation: boolean;
  dizziness: number; // 0–10 sintomas de fundo
  notes: string;
}

export interface HearingTest extends Rec {
  /** limiar relativo (dB abaixo do volume máximo do dispositivo; mais negativo = ouve melhor) */
  right: Record<string, number | null>;
  left: Record<string, number | null>;
  device: string;
}

export interface Prophylaxis extends Rec {
  // date = início
  drug: string;
  dose: string;
  end?: string;
  notes: string;
}

export const SYMPTOMS: [string, string][] = [
  ['nausea', 'Náuseas/vómitos'], ['hearing', 'Perda de audição'], ['tinnitus', 'Acufeno'], ['fullness', 'Ouvido tapado'],
  ['headache', 'Cefaleia'], ['photophobia', 'Fotofobia'], ['phonophobia', 'Fonofobia'], ['aura', 'Aura visual'],
  ['oscillopsia', 'Visão a tremer'], ['imbalance', 'Desequilíbrio'], ['anxiety', 'Ansiedade'], ['neuro', 'Visão dupla / fala / fraqueza'],
];

export const TRIGGERS: [string, string][] = [
  ['salt', 'Refeição salgada'], ['caffeine', 'Cafeína'], ['alcohol', 'Álcool'], ['stress', 'Stress'], ['sleep', 'Dormiu mal'],
  ['skipmeal', 'Saltou refeição'], ['menstruation', 'Menstruação'], ['weather', 'Mudança de tempo'], ['screens', 'Ecrãs/luzes'],
  ['food', 'Alimento (chocolate, queijo…)'], ['position', 'Mudança de posição'], ['noise', 'Ruído / sons'], ['travel', 'Viagem/transporte'], ['exercise', 'Esforço físico'],
];

export const KINDS: Record<Attack['kind'], string> = {
  rotatory: 'Vertigem rotatória', unsteady: 'Instabilidade', lightheaded: 'Cabeça leve', positional: 'Posicional (ao deitar/virar)',
};

const DAY = 864e5;

export function attacksBetween(list: Attack[], from: number, to: number) {
  return list.filter((a) => { const t = Date.parse(a.date); return t >= from && t < to; });
}

/** Crises por mês nos últimos n meses (rótulos MM/AA). */
export function monthlyCounts(list: Attack[], months = 6, now = new Date()) {
  const out: { label: string; value: number; meanSev: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
    const a = attacksBetween(list, start, end);
    const d = new Date(start);
    out.push({ label: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`, value: a.length, meanSev: a.length ? a.reduce((s, x) => s + x.severity, 0) / a.length : 0 });
  }
  return out;
}

/** Crises por semana nas últimas n semanas. */
export function weeklyCounts(list: Attack[], weeks = 12, now = Date.now()) {
  const out: { label: string; value: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = now - i * 7 * DAY, start = end - 7 * DAY;
    const d = new Date(start + DAY);
    out.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, value: attacksBetween(list, start, end).length });
  }
  return out;
}

export function triggerFrequency(list: Attack[]) {
  const m = new Map<string, number>();
  for (const a of list) for (const t of a.triggers) m.set(t, (m.get(t) ?? 0) + 1);
  return TRIGGERS.map(([id, label]) => ({ id, label, value: m.get(id) ?? 0 })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
}

/**
 * Associação entre um fator diário e crises no próprio dia ou no seguinte.
 * Devolve a taxa de crises nos dias "expostos" vs "não expostos" (risco relativo).
 */
export function factorAssociation(days: DayLog[], attacks: Attack[], exposed: (d: DayLog) => boolean) {
  const attackDays = new Set(attacks.map((a) => a.date.slice(0, 10)));
  const next = (d: string) => new Date(Date.parse(d) + DAY).toISOString().slice(0, 10);
  let e = 0, eA = 0, u = 0, uA = 0;
  for (const d of days) {
    const hit = attackDays.has(d.date.slice(0, 10)) || attackDays.has(next(d.date.slice(0, 10)));
    if (exposed(d)) { e++; if (hit) eA++; } else { u++; if (hit) uA++; }
  }
  const rE = e ? eA / e : null, rU = u ? uA / u : null;
  return { exposedDays: e, unexposedDays: u, rateExposed: rE, rateUnexposed: rU, rr: rE !== null && rU ? rE / rU : null };
}

/** Resposta à profilaxia: frequência mensal antes (até 90 dias) e depois do início. */
export function prophylaxisResponse(p: Prophylaxis, attacks: Attack[], now = Date.now()) {
  const start = Date.parse(p.date);
  const end = p.end ? Date.parse(p.end) : now;
  const beforeDays = 90;
  const before = attacksBetween(attacks, start - beforeDays * DAY, start).length;
  const afterDays = Math.max(1, (end - start) / DAY);
  // excluir as primeiras 4 semanas (período de titulação) se houver tempo suficiente
  const washIn = afterDays > 56 ? 28 : 0;
  const after = attacksBetween(attacks, start + washIn * DAY, end).length;
  const perMonthBefore = (before / beforeDays) * 30;
  const perMonthAfter = (after / (afterDays - washIn)) * 30;
  const reduction = perMonthBefore > 0 ? (1 - perMonthAfter / perMonthBefore) * 100 : null;
  return {
    perMonthBefore, perMonthAfter, reduction, afterDays,
    verdict: reduction === null ? 'Sem crises registadas antes do início — não é possível calcular a resposta.'
      : afterDays < 56 ? 'Menos de 8 semanas de tratamento: ainda cedo para avaliar a resposta (habitualmente 2–3 meses).'
        : reduction >= 50 ? 'Respondedor (redução ≥ 50 % da frequência mensal).'
          : reduction >= 30 ? 'Resposta parcial (redução 30–50 %).' : 'Sem resposta significativa (< 30 %).',
  };
}

/** Média de baixas frequências (250/500 Hz) vs. referência (2 kHz) num teste de audição caseiro. */
export function lowFreqIndex(t: HearingTest, ear: 'right' | 'left') {
  const v = t[ear];
  const low = [v['250'], v['500']].filter((x): x is number => x !== null && x !== undefined);
  const ref = [v['1000'], v['2000']].filter((x): x is number => x !== null && x !== undefined);
  if (!low.length) return null;
  const l = low.reduce((a, b) => a + b, 0) / low.length;
  const r = ref.length ? ref.reduce((a, b) => a + b, 0) / ref.length : null;
  return { low: l, ref: r, diff: r !== null ? l - r : null };
}
