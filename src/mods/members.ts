import * as S from '../store';
import * as db from '../db';
import { esc, PCOL } from '../util';
import { avatar } from '../icons';
import type { HealthEntry } from '../types';

export interface Member { id: string; name: string; kind: 'adult' | 'kid'; color: string; order: number }
const PALETTE = ['#2f8f8a', '#a25bb5', '#e0607e', '#4f9d62', '#e8923a', '#5b7fd6', '#8a62c9', '#c97b3a', '#d45d79'];
export const DEFAULT_MEMBERS: Member[] = [
  { id: 'm-thinus', name: 'Thinus', kind: 'adult', color: '#2f8f8a', order: 0 },
  { id: 'm-juazel', name: 'Juazel', kind: 'adult', color: '#a25bb5', order: 1 },
  { id: 'm-phoebe', name: 'Phoebe', kind: 'kid', color: '#e07a8f', order: 2 },
  { id: 'm-jocelyn', name: 'Jocelyn', kind: 'kid', color: '#4f9d62', order: 3 },
];
export const members = () => {
  const list = S.list<Member>('members').sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  for (const m of list) PCOL[m.name] = m.color;
  return list;
};
export const adults = () => members().filter(m => m.kind === 'adult');
export const kids = () => members().filter(m => m.kind === 'kid');
export const memberByName = (name: string) => members().find(m => m.name === name || m.id === name);
export function personColor(name: string) {
  if (!name) return PCOL.Unassigned;
  return memberByName(name)?.color ?? PCOL[name] ?? '#8a8078';
}
export const whoOptions = () => ['Family', ...members().map(m => m.name)];

/** Seed Thinus, Juazel, Phoebe and Jocelyn. Existing health entries stay on the person already stored (Phoebe/Jocelyn are never reassigned). */
export async function ensureMembers() {
  for (const m of DEFAULT_MEMBERS) await S.seedDefault('members', { ...m, updatedAt: 1 } as any);
  const have = new Set(members().map(m => m.name.toLowerCase()));
  let order = members().reduce((n, m) => Math.max(n, m.order + 1), 0);
  const names = new Set<string>();
  let entries: HealthEntry[] = [];
  try { entries = await db.allEntries() as HealthEntry[]; for (const e of entries) if (e.child) names.add(e.child); } catch { /* empty db */ }
  for (const name of names) {
    if (!name || have.has(name.toLowerCase())) continue;
    const id = 'm-auto-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await S.seedDefault('members', { id, name, kind: 'kid', color: PALETTE[order % PALETTE.length], order, updatedAt: 1 } as any);
    have.add(name.toLowerCase()); order++;
  }
  // Karri was a mistaken default — drop the member if she has no health logs
  for (const k of members().filter(m => m.name === 'Karri' || m.id === 'm-karri')) {
    if (!entries.some(e => e.child === 'Karri' || e.memberId === 'm-karri' || e.memberId === k.id)) await S.remove('members', k.id);
  }
}
export async function addMember(name: string, kind: 'adult' | 'kid') {
  const n = name.trim(); if (!n) return;
  if (members().some(m => m.name.toLowerCase() === n.toLowerCase())) { S.bus.toast('That person is already on the list'); return; }
  const order = members().reduce((x, m) => Math.max(x, m.order + 1), 0);
  await S.save<Member>('members', { name: n, kind, color: PALETTE[order % PALETTE.length], order } as Member);
}
export async function renameMember(id: string, name: string) {
  const m = S.get<Member>('members', id); const n = name.trim(); if (!m || !n) return;
  await S.save('members', { ...m, name: n });
}
export async function removeMember(id: string) {
  if (members().length <= 1) { S.bus.toast('Keep at least one family member'); return false; }
  const m = S.get<Member>('members', id); if (!m) return false;
  if (!confirm(`Remove ${m.name} from the family list? Their existing health entries stay saved.`)) return false;
  await S.remove('members', id); return true;
}

export function memberChips(cur: string, attr = 'child') {
  return healthChips(cur, attr);
}

