import { page, q, esc, icon, collection, uid, setting, toast, download, fmtDate } from '../_shared';
import type { Rec } from '../../core/storage';
import { EXERCISES, GROUPS, DEFAULT_PROGRAM, getExercise, icsReminders, type Exercise } from '../../content/rehab';
import { Metronome, beep, beepEnd, speak } from '../../core/audio';
import { keepAwake } from '../../core/sensors';
import { onLeave } from '../../core/router';

export interface RehabSession extends Rec { kind: 'program' | 'vor' | 'okn'; exercises: string[]; minutes: number; before?: number; after?: number; level?: number; detail?: string }
export const sessionsCol = collection<RehabSession>('rehab-sessions', 5000);
export const program = setting<{ ids: string[]; perDay: number; times: string[] }>('rehab.program', { ids: DEFAULT_PROGRAM, perDay: 2, times: ['09:00', '19:00'] });

/** Adesão nos últimos n dias: sessões feitas / previstas. */
export function adherence(days = 28) {
  const p = program.get();
  const since = Date.now() - days * 864e5;
  const s = sessionsCol.all().filter((x) => Date.parse(x.date) >= since);
  const perDay = new Map<string, number>();
  for (const x of s) perDay.set(x.date.slice(0, 10), (perDay.get(x.date.slice(0, 10)) ?? 0) + 1);
  const expected = days * p.perDay;
  const done = Math.min(expected, [...perDay.values()].reduce((a, b) => a + Math.min(b, p.perDay), 0));
  return { pct: expected ? Math.round((done / expected) * 100) : 0, sessions: s.length, perDay, daysActive: perDay.size };
}

function heatmap(perDay: Map<string, number>, target: number) {
  const cells: string[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const n = perDay.get(d) ?? 0;
    const lvl = n === 0 ? 0 : n >= target ? 3 : n >= target / 2 ? 2 : 1;
    cells.push(`<span class="hm hm-${lvl}" title="${fmtDate(d)}: ${n} sessão(ões)"></span>`);
  }
  return `<div class="heatmap" aria-label="Sessões nos últimos 28 dias">${cells.join('')}</div><p class="legend small"><span class="hm hm-0"></span>0 <span class="hm hm-1"></span>parcial <span class="hm hm-3"></span>objetivo</p>`;
}

let reminderTimer = 0;
/** Lembretes enquanto a app está aberta (notificação do sistema, se autorizada). */
function startInAppReminders() {
  clearInterval(reminderTimer);
  const fired = new Set<string>();
  reminderTimer = window.setInterval(() => {
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const key = now.toISOString().slice(0, 10) + hm;
    if (program.get().times.includes(hm) && !fired.has(key)) {
      fired.add(key);
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Vertigo', { body: 'Hora dos exercícios de reabilitação vestibular.', icon: './icon-192.png' }); } catch { /* ignorar */ }
      beep(880, 0.2);
    }
  }, 20000);
}
startInAppReminders();

export function rehabView(app: HTMLElement) {
  const p = program.get();
  const ad = adherence();
  const recent = sessionsCol.all().slice(0, 10);
  page(app, { title: 'Reabilitação vestibular', sub: 'Cawthorne-Cooksey, estabilização do olhar e equilíbrio', back: '/' }, `
  <div class="grid2">
    <section class="stack">
      <div class="card">
        <div class="hyp-head"><h2>Adesão (28 dias)</h2><span class="badge badge-${ad.pct >= 70 ? 'ok' : ad.pct >= 40 ? 'warn' : 'bad'}">${ad.pct} %</span></div>
        ${heatmap(ad.perDay, p.perDay)}
        <p class="small muted">${ad.sessions} sessões · ${ad.daysActive} dias com exercício · objetivo ${p.perDay}×/dia</p>
        <div class="actionbar"><button class="btn primary big" id="start">${icon('play')}Fazer a sessão agora</button></div>
      </div>
      <div class="card">
        <h2>Lembretes</h2>
        <div class="field-grid">
          <label class="field"><span>Sessões por dia</span><input type="number" id="perDay" min="1" max="6" value="${p.perDay}"></label>
          <label class="field"><span>Horas (separadas por vírgula)</span><input type="text" id="times" value="${esc(p.times.join(', '))}"></label>
        </div>
        <div class="actionbar"><button class="btn" id="ics">${icon('calendar')}Adicionar ao calendário (.ics)</button><button class="btn" id="notif">${icon('bell')}Notificações na app</button></div>
        <p class="small muted">O ficheiro .ics cria lembretes diários no calendário do telemóvel — funciona mesmo com a app fechada. As notificações da app só aparecem com a app aberta.</p>
      </div>
      ${recent.length ? `<div class="card"><h3>Últimas sessões</h3><ul class="rec-list">${recent.map((s) => `<li><span><b>${fmtDate(s.date, true)}</b> · ${s.kind === 'program' ? 'Programa' : s.kind === 'vor' ? 'VOR' : 'Habituação visual'} · ${s.minutes} min${s.after !== undefined ? ` · sintomas ${s.before ?? '—'}→${s.after}` : ''}${s.detail ? ` · <small>${esc(s.detail)}</small>` : ''}</span></li>`).join('')}</ul></div>` : ''}
    </section>
    <section class="card">
      <h2>O meu programa</h2>
      <p class="small muted">Escolhido com o médico/fisioterapeuta. Progrida de deitado → sentado → de pé → em movimento.</p>
      <form id="prog">${Object.entries(GROUPS).map(([g, name]) => `<h3 class="group-title">${esc(name)}</h3>
        ${EXERCISES.filter((e) => e.group === g).map((e) => `<label class="ex-row"><input type="checkbox" name="ex" value="${e.id}"${p.ids.includes(e.id) ? ' checked' : ''}><span><b>${esc(e.name)}</b><small>${esc(e.dose)}</small></span>${e.interactive ? `<a href="#${e.interactive}" class="chip">interativo</a>` : ''}</label>`).join('')}`).join('')}</form>
    </section>
  </div>
  <div id="runner"></div>`);

  q('#prog').addEventListener('change', () => {
    const ids = Array.from(app.querySelectorAll<HTMLInputElement>('input[name="ex"]:checked')).map((i) => i.value);
    program.set({ ...program.get(), ids });
  });
  const saveTimes = () => {
    const times = (q('#times') as HTMLInputElement).value.split(/[,;\s]+/).filter((t) => /^\d{1,2}:\d{2}$/.test(t)).map((t) => t.padStart(5, '0'));
    program.set({ ...program.get(), perDay: Number((q('#perDay') as HTMLInputElement).value) || 2, times });
    return times;
  };
  q('#perDay').onchange = saveTimes;
  q('#times').onchange = saveTimes;
  q('#ics').onclick = () => { const t = saveTimes(); if (!t.length) { toast('Indique pelo menos uma hora (p. ex. 09:00)'); return; } download('vertigo-lembretes.ics', icsReminders(t), 'text/calendar'); };
  q('#notif').onclick = async () => {
    saveTimes();
    if (!('Notification' in window)) { toast('Notificações não suportadas'); return; }
    const r = await Notification.requestPermission();
    toast(r === 'granted' ? 'Notificações ativas (com a app aberta)' : 'Notificações recusadas');
  };
  q('#start').onclick = () => runSession(q('#runner'), program.get().ids.map(getExercise).filter(Boolean) as Exercise[]);
}

