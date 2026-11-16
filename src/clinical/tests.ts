import type { TestDefinition, TestId } from '../types';

export const TESTS: Record<TestId, TestDefinition> = {
  'dh-right': {
    id: 'dh-right',
    name: 'Dix-Hallpike direito',
    short: 'DH dir.',
    downEar: 'right',
    instructions: [
      'Doente sentado na marquesa, cabeça rodada 45° para a DIREITA.',
      'Iniciar a gravação com os olhos do doente bem visíveis (abertos, sem fixação se possível).',
      'Deitar rapidamente o doente em decúbito dorsal com a cabeça pendente ~20–30° abaixo da horizontal.',
      'Carregar em «Posição atingida» assim que a posição for alcançada.',
      'Manter a gravação ≥ 30–45 s ou até o nistagmo terminar.',
    ],
  },
  'dh-left': {
    id: 'dh-left',
    name: 'Dix-Hallpike esquerdo',
    short: 'DH esq.',
    downEar: 'left',
    instructions: [
      'Doente sentado na marquesa, cabeça rodada 45° para a ESQUERDA.',
      'Iniciar a gravação com os olhos do doente bem visíveis.',
      'Deitar rapidamente o doente em decúbito dorsal com a cabeça pendente ~20–30° abaixo da horizontal.',
      'Carregar em «Posição atingida» assim que a posição for alcançada.',
      'Manter a gravação ≥ 30–45 s ou até o nistagmo terminar.',
    ],
  },
  'roll-right': {
    id: 'roll-right',
    name: 'Supine roll test — cabeça à direita',
    short: 'Roll dir.',
    downEar: 'right',
    instructions: [
      'Doente em decúbito dorsal com a cabeça fletida ~30° (almofada).',
      'Iniciar a gravação; rodar rapidamente a cabeça 90° para a DIREITA.',
      'Carregar em «Posição atingida» e gravar ≥ 30–60 s.',
      'Voltar à posição neutra e aguardar que os sintomas cessem antes do lado oposto.',
    ],
  },
  'roll-left': {
    id: 'roll-left',
    name: 'Supine roll test — cabeça à esquerda',
    short: 'Roll esq.',
    downEar: 'left',
    instructions: [
      'Doente em decúbito dorsal com a cabeça fletida ~30° (almofada).',
      'Iniciar a gravação; rodar rapidamente a cabeça 90° para a ESQUERDA.',
      'Carregar em «Posição atingida» e gravar ≥ 30–60 s.',
    ],
  },
  'head-hanging': {
    id: 'head-hanging',
    name: 'Head-hanging (cabeça pendente na linha média)',
    short: 'Head-hang.',
    instructions: [
      'Doente sentado, cabeça em posição neutra.',
      'Deitar com a cabeça pendente ≥ 30° abaixo da horizontal, na linha média.',
      'Carregar em «Posição atingida» e gravar ≥ 30–45 s. Útil na suspeita de canal anterior.',
    ],
  },
  spontaneous: {
    id: 'spontaneous',
    name: 'Nistagmo espontâneo (posição primária)',
    short: 'Espontâneo',
    instructions: [
      'Doente sentado, olhar em frente. Idealmente sem fixação (óculos de Frenzel/vídeo ou sala escura com IV).',
      'Gravar 20–30 s. Carregar em «Posição atingida» no início.',
    ],
  },
  'gaze-right': {
    id: 'gaze-right',
    name: 'Olhar excêntrico à direita (~30°)',
    short: 'Olhar dir.',
    instructions: [
      'Pedir ao doente que olhe ~30° para a DIREITA (não mais — evita nistagmo de posição extrema fisiológico).',
      'Gravar 15–20 s.',
    ],
  },
  'gaze-left': {
    id: 'gaze-left',
    name: 'Olhar excêntrico à esquerda (~30°)',
    short: 'Olhar esq.',
    instructions: [
      'Pedir ao doente que olhe ~30° para a ESQUERDA.',
      'Gravar 15–20 s.',
    ],
  },
};

export const TEST_GROUPS: { title: string; ids: TestId[] }[] = [
  { title: 'Canal posterior / anterior', ids: ['dh-right', 'dh-left', 'head-hanging'] },
  { title: 'Canal horizontal', ids: ['roll-right', 'roll-left'] },
  { title: 'Espontâneo e evocado pelo olhar', ids: ['spontaneous', 'gaze-right', 'gaze-left'] },
];
