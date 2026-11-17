/**
 * Apoio ao diagnóstico pelos critérios da Bárány Society (ICVD — International Classification of
 * Vestibular Disorders), organizado pela abordagem "timing & triggers".
 * Cada diagnóstico tem critérios explícitos; cada critério depende de respostas Sim / Não / ?.
 * ⚠ Texto dos critérios resumido/adaptado — consultar as publicações originais no J Vestib Res.
 */
export type Tri = 'yes' | 'no' | 'unk';
export type Timing = 'episodic-triggered' | 'episodic-spontaneous' | 'acute-continuous' | 'chronic';
export type Answers = Record<string, Tri>;

export const TIMINGS: { id: Timing; name: string; desc: string }[] = [
  { id: 'episodic-triggered', name: 'Episódico desencadeado', desc: 'Crises breves provocadas por mudança de posição da cabeça, de pé, som ou pressão.' },
  { id: 'episodic-spontaneous', name: 'Episódico espontâneo', desc: 'Crises que surgem sem desencadeante, de segundos a horas/dias, com períodos livres.' },
  { id: 'acute-continuous', name: 'Agudo contínuo', desc: 'Vertigem contínua de início agudo, que dura dias, com nistagmo, náuseas e instabilidade.' },
  { id: 'chronic', name: 'Crónico', desc: 'Tontura ou instabilidade persistente durante semanas a meses.' },
];

export interface Question { id: string; text: string; help?: string }

