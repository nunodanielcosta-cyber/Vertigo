import { page, q, esc, icon, experimental, collection, uid, fmtDate, fmt, toast } from '../_shared';
import type { Rec } from '../../core/storage';
import { listenMotion, requestMotionPermission, keepAwake } from '../../core/sensors';
import { swayMetrics, sensoryAnalysis, MCTSIB, type AccSample, type SwayMetrics, type CondId } from '../../clinical/sensorMetrics';
import { beepStart, beepEnd, beep, speak } from '../../core/audio';
import { barChart } from '../../core/chart';
import { onLeave } from '../../core/router';

export interface PostureRec extends Rec { protocol: 'romberg' | 'mctsib'; results: Partial<Record<CondId, SwayMetrics>>; falls: CondId[] }
export const postureRecs = collection<PostureRec>('posture');

export function postureView(app: HTMLElement) {
  page(app, { title: 'Posturografia simplificada', sub: 'Romberg e mCTSIB com o acelerómetro', back: '/' }, `
  ${experimental()}
  <div class="grid2">
    <section class="card">
      <h2>Preparação</h2>
      <ol class="timeline compact">
        <li>Prenda o telemóvel à cintura, nas costas (zona lombar, L3–L5), em <b>retrato</b>, com um cinto ou bolsa elástica bem justa.</li>
        <li>Pés juntos, braços cruzados sobre o peito, olhar num ponto fixo à frente. Alguém deve ficar ao lado por segurança.</li>
        <li>Cada condição dura 30 s. A app avisa com sons e voz quando começar e terminar.</li>
        <li>Para a espuma use uma almofada de espuma média-densa (~10 cm).</li>
      </ol>
      <div class="q-block"><b>Protocolo</b>
        <div class="pills"><label class="pill"><input type="radio" name="proto" value="romberg"><span>Romberg (2 condições)</span></label><label class="pill"><input type="radio" name="proto" value="mctsib" checked><span>mCTSIB (4 condições)</span></label></div></div>
      <label class="field"><span>Duração de cada condição</span><select id="dur"><option value="20">20 s</option><option value="30" selected>30 s</option></select></label>
      <div class="actionbar"><button class="btn primary big" id="go">${icon('play')}Começar</button></div>
    </section>
    <section class="stack">
      <div class="card center" id="live"><div class="big-timer" id="cd">—</div><p id="cond" class="muted">Pronto</p><div class="sway-dot-wrap"><div class="sway-dot" id="dot"></div></div>
        <button class="btn" id="fall" hidden>${icon('alert')}Perdeu o equilíbrio</button></div>
      <div id="out"></div>
    </section>
  </div>
  <div id="hist"></div>`);

  let stopRec: (() => void) | null = null;
  let buf: AccSample[] = [];
  let aborted = false;
  onLeave(() => { aborted = true; stopRec?.(); });

  const renderHist = () => {
    const all = postureRecs.all();
    q('#hist').innerHTML = all.length ? `<div class="card mt"><h2>Histórico</h2><ul class="rec-list">${all.map((r) => `<li><span><b>${fmtDate(r.date, true)}</b> · ${r.protocol === 'romberg' ? 'Romberg' : 'mCTSIB'} · ${MCTSIB.filter((c) => r.results[c.id]).map((c) => `${c.short}: ${Math.round(r.results[c.id]!.area95)}`).join(' · ')} mG²${r.falls.length ? ` · <span class="chip chip-warn">${r.falls.length} perda(s) de equilíbrio</span>` : ''}</span><button class="icon-btn" data-del="${r.id}" aria-label="Apagar">${icon('trash')}</button></li>`).join('')}</ul></div>` : '';
    app.querySelectorAll<HTMLElement>('[data-del]').forEach((b) => (b.onclick = () => { postureRecs.remove(b.dataset.del!); renderHist(); }));
  };

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  q('#go').onclick = async () => {
    if (!(await requestMotionPermission())) { toast('Acelerómetro indisponível neste dispositivo/navegador'); return; }
    void keepAwake();
    const proto = (app.querySelector('input[name="proto"]:checked') as HTMLInputElement).value as 'romberg' | 'mctsib';
    const dur = Number((q('#dur') as HTMLSelectElement).value);
    const conds = proto === 'romberg' ? MCTSIB.slice(0, 2) : MCTSIB;
    const results: PostureRec['results'] = {};
    const falls: CondId[] = [];
    (q('#go') as HTMLButtonElement).disabled = true;
    aborted = false;
    let fell = false;
    q('#fall').onclick = () => { fell = true; };
    for (const c of conds) {
      if (aborted) return;
      q('#cond').textContent = c.name;
      speak(`${c.name}. Prepare-se.`);
      for (let i = 8; i > 0; i--) { if (aborted) return; q('#cd').textContent = String(i); if (i <= 3) beep(600, 0.08); await wait(1000); }
      buf = []; fell = false;
      beepStart();
      q('#fall').hidden = false;
      stopRec = listenMotion((s) => {
        buf.push({ t: s.t, x: s.gx, y: s.gy, z: s.gz });
        // ponto de oscilação ao vivo
        const n = buf.length;
        if (n > 20 && n % 3 === 0) {
          const recent = buf.slice(-60);
          const mx = recent.reduce((a, b) => a + b.x, 0) / recent.length, mz = recent.reduce((a, b) => a + b.z, 0) / recent.length;
          q('#dot').style.transform = `translate(${Math.max(-60, Math.min(60, (s.gx - mx) * 300))}px, ${Math.max(-60, Math.min(60, (s.gz - mz) * 300))}px)`;
        }
      });
      const t0 = performance.now();
      while ((performance.now() - t0) / 1000 < dur && !fell && !aborted) { q('#cd').textContent = String(Math.ceil(dur - (performance.now() - t0) / 1000)); await wait(200); }
      stopRec(); stopRec = null;
      beepEnd();
      q('#fall').hidden = true;
      if (fell) falls.push(c.id);
      const m = swayMetrics(buf);
      if (m) results[c.id] = m;
      else toast('Poucos dados do acelerómetro nesta condição');
      speak(fell ? 'Registada perda de equilíbrio.' : 'Terminado.');
      await wait(1500);
    }
    q('#cd').textContent = '✓';
    q('#cond').textContent = 'Concluído';
    (q('#go') as HTMLButtonElement).disabled = false;
    const rec: PostureRec = { id: uid(), date: new Date().toISOString(), protocol: proto, results, falls };
    postureRecs.save(rec);
    showResults(rec);
    renderHist();
  };

  const showResults = (r: PostureRec) => {
    const rows = MCTSIB.filter((c) => r.results[c.id]);
    const areas = Object.fromEntries(rows.map((c) => [c.id, r.results[c.id]!.area95])) as Partial<Record<CondId, number>>;
    q('#out').innerHTML = `<div class="card">
      <h2>Resultado</h2>
      <table class="tbl"><thead><tr><th>Condição</th><th>RMS ML</th><th>RMS AP</th><th>Área 95 %</th><th>Jerk</th></tr></thead><tbody>
      ${rows.map((c) => { const m = r.results[c.id]!; return `<tr><td>${esc(c.short)}${r.falls.includes(c.id) ? ' ⚠' : ''}</td><td>${fmt(m.rmsML)}</td><td>${fmt(m.rmsAP)}</td><td>${Math.round(m.area95)}</td><td>${Math.round(m.jerk)}</td></tr>`; }).join('')}
      </tbody></table>
      <p class="small muted">RMS em mG (milésimas de g); área em mG²; jerk em mG/s.</p>
      ${barChart(rows.map((c, i) => ({ label: c.short, value: Math.round(r.results[c.id]!.area95), tone: (i % 2 ? 'b' : 'a') as 'a' | 'b' })), { title: 'Área de oscilação (mG²)' })}
      <ul class="notes">${sensoryAnalysis(areas).map((x) => `<li>${esc(x)}</li>`).join('')}${r.falls.length ? `<li>Perda de equilíbrio em: ${r.falls.map((f) => MCTSIB.find((c) => c.id === f)!.short).join(', ')} (no mCTSIB clínico, conta como 30 s / falha).</li>` : ''}</ul>
      <p class="small muted">Sem valores normativos validados para este método: compare sobretudo com as medições anteriores do mesmo doente, com o mesmo telemóvel e colocação.</p>
      <p class="ref">Mancini M et al. J Neuroeng Rehabil 2012; Shumway-Cook A, Horak FB. Phys Ther 1986 (CTSIB).</p>
    </div>`;
  };
  const last = postureRecs.all()[0];
  if (last) showResults(last);
  renderHist();
}
