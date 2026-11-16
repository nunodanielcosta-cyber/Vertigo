/**
 * Questionários e escalas: DHI, VSS-SF, ABC, NPQ, MSSQ-short; risco de queda: TUG, DGI, FGA, Berg.
 * ⚠ Traduções de trabalho para uso clínico interno — para investigação/publicação usar as versões
 * portuguesas validadas e respeitar os direitos de autor de cada instrumento.
 */
export type Tone = 'ok' | 'warn' | 'bad' | 'info';
export interface Item { text: string; sub?: string; timed?: number /* s, cronómetro sugerido */ }
export interface ScaleResult { total: number; max: number; display: string; subs: { name: string; value: string }[]; interpretation: string; tone: Tone; complete: boolean }
export interface Scale {
  id: string;
  name: string;
  short: string;
  group: 'questionnaire' | 'fall';
  desc: string;
  instructions: string;
  options: [number, string][] | 'percent' | 'mssq';
  items: Item[];
  /** secção dupla (MSSQ: infância / últimos 10 anos) */
  sections?: string[];
  score(v: (number | null)[]): ScaleResult;
  reference: string;
}

const sum = (v: (number | null)[]) => v.reduce<number>((a, b) => a + (b ?? 0), 0);
const answered = (v: (number | null)[]) => v.filter((x) => x !== null && x !== undefined).length;
const subSum = (items: Item[], v: (number | null)[], s: string) => items.reduce((a, it, i) => a + (it.sub === s ? v[i] ?? 0 : 0), 0);

/* ------------------------------------------------------------------ */
const DHI_ITEMS: Item[] = [
  ['Olhar para cima agrava o seu problema?', 'P'],
  ['Sente-se frustrado(a) por causa do seu problema?', 'E'],
  ['Restringe as suas viagens de trabalho ou lazer por causa do seu problema?', 'F'],
  ['Andar pelos corredores de um supermercado agrava o seu problema?', 'P'],
  ['Tem dificuldade em deitar-se ou levantar-se da cama por causa do seu problema?', 'F'],
  ['O seu problema limita significativamente a sua participação em atividades sociais (jantar fora, cinema, festas)?', 'F'],
  ['Tem dificuldade em ler por causa do seu problema?', 'F'],
  ['Atividades mais exigentes (desporto, dança, tarefas domésticas como varrer) agravam o seu problema?', 'P'],
  ['Tem medo de sair de casa sem companhia por causa do seu problema?', 'E'],
  ['Sente-se envergonhado(a) diante de outras pessoas por causa do seu problema?', 'E'],
  ['Movimentos rápidos da cabeça agravam o seu problema?', 'P'],
  ['Evita lugares altos por causa do seu problema?', 'F'],
  ['Virar-se na cama agrava o seu problema?', 'P'],
  ['Tem dificuldade em fazer trabalhos domésticos pesados ou de jardinagem por causa do seu problema?', 'F'],
  ['Tem medo que as pessoas pensem que está embriagado(a) por causa do seu problema?', 'E'],
  ['Tem dificuldade em ir passear sozinho(a) por causa do seu problema?', 'F'],
  ['Andar pelo passeio agrava o seu problema?', 'P'],
  ['Tem dificuldade em concentrar-se por causa do seu problema?', 'E'],
  ['Tem dificuldade em andar pela casa no escuro por causa do seu problema?', 'F'],
  ['Tem medo de ficar sozinho(a) em casa por causa do seu problema?', 'E'],
  ['Sente-se incapacitado(a) por causa do seu problema?', 'E'],
  ['O seu problema prejudica as suas relações com familiares ou amigos?', 'E'],
  ['Sente-se deprimido(a) por causa do seu problema?', 'E'],
  ['O seu problema interfere com o seu trabalho ou responsabilidades em casa?', 'F'],
  ['Inclinar-se para a frente agrava o seu problema?', 'P'],
].map(([text, sub]) => ({ text, sub }));