export const QUESTIONS: Record<string, Question> = {
  other: { id: 'other', text: 'Os sintomas são melhor explicados por outra doença vestibular ou não vestibular?', help: 'Responda «Não» se nada no quadro sugerir outra causa (critério comum a todos os diagnósticos).' },
  // VPPB
  bppv_pos: { id: 'bppv_pos', text: 'Crises recorrentes de vertigem/tontura provocadas por deitar-se ou virar-se na cama?' },
  bppv_short: { id: 'bppv_short', text: 'Cada crise dura menos de 1 minuto?' },
  bppv_pc: { id: 'bppv_pc', text: 'Dix-Hallpike ou side-lying: nistagmo upbeat + torsional (polo superior para a orelha de baixo), latência de alguns segundos, < 1 min?' },
  bppv_hc_geo: { id: 'bppv_hc_geo', text: 'Supine roll test: nistagmo horizontal GEOTRÓPICO, muda de direção, < 1 min?' },
  bppv_hc_apo: { id: 'bppv_hc_apo', text: 'Supine roll test: nistagmo horizontal APOGEOTRÓPICO, muda de direção, > 1 min?' },
  bppv_neg: { id: 'bppv_neg', text: 'As provas posicionais foram feitas e NÃO mostraram nistagmo?' },
  // Ménière
  men_v12: { id: 'men_v12', text: '≥ 2 episódios de vertigem espontânea com duração entre 20 min e 12 h?' },
  men_v24: { id: 'men_v24', text: '≥ 2 episódios de vertigem ou tontura com duração entre 20 min e 24 h?' },
  men_audio: { id: 'men_audio', text: 'Hipoacusia neurossensorial de frequências graves a médias documentada em audiograma, num ouvido, antes, durante ou depois de um episódio?' },
  men_aural: { id: 'men_aural', text: 'Sintomas auditivos flutuantes nesse ouvido (audição, acufeno ou plenitude)?' },
  // Migrânea vestibular
  vm_5: { id: 'vm_5', text: '≥ 5 episódios de sintomas vestibulares moderados ou graves, com duração entre 5 min e 72 h?' },
  vm_mig: { id: 'vm_mig', text: 'História atual ou prévia de migrânea com ou sem aura (critérios ICHD)?' },
  vm_feat: { id: 'vm_feat', text: 'Em ≥ 50 % dos episódios, pelo menos uma característica de migrânea?', help: 'Cefaleia com ≥ 2 de: unilateral, pulsátil, moderada/grave, agravada pela atividade; OU fotofobia e fonofobia; OU aura visual.' },
  // Paroxismia vestibular
  vp_10: { id: 'vp_10', text: '≥ 10 crises de vertigem (rotatória ou não)?' },
  vp_5: { id: 'vp_5', text: '≥ 5 crises de vertigem (rotatória ou não)?' },
  vp_1m: { id: 'vp_1m', text: 'As crises duram menos de 1 minuto?' },
  vp_5m: { id: 'vp_5m', text: 'As crises duram menos de 5 minutos?' },
  vp_stereo: { id: 'vp_stereo', text: 'As crises são estereotipadas (sempre iguais no mesmo doente)?' },
  vp_cbz: { id: 'vp_cbz', text: 'Houve resposta ao tratamento com carbamazepina ou oxcarbazepina?' },
  // Nevrite vestibular
  vn_24: { id: 'vn_24', text: 'Início agudo/subagudo de vertigem espontânea contínua, moderada a grave, com duração ≥ 24 h?' },
  vn_ny: { id: 'vn_ny', text: 'Nistagmo espontâneo periférico: direção fixa, horizontal-torsional, aumenta sem fixação?' },
  vn_vor: { id: 'vn_vor', text: 'Redução inequívoca do VOR do lado oposto à fase rápida (HIT/vHIT ou prova calórica)?' },
  vn_nocentral: { id: 'vn_nocentral', text: 'Sem sinais centrais (skew, nistagmo que muda de direção, ataxia grave) e sem sintomas cocleares ou otológicos agudos?' },
  // Vestibulopatia bilateral
  bvp_unst: { id: 'bvp_unst', text: 'Instabilidade ao andar ou de pé?' },
  bvp_osc: { id: 'bvp_osc', text: 'Oscilopsia ou visão turva com o movimento (ao andar, ou com movimentos rápidos da cabeça)?' },
  bvp_dark: { id: 'bvp_dark', text: 'A instabilidade piora no escuro e/ou em terreno irregular?' },
  bvp_static: { id: 'bvp_static', text: 'Sem sintomas sentado ou deitado em repouso?' },
  bvp_lab: { id: 'bvp_lab', text: 'VOR reduzido bilateralmente documentado?', help: 'vHIT horizontal com ganho < 0,6 bilateral; OU calórica com soma das SPV máximas < 6 °/s de cada lado; OU cadeira rotatória com ganho < 0,1 (0,1 Hz).' },
  bvp_bedside: { id: 'bvp_bedside', text: 'Head impulse test à cabeceira alterado bilateralmente?' },
  // PPPD
  pppd_3m: { id: 'pppd_3m', text: 'Tontura, instabilidade ou vertigem não rotatória na maior parte dos dias, durante ≥ 3 meses (períodos de horas, com flutuação)?' },
  pppd_exac: { id: 'pppd_exac', text: 'Os sintomas pioram com a postura de pé, com o movimento (próprio ou passivo) e com estímulos visuais em movimento ou padrões complexos?' },
  pppd_trig: { id: 'pppd_trig', text: 'Começou após um evento que causou vertigem ou instabilidade (vestibular, médico ou sofrimento psicológico)?' },
  pppd_dist: { id: 'pppd_dist', text: 'Os sintomas causam sofrimento ou incapacidade funcional significativa?' },
  // Deiscência do canal superior
  scd_sym: { id: 'scd_sym', text: 'Pelo menos um: hiperacusia de condução óssea; vertigem/oscilopsia induzida por sons; induzida por pressão (Valsalva); acufeno pulsátil?' },
  scd_sign: { id: 'scd_sign', text: 'Pelo menos um: nistagmo induzido por som/pressão no plano do canal superior; limiares de condução óssea negativos nas frequências graves; VEMPs aumentados (limiar cVEMP baixo ou amplitude oVEMP elevada)?' },
  scd_ct: { id: 'scd_ct', text: 'TC de alta resolução com reconstrução no plano do canal superior com deiscência?' },
  // Mal de débarquement
  mdds_rock: { id: 'mdds_rock', text: 'Vertigem não rotatória com sensação de balanço/ondulação, contínua ou na maior parte do dia?' },
  mdds_48: { id: 'mdds_48', text: 'Começou até 48 h depois de terminar uma exposição a movimento passivo (barco, avião, carro)?' },
  mdds_rel: { id: 'mdds_rel', text: 'Melhora temporariamente ao voltar a estar em movimento passivo (p. ex. a conduzir)?' },
  mdds_pers: { id: 'mdds_pers', text: 'Os sintomas persistem há mais de 48 h?' },
};

