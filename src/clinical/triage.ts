/**
 * Triagem da vertigem na urgência: HINTS+, ABCD2, fatores de risco vascular e sinais de alarme.
 * Inspirado em TiTrATE (Newman-Toker & Edlow 2015), STANDING (Vanni 2017) e na graduação da marcha
 * (Carmona 2016). ⚠ Apoio à decisão — validar com o protocolo local.
 */
import { evaluateHints, type HintsInput, type HintsResult } from './hints';

export interface Abcd2Input {
  age60: boolean;
  bp140: boolean; // TA ≥ 140/90 na apresentação
  clinical: 'none' | 'speech' | 'weakness'; // fala sem fraqueza = 1; fraqueza unilateral = 2
  duration: '<10' | '10-59' | '>=60';
  diabetes: boolean;
}

export function abcd2(i: Abcd2Input) {
  const score = (i.age60 ? 1 : 0) + (i.bp140 ? 1 : 0) + (i.clinical === 'weakness' ? 2 : i.clinical === 'speech' ? 1 : 0)
    + (i.duration === '>=60' ? 2 : i.duration === '10-59' ? 1 : 0) + (i.diabetes ? 1 : 0);
  const risk = score >= 6 ? 'alto' : score >= 4 ? 'moderado' : 'baixo';
  return { score, risk };
}

export type Timing = 'acute-continuous' | 'episodic-triggered' | 'episodic-spontaneous' | 'chronic';
export type Gait = 0 | 1 | 2 | 3; // 0 normal; 1 ligeira-moderada, anda sozinho; 2 grave, não anda sem apoio; 3 não consegue estar de pé

export interface TriageInput {
  timing: Timing;
  hints: HintsInput;
  abcd2: Abcd2Input;
  gait: Gait;
  redFlags: {
    suddenHeadache: boolean; // cefaleia súbita/intensa, cervicalgia (dissecção)
    neuroDeficit: boolean; // diplopia, disartria, disfagia, défice motor/sensitivo, síndrome de Horner
    ataxia: boolean; // dismetria, ataxia de membros
    consciousness: boolean; // alteração do estado de consciência
    trauma: boolean; // TCE / trauma cervical
    anticoag: boolean; // anticoagulação
  };
  vascular: {
    hypertension: boolean;
    diabetes: boolean;
    smoking: boolean;
    dyslipidemia: boolean;
    atrialFib: boolean;
    priorStroke: boolean;
  };
  positionalTypical: boolean; // Dix-Hallpike/roll test típicos de VPPB (para episódico desencadeado)
}

export interface TriageOutput {
  level: 'emergent' | 'urgent' | 'standard';
  headline: string;
  hints?: HintsResult;
  abcd2: { score: number; risk: string };
  vascularCount: number;
  reasons: string[];
  actions: string[];
}

