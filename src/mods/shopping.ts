import * as S from '../store';
import { esc, val } from '../util';
import { CAT_ICON } from '../icons';
import { ownerRadios, asOwner, ownerMini } from './members';
import type { Module } from './types';

export interface ShopList { id: string; name: string; order: number }
export interface ShopItem { id: string; listId: string; name: string; qty: string; cat: string; done: boolean; doneAt?: number; who?: string; groupId?: string; note?: string; order?: number; createdAt?: number }
export interface ShopCat { id: string; name: string; icon: string; color: string; order: number; archived?: boolean }

export const CATS = ['Fruit & veg', 'Meat & fish', 'Dairy & eggs', 'Bakery', 'Pantry', 'Frozen', 'Drinks', 'Snacks', 'Baby & kids', 'Health & pharmacy', 'Household & cleaning', 'Toiletries', 'Other'];
const KW: [RegExp, string][] = [
  [/apple|banana|pear|grape|orange|lemon|lime|avo|tomato|potato|onion|garlic|carrot|lettuce|spinach|cucumber|pepper|broccoli|butternut|pumpkin|mushroom|berr|fruit|veg|herb|ginger|chilli|sweet ?potato|baby marrow|corn|peas|beans? sprout/i, 'Fruit & veg'],
  [/chicken|beef|mince|pork|lamb|bacon|sausage|boerewors|fish|salmon|hake|tuna|steak|ham|polony|viennas|wors/i, 'Meat & fish'],
  [/milk|cheese|yog|butter|cream|egg|feta|maas/i, 'Dairy & eggs'], [/bread|roll|bun|wrap|pita|croissant|muffin|cake/i, 'Bakery'],
  [/frozen|ice ?cream|chips? \(frozen\)/i, 'Frozen'], [/juice|cola|coke|water|coffee|tea|rooibos|wine|beer|cooldrink/i, 'Drinks'],
  [/chips|crisps|chocolate|sweets|biscuit|rusk|popcorn|nuts/i, 'Snacks'], [/nappies|diaper|wipes|formula|purity/i, 'Baby & kids'],
  [/panado|nurofen|plaster|vitamin|medicine|telfast|allergex|syrup|pharm|sunscreen/i, 'Health & pharmacy'],
  [/soap|detergent|bleach|handy ?andy|sponge|foil|cling|bin bag|toilet ?paper|loo roll|dishwash|sunlight|domestos|jik/i, 'Household & cleaning'],
  [/shampoo|toothpaste|toothbrush|deo|lotion|razor|conditioner|tissues/i, 'Toiletries'],
  [/rice|pasta|flour|sugar|salt|oil|sauce|tin|can|spice|stock|cereal|oats|jam|peanut|honey|vinegar|mayo|tomato paste|lentil|beans|maize|mielie|pap/i, 'Pantry'],
];
const AISLE_GROUP: Record<string, string> = {
  'Fruit & veg': 'sc-food', 'Meat & fish': 'sc-food', 'Dairy & eggs': 'sc-food', Bakery: 'sc-food', Pantry: 'sc-food', Frozen: 'sc-food', Drinks: 'sc-food', Snacks: 'sc-food',
  'Household & cleaning': 'sc-household', Toiletries: 'sc-household', 'Health & pharmacy': 'sc-household',
  'Baby & kids': 'sc-kids', Other: 'sc-other',
};
const NAME_GROUP: [RegExp, string][] = [
  [/christmas|xmas|wrapping|cracker|stocking|tinsel|gift wrap|advent|santa/i, 'sc-xmas'],
  [/rawl|plug|screw|nail|drill|hammer|paint|varnish|sandpaper|duct tape|spanner|wrench|washer|bolt|hinge|light ?bulb|gloei|wood glue|pvc|gutter/i, 'sc-maintenance'],
  [/school|lunchbox|stationery|crayon|felt tip|glue stick|exercise book|workbook|tights|takkies/i, 'sc-kids'],
];

