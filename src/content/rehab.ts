/**
 * Catálogo de exercícios de reabilitação vestibular em casa: Cawthorne-Cooksey, estabilização do olhar
 * (VOR x1/x2) e equilíbrio/marcha. ⚠ O programa deve ser prescrito e ajustado pelo médico/fisioterapeuta.
 */
export interface Exercise {
  id: string;
  name: string;
  group: 'cc-bed' | 'cc-sit' | 'cc-stand' | 'cc-move' | 'gaze' | 'balance';
  steps: string[];
  dose: string;
  /** duração por série (s) para o temporizador */
  seconds?: number;
  /** metrónomo sugerido (bpm) */
  bpm?: number;
  /** rota de exercício interativo */
  interactive?: string;
  safety?: string;
}

export const GROUPS: Record<Exercise['group'], string> = {
  'cc-bed': 'Cawthorne-Cooksey — na cama ou sentado',
  'cc-sit': 'Cawthorne-Cooksey — sentado',
  'cc-stand': 'Cawthorne-Cooksey — de pé',
  'cc-move': 'Cawthorne-Cooksey — em movimento',
  gaze: 'Estabilização do olhar',
  balance: 'Equilíbrio e marcha',
};

export const EXERCISES: Exercise[] = [
  { id: 'cc-eyes', group: 'cc-bed', name: 'Movimentos dos olhos', steps: ['Sem mexer a cabeça, olhe para cima e para baixo.', 'Depois para a esquerda e para a direita.', 'Comece devagar e aumente a velocidade.'], dose: '20 vezes cada direção', seconds: 60 },
  { id: 'cc-focus', group: 'cc-bed', name: 'Focar o dedo', steps: ['Estique o braço com o polegar levantado.', 'Aproxime o polegar até ~30 cm da cara e volte a afastar, sempre focado nele.'], dose: '20 vezes', seconds: 60 },
  { id: 'cc-head', group: 'cc-bed', name: 'Movimentos da cabeça', steps: ['Dobre a cabeça para a frente e para trás.', 'Rode a cabeça de um lado para o outro.', 'Comece devagar, aumente a velocidade. Repita de olhos fechados quando ficar fácil.'], dose: '20 vezes cada', seconds: 90, bpm: 60 },
  { id: 'cc-shoulders', group: 'cc-sit', name: 'Ombros', steps: ['Encolha os ombros e rode-os para trás e para a frente.'], dose: '20 vezes', seconds: 45 },
  { id: 'cc-bend', group: 'cc-sit', name: 'Apanhar objetos do chão', steps: ['Sentado, incline-se para a frente e apanhe um objeto do chão.', 'Volte a sentar-se direito e levante o objeto acima da cabeça, seguindo-o com os olhos.'], dose: '20 vezes', seconds: 90, safety: 'Faça-o junto a uma mesa ou parede.' },
  { id: 'cc-sitstand', group: 'cc-stand', name: 'Sentar e levantar', steps: ['Levante-se de uma cadeira e volte a sentar-se.', 'Primeiro de olhos abertos, depois fechados.'], dose: '20 vezes', seconds: 90, safety: 'Tenha alguém por perto nas primeiras vezes de olhos fechados.' },
  { id: 'cc-ball', group: 'cc-stand', name: 'Bola de mão em mão', steps: ['De pé, passe uma bola pequena de uma mão para a outra acima do nível dos olhos, seguindo-a com o olhar.', 'Depois passe-a por baixo de um joelho, alternando.'], dose: '20 vezes', seconds: 60 },
  { id: 'cc-turn', group: 'cc-stand', name: 'Rodar sobre si', steps: ['De pé, dê uma volta completa sobre si mesmo, devagar.', 'Pare, recupere, e rode para o outro lado.'], dose: '5 voltas cada lado', seconds: 60, safety: 'Junto a um canto da casa, com cadeira à frente.' },
  { id: 'cc-walk', group: 'cc-move', name: 'Andar pela sala', steps: ['Ande pela sala de olhos abertos.', 'Depois ande a rodar a cabeça para os lados.', 'Suba e desça um degrau ou rampa.'], dose: '2–3 minutos', seconds: 180 },
  { id: 'cc-catch', group: 'cc-move', name: 'Atirar e apanhar', steps: ['Atire uma bola contra a parede e apanhe-a, ou jogue com alguém.', 'Inclua mudanças de direção e baixar-se.'], dose: '2–3 minutos', seconds: 180 },
  { id: 'vor1-h', group: 'gaze', name: 'VOR x1 horizontal', steps: ['Fixe uma letra à altura dos olhos (ou o alvo no ecrã) a 1–1,5 m.', 'Rode a cabeça para um lado e para o outro (~20°) sem deixar a letra «fugir» de foco.', 'Aumente a velocidade enquanto a letra se mantiver nítida.'], dose: '1–2 min, 3–5 vezes por dia', seconds: 60, bpm: 120, interactive: '/doente/vor' },
  { id: 'vor1-v', group: 'gaze', name: 'VOR x1 vertical', steps: ['Como o horizontal, mas acenando «sim» com a cabeça.'], dose: '1–2 min, 3–5 vezes por dia', seconds: 60, bpm: 120, interactive: '/doente/vor' },
  { id: 'vor2', group: 'gaze', name: 'VOR x2', steps: ['O alvo move-se para um lado enquanto a cabeça roda para o lado oposto.', 'Mantenha o alvo nítido.'], dose: '1 min, 3 vezes por dia (só quando o x1 estiver fácil)', seconds: 60, bpm: 90, interactive: '/doente/vor' },
  { id: 'bal-romberg', group: 'balance', name: 'De pé com pés juntos', steps: ['Pés juntos, braços cruzados, 30 s de olhos abertos.', 'Quando fácil: olhos fechados; depois numa almofada.'], dose: '3 × 30 s', seconds: 30, safety: 'Num canto da casa, com uma cadeira à frente.' },
  { id: 'bal-tandem', group: 'balance', name: 'Tandem (pé à frente do outro)', steps: ['Um pé imediatamente à frente do outro, 30 s.', 'Troque o pé da frente.'], dose: '3 × 30 s cada', seconds: 30, safety: 'Junto a uma bancada para se apoiar.' },
  { id: 'bal-oneleg', group: 'balance', name: 'Apoio num pé', steps: ['Fique num pé só até 30 s.', 'Troque de pé.'], dose: '3 × cada pé', seconds: 30 },
  { id: 'bal-headturns', group: 'balance', name: 'Andar a rodar a cabeça', steps: ['Ande em linha reta num corredor rodando a cabeça para a esquerda e direita a cada 2–3 passos.', 'Depois acenando para cima e para baixo.'], dose: '3 percursos', seconds: 120, bpm: 60 },
];

export const getExercise = (id: string) => EXERCISES.find((e) => e.id === id);

/** Programa por defeito (pós-nevrite / hipofunção unilateral). */
export const DEFAULT_PROGRAM = ['cc-eyes', 'cc-head', 'vor1-h', 'vor1-v', 'bal-romberg', 'bal-headturns'];

/** Ficheiro .ics com lembretes diários recorrentes (abre no calendário do telemóvel). */
export function icsReminders(times: string[], title = 'Exercícios de reabilitação vestibular (Vertigo)') {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date();
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = times.map((t, i) => {
    const [h, m] = t.split(':');
    return [
      'BEGIN:VEVENT',
      `UID:vertigo-rehab-${date}-${i}@vertigo.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${date}T${pad(Number(h))}${pad(Number(m))}00`,
      'DURATION:PT15M',
      'RRULE:FREQ=DAILY',
      `SUMMARY:${title}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vertigo//PT', ...events, 'END:VCALENDAR'].join('\r\n');
}
