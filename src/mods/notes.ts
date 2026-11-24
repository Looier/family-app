import * as S from '../store';
import { esc, val } from '../util';
import type { Module } from './types';
export interface Note { id: string; title: string; text: string; pinned?: boolean }
let edit: Partial<Note> | null = null;
const list = () => S.list<Note>('notes').sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b as any).updatedAt - (a as any).updatedAt);
const r = () => S.bus.rerender();
function view() {
  const ns = list();
  return `<h2>Notes</h2>
  ${ns.map(n => `<button class="card quiet notecard ${n.pinned ? 'pin' : ''}" data-nedit="${n.id}">
    <div class="ehead"><b>${esc(n.title) || 'Untitled'}</b>${n.pinned ? '<small>Pinned</small>' : ''}</div>
    <p class="muted">${esc((n.text || '').slice(0, 140))}${(n.text || '').length > 140 ? '…' : ''}</p>
  </button>`).join('') || '<div class="emptyart"><span>📝</span><b>No notes yet</b><small>Use Quick add or the ＋ button.</small></div>'}`;
}
function form() {
  const n = edit!;
  return `<form class="sheet" data-form="note"><h2>${n.id ? 'Edit note' : 'New note'}</h2>
  <input name="title" required placeholder="Title" value="${esc(n.title)}" autofocus>
  <textarea name="text" rows="8" placeholder="Write anything…">${esc(n.text)}</textarea>
  <label class="chk"><input type="checkbox" name="pinned" ${n.pinned ? 'checked' : ''}> Pin to the top</label>
  <button class="save">Save</button><div class="toggles"><button type="button" class="tog" data-cancel>Cancel</button>${n.id ? `<button type="button" class="tog danger" data-ndel="${n.id}">Delete</button>` : ''}</div></form>`;
}
export const notes: Module = {
  nav: () => edit ? { view: edit.id ? 'edit' : 'new', id: edit.id } : {},
  applyNav: n => {
    if (n.view === 'new') edit = { title: '', text: '', pinned: false };
    else if ((n.view === 'edit' || n.id) && n.id) { const x = S.get<Note>('notes', n.id); edit = x ? { ...x } : null; }
    else edit = null;
  },
  tabs: () => [], tab: () => '', setTab: t => { if (t === 'new') edit = { title: '', text: '', pinned: false }; },
  render: () => edit ? form() : view(),
  click: async b => {
    const d = b.dataset;
    if (d.nedit) { edit = { ...S.get<Note>('notes', d.nedit)! }; r(); return true; }
    if (d.ndel) { await S.remove('notes', d.ndel); edit = null; r(); return true; }
    if ('cancel' in d) { edit = null; r(); return true; }
    return false;
  },
  submit: async f => {
    const title = val(f, 'title'); if (!title) { S.bus.toast('Please enter a name', 'err'); return; }
    await S.save<Note>('notes', { ...(edit as Note), title, text: val(f, 'text'), pinned: !!(f.elements.namedItem('pinned') as HTMLInputElement)?.checked });
    edit = null; S.bus.toast('Note saved ✓'); r();
  },
};
