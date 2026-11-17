import { page, q, esc, icon, disclaimer, num, sw, resultBox, badge, fmt, setting, toast } from './_shared';
import { caloric, vhit, vemp, integrate, CANALS, type CaloricInput, type VhitInput, type VempInput, type Canal } from '../clinical/labtests';
import { barChart } from '../core/chart';

const calSet = setting<CaloricInput & { done?: boolean }>('lab.caloric', { rw: 0, rc: 0, lw: 0, lc: 0, uwLimit: 25, dpLimit: 30, bilateralLimit: 6, fixationIndex: null });
const vhitSet = setting<VhitInput & { done?: boolean }>('lab.vhit', { hLimit: 0.8, vLimit: 0.7 });
const emptyEar = () => ({ amp: null, threshold: null, absent: false });
const vempSet = setting<VempInput & { done?: boolean }>('lab.vemp', { c: { right: emptyEar(), left: emptyEar() }, o: { right: emptyEar(), left: emptyEar() }, arLimit: 35, cThreshLow: 65, oAmpHigh: 17 });

const printBtn = `<button class="icon-btn" onclick="window.print()" title="Imprimir / PDF" aria-label="Imprimir">${icon('print')}</button>`;
const nOrNull = (v: FormDataEntryValue | null) => (v === null || v === '' ? null : Number(v));

/* ---------------- Calóricas ---------------- */
export function caloricView(app: HTMLElement) {
  const s = calSet.get();
  page(app, { title: 'Provas calóricas', sub: 'Paresia canalar (Jongkees) e preponderância direcional', back: '/', actions: printBtn }, `
  <div class="grid2">
    <form id="f" class="stack">
      <div class="card">
        <h2>SPV máxima da fase lenta (°/s)</h2>
        <div class="cal-grid">
          <span></span><b>Quente (44 °C / 50 °C ar)</b><b>Fria (30 °C / 24 °C ar)</b>
          <b>Ouvido direito</b>${num('rw', '', s.rw || '', '°/s', 'step="0.1" min="0"')}${num('rc', '', s.rc || '', '°/s', 'step="0.1" min="0"')}
          <b>Ouvido esquerdo</b>${num('lw', '', s.lw || '', '°/s', 'step="0.1" min="0"')}${num('lc', '', s.lc || '', '°/s', 'step="0.1" min="0"')}
        </div>
        ${num('fi', 'Índice de fixação (opcional)', s.fixationIndex ?? '', '', 'step="0.01" min="0"')}
      </div>
      <details class="card"><summary><b>Limites do laboratório</b></summary>
        <div class="field-grid">${num('uwL', 'Paresia canalar ≥', s.uwLimit, '%')}${num('dpL', 'Preponderância direcional ≥', s.dpLimit, '%')}${num('bilL', 'Hiporreflexia bilateral: soma por lado <', s.bilateralLimit, '°/s')}</div>
      </details>
    </form>
    <section id="out" class="stack sticky-col"></section>
  </div>`);
  const f = q<HTMLFormElement>('#f');
  const upd = () => {
    const fd = new FormData(f);
    const inp: CaloricInput = { rw: Number(fd.get('rw') || 0), rc: Number(fd.get('rc') || 0), lw: Number(fd.get('lw') || 0), lc: Number(fd.get('lc') || 0), uwLimit: Number(fd.get('uwL') || 25), dpLimit: Number(fd.get('dpL') || 30), bilateralLimit: Number(fd.get('bilL') || 6), fixationIndex: nOrNull(fd.get('fi')) };
    const done = inp.rw + inp.rc + inp.lw + inp.lc > 0;
    calSet.set({ ...inp, done });
    if (!done) { q('#out').innerHTML = `<div class="card empty"><p>Introduza as quatro respostas.</p></div>`; return; }
    const r = caloric(inp);
    q('#out').innerHTML = `
      ${resultBox('Resultado', `
        <p class="badges">${badge(`Paresia canalar ${fmt(Math.abs(r.uw), 0)} %${r.weakSide ? ` (${r.weakSide === 'right' ? 'direita' : 'esquerda'})` : ''}`, r.weakSide ? 'warn' : 'ok')}
        ${badge(`Preponderância direcional ${fmt(Math.abs(r.dp), 0)} %${r.dpSide ? ` (→ ${r.dpSide === 'right' ? 'dir.' : 'esq.'})` : ''}`, r.dpSide ? 'warn' : 'ok')}
        ${badge(`Soma: dir. ${fmt(r.sumR, 0)} · esq. ${fmt(r.sumL, 0)} °/s`, r.bilateral ? 'bad' : 'info')}</p>
        <ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`, r.bilateral || r.weakSide ? 'warn' : 'ok')}
      <div class="card">${barChart([
        { label: 'D quente', value: inp.rw, tone: 'a' }, { label: 'D fria', value: inp.rc, tone: 'a' },
        { label: 'E quente', value: inp.lw, tone: 'b' }, { label: 'E fria', value: inp.lc, tone: 'b' },
      ], { unit: ' °/s', title: 'SPV máxima por irrigação' })}</div>
      <div class="card small"><p><b>Fórmulas</b> — PC = [(DQ+DF) − (EQ+EF)] / Σ × 100; PD = [(DQ+EF) − (EQ+DF)] / Σ × 100.</p>
        <p class="ref">Jongkees LB, Philipszoon AJ. Acta Otolaryngol 1964; Strupp M et al. J Vestib Res 2017 (critério bilateral).</p>
        <a class="btn small" href="#/provas/relatorio">${icon('clipboard')}Relatório integrado</a></div>`;
  };
  f.addEventListener('input', upd);
  upd();
}

