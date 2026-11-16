/**
 * Persistência local genérica (localStorage). Nada sai do dispositivo.
 * Cada coleção guarda uma lista de registos com id e data.
 */
export interface Rec {
  id: string;
  date: string; // ISO
}

const PREFIX = 'vertigo.';

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível/cheio */
  }
}

export interface Collection<T extends Rec> {
  all(): T[];
  get(id: string): T | undefined;
  save(r: T): void;
  remove(id: string): void;
  clear(): void;
  replaceAll(list: T[]): void;
}

/** Coleção ordenada por data decrescente. */
export function collection<T extends Rec>(name: string, max = 2000): Collection<T> {
  const key = 'col.' + name;
  const all = () => read<T[]>(key, []);
  return {
    all,
    get: (id) => all().find((r) => r.id === id),
    save(r) {
      const list = all().filter((x) => x.id !== r.id);
      list.push(r);
      list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      write(key, list.slice(0, max));
    },
    remove(id) { write(key, all().filter((x) => x.id !== id)); },
    clear() { write(key, []); },
    replaceAll(list) { write(key, list); },
  };
}

/** Valor único (configurações, estado de um módulo). */
export function setting<T>(name: string, fallback: T) {
  const key = 'set.' + name;
  return {
    get: (): T => ({ ...(fallback as object), ...(read<T>(key, fallback) as object) }) as T,
    getRaw: (): T => read<T>(key, fallback),
    set: (v: T) => write(key, v),
  };
}

/** Exporta todos os dados da app (cópia de segurança / partilha com o médico). */
export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith(PREFIX)) {
      try { out[k] = JSON.parse(localStorage.getItem(k)!); } catch { /* ignorar */ }
    }
  }
  return out;
}

export function importAll(data: Record<string, unknown>) {
  for (const [k, v] of Object.entries(data)) if (k.startsWith(PREFIX)) localStorage.setItem(k, JSON.stringify(v));
}

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
