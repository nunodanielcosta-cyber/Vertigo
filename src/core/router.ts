/** Router por hash (#/rota). Cada vista recebe o contentor e pode registar uma função de limpeza. */
export type View = (app: HTMLElement, params: string[]) => void | Promise<void>;

const routes: { pattern: RegExp; view: View }[] = [];
let cleanups: (() => void)[] = [];

export function route(path: string, view: View) {
  // "/escalas/:id" → /^\/escalas\/([^/]+)$/
  const re = new RegExp('^' + path.replace(/:[a-z]+/gi, '([^/]+)') + '$');
  routes.push({ pattern: re, view });
}

/** Regista uma função a executar quando o utilizador sai da vista atual (parar câmara, sensores, temporizadores…). */
export function onLeave(fn: () => void) {
  cleanups.push(fn);
}

export function runCleanups() {
  const c = cleanups;
  cleanups = [];
  for (const fn of c) {
    try { fn(); } catch (e) { console.error(e); }
  }
}

export function navigate(path: string) {
  if (location.hash === '#' + path) render();
  else location.hash = path;
}

export function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}

let app: HTMLElement;
export function startRouter(root: HTMLElement) {
  app = root;
  window.addEventListener('hashchange', render);
  render();
}

export function render() {
  runCleanups();
  const path = currentPath();
  for (const r of routes) {
    const m = r.pattern.exec(path);
    if (m) {
      window.scrollTo(0, 0);
      void r.view(app, m.slice(1).map(decodeURIComponent));
      return;
    }
  }
  navigate('/');
}