export const DEFAULT_CATS: ShopCat[] = [
  { id: 'sc-food', name: 'Food / Groceries', icon: '🥬', color: '#5a9a62', order: 0 },
  { id: 'sc-household', name: 'Household', icon: '🏠', color: '#2f8f8a', order: 1 },
  { id: 'sc-maintenance', name: 'Maintenance / Hardware', icon: '🔧', color: '#c97b3a', order: 2 },
  { id: 'sc-xmas', name: 'Christmas & Gifts', icon: '🎁', color: '#c94f63', order: 3 },
  { id: 'sc-kids', name: 'Kids & School', icon: '🎒', color: '#8a62c9', order: 4 },
  { id: 'sc-other', name: 'Other', icon: '🛍️', color: '#8a8078', order: 5 },
];

export function guessCat(name: string) {
  const past = S.listAll<ShopItem>('shopItems').filter(i => i.name.toLowerCase() === name.toLowerCase()).sort((a, b) => (b as any).updatedAt - (a as any).updatedAt)[0];
  if (past) return past.cat; for (const [r, c] of KW) if (r.test(name)) return c; return 'Other';
}
export function guessGroup(it: { name: string; cat?: string; groupId?: string }) {
  if (it.groupId && cats().some(c => c.id === it.groupId)) return it.groupId;
  for (const [r, g] of NAME_GROUP) if (r.test(it.name)) return g;
  return AISLE_GROUP[it.cat || ''] || 'sc-other';
}

export const cats = () => S.list<ShopCat>('shopCats').filter(c => !c.archived).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
export const allCats = () => S.list<ShopCat>('shopCats').sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
export function lists() { return S.list<ShopList>('shopLists').sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)); }
export async function ensureLists() { if (!S.listAll('shopLists').length) for (const [i, n] of ['Checkers', 'Woolworths', 'Clicks'].entries()) await S.seedDefault('shopLists', { id: n.toLowerCase(), name: n, order: i } as any); }

export async function ensureShopCats() {
  if (!S.listAll('shopCats').length) for (const c of DEFAULT_CATS) await S.seedDefault('shopCats', { ...c, updatedAt: 1 } as any);
  else for (const c of DEFAULT_CATS) if (!(S.listAll('shopCats') as ShopCat[]).some(x => x.id === c.id)) await S.seedDefault('shopCats', { ...c, updatedAt: 1 } as any);
  for (const it of S.list<ShopItem>('shopItems')) {
    if (!it.groupId) await S.save('shopItems', { ...it, groupId: guessGroup(it) });
  }
}

const LS_COLLAPSE = 'shopCollapsed';
const LS_HIDDEN = 'shopHidden';
const LS_LAST = 'shopLastGroup';
const LS_FILTER = 'shopFilter';
const loadJson = <T,>(k: string, d: T): T => { try { return { ...d as any, ...JSON.parse(localStorage.getItem(k) || 'null') }; } catch { return d; } };
const collapsedMap = () => {
  const raw = localStorage.getItem(LS_COLLAPSE);
  if (raw) return loadJson<Record<string, boolean>>(LS_COLLAPSE, {});
  const d: Record<string, boolean> = {}; for (const c of cats()) if (c.id !== 'sc-food') d[c.id] = true; return d;
};
const hiddenMap = () => loadJson<Record<string, boolean>>(LS_HIDDEN, {});
const isHidden = (id: string) => !!hiddenMap()[id];
const isCollapsed = (id: string) => !!collapsedMap()[id];
const setFlag = (key: string, id: string, on: boolean) => { const m = key === LS_COLLAPSE ? collapsedMap() : hiddenMap(); if (on) m[id] = true; else delete m[id]; localStorage.setItem(key, JSON.stringify(m)); };

let curList = '', editing: ShopItem | null = null, managing = false, pickingCat = false, quickMore = false, trolleyOpen = false, showMoreEdit = false;
let filter = localStorage.getItem(LS_FILTER) || 'all';
let lastGroup = localStorage.getItem(LS_LAST) || 'sc-food';
let sortBy = (localStorage.getItem('shopSort') as 'name' | 'added' | 'manual') || 'name';
const created = (i: ShopItem) => i.createdAt || (i as any).updatedAt || 0;
function sortItems(arr: ShopItem[]) {
  const a = arr.slice();
  if (sortBy === 'added') a.sort((x, y) => created(x) - created(y));
  else if (sortBy === 'manual') a.sort((x, y) => (x.order ?? created(x)) - (y.order ?? created(y)));
  else a.sort((x, y) => x.name.localeCompare(y.name));
  return a;
}

