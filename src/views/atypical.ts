import { page, q, esc, icon, disclaimer, collection, uid, fmtDate, pills, download, toCSV } from './_shared';
import type { Rec } from '../core/storage';

export interface Recurrence extends Rec {
  canal: string;
  side: 'right' | 'left' | 'bilateral' | 'unk';
  maneuver: string;
  sessions: number;
  resolved: boolean;
  notes: string;
}
export const recurrences = collection<Recurrence>('bppv-recurrences');

const CANALS: [string, string][] = [['pc', 'Posterior'], ['hc-geo', 'Horizontal geotrópico'], ['hc-apo', 'Horizontal apogeotrópico'], ['ac', 'Anterior'], ['multi', 'Vários canais'], ['unk', 'Não determinado']];

export function atypicalView(app: HTMLElement) {
  page(app, { title: 'VPPB atípica', sub: 'Formas raras, sinais centrais e registo de recidivas', back: '/' }, `
  <div class="grid2">
    <section class="stack">
      <details class="card acc" open><summary><h2>Canal horizontal apogeotrópico</h2></summary>
        <ul>
          <li>Nistagmo horizontal que bate para o teto nos dois lados do roll test, geralmente persistente (cupulolitíase) ou por partículas no braço anterior do canal.</li>
          <li><b>Lado afetado = lado com nistagmo MENOS intenso.</b> Apoios à lateralização: o <i>null point</i> (posição da cabeça, ~20–30° para o lado afetado, em que o nistagmo cessa, na cupulolitíase) e o teste de «bow and lean», cuja interpretação depende da forma — usar com prudência quando as intensidades são semelhantes.</li>
          <li>Tratamento: Gufoni apogeotrópico, head-shaking em flexão, ou manobras de conversão para a forma geotrópica e depois Lempert/Gufoni.</li>
          <li>Se não responde a várias sessões ou tem características centrais: considerar <b>nistagmo posicional central</b> (lesões do nódulo/úvula cerebelosa podem simular a forma apogeotrópica).</li>
        </ul>
        <div class="actionbar"><a class="btn small" href="#/manobra/gufoni-apo-right">${icon('play')}Gufoni apogeotrópico (dir.)</a><a class="btn small" href="#/manobra/gufoni-geo-right">${icon('play')}Gufoni geotrópico (dir.)</a></div>
      </details>
      <details class="card acc"><summary><h2>Canal anterior</h2></summary>
        <ul>
          <li>Raro (1–3 %). Nistagmo <b>downbeat</b> posicional com componente torsional (polo superior para a orelha afetada) no Dix-Hallpike de qualquer lado ou no head-hanging.</li>
          <li>Lateralização pouco fiável: o componente torsional é muitas vezes pequeno.</li>
          <li>Tratamento: <b>Yacovino</b> (deep head hanging) — não exige saber o lado.</li>
          <li><b>Diagnóstico de exclusão:</b> o downbeat posicional é muito frequente em doença central. Desconfiar se não há torsão, se é persistente, sem latência, sem fatigabilidade, ou sem vertigem proporcional.</li>
        </ul>
        <div class="actionbar"><a class="btn small" href="#/manobra/yacovino">${icon('play')}Yacovino</a></div>
      </details>
      <details class="card acc"><summary><h2>Vários canais / bilateral</h2></summary>
        <ul>
          <li>Mais frequente após traumatismo craniano, ou após manobras (conversão de canal posterior para horizontal, «canal switch»).</li>
          <li>Tratar primeiro o canal que causa mais sintomas ou o nistagmo mais intenso; reavaliar na mesma sessão ou na seguinte.</li>
          <li>VPPB bilateral do canal posterior: upbeat-torsional concordante nos dois Dix-Hallpike — tratar um lado de cada vez (o mais sintomático primeiro).</li>
        </ul>
      </details>
      <details class="card acc" open><summary><h2>Quando suspeitar de causa central</h2></summary>
        <ul class="checklist">
          ${['Nistagmo puro vertical (sobretudo downbeat) ou puro torsional', 'Nistagmo sem latência, sem fatigabilidade, persistente enquanto a posição se mantém', 'Direção que não corresponde ao plano de nenhum canal', 'Nistagmo intenso com pouca ou nenhuma vertigem (dissociação)', 'Náuseas e vómitos marcados com nistagmo fraco', 'Falha de resposta a 3 ou mais manobras corretamente feitas', 'Sinais neurológicos, alterações oculomotoras (perseguição, sacadas), ataxia, cefaleia', 'Recidivas muito frequentes ou atípicas'].map((x) => `<li>${icon('alert')}<span>${x}</span></li>`).join('')}
        </ul>
        <p class="small">Perante estes sinais: exame neurológico e oculomotor completo e RM-CE com estudo da fossa posterior.</p>
        <p class="ref">von Brevern 2015; Büttner U et al. Acta Otolaryngol 1999; Lemos J, Strupp M. J Neurol 2022 (central positional nystagmus).</p>
      </details>
      <details class="card acc"><summary><h2>Recidivas</h2></summary>
        <ul>
          <li>Recorrência de ~15 % ao ano e até ~50 % em 5–10 anos. Fatores: idade, sexo feminino, osteoporose/défice de vitamina D, traumatismo, Ménière, migrânea, imobilização prolongada.</li>
          <li>Na hipovitaminose D, a suplementação reduziu as recidivas num ensaio controlado (Jeong 2020).</li>
          <li>Ensinar o doente a gravar o nistagmo numa crise e, se adequado, a fazer a manobra em casa do lado identificado.</li>
        </ul>
      </details>
    </section>
    <section class="stack">
      <form class="card" id="f">
        <h2>Registo de episódios / recidivas</h2>
        <div class="field-grid">
          <label class="field"><span>Data</span><input type="date" name="date" value="${new Date().toISOString().slice(0, 10)}" required></label>
          <label class="field"><span>Sessões de manobra</span><input type="number" name="sessions" value="1" min="0" step="1"></label>
        </div>
        <div class="q-block"><b>Canal</b>${pills('canal', CANALS, 'pc', 'pills-wrap')}</div>
        <div class="q-block"><b>Lado</b>${pills('side', [['right', 'Direito'], ['left', 'Esquerdo'], ['bilateral', 'Bilateral'], ['unk', '?']], 'right')}</div>
        <label class="field"><span>Manobra(s)</span><input type="text" name="maneuver" placeholder="p. ex. Epley × 2"></label>
        <label class="switch"><input type="checkbox" name="resolved" checked><span class="track"></span><span>Resolvido</span></label>
        <label class="field"><span>Notas</span><input type="text" name="notes"></label>
        <div class="actionbar"><button class="btn primary">${icon('plus')}Registar episódio</button></div>
      </form>
      <div id="list"></div>
    </section>
  </div>
  ${disclaimer()}`);

  const renderList = () => {
    const all = recurrences.all();
    const lab = (k: string) => CANALS.find((c) => c[0] === k)?.[1] ?? k;
    const intervals: number[] = [];
    for (let i = 0; i < all.length - 1; i++) intervals.push((Date.parse(all[i].date) - Date.parse(all[i + 1].date)) / 864e5);
    q('#list').innerHTML = all.length ? `<div class="card">
      <div class="hyp-head"><h3>${all.length} episódio${all.length === 1 ? '' : 's'}</h3><button class="btn small" id="csv">${icon('download')}CSV</button></div>
      ${intervals.length ? `<p class="small muted">Intervalo médio entre episódios: ${Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)} dias.</p>` : ''}
      <ul class="rec-list">${all.map((r) => `<li><span><b>${fmtDate(r.date)}</b> · ${esc(lab(r.canal))} ${r.side === 'right' ? 'dir.' : r.side === 'left' ? 'esq.' : r.side === 'bilateral' ? 'bilateral' : ''} · ${esc(r.maneuver || '—')} (${r.sessions} sessão/ões) ${r.resolved ? '✓' : '<span class="chip chip-warn">não resolvido</span>'}${r.notes ? `<br><small>${esc(r.notes)}</small>` : ''}</span><button class="icon-btn" data-del="${r.id}" aria-label="Apagar">${icon('trash')}</button></li>`).join('')}</ul></div>` : '';
    app.querySelectorAll<HTMLElement>('[data-del]').forEach((b) => (b.onclick = () => { recurrences.remove(b.dataset.del!); renderList(); }));
    const csv = app.querySelector<HTMLElement>('#csv');
    if (csv) csv.onclick = () => download('vppb-recidivas.csv', toCSV([['data', 'canal', 'lado', 'manobra', 'sessões', 'resolvido', 'notas'], ...all.map((r) => [r.date.slice(0, 10), lab(r.canal), r.side, r.maneuver, r.sessions, r.resolved ? 'sim' : 'não', r.notes])]), 'text/csv');
  };
  q<HTMLFormElement>('#f').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    recurrences.save({
      id: uid(), date: new Date(String(fd.get('date'))).toISOString(), canal: String(fd.get('canal')), side: String(fd.get('side')) as Recurrence['side'],
      maneuver: String(fd.get('maneuver') ?? ''), sessions: Number(fd.get('sessions') ?? 1), resolved: fd.get('resolved') === 'on', notes: String(fd.get('notes') ?? ''),
    });
    renderList();
  };
  renderList();
}
