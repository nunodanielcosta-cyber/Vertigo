/** Conteúdos de educação para o doente. ⚠ Rever e adaptar pelo médico responsável. */
export interface Topic { id: string; title: string; icon: string; summary: string; body: string[]; maneuvers?: { id: string; name: string }[] }

export const TOPICS: Topic[] = [
  {
    id: 'vppb', title: 'VPPB e manobras de reposição', icon: 'rotate',
    summary: 'O que são os «cristais soltos» e como as manobras os recolocam.',
    body: [
      'Na vertigem posicional paroxística benigna (VPPB), pequenos cristais de carbonato de cálcio (otocónias) soltam-se do utrículo e entram num canal semicircular. Quando muda a posição da cabeça, os cristais deslocam-se e provocam uma vertigem intensa que dura menos de um minuto.',
      'As manobras de reposição (Epley, Semont, Lempert/BBQ roll) usam a gravidade para levar os cristais de volta ao utrículo. Resultam em cerca de 80 % dos casos após 1 a 3 manobras.',
      'Depois da manobra pode sentir instabilidade ligeira durante alguns dias. Não é necessário dormir sentado nem usar colar cervical (as recomendações atuais não o exigem).',
      'A VPPB volta em cerca de 1 em cada 3 pessoas nos anos seguintes. Se voltar, registe a crise no diário e, se o médico o tiver ensinado, faça a manobra em casa do lado certo.',
    ],
    maneuvers: [
      { id: 'epley-right', name: 'Epley direita' }, { id: 'epley-left', name: 'Epley esquerda' },
      { id: 'semont-right', name: 'Semont direita' }, { id: 'semont-left', name: 'Semont esquerda' },
      { id: 'lempert-right', name: 'Lempert (afetado direito)' }, { id: 'lempert-left', name: 'Lempert (afetado esquerdo)' },
      { id: 'gufoni-geo-right', name: 'Gufoni geotrópico (afetado direito)' }, { id: 'gufoni-geo-left', name: 'Gufoni geotrópico (afetado esquerdo)' },
      { id: 'yacovino', name: 'Yacovino (canal anterior)' },
    ],
  },
  {
    id: 'driving', title: 'Condução', icon: 'walk',
    summary: 'Quando é seguro voltar a conduzir.',
    body: [
      'Não conduza durante uma crise de vertigem, nem enquanto tiver tonturas, visão a tremer ou estiver a tomar medicamentos que dão sono (p. ex. supressores vestibulares, benzodiazepinas, alguns antieméticos).',
      'VPPB: pode conduzir quando deixar de ter vertigem ao olhar para cima, para os lados e ao inclinar a cabeça — atenção a olhar por cima do ombro e a estacionar.',
      'Crises imprevisíveis (doença de Ménière, migrânea vestibular, paroxismia): fale com o seu médico. Em regra só se deve conduzir quando as crises estiverem controladas ou houver aviso suficiente para parar em segurança.',
      'Condutores profissionais têm regras mais exigentes. A legislação sobre aptidão para conduzir prevê avaliação médica nas perturbações do equilíbrio — siga a indicação do seu médico.',
    ],
  },
  {
    id: 'work', title: 'Regresso ao trabalho', icon: 'clipboard',
    summary: 'Voltar à atividade de forma gradual ajuda a recuperar.',
    body: [
      'Na maioria das situações vestibulares, retomar a atividade cedo acelera a compensação do cérebro. O repouso prolongado atrasa a recuperação.',
      'Comece com horários mais curtos ou tarefas mais simples, faça pausas para os exercícios e evite inicialmente trabalho em altura, com máquinas perigosas ou a conduzir.',
      'Trabalho com ecrãs: aumente o tamanho da letra, reduza o brilho e o movimento no ecrã, faça pausas a cada 30–45 minutos.',
      'Se as tonturas aumentarem durante o dia de trabalho, é normal nas primeiras semanas — não significa que esteja a piorar.',
    ],
  },
  {
    id: 'suppressants', title: 'Medicamentos «para as tonturas»', icon: 'flask',
    summary: 'Supressores vestibulares: úteis por poucos dias, prejudiciais a longo prazo.',
    body: [
      'Medicamentos como dimenidrinato, cinarizina, meclizina, prometazina ou benzodiazepinas (p. ex. diazepam) aliviam náuseas e vertigem intensa, mas «adormecem» o sistema de equilíbrio.',
      'Use-os apenas nos primeiros 2–3 dias de uma crise forte, ou durante as crises de Ménière, conforme a indicação do médico.',
      'Uso prolongado atrasa a compensação vestibular, causa sonolência, aumenta o risco de quedas (sobretudo em idosos) e pode piorar a memória. A cinarizina e a flunarizina podem causar parkinsonismo em idosos.',
      'Na VPPB os supressores NÃO tratam a causa: o tratamento é a manobra de reposição.',
      'A betaistina não é um supressor vestibular; é usada na doença de Ménière.',
    ],
  },
  {
    id: 'meniere', title: 'Doença de Ménière no dia a dia', icon: 'ear',
    summary: 'Sal, cafeína, stress, sono e registo das crises.',
    body: [
      'Registe as crises (duração, audição, acufeno, ouvido tapado) — ajuda o médico a avaliar a evolução e a decidir o tratamento.',
      'Muitas pessoas beneficiam de uma alimentação com pouco sal (cerca de 1,5–2 g de sódio/dia), distribuído de forma regular ao longo do dia, e de reduzir cafeína e álcool. A evidência é limitada, por isso veja no seu diário se faz diferença.',
      'Durma bem e gira o stress: são desencadeantes frequentes.',
      'Durante uma crise: deite-se num local seguro, com os olhos fixos num ponto, e tome a medicação de crise se prescrita. Procure a urgência se tiver sintomas novos (fala, visão dupla, fraqueza).',
    ],
  },
  {
    id: 'vm', title: 'Migrânea vestibular', icon: 'heart',
    summary: 'Identificar desencadeantes e avaliar a profilaxia.',
    body: [
      'A migrânea vestibular causa crises de vertigem de minutos a dias, com ou sem dor de cabeça. É uma das causas mais frequentes de vertigem recorrente.',
      'Desencadeantes comuns: dormir pouco ou demais, saltar refeições, stress (ou o fim de um período de stress), menstruação, luzes intensas, ecrãs, alguns alimentos e álcool.',
      'Registe crises e desencadeantes durante 2–3 meses. Os medicamentos preventivos demoram 6–8 semanas a fazer efeito — não desista cedo. Considera-se boa resposta uma redução de pelo menos 50 % das crises.',
      'Exercício regular, horários de sono e refeições regulares ajudam a prevenir crises.',
    ],
  },
  {
    id: 'pppd', title: 'PPPD — tontura persistente', icon: 'layers',
    summary: 'Um problema do «software» do equilíbrio, que se trata.',
    body: [
      'A PPPD é uma tontura ou instabilidade quase diária que dura mais de 3 meses, e piora de pé, com o movimento e em ambientes visualmente complexos (supermercados, ecrãs).',
      'Surge muitas vezes depois de um episódio de vertigem que já passou: o cérebro ficou em «modo de alerta» e continua a controlar o equilíbrio de forma rígida.',
      'Tratamento: reabilitação vestibular com habituação visual gradual, alguns medicamentos (ISRS/IRSN) e terapia cognitivo-comportamental. Evitar as situações difíceis piora o problema a longo prazo.',
    ],
  },
  {
    id: 'falls', title: 'Prevenir quedas', icon: 'balance',
    summary: 'Medidas simples em casa.',
    body: [
      'Boa iluminação à noite (luz de presença no caminho para a casa de banho).',
      'Retirar tapetes soltos e fios do chão; barras de apoio na casa de banho.',
      'Levantar-se devagar da cama: sentar-se primeiro alguns segundos.',
      'Calçado fechado com sola antiderrapante. Usar bengala se o médico/fisioterapeuta indicar.',
    ],
  },
  {
    id: 'record', title: 'Como gravar o nistagmo em casa', icon: 'camera',
    summary: 'Um vídeo dos olhos durante a crise vale muito na consulta.',
    body: [
      'Peça a alguém que filme os seus olhos de perto (15–20 cm), com boa luz de frente e sem flash.',
      'Mantenha os olhos bem abertos e olhe em frente. Se possível, filme também a olhar para a direita e para a esquerda (10 s cada).',
      'Se a vertigem é posicional, filme logo a seguir a deitar-se ou virar-se na posição que a provoca, durante 30–60 s.',
      'Use a função «Gravar nistagmo» desta app: o vídeo fica guardado só no seu telemóvel e pode mostrá-lo ao médico.',
    ],
  },
];
