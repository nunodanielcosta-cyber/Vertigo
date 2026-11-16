/**
 * HINTS / HINTS+ (Kattah 2009; Newman-Toker 2013) no síndrome vestibular agudo (AVS).
 * "INFARCT": Impulse Normal, Fast-phase Alternating, Refixation on Cover Test (+ hipoacusia nova).
 * ⚠ Só é válido em vertigem aguda contínua COM nistagmo presente, executado por examinador treinado.
 */
export type HIT = 'abnormal-unilateral' | 'normal-bilateral' | 'abnormal-bilateral' | 'unk';
export type NystagmusPattern = 'unidirectional-horizontal' | 'direction-changing' | 'vertical-or-torsional' | 'none' | 'unk';
export type Skew = 'absent' | 'present' | 'unk';
export type Hearing = 'none' | 'new-loss' | 'unk';

export interface HintsInput {
  continuousVertigo: boolean; // AVS: vertigem contínua há horas/dias
  hit: HIT;
  nystagmus: NystagmusPattern;
  skew: Skew;
  hearing: Hearing; // HINTS+
}

export interface HintsResult {
  applicable: boolean;
  verdict: 'central' | 'peripheral' | 'indeterminate';
  plus: boolean; // HINTS+ avaliado
  centralSigns: string[];
  peripheralSigns: string[];
  notes: string[];
}

export function evaluateHints(i: HintsInput): HintsResult {
  const central: string[] = [];
  const peripheral: string[] = [];
  const notes: string[] = [];
  let applicable = i.continuousVertigo;

  if (!i.continuousVertigo) notes.push('O HINTS só foi validado no síndrome vestibular agudo (vertigem contínua, com nistagmo, náuseas e instabilidade). Não usar em vertigem episódica ou posicional.');
  if (i.nystagmus === 'none') {
    applicable = false;
    notes.push('Sem nistagmo espontâneo ou evocado pelo olhar: o head impulse test perde valor (um HIT "normal" sem nistagmo não indica AVC). Avaliar marcha e restantes sinais neurológicos.');
  }

  if (i.hit === 'normal-bilateral') central.push('Head impulse NORMAL bilateralmente (num doente com vertigem aguda contínua e nistagmo)');
  else if (i.hit === 'abnormal-unilateral') peripheral.push('Head impulse alterado de um lado (sacada corretiva)');
  else if (i.hit === 'abnormal-bilateral') notes.push('Head impulse alterado bilateralmente: pouco típico de nevrite; considerar lesão bilateral, toxicidade ou lesão central (AICA, cerebelo).');

  if (i.nystagmus === 'direction-changing') central.push('Nistagmo que muda de direção com o olhar excêntrico');
  else if (i.nystagmus === 'vertical-or-torsional') central.push('Nistagmo vertical ou torsional puro');
  else if (i.nystagmus === 'unidirectional-horizontal') peripheral.push('Nistagmo horizontal(-torsional) unidirecional, que aumenta ao olhar na direção da fase rápida');

  if (i.skew === 'present') central.push('Skew deviation no cover test alternado (refixação vertical)');
  else if (i.skew === 'absent') peripheral.push('Sem skew deviation');

  const plus = i.hearing !== 'unk';
  if (i.hearing === 'new-loss') {
    central.push('Hipoacusia súbita associada (HINTS+): considerar enfarte da AICA/artéria labiríntica, mesmo com HIT alterado');
    notes.push('Na enfarte da AICA o HIT pode estar alterado (lesão do labirinto), dando um falso padrão "periférico". A hipoacusia aguda nova é tratada como sinal central.');
  }

  const unknowns = [i.hit, i.nystagmus, i.skew].filter((x) => x === 'unk').length;
  let verdict: HintsResult['verdict'];
  if (central.length) verdict = 'central';
  else if (unknowns === 0 && i.hit === 'abnormal-unilateral' && i.nystagmus === 'unidirectional-horizontal' && i.skew === 'absent') verdict = 'peripheral';
  else verdict = 'indeterminate';
  if (verdict === 'indeterminate' && unknowns) notes.push('Complete os 3 componentes: o HINTS só é "periférico" quando os três são tranquilizadores.');
  if (!applicable && verdict === 'peripheral') verdict = 'indeterminate';

  return { applicable, verdict, plus, centralSigns: central, peripheralSigns: peripheral, notes };
}
