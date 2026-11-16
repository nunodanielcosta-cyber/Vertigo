import type { Exam, NystagmusFeatures, Side, TestId } from '../types';
import { TESTS } from './tests';
import { epley, gufoniApo, gufoniGeo, lempert, semont, vannucchi, yacovino, type Maneuver } from './maneuvers';

export type Likelihood = 'alta' | 'moderada' | 'baixa';
export type Category = 'vppb' | 'periferico' | 'central' | 'info';

export interface Hypothesis {
  id: string;
  title: string;
  likelihood: Likelihood;
  category: Category;
  rationale: string[];
  maneuvers: Maneuver[];
}

export interface EngineOutput {
  hypotheses: Hypothesis[];
  redFlags: string[];
  nextSteps: string[];
}

const lado = (s: Side) => (s === 'right' ? 'direito' : 'esquerdo');
const ladoF = (s: Side) => (s === 'right' ? 'direita' : 'esquerda');
const oposto = (s: Side): Side => (s === 'right' ? 'left' : 'right');
const rank: Record<Likelihood, number> = { alta: 3, moderada: 2, baixa: 1 };

/** Descrição textual do nistagmo, em português clínico. */
export function describe(f: NystagmusFeatures): string {
  if (!f.present) return 'Sem nistagmo detetado';
  const parts: string[] = [];
  if (f.vertical !== 'none') parts.push(f.vertical === 'up' ? 'vertical para cima (upbeat)' : 'vertical para baixo (downbeat)');
  if (f.torsional === 'right' || f.torsional === 'left')
    parts.push(`torsional (polo superior para a orelha ${ladoF(f.torsional)}; ${f.torsional === 'right' ? 'anti-horário' : 'horário'} visto pelo examinador)`);
  if (f.horizontal !== 'none') parts.push(`horizontal para a ${ladoF(f.horizontal)}`);
  let s = parts.length ? 'Nistagmo ' + parts.join(' + ') : 'Nistagmo de direção indeterminada';
  const extra: string[] = [];
  if (f.latency !== null) extra.push(`latência ${f.latency} s`);
  if (f.duration !== null) extra.push(f.persistent ? `persistente (≥ ${f.duration} s)` : `duração ${f.duration} s`);
  if (f.crescendoDecrescendo) extra.push('crescendo-decrescendo');
  if (f.directionChangesInPosition) extra.push('muda de direção na mesma posição');
  if (f.torsional === 'unknown') extra.push('torção não medida');
  if (extra.length) s += ' — ' + extra.join(', ');
  return s;
}

function feat(exam: Exam, id: TestId): NystagmusFeatures | undefined {
  return exam.tests[id]?.features;
}