/* ---------- lógica de 3 valores ---------- */
type Expr = (a: Answers) => Tri;
const Q = (id: string): Expr => (a) => a[id] ?? 'unk';
const NOT = (e: Expr): Expr => (a) => { const v = e(a); return v === 'yes' ? 'no' : v === 'no' ? 'yes' : 'unk'; };
const OR = (...es: Expr[]): Expr => (a) => { const v = es.map((e) => e(a)); return v.includes('yes') ? 'yes' : v.every((x) => x === 'no') ? 'no' : 'unk'; };
const NOT_OTHER = NOT(Q('other'));

export interface Criterion { label: string; expr: Expr; questions: string[] }
const C = (label: string, expr: Expr, ...questions: string[]): Criterion => ({ label, expr, questions });
const other = C('Não é melhor explicado por outra doença', NOT_OTHER, 'other');

export interface Diagnosis {
  id: string;
  name: string;
  timings: Timing[];
  definite: Criterion[];
  probable?: Criterion[];
  probableLabel?: string;
  reference: string;
  next: string[]; // atitude se o diagnóstico se confirmar
}

export const DIAGNOSES: Diagnosis[] = [
  {
    id: 'bppv-pc', name: 'VPPB do canal posterior (canalolitíase)', timings: ['episodic-triggered'],
    definite: [
      C('A. Crises recorrentes de vertigem posicional ao deitar-se ou virar-se em decúbito', Q('bppv_pos'), 'bppv_pos'),
      C('B. Duração das crises < 1 min', Q('bppv_short'), 'bppv_short'),
      C('C. Nistagmo posicional upbeat-torsional geotrópico após latência, < 1 min (Dix-Hallpike / side-lying)', Q('bppv_pc'), 'bppv_pc'),
      other,
    ],
    reference: 'von Brevern M et al. Benign paroxysmal positional vertigo: Diagnostic criteria. J Vestib Res 2015;25:105–17.',
    next: ['Manobra de Epley (ou Semont) do lado afetado — ver Assistente VPPB.'],
  },
  {
    id: 'bppv-hc-geo', name: 'VPPB do canal horizontal (canalolitíase, geotrópica)', timings: ['episodic-triggered'],
    definite: [
      C('A. Crises recorrentes de vertigem posicional ao deitar-se ou virar-se em decúbito', Q('bppv_pos'), 'bppv_pos'),
      C('B. Duração das crises < 1 min', Q('bppv_short'), 'bppv_short'),
      C('C. Supine roll test: nistagmo horizontal geotrópico, muda de direção, < 1 min', Q('bppv_hc_geo'), 'bppv_hc_geo'),
      other,
    ],
    reference: 'von Brevern 2015 (J Vestib Res 25:105).',
    next: ['Lempert/BBQ roll ou Gufoni para o lado são; lado afetado = nistagmo mais intenso.'],
  },
  {
    id: 'bppv-hc-apo', name: 'VPPB do canal horizontal (cupulolitíase, apogeotrópica)', timings: ['episodic-triggered'],
    definite: [
      C('A. Vertigem posicional ao deitar-se ou virar-se em decúbito', Q('bppv_pos'), 'bppv_pos'),
      C('B. Supine roll test: nistagmo horizontal apogeotrópico, muda de direção, > 1 min', Q('bppv_hc_apo'), 'bppv_hc_apo'),
      other,
    ],
    reference: 'von Brevern 2015 (J Vestib Res 25:105).',
    next: ['Lado afetado = nistagmo MENOS intenso; Gufoni apogeotrópico, head-shaking ou conversão para geotrópico. Excluir causa central se não melhorar.'],
  },
  {
    id: 'bppv-prob', name: 'VPPB provável, resolvida espontaneamente', timings: ['episodic-triggered'],
    definite: [
      C('A. Crises recorrentes de vertigem/tontura posicional ao deitar-se ou virar-se', Q('bppv_pos'), 'bppv_pos'),
      C('B. Duração das crises < 1 min', Q('bppv_short'), 'bppv_short'),
      C('C. Sem nistagmo nas provas posicionais', Q('bppv_neg'), 'bppv_neg'),
      other,
    ],
    reference: 'von Brevern 2015 (J Vestib Res 25:105).',
    next: ['Repetir provas posicionais numa crise; ensinar a gravar o nistagmo em casa.'],
  },
  {
    id: 'meniere', name: 'Doença de Ménière', timings: ['episodic-spontaneous'],
    definite: [
      C('A. ≥ 2 episódios de vertigem espontânea de 20 min a 12 h', Q('men_v12'), 'men_v12'),
      C('B. Hipoacusia neurossensorial graves/médias documentada num ouvido', Q('men_audio'), 'men_audio'),
      C('C. Sintomas auditivos flutuantes no ouvido afetado', Q('men_aural'), 'men_aural'),
      other,
    ],
    probable: [
      C('A. ≥ 2 episódios de vertigem ou tontura de 20 min a 24 h', OR(Q('men_v12'), Q('men_v24')), 'men_v12', 'men_v24'),
      C('B. Sintomas auditivos flutuantes no ouvido afetado', Q('men_aural'), 'men_aural'),
      other,
    ],
    reference: 'Lopez-Escamez JA et al. Diagnostic criteria for Menière\'s disease. J Vestib Res 2015;25:1–7.',
    next: ['Audiogramas seriados; diário de crises e audição. Restrição de sal/cafeína (evidência limitada), betaistina; escalonar para corticoide/gentamicina intratimpânicos — ver estadiamento AAO-HNS.'],
  },
  {
    id: 'vm', name: 'Migrânea vestibular', timings: ['episodic-spontaneous'],
    definite: [
      C('A. ≥ 5 episódios de sintomas vestibulares moderados/graves, 5 min–72 h', Q('vm_5'), 'vm_5'),
      C('B. História atual ou prévia de migrânea (ICHD)', Q('vm_mig'), 'vm_mig'),
      C('C. ≥ 1 característica de migrânea em ≥ 50 % dos episódios', Q('vm_feat'), 'vm_feat'),
      other,
    ],
    probable: [
      C('A. ≥ 5 episódios de sintomas vestibulares moderados/graves, 5 min–72 h', Q('vm_5'), 'vm_5'),
      C('B ou C. História de migrânea OU características de migrânea em ≥ 50 % dos episódios', OR(Q('vm_mig'), Q('vm_feat')), 'vm_mig', 'vm_feat'),
      other,
    ],
    reference: 'Lempert T et al. Vestibular migraine: Diagnostic criteria (update). J Vestib Res 2022;32:1–6.',
    next: ['Diário de desencadeantes; medidas de estilo de vida; profilaxia (p. ex. propranolol, flunarizina, amitriptilina, topiramato, venlafaxina) com reavaliação da resposta aos 2–3 meses.'],
  },
  {
    id: 'vp', name: 'Paroxismia vestibular', timings: ['episodic-spontaneous', 'episodic-triggered'],
    definite: [
      C('A. ≥ 10 crises de vertigem espontânea, rotatória ou não', Q('vp_10'), 'vp_10'),
      C('B. Duração < 1 min', Q('vp_1m'), 'vp_1m'),
      C('C. Fenomenologia estereotipada', Q('vp_stereo'), 'vp_stereo'),
      C('D. Resposta a carbamazepina/oxcarbazepina', Q('vp_cbz'), 'vp_cbz'),
      other,
    ],
    probable: [
      C('A. ≥ 5 crises de vertigem, espontâneas ou com certos movimentos da cabeça', OR(Q('vp_5'), Q('vp_10')), 'vp_5', 'vp_10'),
      C('B. Duração < 5 min', OR(Q('vp_5m'), Q('vp_1m')), 'vp_5m', 'vp_1m'),
      C('C. Fenomenologia estereotipada', Q('vp_stereo'), 'vp_stereo'),
      other,
    ],
    reference: 'Strupp M et al. Vestibular paroxysmia: Diagnostic criteria. J Vestib Res 2016;26:409–15.',
    next: ['RM com sequências CISS/FIESTA (conflito neurovascular do VIII par — achado também presente em assintomáticos). Prova terapêutica com carbamazepina/oxcarbazepina.'],
  },
  {
    id: 'vn', name: 'Nevrite vestibular aguda (vestibulopatia unilateral aguda)', timings: ['acute-continuous'],
    definite: [
      C('A. Vertigem espontânea contínua moderada/grave, início agudo, ≥ 24 h', Q('vn_24'), 'vn_24'),
      C('B. Nistagmo espontâneo periférico, direção fixa, aumenta sem fixação', Q('vn_ny'), 'vn_ny'),
      C('C. Redução inequívoca do VOR do lado oposto à fase rápida', Q('vn_vor'), 'vn_vor'),
      C('D/E. Sem sinais centrais nem sintomas cocleares/otológicos agudos', Q('vn_nocentral'), 'vn_nocentral'),
      other,
    ],
    probable: [
      C('A. Vertigem espontânea contínua moderada/grave, início agudo, ≥ 24 h', Q('vn_24'), 'vn_24'),
      C('B. Nistagmo espontâneo periférico, direção fixa', Q('vn_ny'), 'vn_ny'),
      C('D/E. Sem sinais centrais nem sintomas cocleares/otológicos agudos', Q('vn_nocentral'), 'vn_nocentral'),
      other,
    ],
    probableLabel: 'provável (VOR não documentado)',
    reference: 'Strupp M et al. Acute unilateral vestibulopathy/vestibular neuritis: Diagnostic criteria. J Vestib Res 2022;32:389–406.',
    next: ['Fazer HINTS+ (ver Calculadora) — obrigatório antes de concluir. vHIT/calóricas para documentar. Reabilitação vestibular precoce.'],
  },
  {
    id: 'bvp', name: 'Vestibulopatia bilateral', timings: ['chronic'],
    definite: [
      C('A1. Instabilidade ao andar ou de pé', Q('bvp_unst'), 'bvp_unst'),
      C('A2/A3. Oscilopsia com o movimento e/ou pior no escuro ou terreno irregular', OR(Q('bvp_osc'), Q('bvp_dark')), 'bvp_osc', 'bvp_dark'),
      C('B. Sem sintomas sentado/deitado em repouso', Q('bvp_static'), 'bvp_static'),
      C('C. VOR reduzido bilateralmente documentado (vHIT, calórica ou cadeira rotatória)', Q('bvp_lab'), 'bvp_lab'),
      other,
    ],
    probable: [
      C('A1. Instabilidade ao andar ou de pé', Q('bvp_unst'), 'bvp_unst'),
      C('A2/A3. Oscilopsia e/ou pior no escuro ou terreno irregular', OR(Q('bvp_osc'), Q('bvp_dark')), 'bvp_osc', 'bvp_dark'),
      C('B. Sem sintomas sentado/deitado em repouso', Q('bvp_static'), 'bvp_static'),
      C('C. HIT à cabeceira alterado bilateralmente', OR(Q('bvp_bedside'), Q('bvp_lab')), 'bvp_bedside', 'bvp_lab'),
      other,
    ],
    reference: 'Strupp M et al. Bilateral vestibulopathy: Diagnostic criteria. J Vestib Res 2017;27:177–89.',
    next: ['Investigar a causa (aminoglicosídeos, CANVAS, Ménière bilateral, meningite, autoimune). Reabilitação com substituição sensorial e prevenção de quedas.'],
  },
  {
    id: 'pppd', name: 'Tontura postural-percetiva persistente (PPPD)', timings: ['chronic'],
    definite: [
      C('A. Tontura/instabilidade/vertigem não rotatória na maioria dos dias, ≥ 3 meses', Q('pppd_3m'), 'pppd_3m'),
      C('B. Agravada por postura ereta, movimento e estímulos visuais', Q('pppd_exac'), 'pppd_exac'),
      C('C. Precipitada por um evento vestibular, médico ou psicológico', Q('pppd_trig'), 'pppd_trig'),
      C('D. Sofrimento ou incapacidade funcional significativa', Q('pppd_dist'), 'pppd_dist'),
      other,
    ],
    reference: 'Staab JP et al. Diagnostic criteria for PPPD. J Vestib Res 2017;27:191–208.',
    next: ['Explicação do diagnóstico; reabilitação vestibular com habituação visual; ISRS/IRSN; terapia cognitivo-comportamental. Aplicar NPQ e DHI.'],
  },
  {
    id: 'scd', name: 'Deiscência do canal semicircular superior', timings: ['episodic-triggered', 'chronic'],
    definite: [
      C('A. Sintomas: hiperacusia óssea, vertigem por som/pressão ou acufeno pulsátil', Q('scd_sym'), 'scd_sym'),
      C('B. Sinais/provas: nistagmo por som/pressão, condução óssea negativa, VEMPs aumentados', Q('scd_sign'), 'scd_sign'),
      C('C. TC de alta resolução com deiscência no plano do canal superior', Q('scd_ct'), 'scd_ct'),
      other,
    ],
    probable: [
      C('A. Sintomas típicos', Q('scd_sym'), 'scd_sym'),
      C('B. Sinais/provas típicos', Q('scd_sign'), 'scd_sign'),
      other,
    ],
    probableLabel: 'suspeita (sem confirmação imagiológica)',
    reference: 'Ward BK et al. Superior semicircular canal dehiscence syndrome: Diagnostic criteria. J Vestib Res 2021;31:131–41.',
    next: ['VEMPs (ver calculadora), audiograma com condução óssea a 250–500 Hz e TC de alta resolução com reconstrução de Pöschl/Stenver.'],
  },
  {
    id: 'mdds', name: 'Mal de débarquement', timings: ['chronic'],
    definite: [
      C('A. Vertigem não rotatória com sensação de balanço, contínua ou na maior parte do dia', Q('mdds_rock'), 'mdds_rock'),
      C('B. Início até 48 h após terminar exposição a movimento passivo', Q('mdds_48'), 'mdds_48'),
      C('C. Melhoria temporária com nova exposição a movimento passivo', Q('mdds_rel'), 'mdds_rel'),
      C('D. Persistência > 48 h', Q('mdds_pers'), 'mdds_pers'),
      other,
    ],
    reference: 'Cha YH et al. Mal de débarquement syndrome diagnostic criteria. J Vestib Res 2020;30:285–93.',
    next: ['Subtipo: em evolução (< 1 mês), transitório (resolve até 1 mês) ou persistente (> 1 mês). Readaptação VOR (protocolo de Dai), considerar benzodiazepina/ISRS.'],
  },
];

