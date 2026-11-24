export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const iso = (d: Date) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
export const todayStr = () => iso(new Date());
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const addDays = (s: string, n: number) => { const d = new Date(s + 'T12:00'); d.setDate(d.getDate() + n); return iso(d); };
export const fmt = (s: string, o: Intl.DateTimeFormatOptions) => new Date(s + 'T12:00').toLocaleDateString('en-ZA', o);
/** e.g. Mon 24 Nov */
export const shortDay = (s: string) => fmt(s, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/,/g, '');
export const mondayOf = (s: string) => { const d = new Date(s + 'T12:00'); return addDays(s, -((d.getDay() + 6) % 7)); };
export const PEOPLE = ['Family', 'Thinus', 'Juazel', 'Phoebe', 'Jocelyn'] as const;
export type Person = typeof PEOPLE[number];
export const PCOL: Record<string, string> = { Family: '#e8765a', Thinus: '#2f8f8a', Juazel: '#a25bb5', Karri: '#e0607e', Phoebe: '#e07a8f', Jocelyn: '#4f9d62', Both: '#e8765a', Unassigned: '#9a9088' };
export const val = (f: HTMLFormElement, n: string) => ((f.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
export const checked = (f: HTMLFormElement, n: string) => !!(f.elements.namedItem(n) as HTMLInputElement | null)?.checked;
export const radios = (name: string, opts: readonly string[], cur: string, colors?: Record<string, string>) =>
  `<div class="radios">${opts.map(o => `<label class="rad"><input type="radio" name="${name}" value="${esc(o)}" ${o === cur ? 'checked' : ''}><span ${colors ? `style="--c:${colors[o]}"` : ''}>${esc(o)}</span></label>`).join('')}</div>`;
export const opts = (list: readonly string[], cur: string) => list.map(o => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('');

/** Drop undefined fields (and nested ones) so Firestore setDoc never sees them. */
export function stripUndefined<T>(v: T): T {
  if (v === undefined || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.filter(x => x !== undefined).map(x => stripUndefined(x)) as T;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (val === undefined) continue;
    out[k] = stripUndefined(val);
  }
  return out as T;
}
export function shortErr(e: unknown): string {
  const raw = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : String(e);
  const msg = raw.replace(/^FirebaseError:\s*/i, '');
  if (/unsupported field value: undefined/i.test(msg)) return 'a required value was missing – try again';
  if (/permission-denied|missing or insufficient permissions/i.test(msg)) return 'sync was refused – check you’re signed in with the family account';
  return msg.slice(0, 180);
}
