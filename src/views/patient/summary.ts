import { embedded, page, q, esc, icon, fmtDate, fmt, setting } from '../_shared';
import { attacksCol, daysCol } from './diary';
import { hearingCol } from './hearing';
import { prophCol } from './migraine';
import { sessionsCol, adherence } from './rehab';
import { scaleRecords, type ScaleRecord } from '../scales';
import { getScale } from '../../clinical/scales';
import { weeklyCounts, triggerFrequency, KINDS, lowFreqIndex, prophylaxisResponse, SYMPTOMS } from '../../clinical/diary';
import { barChart } from '../../core/chart';
import { postureRecs } from '../sensors/posture';
import { svvRecs } from '../sensors/svv';
import { dvaRecs } from '../sensors/dva';
import { nystRecs } from '../sensors/nystagmusRec';
import { guidedRecs } from '../sensors/epleyGuided';

const sumSet = setting<{ label: string; days: number }>('summary', { label: '', days: 90 });

export function summaryView(app: HTMLElement) {
  const s = sumSet.get();
  page(app, { title: 'Resumo para a consulta', sub: 'Uma página com os dados de casa', back: '/', actions: `<button class="icon-btn" onclick="window.print()" aria-label="Imprimir" title="Imprimir / PDF">${icon('print')}</button>` }, `
  <div class="no-print card summary-ctl">
    <label class="field"><span>Nome ou identificação (opcional)</span><input type="text" id="lab" value="${esc(s.label)}"></label>
    <label class="field"><span>Período</span><select id="days">${[30, 60, 90, 180].map((d) => `<option value="${d}"${d === s.days ? ' selected' : ''}>Últimos ${d} dias</option>`).join('')}</select></label>
    <button class="btn primary" id="pr">${icon('print')}Imprimir / guardar PDF</button>
    ${embedded ? '<p class="small muted">Nesta versão partilhada a impressão está desativada. Use a app instalada (web, iPhone ou Windows) para gerar o PDF.</p>' : ''}
  </div>
  <article class="onepage" id="sheet"></article>`);
  const render = () => {
    const days = Number((q('#days') as HTMLSelectElement).value);
    const label = (q('#lab') as HTMLInputElement).value;
    sumSet.set({ label, days });
    const since = Date.now() - days * 864e5;
    const inP = (d: string) => Date.parse(d) >= since;
    const attacks = attacksCol.all().filter((a) => inP(a.date));
    const dlogs = daysCol.all().filter((d) => inP(d.date));
    const n = attacks.length;
    const perMonth = (n / days) * 30;
    const meanSev = n ? attacks.reduce((a, b) => a + b.severity, 0) / n : 0;
    const durBins: [string, number][] = [['< 1 min', 0], ['1–20 min', 0], ['20 min–12 h', 0], ['> 12 h', 0]];
    for (const a of attacks) durBins[a.durationMin < 1.5 ? 0 : a.durationMin < 20 ? 1 : a.durationMin <= 720 ? 2 : 3][1]++;
    const kinds = Object.entries(KINDS).map(([k, l]) => [l, attacks.filter((a) => a.kind === k).length] as [string, number]).filter((x) => x[1]);
    const sym = SYMPTOMS.map(([k, l]) => [l, attacks.filter((a) => a.symptoms.includes(k)).length] as [string, number]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const trig = triggerFrequency(attacks).slice(0, 5);
    const avg = (f: (d: (typeof dlogs)[number]) => number) => (dlogs.length ? dlogs.reduce((a, b) => a + f(b), 0) / dlogs.length : null);
    const hear = hearingCol.all().filter((t) => inP(t.date));
    const scalesBy = new Map<string, ScaleRecord[]>();
    for (const r of scaleRecords.all()) { const arr = scalesBy.get(r.scaleId) ?? []; arr.push(r); scalesBy.set(r.scaleId, arr); }
    const ad = adherence(Math.min(days, 28));
    const sess = sessionsCol.all().filter((x) => inP(x.date));
    const proph = prophCol.all().filter((p) => !p.end || inP(p.end));
    const post = postureRecs.all()[0], svv = svvRecs.all()[0], dva = dvaRecs.all()[0];
    const vids = nystRecs.all().filter((r) => inP(r.date)).length;
    const guided = guidedRecs.all().filter((r) => inP(r.date));

    q('#sheet').innerHTML = `
      <header class="op-head"><div><h1>Resumo vestibular — dados de casa</h1><p>${esc(label || 'Doente')} · ${fmtDate(new Date(since).toISOString())} a ${fmtDate(new Date().toISOString())} (${days} dias)</p></div><span class="op-brand">Vertigo</span></header>
      <section class="op-grid">
        <div class="op-box"><h2>Crises</h2>
          <p class="op-big">${n}<small> crises · ${fmt(perMonth)}/mês · intensidade média ${fmt(meanSev)}/10</small></p>
          ${barChart(weeklyCounts(attacksCol.all(), Math.min(26, Math.ceil(days / 7))), { height: 120 })}
          <p class="op-small"><b>Duração:</b> ${durBins.map(([l, c]) => `${l}: ${c}`).join(' · ')}</p>
          ${kinds.length ? `<p class="op-small"><b>Tipo:</b> ${kinds.map(([l, c]) => `${esc(l)} ${c}`).join(' · ')}</p>` : ''}
          ${sym.length ? `<p class="op-small"><b>Sintomas:</b> ${sym.map(([l, c]) => `${esc(l)} ${c}`).join(' · ')}</p>` : ''}
          ${trig.length ? `<p class="op-small"><b>Desencadeantes:</b> ${trig.map((t) => `${esc(t.label)} ${t.value}`).join(' · ')}</p>` : ''}
        </div>
        <div class="op-box"><h2>Registo diário <small>(${dlogs.length} dias)</small></h2>
          ${dlogs.length ? `<table class="tbl"><tbody>
            <tr><td>Sal alto/muito alto</td><td>${dlogs.filter((d) => d.salt >= 2).length} dias</td></tr>
            <tr><td>Cafeína média</td><td>${fmt(avg((d) => d.caffeine))} /dia</td></tr>
            <tr><td>Stress médio</td><td>${fmt(avg((d) => d.stress))} /10</td></tr>
            <tr><td>Sono médio</td><td>${fmt(avg((d) => d.sleep))} h</td></tr>
            <tr><td>Tontura de fundo</td><td>${fmt(avg((d) => d.dizziness))} /10</td></tr>
            <tr><td>Audição / acufeno / plenitude</td><td>${fmt(avg((d) => d.hearing))} / ${fmt(avg((d) => d.tinnitus))} / ${fmt(avg((d) => d.fullness))}</td></tr>
            <tr><td>Dias com cefaleia</td><td>${dlogs.filter((d) => d.headache).length}</td></tr></tbody></table>` : '<p class="op-small muted">Sem registos diários.</p>'}
          ${hear.length ? `<p class="op-small"><b>Teste de audição (graves, dB rel.):</b> ${hear.slice(0, 4).map((t) => `${fmtDate(t.date)} D ${fmt(lowFreqIndex(t, 'right')?.low ?? null, 0)} / E ${fmt(lowFreqIndex(t, 'left')?.low ?? null, 0)}`).join(' · ')}${hear.length > 4 ? ' …' : ''}</p>` : ''}
        </div>
        <div class="op-box"><h2>Escalas</h2>
          ${scalesBy.size ? `<table class="tbl"><tbody>${[...scalesBy.entries()].map(([id, arr]) => {
            const first = arr[arr.length - 1], last = arr[0];
            return `<tr><td>${esc(id === 'tug' ? 'TUG' : getScale(id)?.short ?? id)}</td><td>${esc(last.display)} <small>(${fmtDate(last.date)})</small>${arr.length > 1 ? ` <small>· antes ${esc(first.display)}</small>` : ''}</td></tr>`;
          }).join('')}</tbody></table>` : '<p class="op-small muted">Sem escalas preenchidas.</p>'}
        </div>
        <div class="op-box"><h2>Reabilitação e tratamento</h2>
          <p class="op-small"><b>Adesão aos exercícios:</b> ${ad.pct} % (últimos ${Math.min(days, 28)} dias) · ${sess.length} sessões no período (${sess.filter((x) => x.kind === 'program').length} programa, ${sess.filter((x) => x.kind === 'vor').length} VOR, ${sess.filter((x) => x.kind === 'okn').length} habituação visual)</p>
          ${proph.length ? proph.map((p) => { const r = prophylaxisResponse(p, attacksCol.all()); return `<p class="op-small"><b>${esc(p.drug)} ${esc(p.dose)}</b> desde ${fmtDate(p.date)}${p.end ? ` até ${fmtDate(p.end)}` : ''}: ${fmt(r.perMonthBefore)} → ${fmt(r.perMonthAfter)} crises/mês. ${esc(r.verdict)}</p>`; }).join('') : ''}
          ${guided.length ? `<p class="op-small"><b>Manobras em casa (guiadas):</b> ${guided.length} (${guided.filter((g) => g.completed).length} completas)</p>` : ''}
          ${post || svv || dva ? `<p class="op-small"><b>Medições (experimentais):</b> ${post ? `posturografia ${fmtDate(post.date)}; ` : ''}${svv ? `VVS ${fmt(svv.mean)}° (${fmtDate(svv.date)}); ` : ''}${dva ? `AVD perda ${fmt(dva.loss)} logMAR (${fmtDate(dva.date)})` : ''}</p>` : ''}
          ${vids ? `<p class="op-small"><b>Vídeos do nistagmo:</b> ${vids} gravações no telemóvel do doente.</p>` : ''}
        </div>
      </section>
      ${attacks.length ? `<section class="op-box op-full"><h2>Últimas crises</h2><div class="tbl-wrap"><table class="tbl small"><thead><tr><th>Data</th><th>Duração</th><th>Int.</th><th>Tipo</th><th>Sintomas</th></tr></thead><tbody>
        ${attacks.slice(0, 8).map((a) => `<tr><td>${fmtDate(a.date, true)}</td><td>${a.durationMin >= 60 ? Math.round(a.durationMin / 60) + ' h' : a.durationMin + ' min'}</td><td>${a.severity}</td><td>${esc(KINDS[a.kind])}</td><td>${a.symptoms.map((s) => esc(SYMPTOMS.find((x) => x[0] === s)?.[1] ?? s)).join(', ')}</td></tr>`).join('')}
      </tbody></table></div></section>` : ''}
      <footer class="op-foot">Dados registados pelo doente na app Vertigo (protótipo de investigação). Medições com o telemóvel são experimentais e não validadas para diagnóstico.</footer>`;
  };
  q('#days').onchange = render;
  q('#lab').oninput = render;
  q('#pr').onclick = () => window.print();
  render();
}