/** Big, colour-coded person switcher for health logs. Selected chip uses the person’s colour and a check; others are dimmed. */
export function healthChips(cur: string, attr = 'child') {
  const list = members();
  return `<div class="kids who-seg" role="tablist" aria-label="Who are you logging for">${list.map(m => {
    const sel = m.name === cur;
    return `<button type="button" role="tab" aria-selected="${sel}" data-${attr}="${esc(m.name)}" class="kid ${sel ? 'sel' : ''}" style="--pc:${m.color}">${avatar(m.name)}<span class="kname">${esc(m.name)}${m.kind === 'kid' ? '<small>Child</small>' : ''}</span>${sel ? '<span class="kcheck" aria-hidden="true">✓</span>' : ''}</button>`;
  }).join('')}</div>`;
}

/** Only Thinus and Juazel (adults) sign in / pick “Who am I”. Children are family members, not app users. */
export function appUsers() {
  const a = adults();
  return a.length ? a : members();
}

export const OWNERS = ['Thinus', 'Juazel', 'Both', 'Unassigned'] as const;
export type Owner = typeof OWNERS[number];
/** Map legacy 'Family' (and empty) onto the new owner values without rewriting old records until they're next saved. */
export function asOwner(who?: string): Owner {
  if (!who || who === 'Unassigned') return 'Unassigned';
  if (who === 'Family' || who === 'Both') return 'Both';
  if (who === 'Thinus' || who === 'Juazel') return who;
  return 'Unassigned';
}
export const isAssignedTo = (who: string | undefined, person: string) => {
  const o = asOwner(who);
  return o === person || o === 'Both';
};
export function ownerRadios(name: string, cur: string) {
  const v = asOwner(cur);
  return `<div class="radios ochips">${OWNERS.map(o => `<label class="rad"><input type="radio" name="${name}" value="${o}" ${o === v ? 'checked' : ''}><span class="own" style="--c:${PCOL[o] ?? '#888'}">${avatar(o)} ${o}</span></label>`).join('')}</div>`;
}
export function ownerMini(who?: string) {
  const o = who ? (['Thinus', 'Juazel', 'Both', 'Family'].includes(who) ? (who === 'Family' ? 'Both' : who) : who) : '';
  if (!o || o === 'Unassigned') return '';
  return `${avatar(o, 'sm')}<span class="who">${esc(o)}</span>`;
}

export function settingsView(syncHtml: string, me: string) {
  const list = members();
  return `<h2>Settings</h2>
  <div class="card"><h3>Who am I on this phone?</h3>
    <p class="muted">This is your phone — only Thinus and Juazel sign in and use the app. The children are not app users; they appear on the family list so you can log their health and plan the week. Stored only on this device. Used for “Mine” on to-dos, and so a bought gift stays hidden on this phone.</p>
    <div class="mephone">${appUsers().map(p => `<button class="chip mechip ${me === p.name ? 'sel' : ''}" data-me="${esc(p.name)}">${avatar(p.name)}${esc(p.name)}</button>`).join('')}</div>
  </div>
  <div class="card"><h3>Family members</h3>
    <p class="muted">Health tracking, the calendar and the weekly plan use this list. Phoebe and Jocelyn are children you log health for — they don’t have their own sign-in. You can add children or adults, or rename someone. Removing a person hides them from the switcher but keeps their old health entries.</p>
    <ul class="editlist members">${list.map(m => `<li>
      ${avatar(m.name)}<span class="iname static"><b>${esc(m.name)}</b><small>${m.kind === 'kid' ? 'Child' : 'Adult'}</small></span>
      <button class="tog" data-renmem="${m.id}">Rename</button>
      <button class="tog danger" data-delmem="${m.id}">Remove</button>
    </li>`).join('')}</ul>
    <div class="toggles"><button class="tog" data-addmem="kid">＋ Add child</button><button class="tog" data-addmem="adult">＋ Add adult</button></div>
  </div>
  ${syncHtml}`;
}

export async function settingsClick(b: HTMLElement) {
  const d = b.dataset;
  if (d.addmem) {
    const n = prompt(d.addmem === 'kid' ? 'Child’s name' : 'Adult’s name')?.trim();
    if (n) await addMember(n, d.addmem as 'adult' | 'kid');
    return true;
  }
  if (d.renmem) {
    const m = S.get<Member>('members', d.renmem); if (!m) return true;
    const n = prompt('New name', m.name)?.trim(); if (n && n !== m.name) await renameMember(d.renmem, n);
    return true;
  }
  if (d.delmem) { await removeMember(d.delmem); return true; }
  return false;
}