/** Outros diagnósticos a considerar em cada padrão (fora destes critérios). */
export const OTHER_DDX: Record<Timing, string[]> = {
  'episodic-triggered': ['Hipotensão ortostática / intolerância ortostática', 'Nistagmo posicional central (downbeat, sem latência, persistente)', 'Fístula perilinfática', 'Síndrome do roubo da subclávia, oclusão vertebral rotacional'],
  'episodic-spontaneous': ['AIT vertebrobasilar', 'Arritmia cardíaca', 'Crises de pânico', 'Ataxias episódicas', 'Epilepsia vestibular (rara)'],
  'acute-continuous': ['AVC/AIT da circulação posterior (fazer HINTS+)', 'Labirintite (com hipoacusia)', 'Herpes zoster ótico (Ramsay Hunt)', 'Esclerose múltipla', 'Encefalopatia de Wernicke', 'Toxicidade (álcool, anticonvulsivantes)'],
  chronic: ['Doenças neurodegenerativas (atrofia cerebelosa, parkinsonismo)', 'Polineuropatia', 'Efeitos adversos de fármacos', 'Schwannoma vestibular', 'Perturbações de ansiedade/depressão'],
};

export type Status = 'definite' | 'probable' | 'possible' | 'unlikely';

export interface CriterionResult { label: string; value: Tri; questions: string[] }
export interface DiagnosisResult {
  dx: Diagnosis;
  status: Status;
  statusLabel: string;
  definite: CriterionResult[];
  probable?: CriterionResult[];
  score: number; // fração de critérios cumpridos (para ordenar)
}

