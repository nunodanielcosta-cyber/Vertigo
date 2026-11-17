import { esc } from '../ui/dom';
import { icon } from '../ui/icons';
import { navigate } from './router';

export { esc, icon };

export interface PageOpts {
  title: string;
  sub?: string;
  back?: string; // rota para o botão voltar
  actions?: string; // HTML de botões extra na barra
  wide?: boolean;
}

/** Estrutura comum das páginas: barra superior + conteúdo. */
export function page(app: HTMLElement, o: PageOpts, body: string) {
  app.innerHTML = `
  <header class="bar">
    <button class="icon-btn" id="back" aria-label="Voltar" title="Voltar">${icon('back')}</button>
    <div class="bar-main">
      <h1 class="bar-title">${esc(o.title)}</h1>
      ${o.sub ? `<span class="bar-sub">${esc(o.sub)}</span>` : ''}
    </div>
    ${o.actions ?? ''}
  </header>
  <main class="page${o.wide ? ' page-wide' : ''}">${body}</main>`;
  (app.querySelector('#back') as HTMLElement).onclick = () => {
    if (o.back) navigate(o.back);
    else history.length > 1 ? history.back() : navigate('/');
  };
}

export const q = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const qa = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];

/** Pílulas de escolha única. */
export function pills(name: string, opts: [string, string][], value?: string, cls = '') {
  return `<div class="pills ${cls}" role="radiogroup">${opts
    .map(([v, l]) => `<label class="pill"><input type="radio" name="${esc(name)}" value="${esc(v)}"${v === value ? ' checked' : ''}><span>${l}</span></label>`)
    .join('')}</div>`;
}

/** Caixas de escolha múltipla em pílula. */
export function checks(name: string, opts: [string, string][], values: string[] = []) {
  return `<div class="pills" role="group">${opts
    .map(([v, l]) => `<label class="pill"><input type="checkbox" name="${esc(name)}" value="${esc(v)}"${values.includes(v) ? ' checked' : ''}><span>${l}</span></label>`)
    .join('')}</div>`;
}

export type Tri = 'yes' | 'no' | 'unk';
/** Pergunta Sim / Não / Não sei. */
export function triQ(name: string, label: string, value: Tri = 'unk', help?: string) {
  return `<div class="q-row">
    <div class="q-text">${label}${help ? `<small>${help}</small>` : ''}</div>
    ${pills(name, [['yes', 'Sim'], ['no', 'Não'], ['unk', '?']], value, 'pills-tri')}
  </div>`;
}

export function num(name: string, label: string, value: number | string | null | undefined, unit = '', attrs = 'step="any"') {
  return `<label class="field"><span>${label}</span><span class="input-unit"><input type="number" inputmode="decimal" name="${esc(name)}" value="${value ?? ''}" ${attrs}>${unit ? `<em>${unit}</em>` : ''}</span></label>`;
}

export function sw(name: string, label: string, checked = false) {
  return `<label class="switch"><input type="checkbox" name="${esc(name)}"${checked ? ' checked' : ''}><span class="track"></span><span>${label}</span></label>`;
}

