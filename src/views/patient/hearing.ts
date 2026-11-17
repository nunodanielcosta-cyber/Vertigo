import { page, q, esc, icon, experimental, collection, uid, fmtDate, toast, setting, fmt } from '../_shared';
import { tone } from '../../core/audio';
import { lowFreqIndex, type HearingTest } from '../../clinical/diary';
import { lineChart } from '../../core/chart';
import { onLeave } from '../../core/router';

export const hearingCol = collection<HearingTest>('hearing', 1000);
const devSet = setting<{ device: string }>('hearing.device', { device: '' });
const FREQS = [250, 500, 1000, 2000];

export function hearingView(app: HTMLElement) {
  page(app, { title: 'Teste de audição em casa', sub: 'Frequências graves — seguir a audição flutuante', back: '/' }, `
  ${experimental()}
  <div class="grid2">
    <section class="card">
      <ol class="timeline compact">
        <li>Use <b>sempre os mesmos auscultadores</b> (com fio, de preferência) e o <b>mesmo volume do sistema</b> (p. ex. 50 %). Num sítio silencioso.</li>
        <li>Vai ouvir tons em cada ouvido, cada vez mais baixos. Carregue em «Ouvi» ou «Não ouvi».</li>
        <li>O resultado é <b>relativo</b> (não é um audiograma): serve para comparar dias e ver se a audição dos graves flutua.</li>
      </ol>
      <label class="field"><span>Auscultadores usados</span><input type="text" id="dev" value="${esc(devSet.get().device)}" placeholder="p. ex. auriculares com fio do telemóvel"></label>
      <div class="actionbar"><button class="btn small" id="testL">Testar ouvido esquerdo</button><button class="btn small" id="testR">Testar ouvido direito</button></div>
      <div class="actionbar"><button class="btn primary big" id="go">${icon('ear')}Começar o teste</button></div>
    </section>
    <section class="card center" id="run">
      <p class="muted">Pronto.</p>
    </section>
  </div>
  <div id="hist"></div>`);

  let abort = false;
  onLeave(() => { abort = true; });
  q('#testL').onclick = () => void tone(1000, -20, 'left', 0.8);
  q('#testR').onclick = () => void tone(1000, -20, 'right', 0.8);

  const ask = (): Promise<boolean> => new Promise((res) => {
    q('#ans').hidden = false;
    q('#yes').onclick = () => { q('#ans').hidden = true; res(true); };
    q('#no').onclick = () => { q('#ans').hidden = true; res(false); };
  });

  q('#go').onclick = async () => {
    devSet.set({ device: (q('#dev') as HTMLInputElement).value });
    abort = false;
    const result: HearingTest = { id: uid(), date: new Date().toISOString(), right: {}, left: {}, device: devSet.get().device };
    q('#run').innerHTML = `<span class="eyebrow" id="where"></span><div class="big-timer" id="ic">${icon('ear')}</div>
      <p id="st" class="muted"></p><div id="ans" class="actionbar" hidden><button class="btn primary big" id="yes">Ouvi</button><button class="btn big" id="no">Não ouvi</button></div>`;
    for (const ear of ['right', 'left'] as const) {
      for (const f of FREQS) {
        if (abort) return;
        q('#where').textContent = `Ouvido ${ear === 'right' ? 'direito' : 'esquerdo'} · ${f} Hz`;
        let level = -30, thr: number | null = null, heardOnce = false;
        for (let i = 0; i < 16 && !abort; i++) {
          q('#st').textContent = 'A tocar…';
          await new Promise((r) => setTimeout(r, 400 + Math.random() * 900));
          await tone(f, level, ear, 1);
          q('#st').textContent = 'Ouviu o som?';
          const heard = await ask();
          if (heard) { heardOnce = true; thr = level; if (level <= -90) break; level -= 10; }
          else { if (heardOnce) break; level += 5; if (level > 0) { thr = null; break; } }
        }
        result[ear][String(f)] = thr;
      }
    }
    hearingCol.save(result);
    q('#run').innerHTML = `<p>${icon('check')} Teste guardado.</p>${summaryHtml(result)}`;
    renderHist();
    toast('Teste guardado');
  };

  const summaryHtml = (t: HearingTest) => `<table class="tbl"><thead><tr><th></th>${FREQS.map((f) => `<th>${f}</th>`).join('')}</tr></thead><tbody>
    ${(['right', 'left'] as const).map((e) => `<tr><td>${e === 'right' ? 'Dir.' : 'Esq.'}</td>${FREQS.map((f) => `<td>${t[e][String(f)] ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <p class="small muted">dB relativos ao volume máximo (mais negativo = ouve sons mais baixos = melhor).</p>`;

  const renderHist = () => {
    const all = hearingCol.all();
    const pts = (ear: 'right' | 'left') => all.slice().reverse().map((t) => { const i = lowFreqIndex(t, ear); return i ? { x: Date.parse(t.date), y: i.low, tip: `${fmtDate(t.date)}: graves ${fmt(i.low, 0)} dB` } : null; }).filter(Boolean) as { x: number; y: number; tip: string }[];
    q('#hist').innerHTML = all.length ? `<div class="card mt">
      ${all.length > 1 ? lineChart([{ name: 'Direito', cls: 'a', points: pts('right') }, { name: 'Esquerdo', cls: 'b', points: pts('left') }], { xTime: true, title: 'Limiar médio 250–500 Hz (dB relativos; para baixo = melhor)', invertY: false }) : ''}
      <ul class="rec-list">${all.slice(0, 30).map((t) => { const r = lowFreqIndex(t, 'right'), l = lowFreqIndex(t, 'left'); return `<li><span><b>${fmtDate(t.date, true)}</b> · graves dir. ${fmt(r?.low ?? null, 0)} / esq. ${fmt(l?.low ?? null, 0)} dB${t.device ? ` · <small>${esc(t.device)}</small>` : ''}</span><button class="icon-btn" data-del="${t.id}" aria-label="Apagar">${icon('trash')}</button></li>`; }).join('')}</ul>
      <p class="small muted">Uma subida (pior) ≥ 10–15 dB nos graves de um ouvido, que depois recupera, é compatível com flutuação auditiva. Confirme sempre com audiograma.</p></div>` : '';
    app.querySelectorAll<HTMLElement>('[data-del]').forEach((b) => (b.onclick = () => { hearingCol.remove(b.dataset.del!); renderHist(); }));
  };
  renderHist();
}
