import * as S from '../store';
import { esc, val, todayStr } from '../util';
import { avatar } from '../icons';
import { members } from './members';
import { addItems, addShopCat, cats, lastShopGroup, setLastShopGroup } from './shopping';
import { tlists } from './todos';
import type { Todo } from './todos';
import type { Ev } from './calendar';
import type { Note } from './notes';
import { defaultWishWho, type Wish } from './wishes';

export type QAType = 'shop' | 'todo' | 'event' | 'note' | 'wish';
const TYPES: [QAType, string][] = [
  ['shop', 'Shopping item'],
  ['todo', 'To-do'],
  ['event', 'Calendar event'],
  ['note', 'Note'],
  ['wish', 'Wishlist item'],
];
const OCC = ['Birthday', 'Christmas', 'Anytime'];
let open = false;
let kind: QAType = (localStorage.getItem('qaLastType') as QAType) || 'shop';
if (!TYPES.some(([k]) => k === kind)) kind = 'shop';

const last = (k: string, d: string) => localStorage.getItem(k) || d;
const setLast = (k: string, v: string) => localStorage.setItem(k, v);

export const qaOpen = () => open;
export function openQA(k?: QAType) { open = true; if (k) { kind = k; setLast('qaLastType', kind); } }
export function closeQA() { open = false; }

export function qaSheet() {
  if (!open) return '';
  let fields = '';
  if (kind === 'shop') {
    const gid = lastShopGroup();
    fields = `<input name="title" required placeholder="Item to buy" autocomplete="off" enterkeyhint="done" autofocus>
    <h3>Category</h3>
    <div class="chips">${cats().map(c => `<label class="chip ${c.id === gid ? 'sel' : ''}"><input type="radio" name="groupId" value="${c.id}" ${c.id === gid ? 'checked' : ''} hidden>${c.icon} ${esc(c.name)}</label>`).join('')}
    <button type="button" class="chip add" data-qaaddcat>＋ New category</button></div>`;
  } else if (kind === 'todo') {
    const who = last('qaLastWho', S.bus.me || 'Unassigned');
    fields = `<input name="title" required placeholder="What needs doing?" autocomplete="off" enterkeyhint="done" autofocus>
    <h3>Assigned to</h3>
    <div class="radios ochips">${['Thinus', 'Juazel', 'Both', 'Unassigned'].map(o => `<label class="rad"><input type="radio" name="who" value="${o}" ${o === who ? 'checked' : ''}><span>${avatar(o)} ${o === 'Unassigned' ? 'Not set' : o}</span></label>`).join('')}</div>`;
  } else if (kind === 'event') {
    fields = `<input name="title" required placeholder="What’s happening?" autocomplete="off" enterkeyhint="done" autofocus>
    <label class="row">Date <input type="date" name="date" required value="${todayStr()}"></label>
    <label class="row">Time <input type="time" name="time" value=""></label>`;
  } else if (kind === 'note') {
    fields = `<input name="title" required placeholder="Note title" autocomplete="off" enterkeyhint="done" autofocus>
    <textarea name="text" rows="3" placeholder="A few words (optional)"></textarea>`;
  } else {
    const who = last('qaLastWishWho', defaultWishWho());
    const occ = last('qaLastOcc', 'Anytime');
    fields = `<input name="title" required placeholder="What would they like?" autocomplete="off" enterkeyhint="done" autofocus>
    <h3>Whose list?</h3>
    <div class="radios ochips">${members().map(m => `<label class="rad"><input type="radio" name="who" value="${esc(m.name)}" ${m.name === who ? 'checked' : ''}><span>${avatar(m.name)} ${esc(m.name)}</span></label>`).join('')}</div>
    <h3>Occasion</h3>
    <div class="radios">${OCC.map(o => `<label class="rad"><input type="radio" name="occasion" value="${o}" ${o === occ ? 'checked' : ''}><span>${o}</span></label>`).join('')}</div>`;
  }
  return `<div class="moreback" data-qaclose></div>
  <form class="sheet qasheet" data-form="qa" novalidate>
    <header><h2>Quick add</h2><button type="button" class="gear" data-qaclose aria-label="Close">✕</button></header>
    <div class="qatypes">${TYPES.map(([k, l]) => `<button type="button" class="chip ${k === kind ? 'sel' : ''}" data-qakind="${k}">${l}</button>`).join('')}</div>
    ${fields}
    <button class="save">Add</button>
  </form>`;
}

export async function qaClick(b: HTMLElement) {
  const d = b.dataset;
  if ('qaopen' in d) { open = true; S.bus.rerender(); return true; }
  if ('qaclose' in d) { open = false; S.bus.rerender(); return true; }
  if (d.qakind) { kind = d.qakind as QAType; setLast('qaLastType', kind); S.bus.rerender(); return true; }
  if ('qaaddcat' in d) {
    const n = prompt('New category name')?.trim();
    if (n) { await addShopCat(n); S.bus.rerender(); }
    return true;
  }
  return false;
}

export async function qaSubmit(f: HTMLFormElement) {
  const title = val(f, 'title').trim();
  if (!title) { S.bus.toast('Please enter a name', 'err'); return; }
  if (kind === 'shop') {
    const gid = val(f, 'groupId') || lastShopGroup();
    if (gid) setLastShopGroup(gid);
    const n = await addItems([{ name: title, qty: '' }], undefined, gid);
    S.bus.toast(n ? 'Added to shopping ✓' : 'Could not add', n ? 'ok' : 'err');
  } else if (kind === 'todo') {
    const who = val(f, 'who') || 'Unassigned';
    const listId = tlists()[0]?.id;
    if (!listId) { S.bus.toast('No to-do list yet – try again in a moment', 'err'); return; }
    setLast('qaLastWho', who);
    await S.save<Todo>('todos', { listId, title, who, due: '', done: false, repeat: 'none' } as Todo);
    S.bus.toast('To-do added ✓');
  } else if (kind === 'event') {
    const time = val(f, 'time'); const date = val(f, 'date') || todayStr();
    if (!date) { S.bus.toast('Please pick a date', 'err'); return; }
    await S.save<Ev>('events', { title, date, allDay: !time, time: time || '', who: 'Family', repeat: 'none', notes: '' } as Ev);
    S.bus.toast('Event added ✓');
  } else if (kind === 'note') {
    await S.save<Note>('notes', { title, text: val(f, 'text'), pinned: false } as Note);
    S.bus.toast('Note saved ✓');
  } else {
    const who = val(f, 'who') || defaultWishWho();
    const occasion = val(f, 'occasion') || 'Anytime';
    setLast('qaLastWishWho', who); setLast('qaLastOcc', occasion);
    await S.save<Wish>('wishes', { who, name: title, occasion, priority: 'med' } as Wish);
    S.bus.toast('Wish added ✓');
  }
  open = false; S.bus.rerender();
}
