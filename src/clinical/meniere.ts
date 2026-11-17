/**
 * Doença de Ménière — normas de reporte AAO-HNS (1995): estadiamento audiométrico, nível funcional
 * e classe de controlo da vertigem. Ajuda na discussão de tratamento escalonado.
 */
export function pta4(f500: number, f1k: number, f2k: number, f3k: number) {
  return (f500 + f1k + f2k + f3k) / 4;
}

export function stage(pta: number) {
  if (pta <= 25) return { stage: 1, range: '≤ 25 dB' };
  if (pta <= 40) return { stage: 2, range: '26–40 dB' };
  if (pta <= 70) return { stage: 3, range: '41–70 dB' };
  return { stage: 4, range: '> 70 dB' };
}

export const FUNCTIONAL_LEVELS: [number, string][] = [
  [1, 'As tonturas não afetam as minhas atividades.'],
  [2, 'Durante as crises tenho de parar o que estou a fazer, mas passam e retomo a atividade. Continuo a trabalhar, conduzir e fazer o que quero sem restrições. Não alterei planos por causa das tonturas.'],
  [3, 'Durante as crises tenho de parar, mas passam e retomo. Trabalho, conduzo e faço o que quero, mas tive de alterar alguns planos por causa das tonturas.'],
  [4, 'Consigo trabalhar, conduzir, viajar e ter vida familiar e social, mas com grande esforço. Tenho de ajustar constantemente as atividades e poupar energias. Mal consigo.'],
  [5, 'Não consigo trabalhar, conduzir ou ter vida familiar. Não consigo fazer a maioria das atividades. Até as essenciais são limitadas. Estou incapacitado(a).'],
  [6, 'Estou incapacitado(a) há ≥ 1 ano e/ou recebo compensação (reforma/pensão) por causa das tonturas ou do equilíbrio.'],
];

/**
 * Classe de controlo da vertigem: valor numérico = (X / Y) × 100, X = média mensal de crises definitivas nos
 * 6 meses entre 18 e 24 meses após o tratamento, Y = média mensal nos 6 meses antes do tratamento.
 */
export function vertigoClass(before: number, after: number, secondaryTx: boolean) {
  if (secondaryTx) return { cls: 'F', value: null as number | null, text: 'Iniciado tratamento secundário por incapacidade causada pela vertigem.' };
  if (before <= 0) return { cls: '—', value: null, text: 'Indique um número de crises antes do tratamento > 0.' };
  const value = Math.round((after / before) * 100);
  const cls = value === 0 ? 'A' : value <= 40 ? 'B' : value <= 80 ? 'C' : value <= 120 ? 'D' : 'E';
  const text = { A: 'Controlo completo da vertigem.', B: 'Controlo substancial.', C: 'Controlo limitado.', D: 'Controlo insignificante.', E: 'Agravamento.' }[cls]!;
  return { cls, value, text };
}

/** Sugestões de tratamento escalonado — apenas orientação para discussão; não é recomendação individual. */
export function treatmentHints(o: { stage: number; level: number; cls: string; failedMedical: boolean; serviceableHearing: boolean; bilateral: boolean }) {
  const out: string[] = [];
  out.push('1.ª linha: aconselhamento, restrição de sal (evidência limitada), redução de cafeína/álcool, gestão do stress e sono; betaistina e/ou diurético conforme prática local; reabilitação vestibular entre crises.');
  if (o.failedMedical) {
    out.push('Falência do tratamento médico: corticoide intratimpânico (preserva a audição) é a opção seguinte habitual.');
    if (o.serviceableHearing) out.push('Audição útil: preferir opções conservadoras da audição (corticoide IT; cirurgia do saco endolinfático em casos selecionados). A gentamicina IT em doses baixas controla a vertigem em ~80–90 %, com risco de perda auditiva (~10–20 %).');
    else out.push('Audição não útil (estádio 3–4): gentamicina intratimpânica ou labirintectomia são opções eficazes para o controlo da vertigem.');
    if (o.bilateral) out.push('⚠ Doença bilateral ou risco de bilateralização: evitar terapêuticas ablativas (gentamicina, labirintectomia, neurectomia) — risco de vestibulopatia bilateral.');
    if (o.level >= 4) out.push(`Nível funcional ${o.level}: impacto elevado — justifica escalonamento terapêutico.`);
  }
  if (o.cls === 'C' || o.cls === 'D' || o.cls === 'E') out.push(`Classe ${o.cls} após tratamento: controlo insuficiente — reavaliar o diagnóstico (migrânea vestibular coexistente?) e escalonar.`);
  if (o.stage >= 3) out.push(`Estádio ${o.stage}: considerar reabilitação auditiva (prótese auditiva, CROS, implante coclear em casos selecionados).`);
  return out;
}