export function triage(i: TriageInput): TriageOutput {
  const reasons: string[] = [];
  const actions: string[] = [];
  const a = abcd2(i.abcd2);
  const vascularCount = Object.values(i.vascular).filter(Boolean).length;
  const rf = i.redFlags;
  let level = 'standard' as TriageOutput['level'];
  const up = (l: TriageOutput['level']) => {
    const r = { standard: 0, urgent: 1, emergent: 2 };
    if (r[l] > r[level]) level = l;
  };

  if (rf.neuroDeficit) { up('emergent'); reasons.push('Défice neurológico focal associado.'); }
  if (rf.consciousness) { up('emergent'); reasons.push('Alteração do estado de consciência.'); }
  if (rf.suddenHeadache) { up('emergent'); reasons.push('Cefaleia súbita/intensa ou cervicalgia: excluir hemorragia, dissecção vertebral.'); }
  if (rf.ataxia) { up('emergent'); reasons.push('Ataxia de membros/dismetria.'); }
  if (rf.trauma) { up('urgent'); reasons.push('Contexto de traumatismo: excluir lesão cervical/vascular e fístula perilinfática; a VPPB pós-TCE é frequente.'); }
  if (rf.anticoag && (rf.suddenHeadache || rf.trauma)) { up('emergent'); reasons.push('Anticoagulado com cefaleia/trauma: TC-CE urgente.'); }
  if (i.gait >= 2) { up('emergent'); reasons.push(`Marcha grau ${i.gait} (não anda sem apoio${i.gait === 3 ? ' / não se mantém de pé' : ''}): muito sugestivo de causa central.`); }

  let h: HintsResult | undefined;
  if (i.timing === 'acute-continuous') {
    h = evaluateHints(i.hints);
    if (h.verdict === 'central') { up('emergent'); reasons.push('HINTS+ com sinal central: ' + h.centralSigns.join('; ') + '.'); }
    else if (h.verdict === 'indeterminate') { up('urgent'); reasons.push('HINTS incompleto/indeterminado no síndrome vestibular agudo.'); }
    else reasons.push('HINTS com padrão periférico (os 3 componentes tranquilizadores).');
    if (a.score >= 4) { up(h.verdict === 'peripheral' ? 'urgent' : 'emergent'); reasons.push(`ABCD2 = ${a.score} (≥ 4 associa-se a maior risco de AVC na vertigem).`); }
    if (vascularCount >= 2 && h.verdict !== 'peripheral') { up('emergent'); reasons.push(`${vascularCount} fatores de risco vascular.`); }
  } else if (i.timing === 'episodic-spontaneous') {
    if (a.score >= 4 || vascularCount >= 2) { up('urgent'); reasons.push(`Episódios espontâneos com risco vascular (ABCD2 ${a.score}, ${vascularCount} fatores): considerar AIT vertebrobasilar — a vertigem isolada pode precedê-lo.`); }
    else reasons.push('Episódios espontâneos sem sinais de alarme: considerar migrânea vestibular, Ménière, paroxismia, crises de pânico.');
  } else if (i.timing === 'episodic-triggered') {
    if (i.positionalTypical) reasons.push('Provas posicionais típicas de VPPB: tratar com manobra de reposição.');
    else { up('urgent'); reasons.push('Vertigem posicional SEM padrão típico de VPPB: considerar nistagmo posicional central ou hipotensão ortostática.'); }
  } else {
    reasons.push('Vertigem crónica: raramente emergente; orientar para consulta (PPPD, vestibulopatia bilateral, causa central lenta).');
  }

  if (level === 'emergent') {
    actions.push('Avaliação pela Neurologia de imediato (via verde AVC se dentro da janela terapêutica).');
    actions.push('RM-CE com difusão (DWI) e estudo da fossa posterior; angio-TC/angio-RM se suspeita de dissecção ou oclusão vertebrobasilar.');
    actions.push('Atenção: a DWI pode ser falsamente negativa nas primeiras 24–48 h (até 1 em 5 enfartes pequenos da fossa posterior) — repetir se a suspeita clínica se mantiver.');
    actions.push('A TC-CE simples exclui hemorragia mas tem baixa sensibilidade para enfarte da fossa posterior.');
  } else if (level === 'urgent') {
    actions.push('Observação em contexto hospitalar e reavaliação (HINTS completo, marcha, exame neurológico).');
    actions.push('Considerar RM-CE com difusão se não for possível confirmar padrão periférico, ou discussão com Neurologia.');
    if (i.timing === 'episodic-spontaneous') actions.push('Investigar AIT: ECG/Holter, estudo vascular cervical e intracraniano, otimizar prevenção secundária.');
  } else {
    if (i.timing === 'acute-continuous') {
      actions.push('Padrão compatível com nevrite vestibular: considerar corticoide precoce (evidência limitada), antiemético e supressor vestibular apenas nos primeiros 2–3 dias.');
      actions.push('Mobilização precoce e reabilitação vestibular. Reavaliar se surgirem sinais neurológicos.');
    } else if (i.timing === 'episodic-triggered' && i.positionalTypical) {
      actions.push('Manobra de reposição de acordo com o canal (ver Assistente VPPB). Não são necessários exames de imagem.');
    } else actions.push('Alta com orientação para consulta de Otorrinolaringologia/Otoneurologia.');
  }
  if (rf.anticoag) actions.push('Doente anticoagulado: limiar baixo para imagem.');

  const headline = level === 'emergent'
    ? 'Suspeita de causa central — neuroimagem e Neurologia já'
    : level === 'urgent'
      ? 'Não é possível excluir causa central — observar e reavaliar'
      : 'Padrão periférico/benigno provável';

  return { level, headline, hints: h, abcd2: a, vascularCount, reasons, actions };
}
