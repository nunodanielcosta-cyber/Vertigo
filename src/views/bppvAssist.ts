import { page, pills, q, qa, esc, icon, disclaimer, sw, setting } from './_shared';
import { runWizard, defaultAnswers, type WizardAnswers } from '../clinical/bppvWizard';
import { keyframesFor } from '../clinical/poses';
import { mountPlayer } from '../ui/maneuverPlayer';
import type { Hypothesis } from '../clinical/engine';
import type { Maneuver } from '../clinical/maneuvers';
import { epley, semont, lempert, gufoniGeo, gufoniApo, vannucchi, yacovino } from '../clinical/maneuvers';
import type { Side } from '../types';

const saved = setting<WizardAnswers>('bppv-wizard', defaultAnswers());

const DH_OPTS: [string, string][] = [
  ['unk', 'Não feito'], ['none', 'Sem nistagmo'], ['up-geo', '↑ Upbeat + torsional geotrópico'], ['up-apo', '↑ Upbeat + torsional para a outra orelha'],
  ['down', '↓ Downbeat'], ['horiz-geo', '↔ Horizontal geotrópico'], ['horiz-apo', '↔ Horizontal apogeotrópico'],
];
const ROLL_OPTS: [string, string][] = [
  ['unk', 'Não feito'], ['none', 'Sem nistagmo'], ['geo', 'Geotrópico (bate para o chão)'], ['apo', 'Apogeotrópico (bate para o teto)'],
  ['fixed-right', 'Sempre para a direita'], ['fixed-left', 'Sempre para a esquerda'],
];

