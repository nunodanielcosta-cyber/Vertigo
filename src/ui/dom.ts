export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function $(sel: string, root: ParentNode = document): HTMLElement {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`Elemento não encontrado: ${sel}`);
  return el as HTMLElement;
}

export function on(root: ParentNode, sel: string, ev: string, fn: (e: Event, el: HTMLElement) => void) {
  root.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, (e) => fn(e, el as HTMLElement)));
}
