import * as S from '../store';
import { esc, fmt, todayStr, addDays, mondayOf, val } from '../util';
import { ownerMini, asOwner } from './members';
import { avatar } from '../icons';
import { PCOL } from '../util';
import { addItems, lists } from './shopping';
import type { Module } from './types';
import { recipeCats, addRecipeCat, normTag } from './recipecats';
export interface Ing { qty: string; name: string }
export interface Recipe { id: string; title: string; ingredients: Ing[]; steps: string; tags: string[]; servings: number; photo?: string }
export interface Meal { id: string; date: string; slot: 'supper' | 'lunch'; text: string; recipeId?: string; cook?: string }
let tab = 'week', wOff = 0, showLunch = localStorage.getItem('showLunch') === '1', tagF = '';
let pick: { date: string; slot: 'supper' | 'lunch' } | null = null, view: string | null = null, edit: Partial<Recipe> | null = null, photo: string | undefined;
export const mealFor = (date: string, slot = 'supper') => S.get<Meal>('mealPlan', `${date}-${slot}`);
const recipes = () => S.list<Recipe>('recipes').sort((a, b) => a.title.localeCompare(b.title));
export const mealLabel = (m?: Meal) => m ? (m.recipeId ? S.get<Recipe>('recipes', m.recipeId)?.title ?? m.text : m.text) : '';
export function parseIng(line: string): Ing {
  const m = line.trim().match(/^([\d½¼¾⅓.,\/\- ]+\s*(?:g|kg|ml|l|cups?|c|tbsp|tsp|T|t|cans?|tins?|pkts?|packets?|x|pinch|handful|cloves?|slices?)?\.?)\s+(.+)$/i);
  return m ? { qty: m[1].trim(), name: m[2].trim() } : { qty: '', name: line.trim() };
}
async function toShop(items: Ing[]) {
  const ls = lists(); if (!ls.length) return;
  let lid = ls[0].id;
  if (ls.length > 1) { const n = prompt(`Add to which list?\n${ls.map((l, i) => `${i + 1}. ${l.name}`).join('\n')}`, '1'); if (n === null) return; lid = ls[Math.max(0, Math.min(ls.length - 1, (+n || 1) - 1))].id; }
  const c = await addItems(items, lid, 'sc-food'); S.bus.toast(`${c} item${c === 1 ? '' : 's'} added to ${ls.find(l => l.id === lid)!.name} ✓`);
}
function week() {
  const mon = addDays(mondayOf(todayStr()), wOff * 7);
  let h = `<div class="pager"><button data-mw="-1">‹</button><b>Week of ${fmt(mon, { day: 'numeric', month: 'short' })}</b><button data-mw="1">›</button></div>
  <label class="chk"><input type="checkbox" data-lunch ${showLunch ? 'checked' : ''}> Plan lunches too</label>`;
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    const slot = (s: 'supper' | 'lunch') => { const m = mealFor(d, s); const cook = s === 'supper' && m?.cook && m.cook !== 'Unassigned' ? `<span class="cook">${ownerMini(m.cook)} cooking</span>` : ''; return `<button class="mealslot ${m && (m.text || m.recipeId) ? '' : 'empty'}" data-pick="${d}|${s}"><small>${s === 'supper' ? 'Supper' : 'Lunch'}</small>${m && (m.text || m.recipeId) ? esc(mealLabel(m)) + (m.recipeId ? ' 📖' : '') : '＋ add'}${cook}</button>`; };
    h += `<div class="mealday ${d === todayStr() ? 'today' : ''}"><b>${fmt(d, { weekday: 'short' })}<small>${fmt(d, { day: 'numeric' })}</small></b><div>${showLunch ? slot('lunch') : ''}${slot('supper')}</div></div>`;
  }
  return h + `<button class="save" data-weekshop="${mon}">🛒 Add this week's ingredients to shopping</button>`;
}
function pickSheet() {
  const p = pick!, cur = mealFor(p.date, p.slot);
  return `<form class="sheet" data-form="meal"><h2>${p.slot === 'supper' ? 'Supper' : 'Lunch'} · ${fmt(p.date, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
  <input name="text" placeholder="Type a meal (e.g. Braai, Leftovers)…" value="${cur && !cur.recipeId ? esc(cur.text) : ''}"><button class="save">Save typed meal</button>
  <h3>…or pick a recipe</h3><div class="chips">${recipes().map(r => `<button type="button" class="chip ${cur?.recipeId === r.id ? 'sel' : ''}" data-pickr="${r.id}">${esc(r.title)}</button>`).join('') || '<p class="empty">No recipes yet</p>'}</div>
  <h3>Who’s cooking?</h3><div class="radios ochips">${['Thinus','Juazel','Both','Unassigned'].map(o => `<label class="rad"><input type="radio" name="cook" value="${o}" ${asOwner(cur?.cook) === o ? 'checked' : ''}><span class="own">${avatar(o)} ${o === 'Unassigned' ? 'Not set' : o}</span></label>`).join('')}</div>
  <div class="toggles"><button type="button" class="tog" data-cancel>Cancel</button>${cur && (cur.text || cur.recipeId) ? '<button type="button" class="tog danger" data-clearmeal>Clear</button>' : ''}</div></form>`;
}
const rTags = (r: Recipe) => (r.tags || []).map(normTag).filter(Boolean);
const rcard = (r: Recipe) => `<button class="rcard" data-rview="${r.id}">${r.photo ? `<img src="${r.photo}" alt="">` : `<div class="noimg" style="--h:${[...r.title].reduce((a, c) => a + c.charCodeAt(0), 0) % 360}">${/braai|wors|meat|beef/i.test(r.title + r.tags) ? '🔥' : /chicken/i.test(r.title) ? '🍗' : /pasta|spaghetti/i.test(r.title) ? '🍝' : /salad|veg/i.test(r.title + r.tags) ? '🥗' : /cake|bake|dessert/i.test(r.title + r.tags) ? '🍰' : '🍲'}</div>`}<b>${esc(r.title)}</b><small>${r.servings ? r.servings + ' servings · ' : ''}${esc(rTags(r).join(', '))}</small></button>`;
function book() {
  const leftover = [...new Set(recipes().flatMap(rTags))].filter(t => !recipeCats().some(c => c.name === t)).sort();
  const names = [...recipeCats().map(c => c.name), ...leftover];
  const chips = `<div class="chips scrollx"><button type="button" class="chip ${!tagF ? 'sel' : ''}" data-tag="">All</button>${names.map(t => `<button type="button" class="chip ${t === tagF ? 'sel' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}<button type="button" class="chip add" data-addrcat>＋ New category</button></div>`;
  if (tagF) {
    const rs = recipes().filter(r => rTags(r).includes(tagF));
    return chips + `<div class="rgrid">${rs.map(rcard).join('')}</div>` + (rs.length ? '' : '<p class="empty">Nothing in this category yet</p>');
  }
  let h = chips; let any = false;
  for (const name of names) {
    const rs = recipes().filter(r => rTags(r).includes(name));
    if (!rs.length) continue; any = true;
    h += `<h3 class="rcat">${esc(name)}</h3><div class="rgrid">${rs.map(rcard).join('')}</div>`;
  }
  const loose = recipes().filter(r => !rTags(r).length);
  if (loose.length) { any = true; h += `<h3 class="rcat">Uncategorised</h3><div class="rgrid">${loose.map(rcard).join('')}</div>`; }
  return h + (any ? '' : '<p class="empty">No recipes yet – tap ＋ to add one</p>');
}
function detail() {
  const r = S.get<Recipe>('recipes', view!); if (!r) { view = null; return book(); }
  return `<button class="link back" data-rback>‹ Recipes</button>${r.photo ? `<img class="hero" src="${r.photo}" alt="">` : ''}<h2>${esc(r.title)}</h2>
  <p class="muted">${r.servings ? r.servings + ' servings' : ''} ${r.tags.map(t => `<span class="pill">${esc(t)}</span>`).join(' ')}</p>
  <div class="card"><h3>Ingredients</h3><ul class="ing">${r.ingredients.map(i => `<li><b>${esc(i.qty)}</b> ${esc(i.name)}</li>`).join('')}</ul></div>
  <button class="save" data-rshop="${r.id}">🛒 Add ingredients to shopping</button>
  <div class="card"><h3>Method</h3><ol class="steps">${r.steps.split('\n').filter(x => x.trim()).map(s => `<li>${esc(s.replace(/^\d+[.)]\s*/, ''))}</li>`).join('')}</ol></div>
  <div class="toggles"><button class="tog" data-redit="${r.id}">Edit</button><button class="tog danger" data-rdel="${r.id}">Delete</button></div>`;
}
function rform() {
  const r = edit!;
  return `<form class="sheet" data-form="recipe"><h2>${r.id ? 'Edit recipe' : 'New recipe'}</h2>
  <input name="title" required placeholder="Recipe name" value="${esc(r.title)}">
  <h3>Ingredients <small>one per line, e.g. "500 g mince"</small></h3><textarea name="ing" rows="6">${esc((r.ingredients ?? []).map(i => (i.qty + ' ' + i.name).trim()).join('\n'))}</textarea>
  <details class="morefold"><summary>More details</summary>
  <label class="row">Servings <input name="servings" type="number" min="1" inputmode="numeric" value="${r.servings ?? 4}"></label>
  <h3>Method <small>one step per line</small></h3><textarea name="steps" rows="6">${esc(r.steps)}</textarea>
  <h3>Category</h3>
  <div class="chips">${recipeCats().map(c => `<button type="button" class="chip ${(r.tags ?? []).map(normTag).includes(c.name) ? 'sel' : ''}" data-rtag="${esc(c.name)}">${esc(c.name)}</button>`).join('')}<button type="button" class="chip add" data-addrcat>＋ New category</button></div>
  <label class="photo"><input type="file" accept="image/*" data-photo hidden><img id="ph" src="${photo ?? ''}" ${photo ? '' : 'hidden'}><span>📷 ${photo ? 'Change' : 'Add'} photo (optional)</span></label>
  </details>
  <button class="save">Save recipe</button><div class="toggles"><button type="button" class="tog" data-cancel>Cancel</button>${photo ? '<button type="button" class="tog" data-nophoto>Remove photo</button>' : ''}</div></form>`;
}
function shrink(file: File): Promise<string> {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => { const k = Math.min(1, 640 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.6)); }; img.onerror = rej; img.src = URL.createObjectURL(file); });
}
const r = () => S.bus.rerender();
export const meals: Module = {
  nav: () => {
    if (edit) return { tab, view: edit.id ? 'edit' : 'new', id: edit.id };
    if (view) return { tab: 'book', view: 'detail', id: view };
    if (pick) return { tab: 'week', view: 'pick', id: pick.date + '_' + pick.slot };
    return { tab };
  },
  applyNav: n => {
    if (n.tab === 'week' || n.tab === 'book') tab = n.tab;
    if (n.view === 'new') { edit = { servings: 4, tags: [] }; photo = undefined; view = null; pick = null; }
    else if (n.view === 'edit' && n.id) { const x = S.get<Recipe>('recipes', n.id); edit = x ? { ...x } : null; photo = edit?.photo; view = n.id; pick = null; }
    else if (n.view === 'detail' && n.id) { view = n.id; edit = null; pick = null; tab = 'book'; }
    else if (n.view === 'pick' && n.id) { const [date, slot] = n.id.split('_'); pick = { date, slot: (slot as 'supper' | 'lunch') || 'supper' }; edit = null; view = null; tab = 'week'; }
    else { edit = null; view = null; pick = null; }
  },
  tabs: () => [['week', 'Week plan'], ['book', 'Recipes']], tab: () => tab,
  setTab: t => { pick = null; if (t === 'new') { edit = { servings: 4 }; photo = undefined; } else { tab = t; edit = null; view = null; } },
  render: () => edit ? rform() : pick ? pickSheet() : tab === 'book' ? (view ? detail() : book()) : week(),
  click: async b => {
    const d = b.dataset;
    if (d.mw) { wOff += +d.mw; r(); return true; }
    if (d.pick) { const [date, slot] = d.pick.split('|'); pick = { date, slot: slot as 'supper' }; r(); return true; }
    if (d.pickr) { const p = pick!; await S.save<Meal>('mealPlan', { id: `${p.date}-${p.slot}`, date: p.date, slot: p.slot, text: S.get<Recipe>('recipes', d.pickr)!.title, recipeId: d.pickr, cook: mealFor(p.date, p.slot)?.cook }); pick = null; r(); return true; }
    if ('clearmeal' in d) { await S.remove('mealPlan', `${pick!.date}-${pick!.slot}`); pick = null; r(); return true; }
    if ('cancel' in d) { pick = null; edit = null; r(); return true; }
    if (d.tag !== undefined && b.classList.contains('chip')) { tagF = d.tag; r(); return true; }
    if (d.rtag) {
      const set = new Set((edit?.tags ?? []).map(normTag));
      if (set.has(d.rtag)) set.delete(d.rtag); else set.add(d.rtag);
      if (edit) edit.tags = [...set];
      b.classList.toggle('sel'); return true;
    }
    if ('addrcat' in d) {
      const n = prompt('New recipe category')?.trim();
      if (n) {
        const c = await addRecipeCat(n);
        const name = c?.name || n;
        if (edit) {
          const f = document.querySelector('form[data-form="recipe"]') as HTMLFormElement | null;
          if (f) { edit.title = val(f, 'title'); edit.servings = +val(f, 'servings') || edit.servings; edit.steps = val(f, 'steps'); edit.ingredients = val(f, 'ing').split('\n').filter(x => x.trim()).map(parseIng); }
          edit.tags = [...new Set([...(edit.tags ?? []).map(normTag), name])];
        } else tagF = name;
        r();
      }
      return true;
    }
    if (d.rview) { view = d.rview; window.scrollTo(0, 0); r(); return true; }
    if ('rback' in d) { view = null; r(); return true; }
    if (d.redit) { edit = { ...S.get<Recipe>('recipes', d.redit)! }; photo = edit.photo; r(); return true; }
    if (d.rdel) { if (confirm('Delete this recipe?')) { await S.remove('recipes', d.rdel); view = null; r(); } return true; }
    if ('nophoto' in d) { photo = undefined; const f = b.closest('form')!; const img = f.querySelector('#ph') as HTMLImageElement; img.hidden = true; b.remove(); return true; }
    if (d.rshop) { await toShop(S.get<Recipe>('recipes', d.rshop)!.ingredients); return true; }
    if (d.weekshop) {
      const items: Ing[] = []; for (let i = 0; i < 7; i++) for (const s of ['lunch', 'supper']) { const m = mealFor(addDays(d.weekshop, i), s); const rc = m?.recipeId && S.get<Recipe>('recipes', m.recipeId); if (rc) items.push(...rc.ingredients); }
      if (!items.length) S.bus.toast('No recipes planned this week'); else await toShop(items); return true;
    }
    return false;
  },
  change: async t => {
    if ('lunch' in t.dataset) { showLunch = t.checked; localStorage.setItem('showLunch', showLunch ? '1' : ''); r(); return true; }
    if ('photo' in t.dataset && t.files?.[0]) { photo = await shrink(t.files[0]); const img = document.getElementById('ph') as HTMLImageElement; img.src = photo; img.hidden = false; return true; }
    return false;
  },
  submit: async f => {
    if (f.dataset.form === 'meal') { const p = pick!, text = val(f, 'text'), cook = val(f, 'cook'); if (text || cook) await S.save<Meal>('mealPlan', { id: `${p.date}-${p.slot}`, date: p.date, slot: p.slot, text: text || mealLabel(mealFor(p.date, p.slot)) || '', recipeId: text ? undefined : mealFor(p.date, p.slot)?.recipeId, cook }); pick = null; r(); return; }
    const doc = await S.save<Recipe>('recipes', { ...(edit as Recipe), title: val(f, 'title'), servings: +val(f, 'servings') || 0, ingredients: val(f, 'ing').split('\n').filter(x => x.trim()).map(parseIng), steps: val(f, 'steps'), tags: [...new Set((edit?.tags ?? []).map(normTag).filter(Boolean))], photo });
    edit = null; tab = 'book'; view = doc.id; S.bus.toast('Recipe saved ✓'); r();
  },
};