export function bppvAssistView(app: HTMLElement) {
  const a = saved.getRaw();
  page(app, { title: 'Assistente de diagnóstico da VPPB', sub: 'Dix-Hallpike → supine roll test → canal → manobra', back: '/' }, `
  <div class="grid2">
    <section>
      <form id="wiz" class="stack">
        <div class="card">
          <span class="eyebrow">Passo 1</span>
          <h2>Dix-Hallpike</h2>
          <p class="muted small">Cabeça rodada 45° para o lado testado, deitar rapidamente com a cabeça pendente 20–30°. Observe 30–45 s. «Geotrópico» = polo superior do olho bate para a orelha de baixo.</p>
          <div id="dhAnim" class="mini-player"></div>
          <div class="q-block"><b>Lado direito</b>${pills('dhRight', DH_OPTS, a.dhRight, 'pills-wrap')}</div>
          <div class="q-block"><b>Lado esquerdo</b>${pills('dhLeft', DH_OPTS, a.dhLeft, 'pills-wrap')}</div>
          <div class="field-grid">
            <div class="q-block"><b>Duração do nistagmo</b>${pills('dhDuration', [['short', '< 60 s'], ['long', '> 60 s / persistente']], a.dhDuration)}</div>
            <div class="q-block"><b>Latência de alguns segundos</b>${pills('dhLatency', [['yes', 'Sim'], ['no', 'Não (imediato)']], a.dhLatency)}</div>
          </div>
        </div>
        <div class="card">
          <span class="eyebrow">Passo 2</span>
          <h2>Supine roll test</h2>
          <p class="muted small">Deitado com a cabeça fletida 30°, rodar rapidamente a cabeça 90° para cada lado. Compare a intensidade dos dois lados.</p>
          <div id="rollAnim" class="mini-player"></div>
          <div class="q-block"><b>Cabeça à direita</b>${pills('rollRight', ROLL_OPTS, a.roll.right, 'pills-wrap')}</div>
          <div class="q-block"><b>Cabeça à esquerda</b>${pills('rollLeft', ROLL_OPTS, a.roll.left, 'pills-wrap')}</div>
          <div class="field-grid">
            <div class="q-block"><b>Mais intenso com a cabeça…</b>${pills('rollStronger', [['right', 'à direita'], ['left', 'à esquerda'], ['equal', 'igual / incerto']], a.rollStronger)}</div>
            <div class="q-block"><b>Duração</b>${pills('rollDuration', [['short', '< 60 s'], ['long', '> 60 s']], a.rollDuration)}</div>
          </div>
        </div>
        <div class="card">
          <span class="eyebrow">Passo 3</span>
          <h2>Sentado</h2>
          <div class="q-block"><b>Nistagmo espontâneo (olhar em frente, sem fixação)</b>${pills('spontaneous', [['none', 'Nenhum'], ['horizontal', 'Horizontal'], ['vertical', 'Vertical/torsional puro']], a.spontaneous)}</div>
          ${sw('redFlags', 'Sinais neurológicos, cefaleia intensa ou ataxia grave', a.redFlags)}
        </div>
        <button type="button" class="btn" id="reset">${icon('refresh')}Limpar respostas</button>
      </form>
    </section>
    <section id="out" class="assessment"></section>
  </div>`);

  const form = q<HTMLFormElement>('#wiz');
  mountPlayer(q('#dhAnim'), keyframesFor('dix-hallpike-right')!, { affected: 'right' });
  mountPlayer(q('#rollAnim'), keyframesFor('roll-right')!, {});

  const read = (): WizardAnswers => {
    const fd = new FormData(form);
    const g = (k: string) => String(fd.get(k) ?? '');
    return {
      dhRight: g('dhRight') as WizardAnswers['dhRight'], dhLeft: g('dhLeft') as WizardAnswers['dhLeft'],
      dhDuration: g('dhDuration') as 'short' | 'long', dhLatency: g('dhLatency') as 'yes' | 'no',
      roll: { right: g('rollRight') as WizardAnswers['roll']['right'], left: g('rollLeft') as WizardAnswers['roll']['left'] },
      rollStronger: g('rollStronger') as WizardAnswers['rollStronger'], rollDuration: g('rollDuration') as 'short' | 'long',
      spontaneous: g('spontaneous') as WizardAnswers['spontaneous'], redFlags: fd.get('redFlags') === 'on',
    };
  };

  const update = () => {
    const ans = read();
    saved.set(ans);
    const out = runWizard(ans);
    const anyDone = ans.dhRight !== 'unk' || ans.dhLeft !== 'unk' || ans.roll.right !== 'unk' || ans.roll.left !== 'unk';
    const top = out.hypotheses[0];
    const m = top?.maneuvers[0];
    q('#out').innerHTML = `
      <div class="section-head"><h2>Resultado</h2><p class="muted">Atualiza à medida que responde.</p></div>
      ${out.redFlags.length ? `<div class="alert" role="alert">${icon('alert')}<div><h3>Sinais de alarme</h3><ul>${out.redFlags.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div></div>` : ''}
      ${!anyDone ? `<div class="card empty"><p>Registe o resultado do <b>Dix-Hallpike</b> dos dois lados.<br>Se for negativo, faça o <b>supine roll test</b>.</p></div>` : ''}
      ${top && anyDone ? `<div class="card">
        <span class="eyebrow">Hipótese principal</span>
        <h2>${esc(top.title)}</h2>
        <ul class="rationale">${top.rationale.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        ${m ? `<h3 class="mt">${esc(m.name)}${m.needsReview ? ' <span class="chip chip-warn">validar protocolo</span>' : ''}</h3>
          <div id="player"></div>
          <ol class="timeline compact">${m.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
          ${m.notes?.length ? `<ul class="notes">${m.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
          <p class="ref">${esc(m.reference)}</p>
          <div class="actionbar"><a class="btn" href="#/sensores/epley">${icon('phone')}Guiar com sensores</a><a class="btn" href="#/manobra/${esc(m.id)}">${icon('play')}Ecrã inteiro</a></div>` : ''}
      </div>` : ''}
      ${anyDone ? out.hypotheses.slice(1).map(altCard).join('') : ''}
      ${out.nextSteps.length && anyDone ? `<div class="card next"><h3>Próximos passos</h3><ul class="checklist">${out.nextSteps.map((s) => `<li>${icon('chevron')}<span>${esc(s)}</span></li>`).join('')}</ul></div>` : ''}
      <p class="small"><a href="#/vppb-atipica">VPPB atípica, recidivas e quando suspeitar de causa central →</a></p>
      ${disclaimer()}`;
    const kf = m ? keyframesFor(m.id) : null;
    if (kf) mountPlayer(q('#player'), kf, { affected: m!.side });
  };
  form.addEventListener('change', update);
  q('#reset').onclick = () => { saved.set(defaultAnswers()); bppvAssistView(app); };
  update();
  void qa;
}

function altCard(h: Hypothesis) {
  const cat = { vppb: 'VPPB', periferico: 'Periférico', central: 'Central', info: 'Informação' }[h.category];
  return `<article class="card hyp hyp-${h.category}">
    <div class="hyp-head"><span class="chip cat-${h.category}">${cat}</span><span class="muted small">probabilidade ${h.likelihood}</span></div>
    <h3>${esc(h.title)}</h3>
    <ul class="rationale">${h.rationale.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    ${h.maneuvers.length ? `<p class="small">Manobras: ${h.maneuvers.map((m) => `<a href="#/manobra/${esc(m.id)}">${esc(m.name)}</a>`).join(' · ')}</p>` : ''}
  </article>`;
}

/** Devolve a descrição textual de uma manobra a partir do id. */
export function maneuverById(id: string): Maneuver | null {
  const m = /^(epley|semont|lempert|gufoni-geo|gufoni-apo|vannucchi)-(right|left)$/.exec(id);
  if (id === 'yacovino') return yacovino();
  if (!m) return null;
  const s = m[2] as Side;
  return ({ epley, semont, lempert, 'gufoni-geo': gufoniGeo, 'gufoni-apo': gufoniApo, vannucchi } as Record<string, (s: Side) => Maneuver>)[m[1]](s);
}

export function maneuverView(app: HTMLElement, [id]: string[]) {
  const m = maneuverById(id);
  const kf = keyframesFor(id);
  if (!m || !kf) { page(app, { title: 'Manobra' }, '<p>Manobra não encontrada.</p>'); return; }
  page(app, { title: m.name, sub: 'Animação passo a passo' }, `
    <div class="grid2">
      <section class="card"><div id="player"></div></section>
      <section class="card">
        <h2>Passos</h2>
        <ol class="timeline compact">${m.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        ${m.notes?.length ? `<ul class="notes">${m.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
        <p class="ref">${esc(m.reference)}</p>
        <a class="btn" href="#/sensores/epley">${icon('phone')}Fazer com o telemóvel a guiar</a>
      </section>
    </div>
    ${disclaimer('Faça a manobra em casa apenas se o seu médico a tiver ensinado e indicado o lado. Se tiver dor no pescoço, problemas de coluna cervical ou sintomas novos, não a faça sem orientação.')}`);
  mountPlayer(q('#player'), kf, { affected: m.side, realTime: true });
}