const cur = () => lists().find(l => l.id === curList) ?? lists()[0];
const visibleCats = () => cats().filter(c => !isHidden(c.id));
const groupOf = (i: ShopItem) => guessGroup(i);
const itemsAll = () => S.list<ShopItem>('shopItems');
const openIn = (gid: string) => itemsAll().filter(i => !i.done && groupOf(i) === gid);
const catById = (id: string) => allCats().find(c => c.id === id) || DEFAULT_CATS.find(c => c.id === id);

export async function addItems(items: { name: string; qty: string }[], listId?: string, groupId?: string) {
  const lid = listId ?? cur()?.id; if (!lid) return 0; let n = 0;
  const gid = groupId || lastGroup || 'sc-food';
  for (const it of items) {
    const name = it.name.trim(); if (!name) continue;
    const ex = itemsAll().find(i => i.listId === lid && !i.done && i.name.toLowerCase() === name.toLowerCase() && groupOf(i) === gid);
    if (ex) { if (it.qty) await S.save('shopItems', { ...ex, qty: [ex.qty, it.qty].filter(Boolean).join(' + ') }); }
    else { const order = openIn(gid).reduce((m, x) => Math.max(m, (x.order ?? 0) + 1), 0); await S.save<ShopItem>('shopItems', { listId: lid, name, qty: it.qty, cat: guessCat(name), done: false, groupId: gid, createdAt: Date.now(), order } as ShopItem); }
    n++;
  }
  return n;
}
export const lastShopGroup = () => lastGroup;
export function setLastShopGroup(id: string) { lastGroup = id; localStorage.setItem(LS_LAST, id); }
export async function addShopCat(name: string) {
  const n = name.trim(); if (!n) return undefined;
  const exist = cats().find(c => c.name.toLowerCase() === n.toLowerCase());
  if (exist) return exist;
  const order = allCats().reduce((m, c) => Math.max(m, c.order + 1), 0);
  const c = await S.save<ShopCat>('shopCats', { name: n, icon: '📌', color: '#8a8078', order } as ShopCat);
  setLastShopGroup(c.id); return c;
}
export const openCount = () => itemsAll().filter(i => !i.done).length;
export function shopSummary() {
  return visibleCats().map(c => ({ id: c.id, name: c.name, icon: c.icon, color: c.color, n: openIn(c.id).length })).filter(x => x.n > 0);
}

const r = () => S.bus.rerender();
const row = (i: ShopItem, gid?: string) => `<div class="item ${i.done ? 'done' : ''}" data-sid="${i.id}">${sortBy === 'manual' && !i.done ? `<span class="ordbtns"><button type="button" class="ord" data-upitem="${i.id}" data-gid="${gid ?? groupOf(i)}" aria-label="Move up">↑</button><button type="button" class="ord" data-dnitem="${i.id}" data-gid="${gid ?? groupOf(i)}" aria-label="Move down">↓</button></span>` : ''}<button class="tick" aria-label="Tick" data-si="${i.id}"><span class="box"></span></button><button class="iname" data-sedit="${i.id}">${esc(i.name)}${i.qty ? ` <small>${esc(i.qty)}</small>` : ''}${i.note ? `<small class="muted">${esc(i.note)}</small>` : ''}${i.who && asOwner(i.who) !== 'Unassigned' ? `<small>${ownerMini(i.who)}</small>` : ''}</button></div>`;