function runSession(el: HTMLElement, list: Exercise[]) {
  if (!list.length) { toast('Escolha pelo menos um exercício'); return; }
  void keepAwake();
  let i = 0;
  const start = Date.now();
  let before = 0;
  const metro = new Metronome(60);
  let timer = 0;
  onLeave(() => { metro.stop(); clearInterval(timer); });
  el.innerHTML = `<div class="session-overlay"><div class="session card">
    <div id="sbody"></div>
  </div></div>`;
  const body = q('#sbody', el);
  const close = () => { metro.stop(); clearInterval(timer); el.innerHTML = ''; };
  const askBefore = () => {
    body.innerHTML = `<h2>Antes de começar</h2><div class="q-block"><b>Tontura agora: <output id="bo">0</output>/10</b><input type="range" id="b" min="0" max="10" value="0"></div>
      <div class="actionbar"><button class="btn primary big" id="ok">${icon('play')}Começar</button><button class="btn big" id="x">Cancelar</button></div>`;
    q('#b', el).oninput = (e) => (q('#bo', el).textContent = (e.target as HTMLInputElement).value);
    q('#ok', el).onclick = () => { before = Number((q('#b', el) as HTMLInputElement).value); show(); };
    q('#x', el).onclick = close;
  };
  const show = () => {
    metro.stop(); clearInterval(timer);
    if (i >= list.length) return finish();
    const e = list[i];
    let left = e.seconds ?? 60;
    body.innerHTML = `<span class="eyebrow">Exercício ${i + 1} de ${list.length} · ${esc(GROUPS[e.group])}</span>
      <h2>${esc(e.name)}</h2><ol class="timeline compact">${e.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <p class="small"><b>${esc(e.dose)}</b>${e.safety ? ` · ${icon('alert')} ${esc(e.safety)}` : ''}</p>
      ${e.interactive ? `<p class="small"><a href="#${e.interactive}">Abrir a versão interativa com alvo e câmara →</a></p>` : ''}
      <div class="big-timer" id="tm">${left}<small> s</small></div>
      <div class="actionbar"><button class="btn primary big" id="go">${icon('play')}Iniciar${e.bpm ? ' com metrónomo' : ''}</button><button class="btn big" id="nx">${icon('chevron')}Seguinte</button><button class="btn big" id="x">Terminar</button></div>`;
    speak(e.name);
    q('#go', el).onclick = () => {
      if (e.bpm) { metro.bpm = e.bpm; metro.start(); }
      clearInterval(timer);
      timer = window.setInterval(() => {
        left--;
        q('#tm', el).innerHTML = `${Math.max(0, left)}<small> s</small>`;
        if (left <= 0) { clearInterval(timer); metro.stop(); beepEnd(); }
      }, 1000);
    };
    q('#nx', el).onclick = () => { i++; show(); };
    q('#x', el).onclick = finish;
  };
  const finish = () => {
    metro.stop(); clearInterval(timer);
    body.innerHTML = `<h2>Sessão terminada</h2><div class="q-block"><b>Tontura agora: <output id="ao">${before}</output>/10</b><input type="range" id="a" min="0" max="10" value="${before}"></div>
      <p class="small muted">É normal a tontura aumentar um pouco durante os exercícios e voltar ao nível inicial em 15–30 min. Se piorar muito ou durante horas, reduza a intensidade e fale com o seu fisioterapeuta.</p>
      <div class="actionbar"><button class="btn primary big" id="sv">${icon('check')}Guardar sessão</button></div>`;
    q('#a', el).oninput = (e) => (q('#ao', el).textContent = (e.target as HTMLInputElement).value);
    q('#sv', el).onclick = () => {
      sessionsCol.save({ id: uid(), date: new Date().toISOString(), kind: 'program', exercises: list.slice(0, Math.max(1, i)).map((x) => x.id), minutes: Math.max(1, Math.round((Date.now() - start) / 60000)), before, after: Number((q('#a', el) as HTMLInputElement).value) });
      close();
      toast('Sessão registada');
      location.reload();
    };
  };
  askBefore();
}