function evalSet(set: Criterion[], a: Answers): CriterionResult[] {
  return set.map((c) => ({ label: c.label, value: c.expr(a), questions: c.questions }));
}
const allYes = (r: CriterionResult[]) => r.every((c) => c.value === 'yes');
const anyNo = (r: CriterionResult[]) => r.some((c) => c.value === 'no');

export function evaluateDx(dx: Diagnosis, a: Answers): DiagnosisResult {
  const d = evalSet(dx.definite, a);
  const p = dx.probable ? evalSet(dx.probable, a) : undefined;
  let status: Status;
  if (allYes(d)) status = 'definite';
  else if (p && allYes(p)) status = 'probable';
  else if (!anyNo(p ?? d) || !anyNo(d)) status = 'possible';
  else status = 'unlikely';
  const labels: Record<Status, string> = {
    definite: dx.probable ? 'definitiva — critérios cumpridos' : 'critérios cumpridos',
    probable: dx.probableLabel ?? 'provável',
    possible: 'possível — faltam dados',
    unlikely: 'critérios não cumpridos',
  };
  const pool = [...d, ...(p ?? [])];
  const score = pool.filter((c) => c.value === 'yes').length / pool.length - pool.filter((c) => c.value === 'no').length / pool.length;
  return { dx, status, statusLabel: labels[status], definite: d, probable: p, score };
}

const ORDER: Record<Status, number> = { definite: 0, probable: 1, possible: 2, unlikely: 3 };

export function evaluateIcvd(timing: Timing | 'all', a: Answers): DiagnosisResult[] {
  return DIAGNOSES.filter((d) => timing === 'all' || d.timings.includes(timing))
    .map((d) => evaluateDx(d, a))
    .sort((x, y) => ORDER[x.status] - ORDER[y.status] || y.score - x.score);
}

/** Perguntas relevantes para um padrão temporal (ordem de aparecimento nos critérios). */
export function questionsFor(timing: Timing | 'all'): Question[] {
  const ids: string[] = [];
  for (const d of DIAGNOSES.filter((x) => timing === 'all' || x.timings.includes(timing))) {
    for (const c of [...d.definite, ...(d.probable ?? [])]) for (const qid of c.questions) if (qid !== 'other' && !ids.includes(qid)) ids.push(qid);
  }
  ids.push('other');
  return ids.map((i) => QUESTIONS[i]);
}
