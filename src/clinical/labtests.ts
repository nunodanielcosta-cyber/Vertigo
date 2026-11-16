/**
 * Provas vestibulares: calóricas (Jongkees), vHIT, VEMPs e relatório integrado de localização.
 * Limiares configuráveis — os valores normais variam entre laboratórios e equipamentos.
 */
export type Side = 'right' | 'left';
const L = (s: Side) => (s === 'right' ? 'direito' : 'esquerdo');
const Lf = (s: Side) => (s === 'right' ? 'direita' : 'esquerda');

/* ---------------- Calóricas ---------------- */
export interface CaloricInput { rw: number; rc: number; lw: number; lc: number; uwLimit?: number; dpLimit?: number; bilateralLimit?: number; fixationIndex?: number | null }
export interface CaloricResult {
  uw: number; // % (+ = direito mais fraco)
  weakSide: Side | null;
  dp: number; // % (+ = preponderância para a direita)
  dpSide: Side | null;
  sumR: number; sumL: number; total: number;
  bilateral: boolean;
  lines: string[];
}

export function caloric(i: CaloricInput): CaloricResult {
  const uwLim = i.uwLimit ?? 25, dpLim = i.dpLimit ?? 30, bilLim = i.bilateralLimit ?? 6;
  const [rw, rc, lw, lc] = [i.rw, i.rc, i.lw, i.lc].map(Math.abs);
  const total = rw + rc + lw + lc;
  const sumR = rw + rc, sumL = lw + lc;
  // Jongkees: positivo = ouvido ESQUERDO mais forte → direito mais fraco
  const uw = total ? ((sumL - sumR) / total) * 100 : 0;
  // direção do nistagmo: RW e LC → nistagmo para a direita; LW e RC → para a esquerda
  const dp = total ? (((rw + lc) - (lw + rc)) / total) * 100 : 0;
  const weakSide: Side | null = Math.abs(uw) >= uwLim ? (uw > 0 ? 'right' : 'left') : null;
  const dpSide: Side | null = Math.abs(dp) >= dpLim ? (dp > 0 ? 'right' : 'left') : null;
  const bilateral = sumR < bilLim && sumL < bilLim;
  const lines: string[] = [];
  if (bilateral) lines.push(`Hiporreflexia bilateral: soma das SPV máximas < ${bilLim} °/s de cada lado (critério da Bárány Society para vestibulopatia bilateral).`);
  else if (weakSide) lines.push(`Paresia canalar ${L(weakSide)} de ${Math.abs(uw).toFixed(0)} % (limite ${uwLim} %).`);
  else lines.push(`Sem paresia canalar significativa (${Math.abs(uw).toFixed(0)} % < ${uwLim} %).`);
  if (dpSide) lines.push(`Preponderância direcional para a ${dpSide === 'right' ? 'direita' : 'esquerda'} de ${Math.abs(dp).toFixed(0)} % — sugere nistagmo espontâneo/assimetria do tónus (inespecífica; pode ser periférica ou central).`);
  if (i.fixationIndex !== null && i.fixationIndex !== undefined && i.fixationIndex >= 0.6) lines.push(`Índice de fixação de ${i.fixationIndex.toFixed(2)} (≥ 0,6): falha de supressão pela fixação — sugere disfunção cerebelosa.`);
  if (!bilateral && (rw + lw + rc + lc) > 0 && Math.max(rw, rc, lw, lc) > 50) lines.push('Respostas muito amplas (> 50 °/s) — confirmar estímulo; hiperreflexia pode associar-se a lesão cerebelosa.');
  return { uw, weakSide, dp, dpSide, sumR, sumL, total, bilateral, lines };
}

