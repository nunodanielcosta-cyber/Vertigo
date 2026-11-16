/**
 * Convenções de sinal (sempre no referencial do DOENTE):
 *  - H (horizontal): positivo = olho desloca-se para a DIREITA do doente
 *  - V (vertical):   positivo = olho desloca-se para CIMA
 *  - T (torsional):  positivo = polo superior do olho roda para a ORELHA DIREITA do doente
 *                    (= sentido anti-horário visto pelo examinador, de frente para o doente)
 *
 * A direção do nistagmo é, por convenção clínica, a direção da FASE RÁPIDA,
 * que é oposta à velocidade da fase lenta (SPV).
 */

export type Side = 'right' | 'left';

/** Uma amostra de posição ocular (olho-na-cabeça), em graus estimados. */
export interface EyeSample {
  t: number; // segundos desde o início da gravação
  h: number;
  v: number;
  /** NaN quando a torção não pôde ser medida neste frame */
  tor: number;
  /** false durante pestanejo / perda de tracking */
  valid: boolean;
}

export interface Recording {
  samples: EyeSample[];
  /** instante (s) em que a posição de teste foi atingida (fim da manobra) */
  t0: number;
  source: 'camera' | 'file' | 'synthetic';
  mode: 'face' | 'closeup' | 'synthetic';
  fps: number;
  torsionAvailable: boolean;
}

export interface FastPhase {
  t: number; // instante central
  dh: number;
  dv: number;
  dt: number;
}

export interface WindowStat {
  t: number; // centro da janela
  spvH: number;
  spvV: number;
  spvT: number;
  beats: number;
  /** nistagmo considerado ativo nesta janela */
  active: boolean;
}

export type HDir = 'right' | 'left' | 'none';
export type VDir = 'up' | 'down' | 'none';
/** torsional: polo superior bate para a orelha direita/esquerda do doente */
export type TDir = 'right' | 'left' | 'none' | 'unknown';

/** Características clínicas do nistagmo — podem vir da análise automática ou ser editadas pelo clínico. */
export interface NystagmusFeatures {
  present: boolean;
  horizontal: HDir;
  vertical: VDir;
  torsional: TDir;
  /** SPV de pico (°/s) por componente, valor absoluto */
  peakSpvH: number;
  peakSpvV: number;
  peakSpvT: number;
  /** s desde t0 até ao início; null se ausente */
  latency: number | null;
  /** s de duração; null se ausente */
  duration: number | null;
  /** ainda presente no fim da gravação */
  persistent: boolean;
  /** perfil crescendo-decrescendo */
  crescendoDecrescendo: boolean;
  /** inversão da direção horizontal/vertical dentro da mesma posição */
  directionChangesInPosition: boolean;
  /** frequência média (batimentos/s) durante a fase ativa */
  frequency: number;
  /** 0–1: confiança da análise automática (qualidade de sinal) */
  confidence: number;
  /** foi editado manualmente pelo clínico */
  edited?: boolean;
}

export interface AnalysisResult {
  features: NystagmusFeatures;
  fastPhases: FastPhase[];
  windows: WindowStat[];
  /** sinal reamostrado usado na análise */
  t: number[];
  h: number[];
  v: number[];
  tor: number[];
  validFraction: number;
  notes: string[];
}

export type TestId =
  | 'dh-right'
  | 'dh-left'
  | 'roll-right'
  | 'roll-left'
  | 'spontaneous'
  | 'gaze-right'
  | 'gaze-left'
  | 'head-hanging';

export interface TestDefinition {
  id: TestId;
  name: string;
  short: string;
  instructions: string[];
  /** ouvido inferior na posição de teste, se aplicável */
  downEar?: Side;
}

export interface TestRecord {
  id: TestId;
  analysis?: AnalysisResult;
  features?: NystagmusFeatures;
  recordedAt?: string;
  /** instante (s) em que a posição foi atingida */
  t0?: number;
  /** URL local (blob) do vídeo gravado — não é persistido */
  videoUrl?: string;
}

export interface RedFlagsInput {
  neuroSymptoms: boolean; // diplopia, disartria, disfagia, fraqueza, alteração sensitiva
  severeHeadache: boolean;
  cannotWalk: boolean; // ataxia de tronco / incapacidade de marcha
  hearingLossAcute: boolean;
  vascularRisk: boolean;
}

export interface Exam {
  id: string;
  label: string;
  createdAt: string;
  tests: Partial<Record<TestId, TestRecord>>;
  redFlags: RedFlagsInput;
}