/** Aplica as regras clínicas ao conjunto de provas do exame. */
export function evaluate(exam: Exam): EngineOutput {
  const H: Hypothesis[] = [];
  const red: string[] = [];
  const next: string[] = [];

  const dhR = feat(exam, 'dh-right');
  const dhL = feat(exam, 'dh-left');
  const hh = feat(exam, 'head-hanging');
  const rollR = feat(exam, 'roll-right');
  const rollL = feat(exam, 'roll-left');
  const spont = feat(exam, 'spontaneous');
  const gzR = feat(exam, 'gaze-right');
  const gzL = feat(exam, 'gaze-left');

  // ---------------- Canal posterior ----------------
  const pcCandidates: { side: Side; f: NystagmusFeatures }[] = [];
  for (const [side, f] of [['right', dhR], ['left', dhL]] as [Side, NystagmusFeatures | undefined][]) {
    if (!f?.present || f.vertical !== 'up') continue;
    pcCandidates.push({ side, f });
  }
  // se ambos os lados têm upbeat, privilegia os que têm torção concordante, ou o mais intenso
  let pcList = pcCandidates;
  if (pcCandidates.length === 2) {
    const concord = pcCandidates.filter((c) => c.f.torsional === c.side);
    if (concord.length === 1) pcList = concord;
    else if (concord.length === 0) {
      const strongest = pcCandidates.reduce((a, b) => (spvTotal(b.f) > spvTotal(a.f) ? b : a));
      pcList = [strongest];
    }
  }
  for (const { side, f } of pcList) {
    const rationale = [`Dix-Hallpike ${lado(side)}: ${describe(f)}.`];
    let lik: Likelihood = 'alta';
    if (f.torsional === side) rationale.push(`Componente torsional geotrópico (polo superior para a orelha ${ladoF(side)}, inferior) — típico do canal posterior ${lado(side)}.`);
    else if (f.torsional === 'unknown') {
      lik = 'moderada';
      rationale.push('Torção não medida — confirmar visualmente o componente torsional geotrópico.');
    } else if (f.torsional === 'none') {
      lik = 'moderada';
      rationale.push('Sem componente torsional detetado — atípico; confirmar visualmente.');
    } else {
      lik = 'baixa';
      rationale.push('Torção em sentido oposto ao esperado — padrão atípico; considerar canal anterior contralateral ou causa central.');
    }
    if (f.latency !== null && f.latency > 0) rationale.push(`Latência de ${f.latency} s (típico: 1–20 s).`);
    else if (f.latency === 0) {
      rationale.push('Sem latência evidente (atípico para canalolitíase).');
      if (lik === 'alta') lik = 'moderada';
    }
    if (pcCandidates.length === 2 && pcList.length === 2) rationale.push('Upbeat-torsional concordante em ambos os lados: considerar VPPB bilateral (p. ex. pós-TCE).');

    const cupulo = f.persistent || (f.duration ?? 0) > 60;
    if (cupulo) {
      rationale.push('Duração > 60 s / persistente — sugere cupulolitíase.');
      H.push({
        id: `pc-cupulo-${side}`,
        title: `VPPB do canal posterior ${lado(side)} — cupulolitíase`,
        likelihood: lik === 'alta' ? 'moderada' : lik,
        category: 'vppb',
        rationale,
        maneuvers: [semont(side), epley(side)],
      });
    } else {
      if (f.duration !== null) rationale.push(`Duração ${f.duration} s (< 60 s), compatível com canalolitíase.`);
      if (f.crescendoDecrescendo) rationale.push('Perfil crescendo-decrescendo.');
      H.push({
        id: `pc-canalo-${side}`,
        title: `VPPB do canal posterior ${lado(side)} — canalolitíase`,
        likelihood: lik,
        category: 'vppb',
        rationale,
        maneuvers: [epley(side), semont(side)],
      });
    }
  }

  // ---------------- Canal anterior / downbeat posicional ----------------
  const down = ([['Dix-Hallpike direito', dhR], ['Dix-Hallpike esquerdo', dhL], ['Head-hanging', hh]] as [string, NystagmusFeatures | undefined][])
    .filter(([, f]) => f?.present && f.vertical === 'down');
  if (down.length) {
    const withTor = down.find(([, f]) => f!.torsional === 'right' || f!.torsional === 'left');
    const anyPersistentNoLatency = down.some(([, f]) => f!.persistent && (f!.latency ?? 0) < 1);
    const rationale = down.map(([n, f]) => `${n}: ${describe(f!)}.`);
    const sideTxt = withTor ? ` (torção sugere lado ${lado(withTor[1]!.torsional as Side)} — lateralização pouco fiável)` : '';
    H.push({
      id: 'ac',
      title: `VPPB do canal anterior${sideTxt}`,
      likelihood: withTor && !anyPersistentNoLatency ? 'moderada' : 'baixa',
      category: 'vppb',
      rationale: [...rationale, 'Nistagmo downbeat posicional (± torsional) é compatível com canal anterior, que é raro — diagnóstico de exclusão.'],
      maneuvers: [yacovino()],
    });
    H.push({
      id: 'central-positional',
      title: 'Nistagmo posicional de origem central (downbeat)',
      likelihood: !withTor || anyPersistentNoLatency ? 'moderada' : 'baixa',
      category: 'central',
      rationale: [
        'Downbeat posicional pode ter origem central (cerebelo/tronco — p. ex. lesões da fossa posterior, degenerescência cerebelosa, Chiari).',
        !withTor ? 'Ausência de componente torsional favorece origem central.' : 'Componente torsional presente.',
        anyPersistentNoLatency ? 'Persistente e sem latência — sinais de alarme.' : '',
      ].filter(Boolean),
      maneuvers: [],
    });
    if (!withTor || anyPersistentNoLatency) red.push('Downbeat posicional puro e/ou persistente sem latência: excluir causa central (exame neurológico, considerar RM-CE com estudo da fossa posterior).');
  }

  // horizontal predominante no Dix-Hallpike → pensar em canal horizontal
  for (const [side, f] of [['right', dhR], ['left', dhL]] as [Side, NystagmusFeatures | undefined][]) {
    if (f?.present && f.horizontal !== 'none' && f.vertical === 'none' && !(rollR && rollL))
      next.push(`Nistagmo horizontal no Dix-Hallpike ${lado(side)}: realizar supine roll test (suspeita de canal horizontal).`);
  }

  // ---------------- Canal horizontal ----------------
  if (rollR || rollL) {
    const geo = (f: NystagmusFeatures | undefined, ear: Side) =>
      !f?.present || f.horizontal === 'none' ? null : f.horizontal === ear ? 'geo' : 'apo';
    const gR = geo(rollR, 'right');
    const gL = geo(rollL, 'left');
    const iR = rollR?.peakSpvH ?? 0;
    const iL = rollL?.peakSpvH ?? 0;
    const rationale = [
      rollR ? `Roll à direita: ${describe(rollR)}${gR ? ` → ${gR === 'geo' ? 'geotrópico' : 'apogeotrópico'}` : ''}.` : 'Roll à direita: não realizado.',
      rollL ? `Roll à esquerda: ${describe(rollL)}${gL ? ` → ${gL === 'geo' ? 'geotrópico' : 'apogeotrópico'}` : ''}.` : 'Roll à esquerda: não realizado.',
    ];
    const ratio = Math.max(iR, iL) / Math.max(0.1, Math.min(iR, iL));
    const clearLat = ratio >= 1.25;
    if (gR === 'geo' && gL === 'geo') {
      const affected: Side = iR >= iL ? 'right' : 'left';
      rationale.push(`Geotrópico bilateral → canalolitíase do canal horizontal. Lado afetado = lado com nistagmo mais intenso (${lado(affected)}: ${Math.max(iR, iL)} vs ${Math.min(iR, iL)} °/s).`);
      if (!clearLat) rationale.push('Diferença de intensidade pequena — lateralização incerta; considerar bow-and-lean test.');
      H.push({
        id: `hc-geo-${affected}`,
        title: `VPPB do canal horizontal ${lado(affected)} — geotrópico (canalolitíase)`,
        likelihood: clearLat ? 'alta' : 'moderada',
        category: 'vppb',
        rationale,
        maneuvers: [lempert(affected), gufoniGeo(affected), vannucchi(affected)],
      });
    } else if (gR === 'apo' && gL === 'apo') {
      const affected: Side = iR <= iL ? 'right' : 'left';
      rationale.push(`Apogeotrópico bilateral → cupulolitíase ou partículas no braço anterior do canal horizontal. Lado afetado = lado com nistagmo MENOS intenso (${lado(affected)}).`);
      if (!clearLat) rationale.push('Diferença de intensidade pequena — lateralização incerta; considerar bow-and-lean test.');
      if ((rollR?.persistent || rollL?.persistent)) rationale.push('Nistagmo persistente — favorece cupulolitíase.');
      H.push({
        id: `hc-apo-${affected}`,
        title: `VPPB do canal horizontal ${lado(affected)} — apogeotrópico`,
        likelihood: clearLat ? 'alta' : 'moderada',
        category: 'vppb',
        rationale,
        maneuvers: [gufoniApo(affected)],
      });
      red.push('VPPB apogeotrópica persistente e refratária pode mimetizar nistagmo posicional central — reavaliar se não houver resposta às manobras.');
    } else if (gR && gL) {
      // um geo e outro apo = mesmo sentido em ambos os lados → direção fixa
      rationale.push('Nistagmo horizontal com a MESMA direção em ambos os lados (direção fixa) — não é padrão de VPPB do canal horizontal.');
      H.push({
        id: 'direction-fixed',
        title: 'Nistagmo espontâneo modulado pela posição (direção fixa)',
        likelihood: 'moderada',
        category: 'periferico',
        rationale: [...rationale, 'Sugere nistagmo espontâneo (p. ex. neurite vestibular, fase de Ménière) agravado pela posição; avaliar nistagmo espontâneo e HINTS.'],
        maneuvers: [],
      });
      next.push('Gravar nistagmo espontâneo e olhar excêntrico; realizar head impulse test (HINTS).');
    } else if (gR || gL) {
      const s: Side = gR ? 'right' : 'left';
      const type = (gR ?? gL) === 'geo' ? 'geotrópico' : 'apogeotrópico';
      rationale.push(`Apenas um lado com nistagmo horizontal (${type}).`);
      H.push({
        id: 'hc-partial',
        title: 'Possível VPPB do canal horizontal (dados incompletos)',
        likelihood: 'baixa',
        category: 'vppb',
        rationale,
        maneuvers: [],
      });
      next.push(!(rollR && rollL) ? 'Completar o supine roll test do lado oposto para lateralizar.' : `Roll ${s === 'right' ? 'esquerdo' : 'direito'} sem nistagmo detetado — confirmar visualmente; repetir prova.`);
    }
    if ((rollR?.present && rollR.vertical === 'down') || (rollL?.present && rollL.vertical === 'down'))
      red.push('Componente vertical (downbeat) durante o roll test — atípico para VPPB.');
  }

  // ---------------- Espontâneo / olhar ----------------
  if (spont?.present) {
    const pureV = spont.vertical !== 'none' && spont.horizontal === 'none';
    const pureT = (spont.torsional === 'right' || spont.torsional === 'left') && spont.horizontal === 'none' && spont.vertical === 'none';
    if (pureV || pureT) {
      H.push({
        id: 'central-spont',
        title: `Nistagmo espontâneo ${pureV ? (spont.vertical === 'down' ? 'downbeat' : 'upbeat') : 'torsional puro'} — sugestivo de causa central`,
        likelihood: 'alta',
        category: 'central',
        rationale: [`Espontâneo: ${describe(spont)}.`, 'Nistagmo espontâneo vertical ou torsional puro raramente é periférico.'],
        maneuvers: [],
      });
      red.push('Nistagmo espontâneo vertical/torsional puro: avaliação neurológica urgente e neuroimagem.');
    } else if (spont.horizontal !== 'none') {
      const s = spont.horizontal as Side;
      const rationale = [`Espontâneo: ${describe(spont)}.`];
      let central = false;
      if (gzR?.present && gzL?.present && gzR.horizontal === 'right' && gzL.horizontal === 'left') central = true;
      if (gzR || gzL) {
        const same = gzR?.horizontal === s || gzL?.horizontal === s;
        if (same && !central) rationale.push(`Olhar excêntrico mantém a direção (bate para a ${ladoF(s)}) — compatível com lei de Alexander.`);
      }
      if (!central) {
        H.push({
          id: 'peripheral-avs',
          title: `Padrão vestibular periférico (hipofunção do lado ${lado(oposto(s))}?)`,
          likelihood: 'moderada',
          category: 'periferico',
          rationale: [
            ...rationale,
            `Nistagmo horizontal(-torsional) unidirecional a bater para a ${ladoF(s)} sugere hipofunção vestibular ${lado(oposto(s))} (p. ex. neurite vestibular) se síndrome vestibular aguda.`,
            'Confirmar com HINTS: head impulse positivo para o lado lesado, sem nistagmo de direção alternante, sem skew deviation.',
          ],
          maneuvers: [],
        });
        next.push('Realizar head impulse test (vHIT se disponível) e pesquisa de skew deviation (cover test).');
      }
    }
  }
  if (gzR?.present && gzL?.present && gzR.horizontal === 'right' && gzL.horizontal === 'left') {
    H.push({
      id: 'central-gaze',
      title: 'Nistagmo evocado pelo olhar com mudança de direção — sinal central (HINTS)',
      likelihood: 'alta',
      category: 'central',
      rationale: [`Olhar à direita: ${describe(gzR)}.`, `Olhar à esquerda: ${describe(gzL)}.`, 'Bate na direção do olhar em ambos os lados.'],
      maneuvers: [],
    });
    red.push('Nistagmo evocado pelo olhar de direção alternante: sinal central no HINTS — excluir AVC da circulação posterior.');
  }

  // sinais de alarme gerais em provas posicionais
  for (const id of ['dh-right', 'dh-left', 'roll-right', 'roll-left', 'head-hanging'] as TestId[]) {
    const f = feat(exam, id);
    if (f?.present && f.directionChangesInPosition && !id.startsWith('roll'))
      red.push(`${TESTS[id].name}: nistagmo muda de direção na mesma posição — atípico; considerar causa central.`);
  }

  const rf = exam.redFlags;
  if (rf.neuroSymptoms) red.push('Sintomas neurológicos associados (diplopia, disartria, disfagia, défice motor/sensitivo): excluir AVC da circulação posterior.');
  if (rf.severeHeadache) red.push('Cefaleia intensa/súbita associada: excluir causa vascular (disseção, hemorragia).');
  if (rf.cannotWalk) red.push('Incapacidade de marcha / ataxia de tronco grave: sinal de alarme central.');
  if (rf.hearingLossAcute) red.push('Hipoacusia súbita associada: considerar labirintite ou isquemia da AICA — avaliação urgente.');
  if (rf.vascularRisk && (rf.neuroSymptoms || rf.cannotWalk)) red.push('Fatores de risco vascular + sinais neurológicos: elevada suspeita de AVC.');

  // ---------------- próximos passos genéricos ----------------
  const done = (id: TestId) => !!exam.tests[id]?.features;
  if (!done('dh-right') || !done('dh-left')) next.push('Realizar Dix-Hallpike bilateral.');
  if (done('dh-right') && done('dh-left') && !dhR!.present && !dhL!.present && !(done('roll-right') && done('roll-left')))
    next.push('Dix-Hallpike negativo bilateralmente: realizar supine roll test (canal horizontal).');
  if (H.some((h) => h.category === 'vppb' && h.maneuvers.length))
    next.push('Após a manobra, repetir a prova diagnóstica para confirmar resolução; reavaliar em 1–4 semanas.');

  if (H.length === 0 && Object.values(exam.tests).some((t) => t?.features)) {
    H.push({
      id: 'none',
      title: 'Sem nistagmo patológico nas provas realizadas',
      likelihood: 'moderada',
      category: 'info',
      rationale: ['Considerar VPPB "subjetiva" (vertigem posicional sem nistagmo), repetir noutro momento, ou outras causas de tontura.'],
      maneuvers: [],
    });
  }

  H.sort((a, b) => rank[b.likelihood] - rank[a.likelihood] || catOrder(a.category) - catOrder(b.category));
  return { hypotheses: H, redFlags: dedupe(red), nextSteps: dedupe(next) };
}

function spvTotal(f: NystagmusFeatures) {
  return Math.hypot(f.peakSpvH, f.peakSpvV, f.peakSpvT);
}
function catOrder(c: Category) {
  return { central: 0, vppb: 1, periferico: 2, info: 3 }[c];
}
function dedupe(a: string[]) {
  return [...new Set(a)];
}
