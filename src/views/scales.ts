import { ask, page, q, esc, icon, disclaimer, collection, uid, fmtDate, resultBox, navTile, Stopwatch, fmt, download, toCSV } from './_shared';
import { SCALES, getScale, tugInterpret, type Scale } from '../clinical/scales';
import { lineChart } from '../core/chart';
import { render } from '../core/router';
import type { Rec } from '../core/storage';

export interface ScaleRecord extends Rec { scaleId: string; values: (number | null)[]; total: number; display: string; note?: string }
export const scaleRecords = collection<ScaleRecord>('scales');

export function scalesListView(app: HTMLElement, params: string[]) {
  const fall = params[0] === 'fall';
  const list = SCALES.filter((s) => (fall ? s.group === 'fall' : s.group === 'questionnaire'));
  const recs = scaleRecords.all();
  page(app, { title: fall ? 'Risco de queda' : 'Questionários e escalas', back: '/' }, `
    <div class="nav-grid">
      ${fall ? navTile('/escalas/tug', 'walk', 'Timed Up and Go (TUG)', 'Cronómetro integrado; ≥ 13,5 s = risco de queda') : ''}
      ${list.map((s) => {
        const last = recs.find((r) => r.scaleId === s.id);
        return navTile(`/escalas/${s.id}`, fall ? 'walk' : 'clipboard', s.name, last ? `Último: ${last.display} em ${fmtDate(last.date)}` : s.desc);
      }).join('')}
    </div>
    <p class="small mt">${fall ? '<a href="#/escalas">Ver questionários →</a>' : '<a href="#/quedas">Ver escalas de risco de queda →</a>'}</p>
    ${historyCard(recs.filter((r) => list.some((s) => s.id === r.scaleId) || (fall && r.scaleId === 'tug')))}
    ${disclaimer('Traduções de trabalho. Para investigação ou publicação use as versões portuguesas validadas e respeite os direitos de autor de cada instrumento.')}`);
  wireHistory(app);
}

function historyCard(recs: ScaleRecord[]) {
  if (!recs.length) return '';
  return `<div class="card mt"><div class="hyp-head"><h2>Histórico</h2><button class="btn small" id="csv">${icon('download')}CSV</button></div>
    <ul class="rec-list">${recs.slice(0, 40).map((r) => `<li><span><b>${esc(getScale(r.scaleId)?.short ?? r.scaleId.toUpperCase())}</b> ${esc(r.display)} <small class="muted">${fmtDate(r.date, true)}</small></span><button class="icon-btn" data-del="${r.id}" aria-label="Apagar">${icon('trash')}</button></li>`).join('')}</ul></div>`;
}
function wireHistory(app: HTMLElement) {
  app.querySelectorAll<HTMLElement>('[data-del]').forEach((b) => (b.onclick = async () => { if (await ask('Apagar este registo?', { ok: 'Apagar', danger: true })) { scaleRecords.remove(b.dataset.del!); render(); } }));
  const c = app.querySelector<HTMLElement>('#csv');
  if (c) c.onclick = () => download('vertigo-escalas.csv', toCSV([['data', 'escala', 'total', 'resultado'], ...scaleRecords.all().map((r) => [r.date, r.scaleId, r.total, r.display])]), 'text/csv');
}