/* ---------------- vHIT ---------------- */
export type Canal = 'LH' | 'RH' | 'LA' | 'RA' | 'LP' | 'RP';
export const CANALS: { id: Canal; name: string; side: Side; plane: 'H' | 'A' | 'P' }[] = [
  { id: 'LH', name: 'Lateral esquerdo', side: 'left', plane: 'H' },
  { id: 'RH', name: 'Lateral direito', side: 'right', plane: 'H' },
  { id: 'LA', name: 'Anterior esquerdo', side: 'left', plane: 'A' },
  { id: 'RA', name: 'Anterior direito', side: 'right', plane: 'A' },
  { id: 'LP', name: 'Posterior esquerdo', side: 'left', plane: 'P' },
  { id: 'RP', name: 'Posterior direito', side: 'right', plane: 'P' },
];
export interface VhitCanal { gain: number | null; covert: boolean; overt: boolean }
export type VhitInput = Partial<Record<Canal, VhitCanal>> & { hLimit?: number; vLimit?: number };

export interface VhitResult {
  abnormal: Canal[];
  perCanal: { id: Canal; name: string; gain: number | null; abnormal: boolean; saccades: string; limit: number }[];
  hAsym: number | null; // % assimetria de ganho horizontal
  pattern: string;
  lines: string[];
  nerve: { side: Side; superior: boolean; inferior: boolean }[];
  bilateral: boolean;
}

export function vhit(i: VhitInput): VhitResult {
  const hLim = i.hLimit ?? 0.8, vLim = i.vLimit ?? 0.7;
  const perCanal = CANALS.map((c) => {
    const d = i[c.id];
    const limit = c.plane === 'H' ? hLim : vLim;
    const gainLow = d?.gain !== null && d?.gain !== undefined && d.gain < limit;
    const sacc = !!(d?.covert || d?.overt);
    // anomalia = ganho baixo COM sacadas corretivas (ganho baixo isolado sem sacadas → provável artefacto)
    const abnormal = gainLow && (sacc || (d!.gain! < limit - 0.2));
    const saccades = d?.covert && d?.overt ? 'cobertas e não cobertas' : d?.covert ? 'cobertas' : d?.overt ? 'não cobertas' : 'sem sacadas';
    return { id: c.id, name: c.name, gain: d?.gain ?? null, abnormal, saccades, limit };
  });
  const abnormal = perCanal.filter((c) => c.abnormal).map((c) => c.id);
  const g = (id: Canal) => i[id]?.gain ?? null;
  const gl = g('LH'), gr = g('RH');
  const hAsym = gl !== null && gr !== null && gl + gr > 0 ? (Math.abs(gl - gr) / (gl + gr)) * 100 : null;
  const lines: string[] = [];
  const nerve: VhitResult['nerve'] = [];
  const bilateralH = abnormal.includes('LH') && abnormal.includes('RH');
  const bilateralBVP = gl !== null && gr !== null && gl < 0.6 && gr < 0.6;

  for (const side of ['right', 'left'] as Side[]) {
    const p = side === 'right' ? 'R' : 'L';
    const sup = abnormal.includes(`${p}H` as Canal) || abnormal.includes(`${p}A` as Canal);
    const inf = abnormal.includes(`${p}P` as Canal);
    if (sup || inf) nerve.push({ side, superior: sup, inferior: inf });
  }

  let pattern = 'Normal';
  if (bilateralH || nerve.length === 2) {
    pattern = 'Hipofunção vestibular bilateral';
    lines.push(`Ganho reduzido bilateralmente${bilateralBVP ? ' (horizontal < 0,6 dos dois lados — cumpre critério vHIT da Bárány Society para vestibulopatia bilateral)' : ''}.`);
  } else if (nerve.length === 1) {
    const n = nerve[0];
    const part = n.superior && n.inferior ? 'superior e inferior (nevrite total)' : n.superior ? 'superior (canais lateral e anterior)' : 'inferior (canal posterior)';
    pattern = `Hipofunção vestibular periférica ${Lf(n.side)}`;
    lines.push(`Padrão compatível com lesão do nervo vestibular ${part} ${L(n.side)}.`);
    if (!n.superior && n.inferior) lines.push('Nevrite vestibular inferior isolada: a prova calórica (canal lateral) pode ser normal — o cVEMP ajuda a confirmar.');
  } else lines.push('Ganhos dentro dos limites e sem sacadas corretivas significativas.');

  for (const c of perCanal) {
    const d = i[c.id];
    if (!c.abnormal && (d?.covert || d?.overt)) lines.push(`${c.name}: sacadas com ganho normal — achado de significado incerto (compensação parcial ou artefacto).`);
  }
  if (hAsym !== null && hAsym > 20 && !abnormal.some((x) => x.endsWith('H'))) lines.push(`Assimetria de ganho horizontal de ${hAsym.toFixed(0)} %.`);
  if (perCanal.some((c) => c.abnormal && i[c.id]?.covert)) lines.push('Sacadas cobertas predominantes sugerem compensação central em curso.');
  return { abnormal, perCanal, hAsym, pattern, lines, nerve, bilateral: bilateralH || nerve.length === 2 };
}