/* ---------------- vHIT ---------------- */
export function vhitView(app: HTMLElement) {
  const s = vhitSet.get();
  page(app, { title: 'vHIT', sub: 'Ganhos por canal e sacadas corretivas', back: '/', actions: printBtn }, `
  <div class="grid2">
    <form id="f" class="stack">
      <div class="card">
        <h2>Ganho e sacadas por canal</h2>
        <div class="vhit-grid">
          ${CANALS.map((c) => {
            const d = s[c.id];
            return `<fieldset class="vhit-canal"><legend>${esc(c.name)} <small>(${c.id})</small></legend>
              ${num(`g_${c.id}`, 'Ganho', d?.gain ?? '', '', 'step="0.01" min="0" max="2"')}
              <label class="switch small"><input type="checkbox" name="cv_${c.id}"${d?.covert ? ' checked' : ''}><span class="track"></span><span>Sacadas cobertas</span></label>
              <label class="switch small"><input type="checkbox" name="ov_${c.id}"${d?.overt ? ' checked' : ''}><span class="track"></span><span>Sacadas não cobertas</span></label>
            </fieldset>`;
          }).join('')}
        </div>
      </div>
      <details class="card"><summary><b>Limites</b></summary><div class="field-grid">${num('hL', 'Ganho normal horizontal ≥', s.hLimit, '')}${num('vL', 'Ganho normal vertical ≥', s.vLimit, '')}</div></details>
    </form>
    <section id="out" class="stack sticky-col"></section>
  </div>`);
  const f = q<HTMLFormElement>('#f');
  const upd = () => {
    const fd = new FormData(f);
    const inp: VhitInput = { hLimit: Number(fd.get('hL') || 0.8), vLimit: Number(fd.get('vL') || 0.7) };
    let any = false;
    for (const c of CANALS) {
      const g = nOrNull(fd.get(`g_${c.id}`));
      if (g !== null) any = true;
      inp[c.id] = { gain: g, covert: fd.get(`cv_${c.id}`) === 'on', overt: fd.get(`ov_${c.id}`) === 'on' };
    }
    vhitSet.set({ ...inp, done: any });
    if (!any) { q('#out').innerHTML = `<div class="card empty"><p>Introduza os ganhos medidos (pelo menos os horizontais).</p></div>`; return; }
    const r = vhit(inp);
    const tile = (id: Canal) => {
      const c = r.perCanal.find((x) => x.id === id)!;
      return `<div class="canal-tile ${c.gain === null ? 'na' : c.abnormal ? 'bad' : 'ok'}"><b>${id}</b><span>${c.gain === null ? '—' : fmt(c.gain, 2)}</span><small>${esc(c.saccades)}</small></div>`;
    };
    q('#out').innerHTML = `
      ${resultBox(esc(r.pattern), `<ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>${r.hAsym !== null ? `<p class="small">Assimetria horizontal: ${fmt(r.hAsym, 0)} %</p>` : ''}`, r.abnormal.length ? 'warn' : 'ok')}
      <div class="card"><h3>Mapa dos canais</h3>
        <div class="canal-map"><div class="cm-row">${tile('LA')}<span class="cm-lab">LARP / RALP</span>${tile('RA')}</div><div class="cm-row">${tile('LH')}<span class="cm-lab">Horizontais</span>${tile('RH')}</div><div class="cm-row">${tile('LP')}<span class="cm-lab"></span>${tile('RP')}</div></div>
        <p class="small muted">Nervo vestibular superior: canais lateral e anterior (e utrículo → oVEMP). Inferior: canal posterior (e sáculo → cVEMP).</p>
        <p class="ref">MacDougall HG et al. Neurology 2009; Halmagyi GM et al. Front Neurol 2017.</p>
        <a class="btn small" href="#/provas/relatorio">${icon('clipboard')}Relatório integrado</a></div>`;
  };
  f.addEventListener('input', upd);
  f.addEventListener('change', upd);
  upd();
}

