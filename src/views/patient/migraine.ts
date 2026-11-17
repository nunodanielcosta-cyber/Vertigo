import { ask, page, q, esc, icon, collection, uid, fmtDate, resultBox, fmt, toast } from '../_shared';
import { prophylaxisResponse, triggerFrequency, monthlyCounts, type Prophylaxis } from '../../clinical/diary';
import { attacksCol, daysCol } from './diary';
import { barChart } from '../../core/chart';

export const prophCol = collection<Prophylaxis>('prophylaxis');

export function migraineView(app: HTMLElement) {
  const attacks = attacksCol.all();
  const days = daysCol.all();
  const list = prophCol.all();
  const trig = triggerFrequency(attacks);
  const headacheDays = days.filter((d) => d.headache && Date.now() - Date.parse(d.date) < 30 * 864e5).length;
  const vmAttacks = attacks.filter((a) => a.symptoms.some((s) => ['headache', 'photophobia', 'phonophobia', 'aura'].includes(s)));
  page(app, { title: 'Migrânea vestibular', sub: 'Desencadeantes e resposta à profilaxia', back: '/' }, `
  <div class="grid2">
    <section class="stack">
      <div class="card">
        <h2>Resumo</h2>
        <p>${attacks.length} crises registadas · ${vmAttacks.length} com características de migrânea · ${headacheDays} dias com cefaleia nos últimos 30 dias.</p>
        ${barChart(monthlyCounts(attacks, 6), { title: 'Crises por mês' })}
        <a class="btn" href="#/doente/crise">${icon('plus')}Registar crise</a>
      </div>
      ${trig.length ? `<div class="card">${barChart(trig.slice(0, 8).map((t) => ({ label: t.label.split(' ')[0], value: t.value, tip: `${t.label}: ${t.value}` })), { title: 'Desencadeantes mais frequentes' })}
        <p class="small muted">Desencadeantes frequentes podem ser evitados ou geridos (regularidade de sono e refeições, gestão do stress).</p></div>` : ''}
    </section>
    <section class="stack">
      <form class="card" id="f">
        <h2>Tratamento preventivo</h2>
        <div class="field-grid">
          <label class="field"><span>Medicamento</span><input type="text" name="drug" list="drugs" required placeholder="p. ex. propranolol"></label>
          <datalist id="drugs">${['Propranolol', 'Metoprolol', 'Flunarizina', 'Amitriptilina', 'Nortriptilina', 'Topiramato', 'Venlafaxina', 'Valproato', 'Candesartan', 'Lamotrigina', 'Magnésio', 'Riboflavina', 'Anticorpo anti-CGRP'].map((d) => `<option value="${d}">`).join('')}</datalist>
          <label class="field"><span>Dose</span><input type="text" name="dose" placeholder="p. ex. 40 mg 2×/dia"></label>
          <label class="field"><span>Início</span><input type="date" name="date" required value="${new Date().toISOString().slice(0, 10)}"></label>
          <label class="field"><span>Fim (se suspenso)</span><input type="date" name="end"></label>
        </div>
        <label class="field"><span>Notas (efeitos adversos, ajustes de dose)</span><input type="text" name="notes"></label>
        <div class="actionbar"><button class="btn primary">${icon('plus')}Adicionar</button></div>
      </form>
      ${list.map((p) => {
        const r = prophylaxisResponse(p, attacks);
        return resultBox(`${esc(p.drug)} ${esc(p.dose)}`, `<p class="small muted">${fmtDate(p.date)}${p.end ? ` → ${fmtDate(p.end)}` : ' → atual'} · ${Math.round(r.afterDays)} dias</p>
          <p>Crises/mês: <b>${fmt(r.perMonthBefore)}</b> antes → <b>${fmt(r.perMonthAfter)}</b> depois${r.reduction !== null ? ` (${r.reduction >= 0 ? '−' : '+'}${fmt(Math.abs(r.reduction), 0)} %)` : ''}</p>
          <p>${esc(r.verdict)}</p>${p.notes ? `<p class="small">${esc(p.notes)}</p>` : ''}
          <div class="actionbar"><button class="btn small" data-end="${p.id}">Marcar suspenso hoje</button><button class="btn small" data-del="${p.id}">${icon('trash')}Apagar</button></div>`,
          r.reduction !== null && r.reduction >= 50 && r.afterDays >= 56 ? 'ok' : r.afterDays < 56 ? 'info' : 'warn');
      }).join('')}
      <p class="small muted">Frequência antes = 90 dias anteriores ao início. Depois = desde o início, excluindo as primeiras 4 semanas de titulação quando há ≥ 8 semanas de tratamento. Boa resposta: redução ≥ 50 %.</p>
    </section>
  </div>`);
  q<HTMLFormElement>('#f').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    prophCol.save({ id: uid(), date: new Date(String(fd.get('date'))).toISOString(), drug: String(fd.get('drug')), dose: String(fd.get('dose') ?? ''), end: fd.get('end') ? new Date(String(fd.get('end'))).toISOString() : undefined, notes: String(fd.get('notes') ?? '') });
    toast('Adicionado');
    migraineView(app);
  };
  app.querySelectorAll<HTMLElement>('[data-del]').forEach((b) => (b.onclick = async () => { if (await ask('Apagar este tratamento?', { ok: 'Apagar', danger: true })) { prophCol.remove(b.dataset.del!); migraineView(app); } }));
  app.querySelectorAll<HTMLElement>('[data-end]').forEach((b) => (b.onclick = () => { const p = prophCol.get(b.dataset.end!); if (p) { prophCol.save({ ...p, end: new Date().toISOString() }); migraineView(app); } }));
}
