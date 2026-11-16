import { page, q, esc, icon, disclaimer, triQ, setting, toast, type Tri } from './_shared';
import { TIMINGS, OTHER_DDX, evaluateIcvd, questionsFor, type Answers, type Timing, type DiagnosisResult } from '../clinical/icvd';

const state = setting<{ timing: Timing | 'all'; answers: Answers }>('icvd', { timing: 'episodic-spontaneous', answers: {} });

const mark = (v: Tri) => (v === 'yes' ? `<span class="crit crit-yes" title="Cumprido">✓</span>` : v === 'no' ? `<span class="crit crit-no" title="Não cumprido">✗</span>` : `<span class="crit crit-unk" title="Sem dados">?</span>`);

function dxCard(r: DiagnosisResult) {
  const tone = r.status === 'definite' ? 'ok' : r.status === 'probable' ? 'info' : r.status === 'possible' ? 'warn' : 'muted';
  const crit = (title: string, list: DiagnosisResult['definite']) => `<h4>${title}</h4><ul class="criteria">${list.map((c) => `<li>${mark(c.value)}<span>${esc(c.label)}</span></li>`).join('')}</ul>`;
  return `<article class="card dx dx-${tone}">
    <div class="hyp-head"><h3>${esc(r.dx.name)}</h3><span class="badge badge-${tone === 'muted' ? 'info' : tone}">${esc(r.statusLabel)}</span></div>
    <details${r.status === 'definite' || r.status === 'probable' ? ' open' : ''}>
      <summary>Critérios</summary>
      ${crit(r.dx.probable ? 'Definitiva' : 'Critérios', r.definite)}
      ${r.probable ? crit(r.dx.probableLabel ? r.dx.probableLabel[0].toUpperCase() + r.dx.probableLabel.slice(1) : 'Provável', r.probable) : ''}
      ${r.status !== 'unlikely' ? `<p class="small"><b>Atitude:</b> ${r.dx.next.map(esc).join(' ')}</p>` : ''}
      <p class="ref">${esc(r.dx.reference)}</p>
    </details>
  </article>`;
}

export function icvdView(app: HTMLElement) {
  const st = state.getRaw();
  page(app, { title: 'Diagnóstico pelos critérios da Bárány Society', sub: 'Abordagem timing & triggers (ICVD)', back: '/', actions: `<button class="icon-btn" id="copy" title="Copiar resumo" aria-label="Copiar resumo">${icon('clipboard')}</button>` }, `
  <div class="timing-grid" role="radiogroup" aria-label="Padrão temporal">
    ${TIMINGS.map((t) => `<button class="timing-card${st.timing === t.id ? ' on' : ''}" data-t="${t.id}"><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`).join('')}
  </div>
  <p class="small"><button class="linklike" data-t="all">Mostrar todos os diagnósticos</button></p>
  <div class="grid2">
    <form id="f" class="card"></form>
    <section id="out" class="stack"></section>
  </div>`);

  const renderQ = () => {
    const s = state.getRaw();
    q('#f').innerHTML = `<h2>Perguntas</h2><p class="muted small">Responda ao que souber; «?» = sem dados.</p>${questionsFor(s.timing).map((x) => triQ(x.id, esc(x.text), s.answers[x.id] ?? 'unk', x.help ? esc(x.help) : undefined)).join('')}
      <button type="button" class="btn small mt" id="clear">${icon('refresh')}Limpar respostas</button>`;
    q('#clear').onclick = () => { state.set({ ...state.getRaw(), answers: {} }); renderQ(); renderOut(); };
  };
  const renderOut = () => {
    const s = state.getRaw();
    const res = evaluateIcvd(s.timing, s.answers);
    q('#out').innerHTML = `
      <div class="section-head"><h2>Diagnósticos diferenciais</h2><p class="muted">Ordenados pelo grau de cumprimento dos critérios.</p></div>
      ${res.map(dxCard).join('')}
      ${s.timing !== 'all' ? `<div class="card"><h3>Considerar também</h3><ul>${OTHER_DDX[s.timing].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        ${s.timing === 'acute-continuous' ? `<a class="btn small" href="#/hints">${icon('eye')}Fazer HINTS+</a> <a class="btn small" href="#/urgencia">${icon('siren')}Triagem na urgência</a>` : ''}
        ${s.timing === 'episodic-triggered' ? `<a class="btn small" href="#/vppb">${icon('rotate')}Assistente VPPB</a>` : ''}</div>` : ''}
      ${disclaimer('Critérios resumidos e adaptados — consulte as publicações originais da Bárány Society (J Vestib Res). Vários diagnósticos podem coexistir (p. ex. Ménière e migrânea vestibular).')}`;
  };

  app.querySelectorAll<HTMLButtonElement>('[data-t]').forEach((b) => (b.onclick = () => {
    state.set({ ...state.getRaw(), timing: b.dataset.t as Timing });
    app.querySelectorAll('.timing-card').forEach((c) => c.classList.toggle('on', (c as HTMLElement).dataset.t === b.dataset.t));
    renderQ(); renderOut();
  }));
  q('#f').addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    const s = state.getRaw();
    s.answers[t.name] = t.value as Tri;
    state.set(s);
    renderOut();
  });
  q('#copy').onclick = async () => {
    const s = state.getRaw();
    const res = evaluateIcvd(s.timing, s.answers).filter((r) => r.status !== 'unlikely');
    const txt = res.map((r) => `${r.dx.name}: ${r.statusLabel}\n${[...r.definite].map((c) => `  [${c.value === 'yes' ? 'x' : c.value === 'no' ? ' ' : '?'}] ${c.label}`).join('\n')}`).join('\n\n');
    try { await navigator.clipboard.writeText(txt); toast('Resumo copiado'); } catch { toast('Não foi possível copiar'); }
  };
  renderQ();
  renderOut();
}