/* ---------------- VEMPs ---------------- */
export function vempView(app: HTMLElement) {
  const s = vempSet.get();
  const ear = (t: 'c' | 'o', side: 'right' | 'left', label: string) => {
    const d = s[t][side];
    return `<fieldset class="vhit-canal"><legend>${label}</legend>
      ${num(`${t}_${side}_amp`, t === 'c' ? 'Amplitude P13-N23 (µV)' : 'Amplitude N10 (µV)', d.amp ?? '', 'µV', 'step="0.1" min="0"')}
      ${num(`${t}_${side}_thr`, 'Limiar', d.threshold ?? '', 'dB nHL', 'step="1" min="0"')}
      <label class="switch small"><input type="checkbox" name="${t}_${side}_abs"${d.absent ? ' checked' : ''}><span class="track"></span><span>Ausente</span></label>
    </fieldset>`;
  };
  page(app, { title: 'VEMPs', sub: 'cVEMP e oVEMP: assimetria, limiares e terceira janela', back: '/', actions: printBtn }, `
  <div class="grid2">
    <form id="f" class="stack">
      <div class="card"><h2>cVEMP (sáculo / nervo vestibular inferior)</h2><p class="muted small">Registo no ECM ipsilateral ao ouvido estimulado. Use a amplitude corrigida pelo EMG, se disponível.</p>
        <div class="vhit-grid two">${ear('c', 'right', 'Ouvido direito')}${ear('c', 'left', 'Ouvido esquerdo')}</div></div>
      <div class="card"><h2>oVEMP (utrículo / nervo vestibular superior)</h2><p class="muted small">Indique o ouvido ESTIMULADO (a resposta é registada sob o olho contralateral).</p>
        <div class="vhit-grid two">${ear('o', 'right', 'Ouvido direito')}${ear('o', 'left', 'Ouvido esquerdo')}</div></div>
      <details class="card"><summary><b>Limites</b></summary><div class="field-grid">
        ${num('arL', 'Razão de assimetria anormal ≥', s.arLimit, '%')}${num('cLow', 'Limiar cVEMP baixo ≤', s.cThreshLow, 'dB nHL')}${num('oHigh', 'Amplitude oVEMP elevada ≥', s.oAmpHigh, 'µV')}
      </div><p class="small muted">Valores de referência variam com o estímulo (som aéreo 500 Hz, vibração óssea), a idade e o equipamento.</p></details>
    </form>
    <section id="out" class="stack sticky-col"></section>
  </div>`);
  const f = q<HTMLFormElement>('#f');
  const upd = () => {
    const fd = new FormData(f);
    const e = (t: 'c' | 'o', side: 'right' | 'left') => ({ amp: nOrNull(fd.get(`${t}_${side}_amp`)), threshold: nOrNull(fd.get(`${t}_${side}_thr`)), absent: fd.get(`${t}_${side}_abs`) === 'on' });
    const inp: VempInput = { c: { right: e('c', 'right'), left: e('c', 'left') }, o: { right: e('o', 'right'), left: e('o', 'left') }, arLimit: Number(fd.get('arL') || 35), cThreshLow: Number(fd.get('cLow') || 65), oAmpHigh: Number(fd.get('oHigh') || 17) };
    const any = [inp.c.right, inp.c.left, inp.o.right, inp.o.left].some((x) => x.amp !== null || x.absent || x.threshold !== null);
    vempSet.set({ ...inp, done: any });
    if (!any) { q('#out').innerHTML = `<div class="card empty"><p>Introduza amplitudes e/ou limiares.</p></div>`; return; }
    const r = vemp(inp);
    q('#out').innerHTML = `${resultBox('Resultado', `
      <p class="badges">${r.cAR !== null ? badge(`cVEMP RA ${fmt(r.cAR, 0)} %`, r.cAR >= inp.arLimit! ? 'warn' : 'ok') : ''} ${r.oAR !== null ? badge(`oVEMP RA ${fmt(r.oAR, 0)} %`, r.oAR >= inp.arLimit! ? 'warn' : 'ok') : ''}
      ${r.scdSides.length ? badge('Suspeita de deiscência', 'bad') : ''}</p>
      <ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`, r.scdSides.length ? 'bad' : r.lines.some((l) => /ausente|≥/.test(l)) ? 'warn' : 'ok')}
      <div class="card small"><p>Razão de assimetria = |D − E| / (D + E) × 100.</p>
      <p class="ref">Rosengren SM et al. Clin Neurophysiol 2019 (guia de VEMPs); Zuniga MG et al. Otol Neurotol 2013 (oVEMP na deiscência); Ward BK et al. J Vestib Res 2021.</p>
      <a class="btn small" href="#/provas/relatorio">${icon('clipboard')}Relatório integrado</a></div>`;
  };
  f.addEventListener('input', upd);
  f.addEventListener('change', upd);
  upd();
}

