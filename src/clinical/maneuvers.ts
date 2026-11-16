import type { Side } from '../types';

/**
 * Descrições das manobras de reposição.
 * ⚠ Conteúdo clínico a rever e validar pelo médico responsável antes de uso clínico.
 */
export interface Maneuver {
  id: string;
  name: string;
  side?: Side;
  steps: string[];
  notes?: string[];
  reference: string;
  /** passos cuja direção exata deve ser confirmada na literatura/protocolo local */
  needsReview?: boolean;
}

const lado = (s: Side) => (s === 'right' ? 'direita' : 'esquerda');
const oposto = (s: Side): Side => (s === 'right' ? 'left' : 'right');
const LADO = (s: Side) => lado(s).toUpperCase();

export function epley(s: Side): Maneuver {
  return {
    id: `epley-${s}`,
    name: `Manobra de Epley ${lado(s)}`,
    side: s,
    steps: [
      `Doente sentado; rodar a cabeça 45° para a ${LADO(s)}.`,
      `Deitar em decúbito dorsal com a cabeça pendente ~20–30° (posição de Dix-Hallpike ${lado(s)}). Manter 30–60 s / até cessar o nistagmo.`,
      `Rodar a cabeça 90° para a ${LADO(oposto(s))} (fica 45° para a ${lado(oposto(s))}), mantendo a extensão. 30–60 s.`,
      `Rodar o corpo para decúbito lateral ${lado(oposto(s))} e a cabeça mais 90° (nariz a apontar para o chão, 45°). 30–60 s.`,
      'Sentar o doente mantendo a cabeça rodada; depois endireitar a cabeça com ligeira flexão.',
    ],
    notes: ['Repetir até 2–3 vezes na mesma sessão se o Dix-Hallpike de controlo permanecer positivo.'],
    reference: 'Bhattacharyya N et al. Clinical Practice Guideline: BPPV (Update). Otolaryngol Head Neck Surg 2017;156(3_suppl):S1–S47.',
  };
}

export function semont(s: Side): Maneuver {
  return {
    id: `semont-${s}`,
    name: `Manobra de Semont ${lado(s)} (liberatória)`,
    side: s,
    steps: [
      `Doente sentado na borda da marquesa; rodar a cabeça 45° para a ${LADO(oposto(s))} (lado são).`,
      `Deitar rapidamente sobre o lado ${LADO(s)} (afetado), mantendo a rotação da cabeça (face virada para cima). 1–3 min.`,
      `Num movimento rápido e contínuo, passar pela posição sentada para o lado ${LADO(oposto(s))}, sem alterar a rotação da cabeça (nariz agora a apontar para o chão). 1–3 min.`,
      'Regressar lentamente à posição sentada.',
    ],
    notes: ['Preferível na cupulolitíase do canal posterior (nistagmo persistente > 60 s) e em doentes com limitação cervical para extensão.'],
    reference: 'Semont A et al. Adv Otorhinolaryngol 1988;42:290–3; Bhattacharyya 2017.',
  };
}

export function lempert(affected: Side): Maneuver {
  const so = oposto(affected);
  return {
    id: `lempert-${affected}`,
    name: `Manobra de Lempert (barbecue 360°) — rotação para a ${lado(so)}`,
    side: affected,
    steps: [
      `Doente em decúbito dorsal; cabeça rodada 90° para a ${LADO(affected)} (lado afetado).`,
      'Rodar a cabeça para a posição neutra (face para cima). 30–60 s.',
      `Rodar mais 90° para a ${LADO(so)} (orelha ${lado(so)} para baixo). 30–60 s.`,
      'Rodar o corpo para decúbito ventral (apoiado nos cotovelos, nariz para baixo). 30–60 s.',
      `Continuar a rodar para a ${lado(so)} até à orelha ${lado(affected)} para baixo (360° completos). 30–60 s.`,
      'Regressar à posição sentada pelo lado.',
    ],
    notes: ['Cada passo deve ser mantido até cessar o nistagmo. Alternativa: Gufoni ou posição forçada prolongada (Vannucchi) sobre o lado são.'],
    reference: 'Lempert T, Tiel-Wilck K. Laryngoscope 1996;106:476–8; Bhattacharyya 2017.',
  };
}

export function gufoniGeo(affected: Side): Maneuver {
  const so = oposto(affected);
  return {
    id: `gufoni-geo-${affected}`,
    name: `Manobra de Gufoni (variante geotrópica) — deitar sobre a ${lado(so)}`,
    side: affected,
    steps: [
      'Doente sentado na borda da marquesa, cabeça em posição neutra.',
      `Deitar rapidamente sobre o lado ${LADO(so)} (lado SÃO). Manter 1–2 min após cessar o nistagmo.`,
      'Rodar rapidamente a cabeça 45° para baixo (nariz em direção ao chão). Manter 2 min.',
      'Regressar lentamente à posição sentada.',
    ],
    reference: 'Gufoni M et al. Acta Otorhinolaryngol Ital 1998;18:363–7; Mandalà M et al. Neurology 2013;80:2209.',
  };
}

export function gufoniApo(affected: Side): Maneuver {
  return {
    id: `gufoni-apo-${affected}`,
    name: `Manobra de Gufoni (variante apogeotrópica) — deitar sobre a ${lado(affected)}`,
    side: affected,
    steps: [
      'Doente sentado na borda da marquesa, cabeça em posição neutra.',
      `Deitar rapidamente sobre o lado ${LADO(affected)} (lado AFETADO). Manter 1–2 min.`,
      'Rodar rapidamente a cabeça 45° (sentido a confirmar no protocolo local — ver nota). Manter 2 min.',
      'Regressar lentamente à posição sentada. Reavaliar: a conversão para forma geotrópica indica mobilização das partículas.',
    ],
    notes: [
      'As descrições publicadas da variante apogeotrópica diferem no sentido da rotação final da cabeça — confirmar no protocolo do serviço antes de usar.',
      'Alternativas: head-shaking em flexão (Kim 2012) ou manobras de conversão; se converter para geotrópico, tratar como forma geotrópica.',
    ],
    reference: 'Kim JS et al. Neurology 2012;78:159–66; Appiani GC et al. Otol Neurotol 2005;26:257–60.',
    needsReview: true,
  };
}

export function vannucchi(affected: Side): Maneuver {
  const so = oposto(affected);
  return {
    id: `vannucchi-${affected}`,
    name: `Posição forçada prolongada (Vannucchi) sobre a ${lado(so)}`,
    side: affected,
    steps: [`Dormir/permanecer deitado sobre o lado ${LADO(so)} (lado são) durante ~8–12 h.`],
    reference: 'Vannucchi P et al. J Vestib Res 1997;7:1–6.',
  };
}

export function yacovino(): Maneuver {
  return {
    id: 'yacovino',
    name: 'Manobra de Yacovino (deep head hanging) — canal anterior',
    steps: [
      'Doente sentado, cabeça em posição neutra (não é necessário lateralizar).',
      'Deitar com a cabeça pendente ≥ 30° abaixo da horizontal, na linha média. 30 s.',
      'Ainda em decúbito, fletir a cabeça com o queixo ao peito. 30 s.',
      'Sentar mantendo a cabeça fletida. 30 s.',
    ],
    reference: 'Yacovino DA et al. J Neurol 2009;256:1851–5.',
  };
}
