import { page, pills, q, esc, icon, disclaimer, resultBox } from './_shared';
import { evaluateHints, type HintsInput } from '../clinical/hints';

export function hintsForm(prefix = '') {
  return `
    <div class="q-block"><b>Contexto: vertigem aguda contínua (horas–dias) com nistagmo, náuseas e instabilidade?</b>${pills(prefix + 'avs', [['yes', 'Sim'], ['no', 'Não']], 'yes')}</div>
    <div class="q-block"><b>H — Head Impulse Test</b><small class="muted">Rotação rápida e pequena (10–20°) da cabeça com o doente a fixar o nariz do examinador.</small>
      ${pills(prefix + 'hit', [['abnormal-unilateral', 'Alterado de um lado (sacada corretiva)'], ['normal-bilateral', 'Normal dos dois lados'], ['abnormal-bilateral', 'Alterado bilateral'], ['unk', 'Não avaliado']], 'unk', 'pills-wrap')}</div>
    <div class="q-block"><b>N — Nistagmo</b><small class="muted">Olhar em frente, à direita e à esquerda (~30°).</small>
      ${pills(prefix + 'ny', [['unidirectional-horizontal', 'Horizontal unidirecional'], ['direction-changing', 'Muda de direção com o olhar'], ['vertical-or-torsional', 'Vertical ou torsional puro'], ['none', 'Sem nistagmo'], ['unk', 'Não avaliado']], 'unk', 'pills-wrap')}</div>
    <div class="q-block"><b>TS — Test of Skew</b><small class="muted">Cover test alternado: refixação vertical ao destapar.</small>
      ${pills(prefix + 'skew', [['absent', 'Sem skew'], ['present', 'Skew presente'], ['unk', 'Não avaliado']], 'unk')}</div>
    <div class="q-block"><b>+ Audição (HINTS+)</b><small class="muted">Hipoacusia súbita nova (finger rub, Weber, audiograma).</small>
      ${pills(prefix + 'hear', [['none', 'Sem hipoacusia nova'], ['new-loss', 'Hipoacusia nova'], ['unk', 'Não avaliado']], 'unk')}</div>`;
}

export function readHints(form: HTMLFormElement, prefix = ''): HintsInput {
  const fd = new FormData(form);
  const g = (k: string) => String(fd.get(prefix + k) ?? '');
  return { continuousVertigo: g('avs') === 'yes', hit: g('hit') as HintsInput['hit'], nystagmus: g('ny') as HintsInput['nystagmus'], skew: g('skew') as HintsInput['skew'], hearing: g('hear') as HintsInput['hearing'] };
}

export function hintsView(app: HTMLElement) {
  page(app, { title: 'HINTS / HINTS+', sub: 'Síndrome vestibular agudo: central ou periférico?', back: '/' }, `
  <div class="grid2">
    <form class="card" id="f">${hintsForm()}</form>
    <section id="out" class="stack"></section>
  </div>`);
  const f = q<HTMLFormElement>('#f');
  const upd = () => {
    const r = evaluateHints(readHints(f));
    const tone = r.verdict === 'central' ? 'bad' : r.verdict === 'peripheral' ? 'ok' : 'warn';
    const title = r.verdict === 'central' ? 'Padrão CENTRAL — perigoso' : r.verdict === 'peripheral' ? 'Padrão PERIFÉRICO (tranquilizador)' : 'Indeterminado';
    q('#out').innerHTML = `
      ${resultBox(`${icon(r.verdict === 'central' ? 'alert' : 'check')} ${title}`, `
        ${r.centralSigns.length ? `<p><b>Sinais centrais (INFARCT):</b></p><ul>${r.centralSigns.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
        ${r.peripheralSigns.length ? `<p><b>Sinais periféricos:</b></p><ul>${r.peripheralSigns.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
        ${r.verdict === 'central' ? '<p><b>Atitude:</b> avaliação neurológica urgente e RM-CE com difusão. A RM precoce (&lt; 48 h) pode ser falsamente negativa.</p>' : ''}
        ${r.verdict === 'peripheral' ? '<p>Compatível com nevrite vestibular. Reavaliar se surgirem sinais neurológicos ou se a marcha for muito alterada.</p>' : ''}`, tone)}
      ${r.notes.length ? `<div class="card"><h3>Notas</h3><ul class="notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
      <div class="card small"><p>Em mãos treinadas, o HINTS tem sensibilidade ~97–100 % para AVC no AVS, superior à RM com difusão nas primeiras 48 h. Complete sempre com a <b>marcha</b> (incapacidade de andar sem apoio sugere causa central) e o exame neurológico.</p>
      <p class="ref">Kattah JC et al. Stroke 2009;40:3504–10; Newman-Toker DE et al. Acad Emerg Med 2013;20:986–96.</p>
      <a class="btn small" href="#/urgencia">${icon('siren')}Triagem completa na urgência</a></div>
      ${disclaimer()}`;
  };
  f.addEventListener('change', upd);
  upd();
}