const DHI: Scale = {
  id: 'dhi', name: 'Dizziness Handicap Inventory (DHI)', short: 'DHI', group: 'questionnaire',
  desc: 'Impacto da tontura na vida diária — físico, emocional e funcional (0–100).',
  instructions: 'Responda a cada pergunta pensando apenas no seu problema de tontura ou desequilíbrio.',
  options: [[4, 'Sim'], [2, 'Às vezes'], [0, 'Não']],
  items: DHI_ITEMS,
  score(v) {
    const total = sum(v);
    const interp = total <= 14 ? 'Incapacidade mínima' : total <= 34 ? 'Incapacidade ligeira' : total <= 52 ? 'Incapacidade moderada' : 'Incapacidade grave';
    return {
      total, max: 100, display: `${total}/100`, complete: answered(v) === 25,
      subs: [{ name: 'Físico (P)', value: `${subSum(DHI_ITEMS, v, 'P')}/28` }, { name: 'Emocional (E)', value: `${subSum(DHI_ITEMS, v, 'E')}/36` }, { name: 'Funcional (F)', value: `${subSum(DHI_ITEMS, v, 'F')}/36` }],
      interpretation: `${interp} (0–14 mínima; 16–34 ligeira; 36–52 moderada; ≥ 54 grave). Uma variação ≥ 18 pontos é clinicamente significativa.`,
      tone: total <= 14 ? 'ok' : total <= 34 ? 'info' : total <= 52 ? 'warn' : 'bad',
    };
  },
  reference: 'Jacobson GP, Newman CW. Arch Otolaryngol Head Neck Surg 1990;116:424–7; Whitney SL et al. Otol Neurotol 2004;25:139–43.',
};

/* ------------------------------------------------------------------ */
const VSS_ITEMS: Item[] = [
  ['Sensação de que as coisas giram ou se movem à sua volta, durante menos de 2 minutos', 'V'],
  ['Dores no coração ou no peito', 'A'],
  ['Sensação de calor ou frio súbitos', 'A'],
  ['Instabilidade tão intensa que chega a cair', 'V'],
  ['Náuseas, enjoo', 'V'],
  ['Tensão ou dores musculares', 'A'],
  ['Sensação de cabeça leve, de «flutuar» ou atordoamento', 'V'],
  ['Sensação de que as coisas giram ou se movem, durante 2 minutos a 20 minutos', 'V'],
  ['Transpiração excessiva', 'A'],
  ['Coração a bater forte ou acelerado', 'A'],
  ['Sensação de que as coisas giram ou se movem, durante mais de 20 minutos', 'V'],
  ['Sensação de instabilidade, de ir perder o equilíbrio, durante mais de 20 minutos', 'V'],
  ['Dificuldade em respirar, falta de ar', 'A'],
  ['Sensação de instabilidade, de ir perder o equilíbrio, durante menos de 20 minutos', 'V'],
  ['Sensação de desmaio, de ir perder os sentidos', 'A'],
].map(([text, sub]) => ({ text, sub }));

const VSS: Scale = {
  id: 'vss', name: 'Vertigo Symptom Scale — forma curta (VSS-SF)', short: 'VSS', group: 'questionnaire',
  desc: 'Frequência dos sintomas vestibulares (V) e autonómicos/ansiedade (A) no último ano (0–60).',
  instructions: 'Com que frequência teve cada um destes sintomas nos últimos 12 meses (ou desde o início, se há menos tempo)?',
  options: [[0, 'Nunca'], [1, '1–3 vezes no ano'], [2, '4–12 vezes no ano'], [3, '> 1 vez por mês'], [4, '> 1 vez por semana']],
  items: VSS_ITEMS,
  score(v) {
    const total = sum(v);
    const V = subSum(VSS_ITEMS, v, 'V'), A = subSum(VSS_ITEMS, v, 'A');
    return {
      total, max: 60, display: `${total}/60`, complete: answered(v) === 15,
      subs: [{ name: 'Vertigem-equilíbrio (V)', value: `${V}/32` }, { name: 'Autonómica-ansiedade (A)', value: `${A}/28` }],
      interpretation: total >= 12 ? 'Sintomas frequentes (≥ 12 sugere tontura com impacto relevante).' : 'Sintomas pouco frequentes.',
      tone: total >= 24 ? 'bad' : total >= 12 ? 'warn' : 'ok',
    };
  },
  reference: 'Yardley L et al. J Psychosom Res 1992;36:731–41; Yardley L et al. Br J Gen Pract 1998;48:1131–5.',
};