function view() {
  const hidden = hiddenMap();
  const vis = visibleCats();
  const filt = filter !== 'all' && vis.some(c => c.id === filter) ? filter : 'all';
  const names = [...new Set(S.listAll<ShopItem>('shopItems').map(i => i.name))].sort();
  const lg = catById(lastGroup) || vis[0] || DEFAULT_CATS[0];
  let h = `<div class="chips scrollx filt"><button class="chip ${filt === 'all' ? 'sel' : ''}" data-sfilter="all">All</button>${vis.filter(c => openIn(c.id).length || c.id === filt).map(c => `<button class="chip ${filt === c.id ? 'sel' : ''}" data-sfilter="${c.id}"><span class="cemoji">${c.icon}</span> ${esc(c.name.split(' / ')[0])} <small>${openIn(c.id).length}</small></button>`).join('')}<button class="chip add" data-manage>Manage</button></div>
  <form class="quick shopq" data-form="shopadd">
    <button type="button" class="gpick" data-togglepick aria-label="Category">${lg.icon}<span>${esc(lg.name.split(' / ')[0])}</span></button>
    <input name="name" list="shopnames" placeholder="Add an item…" autocomplete="off" enterkeyhint="done">
    <button class="addbtn" aria-label="Add">＋</button>
  </form>
  <datalist id="shopnames">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
  ${pickingCat ? `<div class="gpicker">${cats().map(c => `<button type="button" class="chip ${c.id === lastGroup ? 'sel' : ''}" data-setlast="${c.id}">${c.icon} ${esc(c.name)}</button>`).join('')}<button type="button" class="chip add" data-addcat>＋ New category</button></div>` : ''}
  <div class="sortrow">Sort ${(['name', 'added', 'manual'] as const).map(k => `<button type="button" class="chip sm ${sortBy === k ? 'sel' : ''}" data-ssort="${k}">${k === 'name' ? 'Name' : k === 'added' ? 'Date added' : 'Yours'}</button>`).join('')}
  <button type="button" class="link quiet" data-qmore>${quickMore ? 'Hide details' : 'Qty, note or assignee'}</button></div>
  ${quickMore ? `<div class="qmore"><input form="unused" name="q-qty" id="q-qty" placeholder="Qty (optional)" class="qty"><input id="q-note" placeholder="Note (optional)"><div class="muted small">Assignee and store can be added after, by tapping the item.</div></div>` : ''}`;

  const sections = (filt === 'all' ? vis : vis.filter(c => c.id === filt));
  let any = false;
  for (const c of sections) {
    const open = sortItems(openIn(c.id));
    if (!open.length && filt === 'all') continue;
    any = true;
    const fold = isCollapsed(c.id) && filt === 'all';
    h += `<section class="ssec" style="--sc:${c.color}">
      <button class="shead" data-stog="${c.id}" aria-expanded="${!fold}">
        <span class="chev ${fold ? '' : 'open'}">▸</span>
        <span class="cemoji">${c.icon}</span>
        <b>${esc(c.name)}</b>
        <em class="scount">${open.length}</em>
      </button>
      ${fold ? '' : (open.length ? open.map(it => row(it, c.id)).join('') : '<p class="empty-s">Nothing here yet</p>')}
    </section>`;
  }
  if (!any) h += `<div class="emptyart"><span>🛒</span><b>List is clear</b><small>${Object.keys(hidden).length ? 'Some categories are hidden on this phone.' : 'Add an item above to get started.'}</small></div>`;

  const done = itemsAll().filter(i => i.done && (filt === 'all' ? !isHidden(groupOf(i)) : groupOf(i) === filt)).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  if (done.length) {
    h += `<section class="ssec trolley">
      <button class="shead" data-trolley aria-expanded="${trolleyOpen}">
        <span class="chev ${trolleyOpen ? 'open' : ''}">▸</span>
        <span class="cemoji">✅</span><b>In trolley / bought</b><em class="scount">${done.length}</em>
      </button>
      ${trolleyOpen ? `${done.map(it => row(it)).join('')}<button class="link" data-clear>Clear bought</button>` : ''}
    </section>`;
  }
  return h;
}

function manageView() {
  const hid = hiddenMap();
  const list = allCats();
  return `<div class="sheet manage"><h2>Shopping categories</h2>
  <p class="muted">Categories are shared between both phones. Collapse and “Hide from my view” stay on this phone only, so Juazel can tuck away Maintenance or Christmas without hiding them for Thinus.</p>
  <ul class="editlist catman">${list.map((c, i) => `<li>
    <span class="cemoji">${c.icon}</span>
    <span class="iname static"><b>${esc(c.name)}</b><small>${c.archived ? 'Archived' : openIn(c.id).length + ' to buy'}${hid[c.id] ? ' · hidden on this phone' : ''}</small></span>
    <button class="tog ${hid[c.id] ? 'sel' : ''}" data-hide="${c.id}">${hid[c.id] ? 'Hidden' : 'Hide'}</button>
    <button class="tog" data-rencat="${c.id}">Rename</button>
    ${c.archived ? `<button class="tog" data-unarch="${c.id}">Restore</button>` : `<button class="tog" data-arch="${c.id}">Archive</button>`}
    <button class="tog" data-upcat="${c.id}" ${i === 0 ? 'disabled' : ''}>↑</button>
    <button class="tog" data-dncat="${c.id}" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>
  </li>`).join('')}</ul>
  <button class="chip add" data-addcat>＋ Add category</button>
  <div class="toggles"><button type="button" class="tog" data-cancel>Done</button></div></div>`;
}