function optionsHtml(s: Scale, i: number, v: number | null) {
  const name = `i${i}`;
  if (s.options === 'percent') {
    return `<div class="pct-row"><input type="range" name="${name}" min="0" max="100" step="10" value="${v ?? 50}" data-touched="${v !== null ? 1 : 0}" aria-label="Confiança em %"><output>${v ?? '—'}${v !== null ? ' %' : ''}</output></div>`;
  }
  const opts: [number, string][] = s.options === 'mssq' ? [[-1, 'Nunca experimentei'], [0, 'Nunca enjoei'], [1, 'Raramente'], [2, 'Às vezes'], [3, 'Frequentemente']] : s.options;
  return `<div class="pills pills-wrap" role="radiogroup">${opts.map(([val, l]) => `<label class="pill"><input type="radio" name="${name}" value="${val}"${v === val ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
}

export function scaleView(app: HTMLElement, [id]: string[]) {
  const s = getScale(id);
  if (!s) { page(app, { title: 'Escala', back: '/escalas' }, '<p>Escala não encontrada.</p>'); return; }
  const values: (number | null)[] = s.items.map(() => null);
  const past = scaleRecords.all().filter((r) => r.scaleId === s.id);
  const back = s.group === 'fall' ? '/quedas' : '/escalas';
  page(app, { title: s.name, sub: s.desc, back }, `
  <div class="grid2">
    <form id="f" class="card scale-form">
      <p class="muted">${esc(s.instructions)}</p>
      ${s.items.map((it, i) => {
        const head = s.sections && (i === 0 || i === 9) ? `<h3 class="group-title">${esc(s.sections[i === 0 ? 0 : 1])}</h3>` : '';
        return `${head}<div class="scale-item" id="it${i}"><div class="q-text"><span class="q-n">${i + 1}.</span> ${esc(it.text)}${it.timed ? ` <button type="button" class="btn small sw-btn" data-sw="${i}">${icon('rec')}<span>${it.timed} s</span></button>` : ''}</div>${optionsHtml(s, i, null)}</div>`;
      }).join('')}
    </form>
    <section class="stack sticky-col">
      <div id="out"></div>
      <label class="field"><span>Nota (opcional)</span><input type="text" id="note" placeholder="p. ex. antes da reabilitação"></label>
      <button class="btn primary big" id="save">${icon('check')}Guardar resultado</button>
      ${past.length > 1 ? lineChart([{ name: s.short, cls: 'a', points: past.map((r) => ({ x: Date.parse(r.date), y: r.total, tip: `${fmtDate(r.date)}: ${r.display}` })) }], { xTime: true, title: `Evolução ${s.short}`, yMin: 0, yMax: s.score(s.items.map(() => null)).max }) : ''}
      <p class="ref">${esc(s.reference)}</p>
    </section>
  </div>`);
  const f = q<HTMLFormElement>('#f');
  const upd = () => {
    s.items.forEach((_, i) => {
      const el = f.elements.namedItem(`i${i}`) as RadioNodeList | HTMLInputElement | null;
      if (!el) return;
      if (s.options === 'percent') {
        const inp = el as HTMLInputElement;
        values[i] = inp.dataset.touched === '1' ? Number(inp.value) : null;
        (inp.nextElementSibling as HTMLOutputElement).textContent = values[i] !== null ? `${values[i]} %` : '—';
      } else {
        const v = (el as RadioNodeList).value;
        values[i] = v === '' ? null : Number(v);
      }
      q(`#it${i}`).classList.toggle('answered', values[i] !== null);
    });
    const r = s.score(values);
    const n = values.filter((x) => x !== null).length;
    q('#out').innerHTML = resultBox(`${esc(s.short)}: ${esc(r.display)}`, `
      <p>${esc(r.interpretation)}</p>
      ${r.subs.length ? `<p class="badges">${r.subs.map((x) => `<span class="badge badge-info">${esc(x.name)}: ${esc(x.value)}</span>`).join(' ')}</p>` : ''}
      <p class="small muted">${n}/${s.items.length} respondidas${r.complete ? '' : ' — resultado provisório'}</p>`, r.tone);
  };
  f.addEventListener('input', (e) => { const t = e.target as HTMLInputElement; if (t.type === 'range') t.dataset.touched = '1'; upd(); });
  f.addEventListener('change', upd);
  // cronómetros nas tarefas temporizadas
  app.querySelectorAll<HTMLButtonElement>('[data-sw]').forEach((b) => {
    const target = s.items[Number(b.dataset.sw)].timed!;
    const label = b.querySelector('span')!;
    const swc = new Stopwatch((t) => { label.textContent = `${t.toFixed(1)} s`; b.classList.toggle('done', t >= target); });
    b.onclick = () => { if (!swc.running && swc.value > 0) swc.reset(); else swc.toggle(); };
  });
  q('#save').onclick = async () => {
    const r = s.score(values);
    if (!r.complete && !(await ask('Há perguntas sem resposta. Guardar mesmo assim?', { ok: 'Guardar' }))) return;
    scaleRecords.save({ id: uid(), date: new Date().toISOString(), scaleId: s.id, values: [...values], total: r.total, display: r.display, note: (q('#note') as HTMLInputElement).value });
    location.hash = back;
  };
  upd();
}

export function tugView(app: HTMLElement) {
  const past = scaleRecords.all().filter((r) => r.scaleId === 'tug');
  page(app, { title: 'Timed Up and Go (TUG)', sub: 'Levantar, andar 3 m, voltar e sentar', back: '/quedas' }, `
  <div class="grid2">
    <section class="card">
      <ol class="timeline compact">
        <li>Doente sentado numa cadeira com braços, costas apoiadas, com o calçado habitual (e auxiliar de marcha, se usar).</li>
        <li>Ao sinal «já», levanta-se, anda 3 metros a passo confortável e seguro, roda, volta e senta-se.</li>
        <li>Parar o cronómetro quando as costas tocam no encosto. Fazer 1 ensaio de treino.</li>
      </ol>
      <div class="big-timer" id="t">0,0<small> s</small></div>
      <div class="actionbar"><button class="btn primary big" id="go">${icon('play')}Iniciar</button><button class="btn big" id="rst">${icon('refresh')}Repor</button></div>
      <label class="field mt"><span>Ou introduzir manualmente</span><span class="input-unit"><input type="number" id="man" step="0.1" min="0"><em>s</em></span></label>
      <label class="switch"><input type="checkbox" id="cog"><span class="track"></span><span>TUG cognitivo/dual-task (a contar para trás)</span></label>
    </section>
    <section class="stack"><div id="out"></div><button class="btn primary big" id="save" disabled>${icon('check')}Guardar</button>
      ${past.length > 1 ? lineChart([{ name: 'TUG', cls: 'a', points: past.map((r) => ({ x: Date.parse(r.date), y: r.total })) }], { xTime: true, title: 'Evolução do TUG (s)', band: [0, 12] }) : ''}
      <p class="ref">Podsiadlo D, Richardson S. J Am Geriatr Soc 1991;39:142–8; Shumway-Cook A et al. Phys Ther 2000;80:896–903.</p></section>
  </div>`);
  let val = 0;
  const show = (s: number) => {
    val = s;
    q('#t').innerHTML = `${fmt(s)}<small> s</small>`;
    const it = tugInterpret(s);
    q('#out').innerHTML = s > 0 ? resultBox(`TUG ${fmt(s)} s`, `<p>${esc(it.text)}</p>`, it.tone) : '';
    (q('#save') as HTMLButtonElement).disabled = !(s > 0);
  };
  const swc = new Stopwatch(show);
  q('#go').onclick = () => { swc.toggle(); q('#go').innerHTML = swc.running ? `${icon('stop')}Parar` : `${icon('play')}Continuar`; };
  q('#rst').onclick = () => { swc.reset(); q('#go').innerHTML = `${icon('play')}Iniciar`; };
  (q('#man') as HTMLInputElement).oninput = (e) => { swc.reset(); show(Number((e.target as HTMLInputElement).value) || 0); };
  q('#save').onclick = () => {
    const cog = (q('#cog') as HTMLInputElement).checked;
    scaleRecords.save({ id: uid(), date: new Date().toISOString(), scaleId: 'tug', values: [val], total: Math.round(val * 10) / 10, display: `${fmt(val)} s${cog ? ' (dual-task)' : ''}` });
    location.hash = '/quedas';
  };
}
