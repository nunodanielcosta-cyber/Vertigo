import { page, q, esc, icon, collection, uid, fmtDate, pills, checks, download, toCSV, toast, navigate, todayISO } from '../_shared';
import { SYMPTOMS, TRIGGERS, KINDS, monthlyCounts, weeklyCounts, triggerFrequency, factorAssociation, type Attack, type DayLog } from '../../clinical/diary';
import { barChart, lineChart } from '../../core/chart';
import { nystRecs } from '../sensors/nystagmusRec';

export const attacksCol = collection<Attack>('attacks', 5000);
export const daysCol = collection<DayLog>('days', 5000);

const localDT = (iso?: string) => { const d = iso ? new Date(iso) : new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function attackFormView(app: HTMLElement, params: string[]) {
  const ex = params[0] ? attacksCol.get(params[0]) : undefined;
  const a: Attack = ex ?? { id: uid(), date: new Date().toISOString(), durationMin: 60, severity: 5, kind: 'rotatory', ear: 'none', symptoms: [], triggers: [], meds: '', notes: '' };
  page(app, { title: ex ? 'Editar crise' : 'Registar uma crise', back: '/doente/diario' }, `
  <form id="f" class="stack narrow">
    <div class="card">
      <div class="field-grid wide">
        <label class="field"><span>Início</span><input type="datetime-local" name="date" value="${localDT(a.date)}" required></label>
        <label class="field"><span>Duração</span><select name="dur">
          ${[[1, '< 1 min'], [5, '1–5 min'], [15, '5–20 min'], [60, '20 min – 2 h'], [240, '2–12 h'], [960, '12–24 h'], [2880, '> 24 h']].map(([v, l]) => `<option value="${v}"${a.durationMin === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select></label>
      </div>
      <div class="q-block"><b>Intensidade: <output id="sevO">${a.severity}</output>/10</b><input type="range" name="severity" min="0" max="10" value="${a.severity}" aria-label="Intensidade"></div>
      <div class="q-block"><b>Tipo</b>${pills('kind', Object.entries(KINDS), a.kind, 'pills-wrap')}</div>
      <div class="q-block"><b>Ouvido com sintomas</b>${pills('ear', [['none', 'Nenhum'], ['right', 'Direito'], ['left', 'Esquerdo'], ['both', 'Ambos']], a.ear)}</div>
    </div>
    <div class="card"><div class="q-block"><b>Sintomas associados</b>${checks('symptoms', SYMPTOMS, a.symptoms)}</div></div>
    <div class="card"><div class="q-block"><b>Possíveis desencadeantes</b>${checks('triggers', TRIGGERS, a.triggers)}</div></div>
    <div class="card">
      <label class="field"><span>Medicação tomada na crise</span><input type="text" name="meds" value="${esc(a.meds)}"></label>
      <label class="field"><span>Notas</span><textarea name="notes" rows="3">${esc(a.notes)}</textarea></label>
      <p class="small"><a href="#/sensores/nistagmo">${icon('camera')} Gravar os olhos agora (se a crise está a decorrer)</a></p>
    </div>
    <div class="alert small" role="note">${icon('alert')}<div>Se tiver <b>fraqueza, dificuldade em falar, visão dupla, dor de cabeça súbita intensa</b> ou não conseguir andar, ligue <b>112</b>.</div></div>
    <div class="actionbar"><button class="btn primary big">${icon('check')}Guardar</button>${ex ? `<button type="button" class="btn big" id="del">${icon('trash')}Apagar</button>` : ''}</div>
  </form>`);
  const f = q<HTMLFormElement>('#f');
  f.severity.oninput = () => (q('#sevO').textContent = f.severity.value);
  f.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    attacksCol.save({
      ...a, date: new Date(String(fd.get('date'))).toISOString(), durationMin: Number(fd.get('dur')), severity: Number(fd.get('severity')),
      kind: String(fd.get('kind')) as Attack['kind'], ear: String(fd.get('ear')) as Attack['ear'], symptoms: fd.getAll('symptoms') as string[], triggers: fd.getAll('triggers') as string[],
      meds: String(fd.get('meds') ?? ''), notes: String(fd.get('notes') ?? ''),
    });
    if ((fd.getAll('symptoms') as string[]).includes('neuro')) alert('Registou sintomas neurológicos (visão dupla, fala, fraqueza). Se são novos ou estão a acontecer agora, ligue 112.');
    toast('Crise registada');
    navigate('/doente/diario');
  };
  const del = app.querySelector<HTMLElement>('#del');
  if (del) del.onclick = () => { if (confirm('Apagar esta crise?')) { attacksCol.remove(a.id); navigate('/doente/diario'); } };
}

const slider = (name: string, label: string, v: number, max = 10, lo = '', hi = '') => `<div class="q-block"><b>${label}: <output data-o="${name}">${v}</output></b><input type="range" name="${name}" min="0" max="${max}" value="${v}" aria-label="${label}"><span class="range-ends"><small>${lo}</small><small>${hi}</small></span></div>`;

export function dayFormView(app: HTMLElement, params: string[]) {
  const date = params[0] ?? todayISO();
  const ex = daysCol.all().find((d) => d.date === date);
  const d: DayLog = ex ?? { id: uid(), date, salt: 1, caffeine: 1, alcohol: 0, stress: 3, sleep: 7, sleepQuality: 6, hearing: 10, tinnitus: 0, fullness: 0, headache: false, menstruation: false, dizziness: 0, notes: '' };
  page(app, { title: 'Registo do dia', sub: fmtDate(date), back: '/doente/diario' }, `
  <form id="f" class="stack narrow">
    <div class="card">
      <label class="field"><span>Dia</span><input type="date" name="date" value="${date}" max="${todayISO()}"></label>
      ${slider('dizziness', 'Tontura de fundo', d.dizziness, 10, 'nenhuma', 'máxima')}
    </div>
    <div class="card"><h2>Estilo de vida</h2>
      <div class="q-block"><b>Sal na alimentação</b>${pills('salt', [['0', 'Baixo'], ['1', 'Moderado'], ['2', 'Alto'], ['3', 'Muito alto']], String(d.salt))}</div>
      <div class="field-grid">
        <label class="field"><span>Cafés / bebidas com cafeína</span><input type="number" name="caffeine" min="0" max="20" value="${d.caffeine}"></label>
        <label class="field"><span>Bebidas alcoólicas</span><input type="number" name="alcohol" min="0" max="20" value="${d.alcohol}"></label>
        <label class="field"><span>Horas de sono</span><input type="number" name="sleep" min="0" max="16" step="0.5" value="${d.sleep}"></label>
      </div>
      ${slider('sleepQuality', 'Qualidade do sono', d.sleepQuality, 10, 'má', 'ótima')}
      ${slider('stress', 'Stress', d.stress, 10, 'nenhum', 'máximo')}
      <label class="switch"><input type="checkbox" name="headache"${d.headache ? ' checked' : ''}><span class="track"></span><span>Dor de cabeça</span></label>
      <label class="switch"><input type="checkbox" name="menstruation"${d.menstruation ? ' checked' : ''}><span class="track"></span><span>Menstruação</span></label>
    </div>
    <div class="card"><h2>Ouvido</h2>
      ${slider('hearing', 'Audição (como ouve hoje)', d.hearing, 10, 'muito mal', 'normal')}
      ${slider('tinnitus', 'Acufeno (zumbido)', d.tinnitus, 10, 'nenhum', 'máximo')}
      ${slider('fullness', 'Ouvido tapado', d.fullness, 10, 'nada', 'máximo')}
      <p class="small"><a href="#/doente/audicao">${icon('ear')} Fazer o teste de audição de hoje</a></p>
    </div>
    <div class="card"><label class="field"><span>Notas</span><textarea name="notes" rows="2">${esc(d.notes)}</textarea></label></div>
    <div class="actionbar"><button class="btn primary big">${icon('check')}Guardar</button></div>
  </form>`);
  const f = q<HTMLFormElement>('#f');
  f.addEventListener('input', (e) => { const t = e.target as HTMLInputElement; const o = app.querySelector(`[data-o="${t.name}"]`); if (o) o.textContent = t.value; });
  f.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const n = (k: string) => Number(fd.get(k) ?? 0);
    const newDate = String(fd.get('date') || date);
    const existing = daysCol.all().find((x) => x.date === newDate);
    daysCol.save({
      id: existing?.id ?? d.id, date: newDate, salt: n('salt') as DayLog['salt'], caffeine: n('caffeine'), alcohol: n('alcohol'), stress: n('stress'), sleep: n('sleep'), sleepQuality: n('sleepQuality'),
      hearing: n('hearing'), tinnitus: n('tinnitus'), fullness: n('fullness'), headache: fd.get('headache') === 'on', menstruation: fd.get('menstruation') === 'on', dizziness: n('dizziness'), notes: String(fd.get('notes') ?? ''),
    });
    toast('Dia registado');
    navigate('/doente/diario');
  };
}

export function diaryView(app: HTMLElement) {
  const attacks = attacksCol.all();
  const days = daysCol.all();
  const last90 = days.filter((d) => Date.now() - Date.parse(d.date) < 90 * 864e5);
  const assoc = [
    { name: 'Sal alto', f: (d: DayLog) => d.salt >= 2 },
    { name: 'Cafeína ≥ 3', f: (d: DayLog) => d.caffeine >= 3 },
    { name: 'Álcool', f: (d: DayLog) => d.alcohol > 0 },
    { name: 'Stress ≥ 7', f: (d: DayLog) => d.stress >= 7 },
    { name: 'Sono < 6 h', f: (d: DayLog) => d.sleep < 6 },
    { name: 'Menstruação', f: (d: DayLog) => d.menstruation },
  ].map((x) => ({ ...x, r: factorAssociation(last90, attacks, x.f) })).filter((x) => x.r.exposedDays >= 3 && x.r.unexposedDays >= 3);
  const trig = triggerFrequency(attacks);
  const hearingPts = days.slice().reverse().map((d) => ({ x: Date.parse(d.date), y: d.hearing, tip: `${fmtDate(d.date)}: audição ${d.hearing}/10` }));
  const tinnPts = days.slice().reverse().map((d) => ({ x: Date.parse(d.date), y: d.tinnitus, tip: `${fmtDate(d.date)}: acufeno ${d.tinnitus}/10` }));

  page(app, { title: 'Diário de vertigem', sub: `${attacks.length} crises · ${days.length} dias registados`, back: '/', actions: `<button class="icon-btn" id="exp" title="Exportar" aria-label="Exportar">${icon('download')}</button>` }, `
  <div class="actionbar"><a class="btn primary big" href="#/doente/crise">${icon('plus')}Registar crise</a><a class="btn big" href="#/doente/dia">${icon('calendar')}Registo do dia</a><a class="btn big" href="#/resumo">${icon('print')}Resumo para a consulta</a></div>
  <div class="grid2 mt">
    <section class="stack">
      <div class="card">${barChart(weeklyCounts(attacks, 12), { title: 'Crises por semana (12 semanas)' })}</div>
      <div class="card">${barChart(monthlyCounts(attacks, 6).map((m) => ({ label: m.label, value: m.value, tip: `${m.label}: ${m.value} crises, intensidade média ${m.meanSev.toFixed(1)}` })), { title: 'Crises por mês (6 meses)' })}</div>
      ${days.length > 1 ? `<div class="card">${lineChart([{ name: 'Audição (0–10)', cls: 'a', points: hearingPts }, { name: 'Acufeno (0–10)', cls: 'b', points: tinnPts }], { xTime: true, yMin: 0, yMax: 10, title: 'Sintomas auditivos diários' })}</div>` : ''}
      ${trig.length ? `<div class="card">${barChart(trig.map((t) => ({ label: t.label.split(' ')[0], value: t.value, tip: `${t.label}: ${t.value} crises` })), { title: 'Desencadeantes assinalados' })}</div>` : ''}
      ${assoc.length ? `<div class="card"><h3>Fatores do dia e crises (últimos 90 dias)</h3><p class="small muted">Percentagem de dias com crise no próprio dia ou no seguinte. Associação ≠ causa; precisa de muitos dias registados.</p>
        <table class="tbl"><thead><tr><th>Fator</th><th>Com</th><th>Sem</th><th>RR</th></tr></thead><tbody>
        ${assoc.map((a) => `<tr><td>${a.name}</td><td>${Math.round((a.r.rateExposed ?? 0) * 100)} % <small>(${a.r.exposedDays} d)</small></td><td>${Math.round((a.r.rateUnexposed ?? 0) * 100)} % <small>(${a.r.unexposedDays} d)</small></td><td>${a.r.rr !== null ? a.r.rr.toFixed(1).replace('.', ',') : '—'}</td></tr>`).join('')}
        </tbody></table></div>` : ''}
    </section>
    <section class="stack">
      <div class="card"><h2>Crises</h2>${attacks.length ? `<ul class="rec-list">${attacks.slice(0, 60).map((a) => `<li><a class="rec-link" href="#/doente/crise/${a.id}"><b>${fmtDate(a.date, true)}</b> · ${esc(KINDS[a.kind])} · ${a.severity}/10 · ${a.durationMin >= 60 ? Math.round(a.durationMin / 60) + ' h' : a.durationMin + ' min'}
        ${a.symptoms.length ? `<br><small>${a.symptoms.map((s) => esc(SYMPTOMS.find((x) => x[0] === s)?.[1] ?? s)).join(', ')}</small>` : ''}</a></li>`).join('')}</ul>` : '<p class="muted">Ainda sem crises registadas.</p>'}</div>
      <div class="card"><h2>Dias</h2>${days.length ? `<ul class="rec-list">${days.slice(0, 30).map((d) => `<li><a class="rec-link" href="#/doente/dia/${d.date}"><b>${fmtDate(d.date)}</b> · sal ${['baixo', 'moderado', 'alto', 'muito alto'][d.salt]} · café ${d.caffeine} · stress ${d.stress} · sono ${d.sleep} h · audição ${d.hearing}/10</a></li>`).join('')}</ul>` : '<p class="muted">Sem registos diários.</p>'}</div>
      ${nystRecs.all().length ? `<div class="card"><h3>Vídeos do nistagmo</h3><p class="small">${nystRecs.all().length} gravações. <a href="#/sensores/nistagmo">Ver →</a></p></div>` : ''}
    </section>
  </div>`);
  q('#exp').onclick = () => {
    const rows: (string | number)[][] = [['tipo', 'data', 'duração_min', 'intensidade', 'tipo_crise', 'ouvido', 'sintomas', 'desencadeantes', 'medicação', 'sal', 'cafeína', 'álcool', 'stress', 'sono_h', 'audição', 'acufeno', 'ouvido_tapado', 'notas']];
    for (const a of attacks) rows.push(['crise', a.date, a.durationMin, a.severity, KINDS[a.kind], a.ear, a.symptoms.join('|'), a.triggers.join('|'), a.meds, '', '', '', '', '', '', '', '', a.notes]);
    for (const d of days) rows.push(['dia', d.date, '', d.dizziness, '', '', d.headache ? 'cefaleia' : '', d.menstruation ? 'menstruação' : '', '', d.salt, d.caffeine, d.alcohol, d.stress, d.sleep, d.hearing, d.tinnitus, d.fullness, d.notes]);
    download(`vertigo-diario-${todayISO()}.csv`, toCSV(rows), 'text/csv');
  };
}
