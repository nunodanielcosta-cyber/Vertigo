import { page, esc, icon, navTile } from '../_shared';
import { TOPICS } from '../../content/education';

export function educationView(app: HTMLElement) {
  page(app, { title: 'Educação', sub: 'Informação para o doente', back: '/' }, `
    <div class="nav-grid">${TOPICS.map((t) => navTile(`/educacao/${t.id}`, t.icon, t.title, t.summary)).join('')}</div>`);
}

export function topicView(app: HTMLElement, [id]: string[]) {
  const t = TOPICS.find((x) => x.id === id);
  if (!t) { page(app, { title: 'Educação', back: '/educacao' }, '<p>Tema não encontrado.</p>'); return; }
  page(app, { title: t.title, back: '/educacao' }, `
    <article class="card prose narrow">
      ${t.body.map((p) => `<p>${esc(p)}</p>`).join('')}
      ${t.maneuvers ? `<h2>Vídeos animados das manobras</h2><div class="maneuver-links">${t.maneuvers.map((m) => `<a class="btn" href="#/manobra/${m.id}">${icon('play')}${esc(m.name)}</a>`).join('')}</div>
        <p class="small muted">Faça a manobra em casa só do lado indicado pelo médico.</p>` : ''}
      <aside class="disclaimer">${icon('alert')}<p>Informação geral — não substitui o aconselhamento do seu médico. Procure a urgência (112) se tiver fraqueza, dificuldade em falar, visão dupla, dor de cabeça súbita intensa ou não conseguir andar.</p></aside>
    </article>`);
}
