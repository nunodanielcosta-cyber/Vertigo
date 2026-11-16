/** Armazenamento de vídeos (Blob) em IndexedDB — fica só neste dispositivo. */
const DB = 'vertigo-media';
const STORE = 'videos';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export const putBlob = (id: string, b: Blob) => tx('readwrite', (s) => s.put(b, id));
export const getBlob = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id));
export const delBlob = (id: string) => tx('readwrite', (s) => s.delete(id));