/* ---------------- VEMPs ---------------- */
export interface VempEar { amp: number | null; threshold: number | null; absent: boolean }
export interface VempInput {
  c: { right: VempEar; left: VempEar }; // cVEMP: amplitude corrigida/P13-N23 (µV), limiar dB nHL
  o: { right: VempEar; left: VempEar }; // oVEMP: N10 (µV) — registado no olho CONTRALATERAL ao ouvido estimulado
  arLimit?: number; // %
  cThreshLow?: number; // dB nHL — limiar anormalmente baixo
  oAmpHigh?: number; // µV — amplitude anormalmente alta
}
export interface VempResult { cAR: number | null; oAR: number | null; lines: string[]; scdSides: Side[] }

export const asymmetry = (r: number, l: number) => (r + l > 0 ? (Math.abs(r - l) / (r + l)) * 100 : null);

export function vemp(i: VempInput): VempResult {
  const arLim = i.arLimit ?? 35, cLow = i.cThreshLow ?? 65, oHigh = i.oAmpHigh ?? 17;
  const lines: string[] = [];
  const scd: Side[] = [];
  const evalType = (name: string, d: VempInput['c'], organ: string, nerve: string) => {
    const r = d.right.absent ? 0 : d.right.amp, l = d.left.absent ? 0 : d.left.amp;
    let ar: number | null = null;
    if (r !== null && l !== null) ar = asymmetry(r, l);
    for (const s of ['right', 'left'] as Side[]) if (d[s].absent) lines.push(`${name} ausente à ${s === 'right' ? 'direita' : 'esquerda'} (estimulação do ouvido ${L(s)}): disfunção do ${organ} / ${nerve} ${L(s)} (excluir componente de condução se estímulo aéreo).`);
    if (ar !== null && ar >= arLim && !(d.right.absent || d.left.absent)) {
      const weak: Side = (r ?? 0) < (l ?? 0) ? 'right' : 'left';
      lines.push(`${name}: razão de assimetria ${ar.toFixed(0)} % (≥ ${arLim} %) com resposta reduzida do lado ${L(weak)}.`);
    } else if (ar !== null) lines.push(`${name}: razão de assimetria ${ar.toFixed(0)} % (normal < ${arLim} %).`);
    return ar;
  };
  const cAR = evalType('cVEMP', i.c, 'sáculo', 'nervo vestibular inferior');
  const oAR = evalType('oVEMP', i.o, 'utrículo', 'nervo vestibular superior');
  for (const s of ['right', 'left'] as Side[]) {
    const reasons: string[] = [];
    const ct = i.c[s].threshold;
    if (ct !== null && !i.c[s].absent && ct <= cLow) reasons.push(`limiar de cVEMP baixo (${ct} dB nHL ≤ ${cLow})`);
    const oa = i.o[s].amp;
    if (oa !== null && !i.o[s].absent && oa >= oHigh) reasons.push(`amplitude de oVEMP elevada (${oa} µV ≥ ${oHigh})`);
    if (reasons.length) { scd.push(s); lines.push(`Ouvido ${L(s)}: ${reasons.join(' e ')} — sugere "terceira janela" (deiscência do canal semicircular superior) ${L(s)}. Confirmar com TC de alta resolução.`); }
  }
  const cBoth = i.c.right.absent && i.c.left.absent, oBoth = i.o.right.absent && i.o.left.absent;
  if (cBoth && oBoth) lines.push('VEMPs ausentes bilateralmente: hipofunção otolítica bilateral (ou fator técnico/condução, idade avançada).');
  return { cAR, oAR, lines, scdSides: scd };
}

