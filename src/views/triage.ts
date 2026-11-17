import { page, pills, q, esc, icon, disclaimer, sw, resultBox, badge } from './_shared';
import { hintsForm, readHints } from './hints';
import { triage, type TriageInput } from '../clinical/triage';

export function triageView(app: HTMLElement) {
  page(app, { title: 'Triagem de vertigem na urgência', sub: 'HINTS+ · ABCD2 · risco vascular · sinais de alarme', back: '/' }, `
  <div class="grid2">
    <form id="f" class="stack">
      <div class="card">
        <h2>1. Padrão temporal</h2>
        ${pills('timing', [['acute-continuous', 'Agudo contínuo (AVS)'], ['episodic-spontaneous', 'Episódico espontâneo'], ['episodic-triggered', 'Episódico desencadeado'], ['chronic', 'Crónico']], 'acute-continuous', 'pills-wrap')}
        <div id="posRow" hidden class="mt">${sw('positionalTypical', 'Dix-Hallpike / roll test típicos de VPPB')}</div>
      </div>
      <div class="card">
        <h2>2. Sinais de alarme</h2>
        ${sw('suddenHeadache', 'Cefaleia súbita ou intensa / cervicalgia')}
        ${sw('neuroDeficit', 'Sinais neurológicos: diplopia, disartria, disfagia, défice motor/sensitivo, Horner')}
        ${sw('ataxia', 'Ataxia de membros / dismetria')}
        ${sw('consciousness', 'Alteração do estado de consciência')}
        ${sw('trauma', 'Traumatismo craniano ou cervical')}
        ${sw('anticoag', 'Anticoagulado')}
        <div class="q-block mt"><b>Marcha</b>${pills('gait', [['0', 'Normal'], ['1', 'Instável, anda sozinho'], ['2', 'Não anda sem apoio'], ['3', 'Não se mantém de pé']], '0', 'pills-wrap')}</div>
      </div>
      <div class="card" id="hintsCard">
        <h2>3. HINTS+</h2>
        ${hintsForm('h_')}
      </div>
      <div class="card">
        <h2>4. ABCD2</h2>
        ${sw('age60', 'Idade ≥ 60 anos (1)')}
        ${sw('bp140', 'TA ≥ 140/90 mmHg (1)')}
        <div class="q-block"><b>Clínica</b>${pills('clinical', [['none', 'Nenhuma'], ['speech', 'Alteração da fala sem fraqueza (1)'], ['weakness', 'Fraqueza unilateral (2)']], 'none', 'pills-wrap')}</div>
        <div class="q-block"><b>Duração dos sintomas</b>${pills('duration', [['<10', '< 10 min'], ['10-59', '10–59 min (1)'], ['>=60', '≥ 60 min (2)']], '>=60')}</div>
        ${sw('diabetes', 'Diabetes (1)')}
      </div>
      <div class="card">
        <h2>5. Fatores de risco vascular</h2>
        ${sw('v_hta', 'Hipertensão')}${sw('v_dm', 'Diabetes')}${sw('v_smoke', 'Tabagismo')}${sw('v_lip', 'Dislipidemia')}${sw('v_af', 'Fibrilhação auricular')}${sw('v_stroke', 'AVC/AIT prévio')}
      </div>
    </form>
    <section id="out" class="stack sticky-col"></section>
  </div>`);
  const f = q<HTMLFormElement>('#f');
  const upd = () => {
    const fd = new FormData(f);
    const b = (k: string) => fd.get(k) === 'on';
    const timing = String(fd.get('timing')) as TriageInput['timing'];
    q('#hintsCard').hidden = timing !== 'acute-continuous';
    q('#posRow').hidden = timing !== 'episodic-triggered';
    const input: TriageInput = {
      timing,
      hints: readHints(f, 'h_'),
      abcd2: { age60: b('age60'), bp140: b('bp140'), clinical: String(fd.get('clinical')) as 'none', duration: String(fd.get('duration')) as '>=60', diabetes: b('diabetes') },
      gait: Number(fd.get('gait')) as 0,
      redFlags: { suddenHeadache: b('suddenHeadache'), neuroDeficit: b('neuroDeficit'), ataxia: b('ataxia'), consciousness: b('consciousness'), trauma: b('trauma'), anticoag: b('anticoag') },
      vascular: { hypertension: b('v_hta'), diabetes: b('v_dm') || b('diabetes'), smoking: b('v_smoke'), dyslipidemia: b('v_lip'), atrialFib: b('v_af'), priorStroke: b('v_stroke') },
      positionalTypical: b('positionalTypical'),
    };
    const r = triage(input);
    const tone = r.level === 'emergent' ? 'bad' : r.level === 'urgent' ? 'warn' : 'ok';
    q('#out').innerHTML = `
      ${resultBox(`${icon(r.level === 'standard' ? 'check' : 'siren')} ${esc(r.headline)}`, `
        <p class="badges">${badge(`ABCD2 ${r.abcd2.score} (${r.abcd2.risk})`, r.abcd2.score >= 4 ? 'warn' : 'info')} ${badge(`${r.vascularCount} fatores vasculares`, r.vascularCount >= 2 ? 'warn' : 'info')}
        ${r.hints ? badge(`HINTS ${r.hints.verdict === 'central' ? 'central' : r.hints.verdict === 'peripheral' ? 'periférico' : 'indeterminado'}`, r.hints.verdict === 'central' ? 'bad' : r.hints.verdict === 'peripheral' ? 'ok' : 'warn') : ''}</p>
        <h4>Fundamentação</h4><ul>${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <h4>Sugestão</h4><ul class="checklist">${r.actions.map((x) => `<li>${icon('chevron')}<span>${esc(x)}</span></li>`).join('')}</ul>`, tone)}
      <p class="ref">Newman-Toker DE, Edlow JA. Neurol Clin 2015;33:577–99 (TiTrATE); Vanni S et al. Neurology 2017;89:1185 (STANDING); Navi BB et al. Stroke 2012 (ABCD2 na tontura); Edlow JA et al. Acad Emerg Med 2023 (GRACE-3).</p>
      ${disclaimer()}`;
  };
  f.addEventListener('change', upd);
  upd();
}
