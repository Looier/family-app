import { openDB, IDBPDatabase } from 'idb';
import type { HealthEntry, MedList } from './types';
import { DEFAULT_MEDS } from './types';
let dbp: Promise<IDBPDatabase> | null = null;
const db = () => (dbp ??= openDB('family', 2, { upgrade(d, old) {
  if (old < 1) { const s = d.createObjectStore('entries', { keyPath: 'id' }); s.createIndex('date', 'date'); d.createObjectStore('kv'); }
  if (old < 2) { const s = d.createObjectStore('docs', { keyPath: 'key' }); s.createIndex('col', 'col'); }
} }));
/** Generic synced docs for the v2 modules (calendar, meals, to-dos, shopping). key = col/id */
export interface StoredDoc { key: string; col: string; data: { id: string; updatedAt: number; deleted?: boolean } }
export async function allDocs(col: string) { return ((await (await db()).getAllFromIndex('docs', 'col', col)) as StoredDoc[]).map(r => r.data); }
export async function getDoc(col: string, id: string) { return ((await (await db()).get('docs', col + '/' + id)) as StoredDoc | undefined)?.data; }
export async function putDoc(col: string, data: StoredDoc['data']) { await (await db()).put('docs', { key: col + '/' + data.id, col, data }); }
export async function mergeDocs(col: string, rows: StoredDoc['data'][]) {
  const d = await db(); const tx = d.transaction('docs', 'readwrite'); let changed = false;
  for (const r of rows) { const cur = (await tx.store.get(col + '/' + r.id)) as StoredDoc | undefined; if (!cur || cur.data.updatedAt < r.updatedAt) { await tx.store.put({ key: col + '/' + r.id, col, data: r }); changed = true; } }
  await tx.done; return changed;
}
export async function allEntries(): Promise<HealthEntry[]> { return (await (await db()).getAll('entries')).filter((e: HealthEntry) => !e.deleted); }
export async function putEntry(e: HealthEntry) { await (await db()).put('entries', e); }
export async function getEntry(id: string): Promise<HealthEntry | undefined> { return (await db()).get('entries', id); }
/** merge remote rows: last-writer-wins on updatedAt */
export async function mergeEntries(rows: HealthEntry[]) {
  const d = await db(); const tx = d.transaction('entries', 'readwrite');
  for (const r of rows) { const cur = await tx.store.get(r.id) as HealthEntry | undefined; if (!cur || cur.updatedAt < r.updatedAt) await tx.store.put(r); }
  await tx.done;
}
export async function getMeds(): Promise<MedList> { return (await (await db()).get('kv', 'meds')) ?? { meds: DEFAULT_MEDS, updatedAt: 0 }; }
export async function setMeds(m: MedList) { await (await db()).put('kv', m, 'meds'); }
export async function getKV<T>(k: string): Promise<T | undefined> { return (await db()).get('kv', k); }
export async function setKV(k: string, v: unknown) { await (await db()).put('kv', v, k); }
