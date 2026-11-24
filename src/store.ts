/** In-memory cache + persistence + sync queue for the v2 module collections. */
import * as db from './db';
import type { SyncAdapter, SyncDoc } from './sync';
import { uid, stripUndefined, shortErr } from './util';
export const COLS = ['events', 'recipes', 'mealPlan', 'todoLists', 'todos', 'shopLists', 'shopItems', 'shopCats', 'recipeCats', 'members', 'weekPlans', 'dayPlans', 'notes', 'wishes', 'config'] as const;
export type Col = typeof COLS[number];
const cache = {} as Record<Col, SyncDoc[]>;
let adapter: SyncAdapter | null = null; let signedIn = false;
export const bus = { rerender: () => {}, toast: (_m: string, _kind?: 'ok' | 'err') => {}, go: (_mod: string, _sub?: string) => {}, dismiss: () => {}, me: 'Thinus' as string };
export async function loadAll() { for (const c of COLS) cache[c] = await db.allDocs(c); }
/** live (non-deleted) docs */
export function list<T>(c: Col): T[] { return (cache[c] ?? []).filter(d => !d.deleted) as unknown as T[]; }
/** includes deleted (for autocomplete history) */
export function listAll<T>(c: Col): T[] { return (cache[c] ?? []) as unknown as T[]; }
export function get<T>(c: Col, id: string): T | undefined { return list<T & SyncDoc>(c).find(d => d.id === id); }
/** includes a soft-deleted doc, if present */
export function getAny<T>(c: Col, id: string): (T & SyncDoc) | undefined { return (cache[c] ?? []).find(d => d.id === id) as (T & SyncDoc) | undefined; }
export async function save<T extends object>(c: Col, d: T & { id?: string }): Promise<T & SyncDoc> {
  try {
    const doc = stripUndefined({ ...d, id: d.id || uid(), updatedAt: Date.now() } as T & SyncDoc);
    await db.putDoc(c, doc);
    const arr = cache[c] ?? (cache[c] = []); const i = arr.findIndex(x => x.id === doc.id); if (i >= 0) arr[i] = doc; else arr.push(doc);
    const p = (await db.getKV<string[]>('pendingDocs')) ?? []; const k = c + '|' + doc.id; if (!p.includes(k)) p.push(k); await db.setKV('pendingDocs', p);
    flushDocs(); return doc;
  } catch (e) {
    bus.toast('Couldn’t save: ' + shortErr(e), 'err');
    throw e;
  }
}
/** local-only defaults (fixed ids, updatedAt 1) so any remote version always wins and nothing is overwritten */
export async function seedDefault(c: Col, d: SyncDoc) { if ((cache[c] ?? []).some(x => x.id === d.id)) return; const doc = stripUndefined({ ...d, updatedAt: 1 }); await db.putDoc(c, doc); (cache[c] ??= []).push(doc); }
export async function remove(c: Col, id: string) { const d = (cache[c] ?? []).find(x => x.id === id); if (d) await save(c, { ...d, deleted: true }); }
export async function flushDocs() {
  if (!adapter || !signedIn) return;
  const p = (await db.getKV<string[]>('pendingDocs')) ?? []; const left: string[] = [];
  let lastErr: unknown = null;
  for (const k of p) { const [c, id] = k.split('|'); const d = await db.getDoc(c, id); if (!d) continue; try { await adapter.pushDoc(c, d); } catch (e) { left.push(k); lastErr = e; } }
  await db.setKV('pendingDocs', left);
  if (lastErr) bus.toast('Couldn’t sync: ' + shortErr(lastErr), 'err');
}
/** call on sign-in; returns unsubscribe. onReady runs after the first snapshot of every collection (or a timeout), before the first flush. */
export function attach(a: SyncAdapter, onErr: (e: unknown) => void, onReady?: () => void | Promise<void>) {
  adapter = a; signedIn = true;
  const first: Record<string, () => void> = {};
  const waited = Promise.all(COLS.map(c => new Promise<void>(res => { first[c] = res; })));
  const uns = COLS.map(c => a.subscribeCol(c, async rows => {
    if (await db.mergeDocs(c, rows)) { cache[c] = await db.allDocs(c); softRender(); }
    first[c]?.(); delete first[c];
  }, e => { first[c]?.(); delete first[c]; onErr(e); }));
  Promise.race([waited, new Promise<void>(r => setTimeout(r, 8000))]).then(async () => {
    try { await onReady?.(); } catch (e) { bus.toast('Couldn’t finish setup: ' + shortErr(e), 'err'); }
    await flushDocs();
    softRender();
  });
  return () => { signedIn = false; uns.forEach(u => u()); };
}
/** don't wipe what someone is typing when a remote update lands */
export function softRender() { const a = document.activeElement; if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) || document.querySelector('.sheet')) return; bus.rerender(); }
