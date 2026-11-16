import { page, q, icon, download, toast, todayISO } from './_shared';
import { exportAll, importAll } from '../core/storage';

export function dataView(app: HTMLElement) {
  page(app, { title: 'Dados e cópia de segurança', back: '/' }, `
  <div class="stack narrow">
    <div class="card">
      <h2>Privacidade</h2>
      <p>Todos os dados (diário, escalas, exames, medições) ficam guardados <b>apenas neste dispositivo</b>, no armazenamento do navegador. Os vídeos do nistagmo ficam no armazenamento local (IndexedDB). Nada é enviado para servidores.</p>
      <p class="small muted">Se limpar os dados do navegador ou desinstalar a app, os dados perdem-se. Faça cópias de segurança.</p>
    </div>
    <div class="card">
      <h2>Exportar / importar</h2>
      <div class="actionbar">
        <button class="btn primary" id="exp">${icon('download')}Exportar tudo (JSON)</button>
        <label class="btn file-pick">${icon('upload')}<span>Importar cópia…</span><input type="file" id="imp" accept="application/json,.json"></label>
      </div>
      <p class="small muted">Os vídeos não são incluídos na cópia; descarregue-os individualmente em «Gravar nistagmo».</p>
    </div>
    <div class="card">
      <h2>Apagar</h2>
      <button class="btn" id="wipe">${icon('trash')}Apagar todos os dados</button>
    </div>
  </div>`);
  q('#exp').onclick = () => download(`vertigo-copia-${todayISO()}.json`, JSON.stringify({ app: 'vertigo', version: 1, exported: new Date().toISOString(), data: exportAll() }, null, 1), 'application/json');
  (q('#imp') as HTMLInputElement).onchange = async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== 'vertigo' || !j.data) throw new Error('formato');
      if (!confirm('Importar vai substituir os dados com o mesmo nome. Continuar?')) return;
      importAll(j.data);
      toast('Dados importados');
    } catch { toast('Ficheiro inválido'); }
  };
  q('#wipe').onclick = () => {
    if (!confirm('Apagar TODOS os dados da Vertigo neste dispositivo? Não é reversível.')) return;
    Object.keys(localStorage).filter((k) => k.startsWith('vertigo.')).forEach((k) => localStorage.removeItem(k));
    try { indexedDB.deleteDatabase('vertigo-media'); } catch { /* ignorar */ }
    toast('Dados apagados');
  };
}