function editForm() {
  const i = editing!;
  const gid = groupOf(i);
  return `<form class="sheet" data-form="shopedit"><h2>Edit item</h2>
  <input name="name" required value="${esc(i.name)}">
  <h3>Category</h3><div class="radios ochips">${cats().map(c => `<label class="rad"><input type="radio" name="groupId" value="${c.id}" ${c.id === gid ? 'checked' : ''}><span>${c.icon} ${esc(c.name)}</span></label>`).join('')}</div>
  <button type="button" class="link" data-emore>${showMoreEdit ? 'Less' : 'More details'}</button>
  <div class="${showMoreEdit ? '' : 'hidden'}">
    <input name="qty" placeholder="Qty" value="${esc(i.qty)}">
    <input name="note" placeholder="Note (optional)" value="${esc(i.note)}">
    <label class="row">Shop at <select name="listId">${lists().map(l => `<option value="${l.id}" ${l.id === i.listId ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>
    <label class="row">Aisle <select name="cat">${CATS.map(c => `<option ${c === i.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <h3>Assigned to</h3>${ownerRadios('who', i.who ?? '')}
  </div>
  <button class="save">Save</button><div class="toggles"><button type="button" class="tog" data-cancel>Cancel</button><button type="button" class="tog danger" data-sdel="${i.id}">Delete</button></div></form>`;
}

async function swapOrder(id: string, dir: number) {
  const list = allCats(); const i = list.findIndex(c => c.id === id); const j = i + dir; if (j < 0 || j >= list.length) return;
  const a = list[i], b = list[j]; const ao = a.order, bo = b.order;
  await S.save('shopCats', { ...a, order: bo }); await S.save('shopCats', { ...b, order: ao });
}

export const shopping: Module = {
  nav: () => managing ? { view: 'manage' } : editing ? { view: 'edit', id: editing.id } : {},
  applyNav: n => {
    if (n.view === 'manage') { managing = true; editing = null; }
    else if ((n.view === 'edit' || n.id) && n.id) { const x = S.get<ShopItem>('shopItems', n.id); editing = x ? { ...x } : null; managing = false; }
    else { editing = null; managing = false; }
  },
  tabs: () => [], tab: () => 'list', setTab: () => { editing = null; managing = false; },
  render: () => managing ? manageView() : editing ? editForm() : view(),
  click: async b => {
    const d = b.dataset;
    if (d.sfilter) { filter = d.sfilter; localStorage.setItem(LS_FILTER, filter); if (filter !== 'all') lastGroup = filter, localStorage.setItem(LS_LAST, lastGroup); r(); return true; }
    if (d.stog) { setFlag(LS_COLLAPSE, d.stog, !isCollapsed(d.stog)); r(); return true; }
    if ('trolley' in d) { trolleyOpen = !trolleyOpen; r(); return true; }
    if ('togglepick' in d) { pickingCat = !pickingCat; r(); return true; }
    if (d.setlast) { lastGroup = d.setlast; localStorage.setItem(LS_LAST, lastGroup); pickingCat = false; r(); return true; }
    if (d.ssort) { sortBy = d.ssort as typeof sortBy; localStorage.setItem('shopSort', sortBy); r(); return true; }
    if (d.upitem || d.dnitem) {
      const id = d.upitem || d.dnitem!, gid = d.gid || '';
      const list = sortItems(openIn(gid));
      const i = list.findIndex(x => x.id === id); const j = i + (d.upitem ? -1 : 1); if (j < 0 || j >= list.length) return true;
      const a = list[i], b = list[j];
      const ao = a.order ?? i, bo = b.order ?? j;
      await S.save('shopItems', { ...a, order: bo }); await S.save('shopItems', { ...b, order: ao });
      sortBy = 'manual'; localStorage.setItem('shopSort', 'manual'); r(); return true;
    }
    if ('qmore' in d) { quickMore = !quickMore; r(); return true; }
    if ('emore' in d) { showMoreEdit = !showMoreEdit; r(); return true; }
    if ('manage' in d) { managing = true; r(); return true; }
    if (d.hide) { setFlag(LS_HIDDEN, d.hide, !isHidden(d.hide)); r(); return true; }
    if (d.rencat) { const c = catById(d.rencat)!; const n = prompt('Category name', c.name)?.trim(); if (n) await S.save('shopCats', { ...c, name: n }); r(); return true; }
    if (d.arch) { const c = catById(d.arch)!; if (cats().length <= 1) { S.bus.toast('Keep at least one category'); return true; } if (confirm(`Archive “${c.name}”? Items stay, and can be moved later.`)) await S.save('shopCats', { ...c, archived: true }); r(); return true; }
    if (d.unarch) { const c = catById(d.unarch)!; await S.save('shopCats', { ...c, archived: false }); r(); return true; }
    if (d.upcat) { await swapOrder(d.upcat, -1); r(); return true; }
    if (d.dncat) { await swapOrder(d.dncat, 1); r(); return true; }
    if ('addcat' in d) {
      const n = prompt('New category name')?.trim(); if (n) {
        const order = allCats().reduce((m, c) => Math.max(m, c.order + 1), 0);
        const c = await S.save<ShopCat>('shopCats', { name: n, icon: '📌', color: '#8a8078', order } as ShopCat);
        lastGroup = c.id; localStorage.setItem(LS_LAST, lastGroup); pickingCat = false;
      } r(); return true;
    }
    if (d.si) { const i = S.get<ShopItem>('shopItems', d.si)!; await S.save('shopItems', { ...i, done: !i.done, doneAt: Date.now() }); r(); return true; }
    if (d.sedit) { editing = { ...S.get<ShopItem>('shopItems', d.sedit)! }; showMoreEdit = !!(editing.qty || editing.note || (editing.who && asOwner(editing.who) !== 'Unassigned')); r(); return true; }
    if (d.sdel) { await S.remove('shopItems', d.sdel); editing = null; r(); return true; }
    if ('cancel' in d) { editing = null; managing = false; r(); return true; }
    if ('clear' in d) {
      const filt = filter; const vis = new Set(visibleCats().map(c => c.id));
      for (const i of itemsAll().filter(i => i.done && (filt === 'all' ? vis.has(groupOf(i)) : groupOf(i) === filt))) await S.remove('shopItems', i.id);
      r(); return true;
    }
    return false;
  },
  submit: async f => {
    if (f.dataset.form === 'shopadd') {
      const name = val(f, 'name'); if (!name) { S.bus.toast('Please enter a name', 'err'); return; }
      const qty = (document.getElementById('q-qty') as HTMLInputElement | null)?.value.trim() ?? '';
      const note = (document.getElementById('q-note') as HTMLInputElement | null)?.value.trim() ?? '';
      const lid = cur()?.id; if (!lid) return;
      const gid = lastGroup || 'sc-food';
      const ex = itemsAll().find(i => i.listId === lid && !i.done && i.name.toLowerCase() === name.toLowerCase() && groupOf(i) === gid);
      if (ex) await S.save('shopItems', { ...ex, qty: [ex.qty, qty].filter(Boolean).join(' + '), note: note || ex.note, groupId: gid });
      else { const order = openIn(gid).reduce((m, x) => Math.max(m, (x.order ?? 0) + 1), 0); await S.save<ShopItem>('shopItems', { listId: lid, name, qty, cat: guessCat(name), done: false, groupId: gid, note, createdAt: Date.now(), order } as ShopItem); }
      r(); (document.querySelector('.shopq input[name="name"]') as HTMLInputElement)?.focus(); return;
    }
    await S.save('shopItems', { ...editing!, name: val(f, 'name'), qty: val(f, 'qty'), note: val(f, 'note'), cat: val(f, 'cat') || editing!.cat, listId: val(f, 'listId') || editing!.listId, who: val(f, 'who') || 'Unassigned', groupId: val(f, 'groupId') || groupOf(editing!) });
    editing = null; r();
  },
};
