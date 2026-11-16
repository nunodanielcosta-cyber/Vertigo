import { page, q, esc, icon, disclaimer, num, sw, resultBox, badge, fmt } from './_shared';
import { pta4, stage, FUNCTIONAL_LEVELS, vertigoClass, treatmentHints } from '../clinical/meniere';

export function meniereAaoView(app: HTMLElement) {
  page(app, { title: 'Doença de Ménière — AAO-HNS', sub: 'Estadiamento, nível funcional e classe de controlo da vertigem', back: '/' }, `
  <div class="grid2">
    <form id="f" class="stack">
      <div class="card">
        <h2>Estadiamento audiométrico</h2>
        <p class="muted small">Limiares por via aérea do ouvido afetado — pior audiograma nos 6 meses antes do tratamento.</p>
        <div class="field-grid">${num('f500', '500 Hz', 40, 'dB')}${num('f1k', '1 kHz', 40, 'dB')}${num('f2k', '2 kHz', 35, 'dB')}${num('f3k', '3 kHz', 40, 'dB')}</div>
      </div>
      <div class="card">
        <h2>Nível funcional (escolhido pelo doente)</h2>
        <div class="radio-list">${FUNCTIONAL_LEVELS.map(([n, t]) => `<label class="radio-card"><input type="radio" name="level" value="${n}"${n === 2 ? ' checked' : ''}><span><b>${n}</b> ${esc(t)}</span></label>`).join('')}</div>
      </div>
      <div class="card">
        <h2>Controlo da vertigem</h2>
        <p class="muted small">Média mensal de crises definitivas: 6 meses antes do tratamento (Y) e período de 6 meses entre os 18 e os 24 meses após (X). Pode usar períodos mais curtos para monitorização (não normalizado).</p>
        <div class="field-grid">${num('before', 'Crises/mês antes (Y)', 4, '')}${num('after', 'Crises/mês depois (X)', '', '')}</div>
        ${sw('secondary', 'Foi iniciado tratamento secundário por incapacidade')}
      </div>
      <div class="card">
        <h2>Contexto para a decisão</h2>
        ${sw('failed', 'Falência do tratamento médico (≥ 6 meses de medidas de 1.ª linha)')}
        ${sw('serviceable', 'Audição útil no ouvido afetado', true)}
        ${sw('bilateral', 'Doença bilateral / ouvido contralateral em risco')}
      </div>
    </form>
    <section id="out" class="stack sticky-col"></section>
  </div>`);
  const f = q<HTMLFormElement>('#f');
  const upd = () => {
    const fd = new FormData(f);
    const n = (k: string) => (fd.get(k) === '' || fd.get(k) === null ? null : Number(fd.get(k)));
    const vals = ['f500', 'f1k', 'f2k', 'f3k'].map(n);
    const p = vals.every((v) => v !== null) ? pta4(vals[0]!, vals[1]!, vals[2]!, vals[3]!) : null;
    const st = p !== null ? stage(p) : null;
    const level = Number(fd.get('level') ?? 2);
    const before = n('before'), after = n('after');
    const vc = before !== null && after !== null ? vertigoClass(before, after, fd.get('secondary') === 'on') : fd.get('secondary') === 'on' ? vertigoClass(1, 0, true) : null;
    const hints = treatmentHints({ stage: st?.stage ?? 1, level, cls: vc?.cls ?? '', failedMedical: fd.get('failed') === 'on', serviceableHearing: fd.get('serviceable') === 'on', bilateral: fd.get('bilateral') === 'on' });
    q('#out').innerHTML = `
      ${resultBox('Resumo AAO-HNS', `
        <p class="badges">${st ? badge(`Estádio ${st.stage} (PTA ${fmt(p, 1)} dB; ${st.range})`, st.stage >= 3 ? 'warn' : 'info') : badge('Estádio: preencher limiares', 'info')}
        ${badge(`Nível funcional ${level}`, level >= 4 ? 'warn' : 'info')}
        ${vc ? badge(`Classe ${vc.cls}${vc.value !== null ? ` (${vc.value})` : ''}`, ['A', 'B'].includes(vc.cls) ? 'ok' : vc.cls === '—' ? 'info' : 'warn') : ''}</p>
        ${vc ? `<p>${esc(vc.text)}</p>` : ''}
        <p class="small muted">Classes: A = 0; B = 1–40; C = 41–80; D = 81–120; E = &gt; 120; F = tratamento secundário. Audição: alteração ≥ 10 dB no PTA ou ≥ 15 % na discriminação é significativa.</p>`, 'info')}
      <div class="card"><h3>Pontos para a decisão terapêutica</h3><ul class="checklist">${hints.map((h) => `<li>${icon('chevron')}<span>${esc(h)}</span></li>`).join('')}</ul></div>
      <p class="ref">Committee on Hearing and Equilibrium. Otolaryngol Head Neck Surg 1995;113:181–5; Basura GJ et al. Clinical Practice Guideline: Ménière's Disease. Otolaryngol Head Neck Surg 2020;162(2_suppl):S1–S55.</p>
      ${disclaimer('Orientação para discussão clínica — não constitui recomendação de tratamento individual.')}`;
  };
  f.addEventListener('input', upd);
  f.addEventListener('change', upd);
  upd();
}