/* ------------------------------------------------------------------ */
const ABC: Scale = {
  id: 'abc', name: 'Activities-specific Balance Confidence (ABC)', short: 'ABC', group: 'questionnaire',
  desc: 'Confiança no equilíbrio em 16 atividades (0–100 %).',
  instructions: 'Qual a sua confiança (0 % nenhuma, 100 % total) em que NÃO vai perder o equilíbrio nem ficar instável ao…',
  options: 'percent',
  items: [
    'Andar pela casa', 'Subir ou descer escadas', 'Baixar-se e apanhar um chinelo do chão', 'Alcançar uma lata pequena numa prateleira à altura dos olhos',
    'Pôr-se em bicos de pés e alcançar algo acima da cabeça', 'Subir para uma cadeira e alcançar algo', 'Varrer o chão', 'Sair de casa e ir até um carro estacionado perto',
    'Entrar ou sair de um carro', 'Atravessar um parque de estacionamento até um centro comercial', 'Subir ou descer uma rampa', 'Andar num centro comercial cheio de gente',
    'Ser empurrado(a) por outras pessoas ao andar num centro comercial', 'Usar uma escada rolante agarrando-se ao corrimão', 'Usar uma escada rolante sem se agarrar ao corrimão', 'Andar no exterior em passeios escorregadios (gelo, molhado)',
  ].map((text) => ({ text })),
  score(v) {
    const n = answered(v);
    const mean = n ? sum(v) / n : 0;
    return {
      total: Math.round(mean), max: 100, display: `${Math.round(mean)} %`, complete: n === 16, subs: [],
      interpretation: mean < 50 ? 'Confiança baixa (< 50 %): nível funcional baixo; risco de queda.' : mean < 67 ? 'Confiança < 67 %: associada a risco de queda aumentado.' : mean < 80 ? 'Confiança moderada (67–80 %).' : 'Confiança elevada (> 80 %).',
      tone: mean < 50 ? 'bad' : mean < 67 ? 'warn' : mean < 80 ? 'info' : 'ok',
    };
  },
  reference: 'Powell LE, Myers AM. J Gerontol A 1995;50:M28–34; Lajoie Y, Gallagher SP. Arch Gerontol Geriatr 2004;38:11–26.',
};

/* ------------------------------------------------------------------ */
const NPQ_ITEMS: Item[] = [
  ['Estar de pé, direito(a), sem apoio', 'U'], ['Estar de pé durante muito tempo (p. ex. numa fila)', 'U'], ['Andar a passo normal', 'U'], ['Andar depressa ou em espaços abertos', 'U'],
  ['Andar de carro, autocarro ou comboio (movimento passivo)', 'M'], ['Andar de elevador ou escada rolante', 'M'], ['Movimentos rápidos da cabeça ou do corpo', 'M'], ['Baixar-se e levantar-se', 'M'],
  ['Ver televisão, filmes ou jogos com muito movimento', 'V'], ['Olhar para padrões complexos (riscas, papel de parede, chão quadriculado)', 'V'], ['Ler ou fazer scroll num ecrã', 'V'], ['Estar num supermercado ou centro comercial (prateleiras, multidão)', 'V'],
].map(([text, sub]) => ({ text, sub }));