/* ---------------- Relatório integrado ---------------- */
const repSet = setting<{ label: string; central: Record<string, boolean>; notes: string }>('lab.report', { label: '', central: {}, notes: '' });

export function integratedView(app: HTMLElement) {
  const c = calSet.get(), v = vhitSet.get(), e = vempSet.get(), rep = repSet.get();
  const CEN: [string, string][] = [['saccades', 'Sacadas alteradas (dismetria, lentificação)'], ['pursuit', 'Perseguição lenta sacádica bilateral'], ['gazeNystagmus', 'Nistagmo evocado pelo olhar'], ['skew', 'Skew deviation'], ['failedFixation', 'Falha de supressão pela fixação (calóricas)'], ['verticalNystagmus', 'Nistagmo espontâneo vertical/torsional puro']];
  page(app, { title: 'Relatório vestibular integrado', sub: 'Calóricas + vHIT + VEMPs + oculomotricidade', back: '/', actions: printBtn }, `
  <div class="grid2">
    <form id="f" class="stack no-print">
      <div class="card">
        <label class="field"><span>Identificação (sem dados pessoais)</span><input type="text" name="label" value="${esc(rep.label)}" placeholder="p. ex. Processo 1234"></label>
        <p class="small mt">Provas incluídas: ${c.done ? badge('Calóricas', 'ok') : `<a href="#/provas/caloricas">calóricas</a>`} ${v.done ? badge('vHIT', 'ok') : `<a href="#/provas/vhit">vHIT</a>`} ${e.done ? badge('VEMPs', 'ok') : `<a href="#/provas/vemp">VEMPs</a>`}</p>
      </div>
      <div class="card"><h2>Oculomotricidade / sinais centrais</h2>${CEN.map(([k, l]) => sw(k, l, !!rep.central[k])).join('')}</div>
      <div class="card"><label class="field"><span>Notas / outras provas (audiograma, posturografia…)</span><textarea name="notes" rows="4">${esc(rep.notes)}</textarea></label></div>
    </form>
    <section id="out" class="stack report"></section>
  </div>`);
  const f = q<HTMLFormElement>('#f');
  const upd = () => {
    const fd = new FormData(f);
    const central = Object.fromEntries(CEN.map(([k]) => [k, fd.get(k) === 'on'])) as Record<string, boolean>;
    repSet.set({ label: String(fd.get('label') ?? ''), central, notes: String(fd.get('notes') ?? '') });
    const cr = c.done ? caloric(c) : undefined;
    const vr = v.done ? vhit(v) : undefined;
    const er = e.done ? vemp(e) : undefined;
    const r = integrate({ caloric: cr, vhit: vr, vemp: er, vempRaw: e.done ? e : undefined, central: central as never });
    q('#out').innerHTML = `<article class="card report-card">
      <header><span class="eyebrow">Relatório vestibular · ${new Date().toLocaleDateString('pt-PT')}</span><h2>${esc(String(fd.get('label') || 'Doente'))}</h2></header>
      ${resultBox(`Conclusão: ${esc(r.localization)}`, '', r.tone)}
      <h3>Achados</h3>
      <ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('') || '<li>Sem provas introduzidas.</li>'}</ul>
      ${cr ? `<p class="small">Calóricas — DQ ${c.rw}, DF ${c.rc}, EQ ${c.lw}, EF ${c.lc} °/s · PC ${fmt(Math.abs(cr.uw), 0)} % · PD ${fmt(Math.abs(cr.dp), 0)} %</p>` : ''}
      ${vr ? `<p class="small">vHIT — ${vr.perCanal.filter((x) => x.gain !== null).map((x) => `${x.id} ${fmt(x.gain, 2)}${x.abnormal ? '↓' : ''}`).join(' · ')}</p>` : ''}
      ${er ? `<p class="small">VEMPs — cVEMP RA ${fmt(er.cAR, 0)} %, oVEMP RA ${fmt(er.oAR, 0)} %</p>` : ''}
      ${fd.get('notes') ? `<h3>Notas</h3><p>${esc(String(fd.get('notes')))}</p>` : ''}
      <p class="small muted">Relatório gerado por apoio à decisão — validar e assinar pelo médico responsável.</p>
    </article>
    <div class="actionbar no-print"><button class="btn primary" id="pr">${icon('print')}Imprimir / guardar PDF</button><button class="btn" id="cp">${icon('clipboard')}Copiar texto</button></div>
    ${disclaimer()}`;
    q('#pr').onclick = () => window.print();
    q('#cp').onclick = async () => { try { await navigator.clipboard.writeText((q('.report-card') as HTMLElement).innerText); toast('Copiado'); } catch { toast('Não foi possível copiar'); } };
  };
  f.addEventListener('input', upd);
  f.addEventListener('change', upd);
  upd();
}
