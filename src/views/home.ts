import { logo } from './exam';
import { icon, navTile, setting } from './_shared';
import { collection } from '../core/storage';
import type { Attack } from '../clinical/diary';

export const audience = setting<{ mode: 'pro' | 'patient' }>('audience', { mode: 'pro' });

export function homeView(app: HTMLElement) {
  const mode = audience.get().mode;
  const attacks = collection<Attack>('attacks').all();
  const last30 = attacks.filter((a) => Date.now() - Date.parse(a.date) < 30 * 864e5).length;

  const pro = `
    <section class="hub-section">
      <h2 class="group-title">${icon('stethoscope')} Apoio ao diagnóstico</h2>
      <div class="nav-grid">
        ${navTile('/vppb', 'rotate', 'Assistente VPPB', 'Dix-Hallpike e roll test guiados → canal afetado → manobra animada')}
        ${navTile('/exame', 'camera', 'Exame com vídeo', 'Gravar e analisar o nistagmo por visão computacional')}
        ${navTile('/hints', 'eye', 'HINTS / HINTS+', 'Central ou periférico no síndrome vestibular agudo')}
        ${navTile('/urgencia', 'siren', 'Triagem na urgência', 'HINTS+, ABCD2, risco vascular, sinais de alarme → RM / Neurologia')}
        ${navTile('/icvd', 'clipboard', 'Critérios da Bárány (ICVD)', 'Timing & triggers → diagnósticos diferenciais com critérios explícitos')}
        ${navTile('/vppb-atipica', 'layers', 'VPPB atípica', 'Apogeotrópica, canal anterior, multicanal, sinais centrais, recidivas')}
      </div>
    </section>
    <section class="hub-section">
      <h2 class="group-title">${icon('calc')} Calculadoras e relatórios de provas</h2>
      <div class="nav-grid">
        ${navTile('/provas/caloricas', 'calc', 'Provas calóricas', 'Paresia canalar (Jongkees) e preponderância direcional')}
        ${navTile('/provas/vhit', 'target', 'vHIT', 'Ganhos por canal, sacadas cobertas/não cobertas, relatório')}
        ${navTile('/provas/vemp', 'wave', 'VEMPs', 'Razão de assimetria, limiares, suspeita de deiscência')}
        ${navTile('/provas/relatorio', 'clipboard', 'Relatório vestibular integrado', 'Localização: periférica uni/bilateral ou central')}
        ${navTile('/meniere-aao', 'ear', 'Ménière — AAO-HNS', 'Estadiamento, nível funcional, classe de controlo')}
      </div>
    </section>
    <section class="hub-section">
      <h2 class="group-title">${icon('clipboard')} Questionários e escalas</h2>
      <div class="nav-grid">
        ${navTile('/escalas', 'clipboard', 'Escalas', 'DHI, VSS, ABC, NPQ, MSSQ')}
        ${navTile('/quedas', 'walk', 'Risco de queda', 'TUG, DGI, FGA e Berg com cronómetro')}
      </div>
    </section>
    <section class="hub-section">
      <h2 class="group-title">${icon('phone')} Medições com o telemóvel <span class="chip chip-warn">experimental</span></h2>
      <div class="nav-grid">
        ${navTile('/sensores/nistagmo', 'camera', 'Gravar nistagmo em casa', 'Vídeo dos olhos na crise, com estimativa da direção')}
        ${navTile('/sensores/vvs', 'target', 'Vertical visual subjetiva', 'Teste do balde com o giroscópio')}
        ${navTile('/sensores/dva', 'eye', 'Acuidade visual dinâmica', 'Optótipos com a cabeça em movimento')}
        ${navTile('/sensores/postura', 'balance', 'Posturografia simplificada', 'Romberg e mCTSIB com o acelerómetro')}
        ${navTile('/sensores/epley', 'rotate', 'Epley guiado por sensores', 'Ângulo e tempo de cada posição em tempo real')}
      </div>
    </section>`;

  const patient = `
    <section class="hub-section">
      <h2 class="group-title">${icon('user')} O meu registo</h2>
      <div class="nav-grid">
        ${navTile('/doente/crise', 'plus', 'Registar uma crise', 'Duração, intensidade, sintomas e desencadeantes')}
        ${navTile('/doente/dia', 'calendar', 'Registo do dia', 'Sal, cafeína, stress, sono, audição')}
        ${navTile('/doente/diario', 'book', 'Diário e gráficos', `${attacks.length} crises registadas · ${last30} nos últimos 30 dias`)}
        ${navTile('/doente/audicao', 'ear', 'Teste de audição (graves)', 'Seguir a audição flutuante na doença de Ménière')}
        ${navTile('/doente/migranea', 'heart', 'Migrânea: profilaxia', 'Desencadeantes e resposta ao tratamento preventivo')}
        ${navTile('/sensores/nistagmo', 'camera', 'Gravar os olhos na crise', 'Vídeo para mostrar ao médico')}
      </div>
    </section>
    <section class="hub-section">
      <h2 class="group-title">${icon('walk')} Exercícios</h2>
      <div class="nav-grid">
        ${navTile('/doente/reabilitacao', 'walk', 'Reabilitação vestibular', 'Cawthorne-Cooksey e equilíbrio, com lembretes e registo')}
        ${navTile('/doente/vor', 'target', 'Estabilização do olhar (VOR x1/x2)', 'Alvo, metrónomo e confirmação do movimento pela câmara')}
        ${navTile('/doente/habituacao', 'layers', 'Habituação visual', 'Estímulos optocinéticos progressivos (PPPD)')}
        ${navTile('/sensores/epley', 'rotate', 'Fazer a manobra de Epley', 'Com o telemóvel na cabeça a guiar')}
      </div>
    </section>
    <section class="hub-section">
      <h2 class="group-title">${icon('book')} Informação e consulta</h2>
      <div class="nav-grid">
        ${navTile('/educacao', 'book', 'Educação', 'Manobras, condução, trabalho, medicamentos')}
        ${navTile('/escalas', 'clipboard', 'Questionários', 'DHI, VSS, ABC, NPQ, MSSQ')}
        ${navTile('/resumo', 'print', 'Resumo para a consulta', 'PDF de uma página com os dados de casa')}
      </div>
    </section>`;

  app.innerHTML = `
  <header class="hero hub-hero">
    <div class="brand">${logo()}<span class="brand-name">Vertigo</span>
      <a class="icon-btn hub-data" href="#/dados" title="Dados e cópia de segurança" aria-label="Dados e cópia de segurança">${icon('download')}</a>
    </div>
    <h1 class="hero-title">Vertigem e sistema vestibular.<br><span>Do diagnóstico à reabilitação.</span></h1>
    <div class="seg audience" role="tablist" aria-label="Perfil">
      <button data-mode="pro" class="${mode === 'pro' ? 'on' : ''}">${icon('stethoscope')}Profissional</button>
      <button data-mode="patient" class="${mode === 'patient' ? 'on' : ''}">${icon('user')}Doente</button>
    </div>
  </header>
  <main class="hub">
    ${mode === 'pro' ? pro : patient}
    <aside class="disclaimer">${icon('alert')}<p><strong>Ferramenta de apoio — não substitui o juízo clínico.</strong> Protótipo de investigação, não certificado como dispositivo médico. Todos os dados ficam só neste dispositivo. ${mode === 'patient' ? 'Em caso de fraqueza, dificuldade em falar, visão dupla ou dor de cabeça súbita intensa, ligue 112.' : ''}</p></aside>
  </main>`;
  app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => (b.onclick = () => {
    audience.set({ mode: b.dataset.mode as 'pro' | 'patient' });
    homeView(app);
  }));
}
