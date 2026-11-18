import * as S from '../store';
import { esc, fmt, todayStr, addDays, val, radios } from '../util';
import { avatar } from '../icons';
import { ownerRadios, asOwner, isAssignedTo, ownerMini, OWNERS } from './members';
import type { Module } from './types';
export interface TodoList { id: string; name: string; order: number }
export interface Todo { id: string; listId: string; title: string; who: string; due: string; done: boolean; doneAt?: number; repeat: 'none' | 'daily' | 'weekly' | 'monthly'; notes?: string }
const REP = ['none', 'daily', 'weekly', 'monthly'] as const;
let filter = 'all', curList = '', edit: Partial<Todo> | null = null;
export const tlists = () => S.list<TodoList>('todoLists').sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
export async function ensureTodoLists() { if (!S.listAll('todoLists').length) for (const [i, n] of ['Home', 'Kids', 'Admin'].entries()) await S.seedDefault('todoLists', { id: 'tl-' + n.toLowerCase(), name: n, order: i } as any); }
const isMine = (t: Todo) => isAssignedTo(t.who, S.bus.me);
const otherAdult = () => (S.bus.me === 'Juazel' ? 'Thinus' : 'Juazel');
export const dueToday = () => S.list<Todo>('todos').filter(t => !t.done && t.due && t.due <= todayStr()).sort((a, b) => a.due.localeCompare(b.due));
function nextDue(t: Todo) {
  const base = t.due || todayStr(); if (t.repeat === 'daily') return addDays(base, 1); if (t.repeat === 'weekly') return addDays(base, 7);
  const d = new Date(base + 'T12:00'); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10);
}
export const todoRow = (t: Todo) => {
  const od = !t.done && t.due && t.due < todayStr();
  const who = asOwner(t.who);
  return `<div class="item ${t.done ? 'done' : ''}"><button class="tick" aria-label="Tick" data-tt="${t.id}"><span class="box"></span></button><button class="iname" data-tedit="${t.id}">${esc(t.title)}${t.repeat !== 'none' ? ' 🔁' : ''}
  <small>${who !== 'Unassigned' ? ownerMini(who) : '<span class="muted">Unassigned</span>'}${t.due ? ` <span class="${od ? 'overdue' : ''}">${t.due === todayStr() ? 'today' : fmt(t.due, { day: 'numeric', month: 'short' })}${od ? ' · overdue' : ''}</span>` : ''}</small></button></div>`;
};
function view() {
  const all = S.list<Todo>('todos'); const lid = filter === 'all' || filter === 'mine' ? (curList || '') : '';
  let ts = all.filter(t => !lid || t.listId === lid);
  if (filter === 'mine') ts = ts.filter(isMine);
  if (filter === 'other') ts = ts.filter(t => isAssignedTo(t.who, otherAdult()));
  if (filter === 'overdue') ts = ts.filter(t => !t.done && t.due && t.due < todayStr());
  const open = ts.filter(t => !t.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')), done = ts.filter(t => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)).slice(0, 15);
  return `${filter !== 'overdue' ? `<div class="chips scrollx"><button class="chip ${!curList ? 'sel' : ''}" data-tl="">All lists</button>${tlists().map(l => `<button class="chip ${l.id === curList ? 'sel' : ''}" data-tl="${l.id}">${esc(l.name)} <small>${all.filter(t => t.listId === l.id && !t.done).length}</small></button>`).join('')}<button class="chip add" data-newtl>＋ List</button></div>` : '<h2>Overdue</h2>'}
  <form class="quick" data-form="todoadd"><input name="title" placeholder="Quick add to-do…" autocomplete="off" enterkeyhint="done"><button class="addbtn" aria-label="Add">＋</button></form>
  ${open.map(todoRow).join('') || '<div class="emptyart"><span>🎉</span><b>Nothing to do</b><small>Enjoy the free time!</small></div>'}
  ${done.length ? `<h3 class="cat">Done</h3>${done.map(todoRow).join('')}` : ''}
  ${curList && filter !== 'overdue' ? '<div class="toggles"><button class="tog" data-rentl>Rename list</button><button class="tog danger" data-deltl>Delete list</button></div>' : ''}`;
}
function form() {
  const t = edit!;
  return `<form class="sheet" data-form="todo"><h2>${t.id ? 'Edit to-do' : 'New to-do'}</h2>
  <input name="title" required placeholder="What needs doing?" value="${esc(t.title)}">
  <h3>Assigned to</h3>${ownerRadios('who', t.who ?? 'Unassigned')}
  <label class="row">Due <input type="date" name="due" value="${t.due ?? ''}"></label>
  <div class="chips"><button type="button" class="chip" data-duein="0">Today</button><button type="button" class="chip" data-duein="1">Tomorrow</button><button type="button" class="chip" data-duein="7">Next week</button><button type="button" class="chip" data-duein="">No date</button></div>
  <details class="morefold"><summary>More details</summary>
  <label class="row">List <select name="listId">${tlists().map(l => `<option value="${l.id}" ${l.id === t.listId ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>
  <h3>Repeat</h3>${radios('repeat', REP, t.repeat ?? 'none')}
  <textarea name="notes" rows="2" placeholder="Notes">${esc(t.notes)}</textarea>
  </details>
  <button class="save">Save</button><div class="toggles"><button type="button" class="tog" data-cancel>Cancel</button>${t.id ? `<button type="button" class="tog danger" data-tdel="${t.id}">Delete</button>` : ''}</div></form>`;
}
const r = () => S.bus.rerender();
export async function toggleTodo(id: string) {
  const t = S.get<Todo>('todos', id)!;
  if (!t.done && t.repeat !== 'none') { const n = nextDue(t); await S.save('todos', { ...t, due: n }); S.bus.toast(`Done ✓ · next due ${fmt(n, { day: 'numeric', month: 'short' })}`); }
  else await S.save('todos', { ...t, done: !t.done, doneAt: Date.now() });
}
export const todos: Module = {
  nav: () => edit ? { tab: filter, view: edit.id ? 'edit' : 'new', id: edit.id } : { tab: filter },
  applyNav: n => {
    if (n.tab && n.tab !== 'new') filter = n.tab;
    if (n.view === 'new') edit = { listId: curList || tlists()[0]?.id, who: S.bus.me || 'Unassigned', repeat: 'none', due: '' };
    else if ((n.view === 'edit' || n.id) && n.id) { const x = S.get<Todo>('todos', n.id); edit = x ? { ...x } : null; }
    else edit = null;
  },
  tabs: () => {
    const other = otherAdult();
    return [['all', 'All'], ['mine', 'Mine'], ['other', other + "’s"], ['overdue', 'Overdue']];
  }, tab: () => filter,
  setTab: t => { if (t === 'new') edit = { listId: curList || tlists()[0]?.id, who: S.bus.me || 'Unassigned', repeat: 'none', due: '' }; else { filter = t; edit = null; } },
  render: () => edit ? form() : view(),
  click: async b => {
    const d = b.dataset;
    if (d.tl !== undefined && b.classList.contains('chip')) { curList = d.tl; r(); return true; }
    if (d.tt) { await toggleTodo(d.tt); r(); return true; }
    if (d.tedit) { edit = { ...S.get<Todo>('todos', d.tedit)! }; r(); return true; }
    if (d.tdel) { await S.remove('todos', d.tdel); edit = null; r(); return true; }
    if ('cancel' in d) { edit = null; r(); return true; }
    if (d.duein !== undefined) { const i = b.closest('form')!.elements.namedItem('due') as HTMLInputElement; i.value = d.duein === '' ? '' : addDays(todayStr(), +d.duein); return true; }
    if ('newtl' in d) { const n = prompt('New list name')?.trim(); if (n) { const l = await S.save<TodoList>('todoLists', { name: n, order: tlists().length } as TodoList); curList = l.id; r(); } return true; }
    if ('rentl' in d) { const l = tlists().find(x => x.id === curList)!; const n = prompt('Rename list', l.name)?.trim(); if (n) { await S.save('todoLists', { ...l, name: n }); r(); } return true; }
    if ('deltl' in d) { const l = tlists().find(x => x.id === curList)!; if (tlists().length > 1 && confirm(`Delete list "${l.name}" and its to-dos?`)) { for (const t of S.list<Todo>('todos').filter(t => t.listId === l.id)) await S.remove('todos', t.id); await S.remove('todoLists', l.id); curList = ''; r(); } return true; }
    return false;
  },
  submit: async f => {
    if (f.dataset.form === 'todoadd') { const title = val(f, 'title'); if (!title) return; const who = filter === 'mine' && S.bus.me ? S.bus.me : filter === 'other' ? otherAdult() : 'Unassigned'; await S.save<Todo>('todos', { listId: curList || tlists()[0]?.id, title, who, due: '', done: false, repeat: 'none' } as Todo); r(); (document.querySelector('.quick input') as HTMLInputElement)?.focus(); return; }
    await S.save<Todo>('todos', { ...(edit as Todo), done: edit!.done ?? false, title: val(f, 'title'), listId: val(f, 'listId'), who: val(f, 'who') || 'Unassigned', due: val(f, 'due'), repeat: (val(f, 'repeat') || 'none') as Todo['repeat'], notes: val(f, 'notes') });
    edit = null; S.bus.toast('Saved ✓'); r();
  },
};