const NPQ: Scale = {
  id: 'npq', name: 'Niigata PPPD Questionnaire (NPQ)', short: 'NPQ', group: 'questionnaire',
  desc: 'Agravamento dos sintomas por postura, movimento e estímulos visuais — apoio ao diagnóstico de PPPD (0–72).',
  instructions: 'Quanto pioram as suas tonturas em cada situação? (0 = nada; 6 = insuportável)',
  options: [[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']],
  items: NPQ_ITEMS,
  score(v) {
    const total = sum(v);
    return {
      total, max: 72, display: `${total}/72`, complete: answered(v) === 12,
      subs: [{ name: 'Postura/marcha', value: `${subSum(NPQ_ITEMS, v, 'U')}/24` }, { name: 'Movimento', value: `${subSum(NPQ_ITEMS, v, 'M')}/24` }, { name: 'Estímulos visuais', value: `${subSum(NPQ_ITEMS, v, 'V')}/24` }],
      interpretation: total >= 27 ? 'Total ≥ 27: sugestivo de PPPD (confirmar pelos critérios da Bárány Society).' : 'Total < 27: PPPD menos provável.',
      tone: total >= 27 ? 'warn' : 'ok',
    };
  },
  reference: 'Yagi C et al. Otol Neurotol 2019;40:e747–52. Itens adaptados — usar a versão validada para investigação.',
};

/* ------------------------------------------------------------------ */
const MSSQ_TRANSPORT = ['Carro', 'Autocarro', 'Comboio', 'Avião', 'Barco pequeno', 'Navio (p. ex. ferry)', 'Baloiço', 'Carrossel / diversões de parque infantil', 'Montanha-russa / diversões de feira'];
const MSSQ: Scale = {
  id: 'mssq', name: 'Motion Sickness Susceptibility Questionnaire — curto (MSSQ)', short: 'MSSQ', group: 'questionnaire',
  desc: 'Suscetibilidade à cinetose (enjoo do movimento) na infância e nos últimos 10 anos.',
  instructions: 'Com que frequência se sentiu enjoado(a) ou maldisposto(a) em cada meio? Escolha «Nunca experimentei» se não se aplica.',
  options: 'mssq',
  sections: ['Infância (antes dos 12 anos)', 'Últimos 10 anos'],
  items: [...MSSQ_TRANSPORT, ...MSSQ_TRANSPORT].map((text, i) => ({ text, sub: i < 9 ? 'A' : 'B' })),
  score(v) {
    // -1 = não experimentou
    const part = (from: number) => {
      const s = v.slice(from, from + 9);
      const na = s.filter((x) => x === -1).length;
      const tot = s.reduce<number>((a, b) => a + (b !== null && b > 0 ? b : 0), 0);
      return na >= 9 ? 0 : (tot * 9) / (9 - na);
    };
    const A = part(0), B = part(9);
    const total = Math.round((A + B) * 10) / 10;
    return {
      total, max: 54, display: `${total.toFixed(1).replace('.', ',')}`, complete: answered(v) === 18,
      subs: [{ name: 'Infância (A)', value: A.toFixed(1).replace('.', ',') }, { name: 'Adulto (B)', value: B.toFixed(1).replace('.', ',') }],
      interpretation: total >= 25 ? 'Suscetibilidade elevada (acima do percentil ~75 da população adulta).' : total >= 11 ? 'Suscetibilidade intermédia (mediana ≈ 11).' : 'Suscetibilidade baixa.',
      tone: total >= 25 ? 'warn' : 'info',
    };
  },
  reference: 'Golding JF. Pers Individ Dif 2006;41:237–48. A suscetibilidade alta é comum na migrânea vestibular.',
};

/* ------------------------------------------------------------------ */
const G4: [number, string][] = [[3, '3 — Normal'], [2, '2 — Alteração ligeira'], [1, '1 — Alteração moderada'], [0, '0 — Alteração grave']];

const DGI: Scale = {
  id: 'dgi', name: 'Dynamic Gait Index (DGI)', short: 'DGI', group: 'fall',
  desc: 'Marcha em 8 tarefas com exigências variáveis (0–24).',
  instructions: 'Pontuar cada tarefa pela categoria mais baixa que se aplica. Percurso de 6 m (20 pés).',
  options: G4,
  items: [
    'Marcha em superfície plana', 'Mudança de velocidade da marcha', 'Marcha com rotação horizontal da cabeça', 'Marcha com movimentos verticais da cabeça',
    'Marcha e rotação sobre si próprio (pivot)', 'Passar por cima de um obstáculo', 'Contornar obstáculos', 'Subir e descer escadas',
  ].map((text) => ({ text })),
  score(v) {
    const total = sum(v);
    return { total, max: 24, display: `${total}/24`, complete: answered(v) === 8, subs: [], interpretation: total <= 19 ? '≤ 19: risco de queda aumentado.' : '> 19: risco de queda baixo.', tone: total <= 19 ? 'bad' : 'ok' };
  },
  reference: 'Shumway-Cook A, Woollacott M. Motor Control 1995; Whitney SL et al. J Vestib Res 2000;10:99–105.',
};

const FGA: Scale = {
  id: 'fga', name: 'Functional Gait Assessment (FGA)', short: 'FGA', group: 'fall',
  desc: 'Versão modificada do DGI, sem efeito de teto (0–30).',
  instructions: 'Percurso de 6 m com 30 cm de largura. Pontuar cada tarefa de 0 a 3.',
  options: G4,
  items: [
    'Marcha em superfície plana', 'Mudança de velocidade', 'Marcha com rotação horizontal da cabeça', 'Marcha com movimentos verticais da cabeça', 'Marcha e rotação sobre si (pivot)',
    'Passar por cima de obstáculo', 'Marcha com base de sustentação estreita (tandem)', 'Marcha de olhos fechados', 'Marcha para trás', 'Subir e descer escadas',
  ].map((text) => ({ text })),
  score(v) {
    const total = sum(v);
    return { total, max: 30, display: `${total}/30`, complete: answered(v) === 10, subs: [], interpretation: total <= 22 ? '≤ 22: risco de queda aumentado.' : '> 22: risco de queda baixo.', tone: total <= 22 ? 'bad' : 'ok' };
  },
  reference: 'Wrisley DM et al. Phys Ther 2004;84:906–18; Wrisley DM, Kumar NA. Phys Ther 2010;90:761–73.',
};

const B5: [number, string][] = [[4, '4'], [3, '3'], [2, '2'], [1, '1'], [0, '0']];
const BERG: Scale = {
  id: 'berg', name: 'Escala de Equilíbrio de Berg', short: 'Berg', group: 'fall',
  desc: 'Equilíbrio estático e dinâmico em 14 tarefas (0–56).',
  instructions: '4 = executa de forma independente e segura no tempo indicado; 0 = incapaz ou precisa de ajuda. Use o cronómetro nas tarefas temporizadas.',
  options: B5,
  items: [
    { text: 'Passar de sentado a de pé' }, { text: 'De pé sem apoio', timed: 120 }, { text: 'Sentado sem apoio das costas, pés no chão', timed: 120 }, { text: 'Passar de pé a sentado' },
    { text: 'Transferências (cadeira com e sem braços)' }, { text: 'De pé sem apoio, olhos fechados', timed: 10 }, { text: 'De pé sem apoio, pés juntos', timed: 60 },
    { text: 'Alcançar à frente com o braço estendido' }, { text: 'Apanhar um objeto do chão' }, { text: 'Olhar para trás por cima dos ombros (esq. e dir.)' },
    { text: 'Rodar 360° (cada sentido)', timed: 4 }, { text: 'Colocar os pés alternadamente num degrau (8 toques)', timed: 20 }, { text: 'De pé, um pé à frente do outro (tandem)', timed: 30 }, { text: 'Apoio num só pé', timed: 10 },
  ],
  score(v) {
    const total = sum(v);
    const interp = total <= 20 ? '0–20: risco de queda elevado (habitualmente dependente de cadeira de rodas).' : total <= 40 ? '21–40: risco de queda moderado (marcha com apoio).' : total <= 45 ? '41–45: risco de queda aumentado.' : '46–56: risco de queda baixo.';
    return { total, max: 56, display: `${total}/56`, complete: answered(v) === 14, subs: [], interpretation: interp, tone: total <= 40 ? 'bad' : total <= 45 ? 'warn' : 'ok' };
  },
  reference: 'Berg KO et al. Physiother Can 1989;41:304–11; Can J Public Health 1992;83 Suppl 2:S7–11.',
};

export const SCALES: Scale[] = [DHI, VSS, ABC, NPQ, MSSQ, DGI, FGA, BERG];
export const getScale = (id: string) => SCALES.find((s) => s.id === id);

/** Timed Up and Go. */
export function tugInterpret(sec: number) {
  if (sec >= 13.5) return { text: '≥ 13,5 s: risco de queda aumentado (Shumway-Cook 2000).', tone: 'bad' as Tone };
  if (sec >= 12) return { text: '12–13,5 s: acima do limiar do CDC STEADI (≥ 12 s) — vigiar risco de queda.', tone: 'warn' as Tone };
  return { text: '< 12 s: dentro do esperado.', tone: 'ok' as Tone };
}