/* ---------------- Relatório integrado ---------------- */
export interface IntegratedInput {
  caloric?: CaloricResult;
  vhit?: VhitResult;
  vemp?: VempResult;
  vempRaw?: VempInput;
  central: { saccades: boolean; pursuit: boolean; gazeNystagmus: boolean; skew: boolean; failedFixation: boolean; verticalNystagmus: boolean };
}

export interface IntegratedResult { localization: string; tone: 'ok' | 'warn' | 'bad' | 'info'; lines: string[] }

export function integrate(i: IntegratedInput): IntegratedResult {
  const lines: string[] = [];
  const centralSigns = Object.entries(i.central).filter(([, v]) => v).map(([k]) => ({
    saccades: 'sacadas alteradas (dismetria/lentificação)', pursuit: 'perseguição lenta sacádica bilateral', gazeNystagmus: 'nistagmo evocado pelo olhar', skew: 'skew deviation', failedFixation: 'falha de supressão pela fixação', verticalNystagmus: 'nistagmo vertical/torsional puro espontâneo',
  } as Record<string, string>)[k]);

  const sides = new Set<Side>();
  let bilateral = false;
  if (i.caloric) {
    if (i.caloric.bilateral) bilateral = true;
    else if (i.caloric.weakSide) sides.add(i.caloric.weakSide);
    lines.push('Calóricas: ' + i.caloric.lines.join(' '));
  }
  if (i.vhit) {
    if (i.vhit.bilateral) bilateral = true;
    else i.vhit.nerve.forEach((n) => sides.add(n.side));
    lines.push('vHIT: ' + i.vhit.pattern + '. ' + i.vhit.lines.join(' '));
  }
  // dissociação calórica/vHIT
  if (i.caloric && i.vhit && i.caloric.weakSide && !i.vhit.abnormal.some((c) => c.endsWith('H'))) {
    lines.push('Dissociação: calórica alterada com vHIT horizontal normal — típica da doença de Ménière (hidrópsia) ou de lesões parciais/compensadas.');
  }
  if (i.vemp) {
    lines.push('VEMPs: ' + i.vemp.lines.join(' '));
    for (const s of ['right', 'left'] as Side[]) if (i.vempRaw?.c[s].absent || i.vempRaw?.o[s].absent) sides.add(s);
  }

  let localization: string;
  let tone: IntegratedResult['tone'];
  if (centralSigns.length) {
    localization = 'Sinais de disfunção vestibular CENTRAL';
    tone = 'bad';
    lines.unshift(`Sinais oculomotores centrais: ${centralSigns.join(', ')}. Recomenda-se RM-CE e avaliação neurológica.`);
    if (sides.size || bilateral) lines.push('Coexistem alterações periféricas — considerar lesão combinada (p. ex. enfarte da AICA) ou patologias distintas.');
  } else if (bilateral || sides.size === 2) {
    localization = 'Hipofunção vestibular periférica BILATERAL';
    tone = 'warn';
  } else if (sides.size === 1) {
    const s = [...sides][0];
    localization = `Hipofunção vestibular periférica UNILATERAL ${s === 'right' ? 'DIREITA' : 'ESQUERDA'}`;
    tone = 'warn';
  } else if (i.vemp?.scdSides.length) {
    localization = `Padrão de "terceira janela" ${i.vemp.scdSides.map((s) => (s === 'right' ? 'direita' : 'esquerda')).join(' e ')}`;
    tone = 'warn';
  } else {
    localization = 'Função vestibular periférica e oculomotora sem alterações nas provas introduzidas';
    tone = 'ok';
  }
  if (i.vemp?.scdSides.length && localization.indexOf('terceira') < 0) lines.push('VEMPs sugerem deiscência do canal superior — correlacionar com sintomas e TC.');
  return { localization, tone, lines };
}