/** Lê um formulário: campos únicos → string; checkboxes com o mesmo nome → string[] (via getAll). */
export function formData(form: HTMLFormElement) {
  const fd = new FormData(form);
  return {
    str: (k: string) => (fd.get(k) as string | null) ?? '',
    num: (k: string): number | null => {
      const v = fd.get(k);
      if (v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    },
    bool: (k: string) => fd.get(k) === 'on',
    all: (k: string) => fd.getAll(k) as string[],
    tri: (k: string): Tri => ((fd.get(k) as Tri | null) ?? 'unk'),
  };
}

type ClaudeHost = { use?: (name: string) => Promise<{ save: (r: { filename: string; data: Blob }) => Promise<unknown> } | null> };
/** Dentro de uma página publicada no claude.ai, as transferências passam pela capacidade «downloads». */
const hostDownloads = (() => {
  const c = (window as unknown as { claude?: ClaudeHost }).claude;
  return c?.use ? c.use('downloads').catch(() => null) : Promise.resolve(null);
})();

export async function download(filename: string, content: BlobPart, mime = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const host = await hostDownloads;
  if (host) {
    try { await host.save({ filename, data: blob }); } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'rejected_extension') toast('Este formato não pode ser descarregado aqui.');
      else if (code !== 'declined') toast('Não foi possível descarregar o ficheiro.');
    }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function toCSV(rows: (string | number | null | undefined)[][]) {
  return '﻿' + rows.map((r) => r.map((c) => {
    const s = c === null || c === undefined ? '' : String(c);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';')).join('\n');
}

export const fmtDate = (iso: string, withTime = false) => {
  const d = new Date(iso);
  return withTime
    ? d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** true quando a app corre dentro de uma página publicada no claude.ai (impressão e câmara indisponíveis). */
export const embedded = !!(window as unknown as { claude?: unknown }).claude;

export function toast(msg: string) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2200);
  setTimeout(() => t.remove(), 2700);
}

export function disclaimer(text = 'Ferramenta de apoio — não substitui o juízo clínico. Protótipo de investigação, não certificado como dispositivo médico.') {
  return `<aside class="disclaimer">${icon('alert')}<p>${text}</p></aside>`;
}

export function experimental() {
  return `<aside class="experimental">${icon('flask')}<p><b>Funcionalidade experimental.</b> Serve para apoio e investigação, não para diagnóstico validado. Os valores dependem do telemóvel, da colocação e da forma de execução.${embedded ? ' <b>Nesta versão partilhada a câmara e os sensores de movimento não estão disponíveis</b> — use a app instalada no telemóvel.' : ''}</p></aside>`;
}

/** Badge de resultado. tone: ok | warn | bad | info */
export function badge(text: string, tone: 'ok' | 'warn' | 'bad' | 'info' = 'info') {
  return `<span class="badge badge-${tone}">${esc(text)}</span>`;
}

export function resultBox(title: string, body: string, tone: 'ok' | 'warn' | 'bad' | 'info' = 'info') {
  return `<div class="result-box tone-${tone}"><h3>${title}</h3>${body}</div>`;
}

export const fmt = (x: number | null | undefined, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(d).replace('.', ','));

/**
 * Diálogo de confirmação dentro da página (substitui confirm(), que alguns contextos ignoram).
 */
export function ask(message: string, o: { ok?: string; cancel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.className = 'dialog-backdrop';
    d.innerHTML = `<div class="dialog card" role="alertdialog" aria-modal="true" aria-labelledby="dlgMsg">
      <p id="dlgMsg">${esc(message)}</p>
      <div class="actionbar"><button class="btn ${o.danger ? 'danger' : 'primary'}" data-v="1">${esc(o.ok ?? 'Confirmar')}</button><button class="btn" data-v="0">${esc(o.cancel ?? 'Cancelar')}</button></div>
    </div>`;
    const done = (v: boolean) => { d.remove(); document.removeEventListener('keydown', key); resolve(v); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') done(false); };
    d.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-v]') as HTMLElement | null;
      if (b) done(b.dataset.v === '1');
      else if (e.target === d) done(false);
    });
    document.addEventListener('keydown', key);
    document.body.appendChild(d);
    (d.querySelector('[data-v="1"]') as HTMLElement).focus();
  });
}

/** Aviso importante dentro da página (substitui alert()). */
export function notice(message: string, title = 'Atenção'): Promise<void> {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.className = 'dialog-backdrop';
    d.innerHTML = `<div class="dialog card" role="alertdialog" aria-modal="true"><h3>${esc(title)}</h3><p>${esc(message)}</p>
      <div class="actionbar"><button class="btn primary">Compreendi</button></div></div>`;
    d.querySelector('button')!.addEventListener('click', () => { d.remove(); resolve(); });
    document.body.appendChild(d);
    (d.querySelector('button') as HTMLElement).focus();
  });
}

/** Pede um valor 0–10 com um cursor (substitui prompt()). */
export function askScore(message: string, initial = 0): Promise<number> {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.className = 'dialog-backdrop';
    d.innerHTML = `<div class="dialog card" role="dialog" aria-modal="true"><p><b>${esc(message)}</b> <output>${initial}</output>/10</p>
      <input type="range" min="0" max="10" value="${initial}" aria-label="${esc(message)}">
      <div class="actionbar"><button class="btn primary">Guardar</button></div></div>`;
    const r = d.querySelector('input') as HTMLInputElement;
    r.oninput = () => (d.querySelector('output')!.textContent = r.value);
    d.querySelector('button')!.addEventListener('click', () => { d.remove(); resolve(Number(r.value)); });
    document.body.appendChild(d);
  });
}

/** Cronómetro simples com mostrador. */
export class Stopwatch {
  private start = 0;
  private acc = 0;
  private raf = 0;
  running = false;
  constructor(private onTick: (s: number) => void) {}
  get value() { return this.acc + (this.running ? (performance.now() - this.start) / 1000 : 0); }
  toggle() { this.running ? this.stop() : this.go(); }
  go() {
    if (this.running) return;
    this.running = true;
    this.start = performance.now();
    const loop = () => { if (!this.running) return; this.onTick(this.value); this.raf = requestAnimationFrame(loop); };
    loop();
  }
  stop() {
    if (!this.running) return;
    this.acc = this.value;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.onTick(this.acc);
  }
  reset() { this.stop(); this.acc = 0; this.onTick(0); }
}

/** Tile de navegação. */
export function navTile(href: string, ic: string, title: string, desc: string, tag?: string) {
  return `<a class="nav-tile" href="#${href}">
    <span class="nav-ico">${icon(ic)}</span>
    <span class="nav-body"><span class="nav-title">${esc(title)}${tag ? ` <span class="chip chip-warn">${esc(tag)}</span>` : ''}</span><span class="nav-desc">${esc(desc)}</span></span>
    ${icon('chevron', 'nav-chev')}
  </a>`;
}
