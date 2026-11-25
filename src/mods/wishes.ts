import * as S from '../store';
import { esc, val, PCOL } from '../util';
import { members } from './members';
import { avatar } from '../icons';
import type { Module } from './types';
export interface Wish { id: string; who: string; name: string; occasion: string; link?: string; price?: string; notes?: string; priority?: 'low' | 'med' | 'high'; boughtBy?: string }
const OCC = ['Birthday', 'Christmas', 'Anytime'];
const PRIO: Record<string, string> = { high: 'High', med: 'Medium', low: 'Low' };
let edit: Partial<Wish> | null = null;
const LS = 'wishCollapsed';
const cmap = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
const folded = (k: string) => !!cmap()[k];
const toggle = (k: string) => { const m = cmap(); if (m[k]) delete m[k]; else m[k] = true; localStorage.setItem(LS, JSON.stringify(m)); };
const all = () => S.list<Wish>('wishes');
const r = () => S.bus.rerender();
/** A concrete owner name so a saved wish is never invisible in the grouped list. */
export function defaultWishWho() {
  const names = members().map(m => m.name);
  const last = (typeof localStorage !== 'undefined' && localStorage.getItem('qaLastWishWho')) || '';
  if (last && names.includes(last)) return last;
  return names[0] || S.bus.me || 'Thinus';
}
function visible(w: Wish) {
  // Hide a bought gift from the person whose list it is, so it stays a surprise
  if (w.boughtBy && S.bus.me && w.who === S.bus.me) return false;
  return true;
}
function form() {
  const w = edit!;
  const people = members().map(m => m.name);
  const whoDef = w.who && people.includes(w.who) ? w.who : (people[0] || defaultWishWho());
  const occ = w.occasion && !OCC.includes(w.occasion) ? 'Other' : (w.occasion || 'Anytime');
  return `<form class="sheet" data-form="wish" novalidate><h2>${w.id ? 'Edit wish' : 'New wish'}</h2>
  <input name="name" required placeholder="What would they like?" value="${esc(w.name)}" autofocus>
  <h3>Whose list?</h3><div class="radios ochips">${people.map(p => `<label class="rad"><input type="radio" name="who" value="${esc(p)}" ${p === whoDef ? 'checked' : ''}><span>${avatar(p)} ${esc(p)}</span></label>`).join('')}</div>
  <h3>Occasion</h3><div class="radios">${[...OCC, 'Other'].map(o => `<label class="rad"><input type="radio" name="occ" value="${o}" ${o === occ ? 'checked' : ''}><span>${o}</span></label>`).join('')}</div>
  <button type="button" class="link morebtn" data-wmore id="wmorebtn">More details</button>
  <div class="hidden" id="wmore">
    <input name="occasionCustom" placeholder="Custom occasion (if Other)" value="${esc(!OCC.includes(w.occasion || '') ? w.occasion : '')}">
    <input name="link" type="text" inputmode="url" autocomplete="off" placeholder="Link (optional)" value="${esc(w.link)}">
    <input name="price" placeholder="Price (optional)" value="${esc(w.price)}">
    <textarea name="notes" rows="2" placeholder="Notes">${esc(w.notes)}</textarea>
    <h3>Priority</h3><div class="radios">${['high', 'med', 'low'].map(p => `<label class="rad"><input type="radio" name="priority" value="${p}" ${(w.priority || 'med') === p ? 'checked' : ''}><span>${PRIO[p]}</span></label>`).join('')}</div>
    <h3>Bought by</h3><div class="radios">${['', ...members().map(m => m.name)].map(p => `<label class="rad"><input type="radio" name="boughtBy" value="${esc(p)}" ${(w.boughtBy || '') === p ? 'checked' : ''}><span>${p ? avatar(p) + ' ' + esc(p) : 'Not yet'}</span></label>`).join('')}</div>
  </div>
  <button class="save">Save</button><div class="toggles"><button type="button" class="tog" data-cancel>Cancel</button>${w.id ? `<button type="button" class="tog danger" data-wdel="${w.id}">Delete</button>` : ''}</div></form>`;
}
function view() {
  const people = members();
  let h = `<h2>Wishlists</h2><p class="muted">Gifts marked as bought stay hidden on that person’s phone, so the surprise isn’t spoilt.</p>`;
  let any = false;
  for (const p of people) {
    const items = all().filter(w => w.who === p.name && visible(w));
    const hiddenN = all().filter(w => w.who === p.name && !visible(w)).length;
    if (!items.length && !hiddenN) continue;
    any = true;
    const pf = folded('p:' + p.name);
    h += `<section class="ssec" style="--sc:${p.color}"><button class="shead" data-wfold="p:${esc(p.name)}"><span class="chev ${pf ? '' : 'open'}">▸</span>${avatar(p.name)}<b>${esc(p.name)}</b><em class="scount">${items.length}</em></button>`;
    if (!pf) {
      const occasions = [...new Set(items.map(w => w.occasion || 'Anytime'))];
      for (const o of occasions) {
        const of = folded('o:' + p.name + ':' + o);
        const grp = items.filter(w => (w.occasion || 'Anytime') === o);
        h += `<button class="shead sub" data-wfold="o:${esc(p.name)}:${esc(o)}"><span class="chev ${of ? '' : 'open'}">▸</span><b>${esc(o)}</b><em class="scount">${grp.length}</em></button>`;
        if (!of) h += grp.map(w => `<button class="item wish ${w.boughtBy ? 'done' : ''}" data-wedit="${w.id}"><span class="iname">${esc(w.name)}${w.price ? `<small>${esc(w.price)}</small>` : ''}${w.boughtBy ? `<small>Bought by ${esc(w.boughtBy)}</small>` : ''}${w.priority === 'high' ? '<small>High priority</small>' : ''}</span></button>`).join('');
      }
      if (hiddenN && S.bus.me === p.name) h += `<p class="muted small">${hiddenN} surprise${hiddenN === 1 ? '' : 's'} waiting — hidden from this phone.</p>`;
    }
    h += '</section>';
  }
  const known = new Set(people.map(p => p.name));
  const orphans = all().filter(w => visible(w) && !known.has(w.who || ''));
  if (orphans.length) {
    any = true;
    const groups = new Map<string, Wish[]>();
    for (const w of orphans) { const k = w.who || 'Other'; (groups.get(k) ?? (groups.set(k, []), groups.get(k)!)).push(w); }
    for (const [name, items] of groups) {
      h += `<section class="ssec"><button class="shead" data-wfold="p:${esc(name)}"><span class="chev open">▸</span><b>${esc(name)}</b><em class="scount">${items.length}</em></button>`;
      h += items.map(w => `<button class="item wish ${w.boughtBy ? 'done' : ''}" data-wedit="${w.id}"><span class="iname">${esc(w.name)}${w.price ? `<small>${esc(w.price)}</small>` : ''}</span></button>`).join('');
      h += '</section>';
    }
  }
  h += `<p class="addline"><button type="button" class="tog" data-wnew>＋ Add a wish</button></p>`;
  if (!any) h += `<div class="emptyart"><span>🎁</span><b>No wishes yet</b><small>Add one here or with Quick add.</small></div>`;
  return h;
}
export const wishes: Module = {
  nav: () => edit ? { view: edit.id ? 'edit' : 'new', id: edit.id } : {},
  applyNav: n => {
    if (n.view === 'new') edit = { who: defaultWishWho(), occasion: 'Anytime', priority: 'med' };
    else if ((n.view === 'edit' || n.id) && n.id) { const x = S.get<Wish>('wishes', n.id); edit = x ? { ...x } : null; }
    else edit = null;
  },
  tabs: () => [], tab: () => '', setTab: t => { if (t === 'new') edit = { who: defaultWishWho(), occasion: 'Anytime', priority: 'med' }; },
  render: () => edit ? form() : view(),
  click: async b => {
    const d = b.dataset;
    if (d.wfold) { toggle(d.wfold); r(); return true; }
    if ('wnew' in d) { edit = { who: defaultWishWho(), occasion: 'Anytime', priority: 'med' }; r(); return true; }
    if (d.wedit) { edit = { ...S.get<Wish>('wishes', d.wedit)! }; r(); return true; }
    if (d.wdel) { await S.remove('wishes', d.wdel); edit = null; r(); return true; }
    if ('wmore' in d) { const box = document.getElementById('wmore'); if (box) box.classList.toggle('hidden'); return true; }
    if ('cancel' in d) { edit = null; r(); return true; }
    return false;
  },
  submit: async f => {
    const name = val(f, 'name');
    if (!name) { S.bus.toast('Please enter a name', 'err'); return; }
    const occSel = val(f, 'occ');
    const occasion = occSel === 'Other' ? (val(f, 'occasionCustom') || 'Other') : occSel || 'Anytime';
    const who = val(f, 'who') || edit?.who || defaultWishWho();
    const link = val(f, 'link');
    const price = val(f, 'price');
    const notes = val(f, 'notes');
    const boughtBy = val(f, 'boughtBy');
    await S.save<Wish>('wishes', {
      ...(edit as Wish),
      name, who, occasion,
      ...(link ? { link } : { link: '' }),
      ...(price ? { price } : { price: '' }),
      ...(notes ? { notes } : { notes: '' }),
      priority: (val(f, 'priority') || 'med') as Wish['priority'],
      boughtBy,
    });
    try { localStorage.setItem('qaLastWishWho', who); } catch { /* ignore */ }
    edit = null; S.bus.toast('Saved ✓'); r();
  },
};
