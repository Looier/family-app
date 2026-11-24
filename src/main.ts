import './style.css';
import { BODY_LOCS, SLEEP_OPTS, APPETITE_OPTS, type Sleep, type HealthEntry, type MedList, type Appetite } from './types';
import * as db from './db';
import { loadAdapter, type SyncAdapter } from './sync';
import { renderWeek, renderDay, renderMonth } from './views';
import * as S from './store';
import { icon, avatar, MOOD_FACE } from './icons';
import type { Module } from './mods/types';
import { calendar } from './mods/calendar';
import { meals } from './mods/meals';
import { todos } from './mods/todos';
import { shopping, ensureLists, ensureShopCats } from './mods/shopping';
import { ensureRecipeCats } from './mods/recipecats';
import { notes } from './mods/notes';
import { wishes } from './mods/wishes';
import { qaSheet, qaOpen, qaClick, qaSubmit, openQA, closeQA } from './mods/quickadd';
import { parse, boot, initRouter, syncFromUi, dismiss, isApplying, toHash, formSnap, emptyRoute, normalize, type Route } from './route';
import { ensureTodoLists } from './mods/todos';
import { homeView } from './mods/home';
import { weekly, setPlanDate, onBlurField } from './mods/weekly';
import { ensureMembers, memberChips, memberByName, members, kids, settingsView, settingsClick } from './mods/members';
import { ensureStarterRecipes } from './mods/seeds';
import { shortErr, stripUndefined } from './util';
type Mod = 'home' | 'health' | 'calendar' | 'meals' | 'todos' | 'shopping' | 'plan' | 'settings' | 'notes' | 'wishes';
const MODS: Record<string, Module> = { calendar, meals, todos, shopping, plan: weekly, notes, wishes };
let mod: Mod = 'home';
let moreOpen = false, healthMore = false;
const MORE_MODS: Mod[] = ['health', 'meals', 'todos', 'notes', 'wishes', 'settings'];

const $app = document.getElementById('app')!;
const todayStr = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const nowTime = () => new Date().toTimeString().slice(0, 5);

type Tab = 'entry' | 'day' | 'week' | 'month' | 'sync';
const st = {
  tab: 'entry' as Tab, child: 'Phoebe', weekOffset: 0, monthOffset: 0, dayDate: todayStr(),
  meds: { meds: [], updatedAt: 0 } as MedList, entries: [] as HealthEntry[],
  adapter: null as SyncAdapter | null, user: null as string | null, syncErr: '',
  form: null as unknown as HealthEntry,
};
const blank = (): HealthEntry => ({
  id: uid(), child: st.child, memberId: memberByName(st.child)?.id, date: todayStr(), ts: Date.now(),
  mood: null, pain: 0, painLocs: [], sleep: null, tired: false, emotional: false, nauseous: false,
  rash: false, rashWhere: '', rashLocs: [], constipated: false, meds: [], notes: '', updatedAt: 0,
  fever: false, temp: null, tummy: false, cough: false, runnyNose: false, appetite: null, medDoses: [],
});

async function refresh() { st.entries = await db.allEntries(); st.meds = await db.getMeds(); }

async function pending(): Promise<string[]> { return (await db.getKV<string[]>('pending')) ?? []; }
async function flush() {
  const a = st.adapter; if (!a || !st.user) return;
  const ids = await pending(); const left: string[] = [];
  for (const id of ids) {
    const e = await db.getEntry(id); if (!e) continue;
    try { await a.pushEntry(e); } catch (err) { left.push(id); st.syncErr = String(err); toast('Couldn’t sync: ' + shortErr(err), 'err'); }
  }
  if (await db.getKV('medsPending')) { try { await a.pushMeds(st.meds); await db.setKV('medsPending', false); } catch (err) { st.syncErr = String(err); toast('Couldn’t sync: ' + shortErr(err), 'err'); } }
  await db.setKV('pending', left);
}
async function saveEntry(e: HealthEntry) {
  try {
    e.updatedAt = Date.now(); e.author = st.user || undefined;
    const clean = stripUndefined({ ...e });
    Object.assign(e, clean);
    await db.putEntry(clean);
    const p = await pending(); if (!p.includes(e.id)) p.push(e.id); await db.setKV('pending', p);
    flush();
  } catch (err) {
    toast('Couldn’t save: ' + shortErr(err), 'err');
    throw err;
  }
}
async function saveMeds(list: string[]) {
  st.meds = { meds: list, updatedAt: Date.now() }; await db.setMeds(st.meds); await db.setKV('medsPending', true); flush();
}
let unsub: (() => void) | null = null, unsubDocs: (() => void) | null = null;
async function initSync() {
  st.adapter = await loadAdapter(); const a = st.adapter;
  if (!a) { await ensureStarterRecipes(); render(); return; }
  a.onAuth(async email => {
    st.user = email; unsub?.(); unsub = null; unsubDocs?.(); unsubDocs = null;
    if (email) {
      unsub = a.subscribe(async rows => { await db.mergeEntries(rows); await refresh(); if (mod !== 'health' || st.tab !== 'entry') S.softRender(); },
        async m => { if (m.updatedAt > st.meds.updatedAt) { await db.setMeds(m); await refresh(); render(); } },
        e => { st.syncErr = String((e as Error).message ?? e); toast('Couldn’t sync: ' + shortErr(e), 'err'); render(); });
      unsubDocs = S.attach(a, e => { st.syncErr = String((e as Error).message ?? e); toast('Couldn’t sync: ' + shortErr(e), 'err'); render(); }, ensureStarterRecipes);
      await flush();
    } else {
      await ensureStarterRecipes();
    }
    render();
  });
}

function banner() {
  if (!st.adapter) return `<div class="banner">Not syncing yet – data is only on this phone. See SETUP-SYNC.md</div>`;
  if (!st.user) return `<div class="banner" data-go2="settings|">Not signed in – tap to sign in and sync</div>`;
  if (st.syncErr) return `<div class="banner err" data-go2="settings|">Sync problem – tap for details</div>`;
  return '';
}
function nav() { return ''; }
function subtabs() {
  if (mod === 'settings' || mod === 'home' || moreOpen) return '';
  if (mod !== 'health') { const M = MODS[mod]; const t = M?.tabs() ?? []; return t.length ? `<div class="subtabs">${t.map(([k, l]) => `<button data-mtab="${k}" class="${M.tab() === k ? 'sel' : ''}">${l}</button>`).join('')}</div>` : ''; }
  const t: [Tab, string][] = [['entry', 'Log'], ['day', 'Day'], ['week', 'Week'], ['month', 'Month']];
  return `<div class="subtabs">${t.map(([k, l]) => `<button data-tab="${k}" class="${st.tab === k ? 'sel' : ''}">${l}</button>`).join('')}</div>`;
}
function bnav() {
  const items: [string, string][] = [['home', 'Home'], ['plan', 'Plan'], ['calendar', 'Calendar'], ['shopping', 'Shop'], ['more', 'More']];
  const on = (m: string) => m === 'more' ? (moreOpen || MORE_MODS.includes(mod)) : (!moreOpen && m === mod);
  return `<nav class="bnav">${items.map(([m, l]) => `<button class="bnav-i ${on(m) ? 'on' : ''}" data-mod="${m}" aria-label="${l}">${icon(m)}<span>${l}</span></button>`).join('')}</nav>`;
}
function moreSheet() {
  if (!moreOpen) return '';
  const items: [Mod, string, string][] = [
    ['health', 'Health', 'How everyone is feeling'],
    ['meals', 'Meals & recipes', 'The week’s menu and recipe book'],
    ['todos', 'To-dos', 'Who is doing what'],
    ['notes', 'Notes', 'Shared notes for the family'],
    ['wishes', 'Wishlists', 'Gift ideas, kept as a surprise'],
    ['settings', 'Settings', 'This phone, family members, sync'],
  ];
  return `<div class="moreback" data-closemore></div>
  <div class="moresheet" role="dialog" aria-label="More">
    <header><h2>More</h2><button class="gear" data-closemore aria-label="Close">✕</button></header>
    <div class="moregrid">${items.map(([m, l, s]) => `<button class="morecell ${mod === m ? 'on' : ''}" data-mod="${m}"><span class="tic tile-${m}">${icon(m)}</span><b>${l}</b><small>${s}</small></button>`).join('')}</div>
  </div>`;
}
function fab(body: string) {
  if (moreOpen || qaOpen() || /class="sheet"/.test(body) || (mod === 'health' && st.tab === 'entry')) return '';
  return `<button class="fab" data-qaopen aria-label="Quick add">${icon('plus')}</button>`;
}
function childPick() { return memberChips(st.child); }
function scale(name: string, from: number, to: number, val: number | null) {
  let h = `<div class="scale ${name}">`; for (let i = from; i <= to; i++) h += `<button data-${name}="${i}" class="${val === i ? 'sel' : ''}" style="--i:${(i - from) / (to - from)}">${name === 'mood' ? `<span class="face">${MOOD_FACE[i - 1]}</span>` : ''}${i}</button>`; return h + '</div>';
}
const chips = (attr: string, list: string[], sel: string[]) => `<div class="chips">${list.map(x => `<button data-${attr}="${esc(x)}" class="chip ${sel.includes(x) ? 'sel' : ''}">${esc(x)}</button>`).join('')}</div>`;

function entryView() {
  const f = st.form;
  if (!f.medDoses) f.medDoses = (f.meds ?? []).map(name => ({ name, dose: '', time: '' }));
  const doses = f.medDoses;
  const on = (k: keyof HealthEntry) => !!(f as unknown as Record<string, unknown>)[k as string];
  const tog = (id: string, k: keyof HealthEntry, l: string) => `<button id="${id}" class="tog ${on(k) ? 'sel' : ''}">${on(k) ? '☑' : '☐'} ${l}</button>`;
  return `${childPick()}
  <label class="row">Date <input type="date" id="date" value="${f.date}" max="${todayStr()}"></label>
  <h3>Mood <small>1 = awful · 10 = great</small></h3>${scale('mood', 1, 10, f.mood)}
  <h3>Pain <small>0 = none</small></h3>${scale('pain', 0, 10, f.pain)}<button data-pain="na" class="chip na ${f.pain === null ? 'sel' : ''}">Nothing reported</button>
  ${(f.pain ?? 0) > 0 ? `<h3>Where does it hurt?</h3>${chips('ploc', BODY_LOCS, f.painLocs)}` : ''}
  <div class="toggles grid tight">${tog('fever', 'fever', 'Fever')}${tog('tummy', 'tummy', 'Tummy ache')}${tog('cough', 'cough', 'Cough')}</div>
  ${doses.length ? `<h3>Medicine</h3>${doses.map((x, i) => `<div class="medrow"><b>${esc(x.name)}</b><input data-mdose="${i}" placeholder="Dose (e.g. 5 ml)" value="${esc(x.dose)}"><input type="time" data-mtime="${i}" value="${esc(x.time)}"><button type="button" class="del" data-mdel="${i}" aria-label="Remove">✕</button></div>`).join('')}` : ''}
  <h3>Notes</h3><textarea id="notes" rows="2" placeholder="Anything else…">${esc(f.notes)}</textarea>
  <button type="button" class="link morebtn" data-hmore>${healthMore ? 'Less' : 'More details'}</button>
  <div class="${healthMore ? '' : 'hidden'}">
    <h3>Sleep <small>optional</small></h3><div class="chips">${SLEEP_OPTS.map(o => `<button data-sleep="${o}" class="chip ${f.sleep === o ? 'sel' : ''}">${f.sleep === o ? '◉' : '○'} ${o}</button>`).join('')}</div>
    <h3>Temperature</h3>
    <div class="row temp"><input id="temp" type="number" inputmode="decimal" step="0.1" min="34" max="42" placeholder="e.g. 38.2" value="${f.temp ?? ''}"><span>°C</span></div>
    <div class="toggles grid">${tog('naus', 'nauseous', 'Nausea')}${tog('rash', 'rash', 'Rash')}${tog('nose', 'runnyNose', 'Runny nose')}${tog('tired', 'tired', 'Tired')}${tog('emo', 'emotional', 'Emotional')}${tog('const', 'constipated', 'Constipated')}</div>
    <h3>Appetite</h3><div class="chips">${APPETITE_OPTS.map(o => `<button data-appetite="${o.id}" class="chip ${f.appetite === o.id ? 'sel' : ''}">${o.label}</button>`).join('')}</div>
    <h3>Medicine given</h3>
    ${doses.length ? '' : doses.map((x, i) => `<div class="medrow"><b>${esc(x.name)}</b><input data-mdose="${i}" placeholder="Dose (e.g. 5 ml)" value="${esc(x.dose)}"><input type="time" data-mtime="${i}" value="${esc(x.time)}"><button type="button" class="del" data-mdel="${i}" aria-label="Remove">✕</button></div>`).join('')}
    ${chips('med', st.meds.meds, doses.map(x => x.name))}
    <button id="addMed" class="chip add">＋ Add med</button>
  </div>
  <button id="save" class="save sticky-save">Save entry for ${esc(st.child)}</button>`;
}
function syncView() {
  const a = st.adapter;
  if (!a) return `<div class="card"><h3>Sync is not set up</h3><p>Everything is saved on this phone only. To share between both phones, follow <b>SETUP-SYNC.md</b> (Firebase, free) and rebuild.</p></div>`;
  if (st.user) return `<div class="card"><h3>Syncing ✓</h3><p>Signed in as <b>${esc(st.user)}</b></p>${st.syncErr ? `<p class="err">${esc(st.syncErr)}</p>` : ''}<button id="signout" class="tog">Sign out</button></div>`;
  return `<div class="card"><h3>Sign in to sync</h3>
  <button id="google" class="save">Sign in with Google</button><p class="or">or email</p>
  <input id="em" type="email" placeholder="Email" autocomplete="email"><input id="pw" type="password" placeholder="Password" autocomplete="current-password">
  <div class="toggles"><button id="login" class="tog">Sign in</button><button id="create" class="tog">Create account</button></div>
  ${st.syncErr ? `<p class="err">${esc(st.syncErr)}</p>` : ''}</div>`;
}
function mePick() {
  return `<div class="mephone"><small>This phone is</small>${members().map(p => `<button class="chip mechip ${S.bus.me === p.name ? 'sel' : ''}" data-me="${esc(p.name)}">${avatar(p.name)}${esc(p.name)}</button>`).join('')}</div>`;
}
const VALID_MODS: Mod[] = ['home', 'health', 'calendar', 'meals', 'todos', 'shopping', 'plan', 'settings', 'notes', 'wishes'];
function snapshot(): Route {
  const M = MODS[mod];
  const n = M?.nav?.() ?? {};
  const tab = mod === 'health' ? st.tab : (n.tab || '');
  return normalize({ mod, tab, view: n.view || '', id: n.id || '', more: moreOpen, qa: qaOpen() });
}
async function applyRoute(r: Route) {
  r = normalize(r);
  moreOpen = r.more;
  if (r.qa) openQA(); else closeQA();
  mod = (VALID_MODS as string[]).includes(r.mod) ? r.mod as Mod : 'home';
  localStorage.setItem('lastMod', mod);
  if (mod === 'health' && ['entry', 'day', 'week', 'month'].includes(r.tab)) st.tab = r.tab as Tab;
  if (mod === 'health') await refresh();
  const M = MODS[mod];
  M?.applyNav?.({ tab: r.tab, view: r.view, id: r.id });
  if (mod === 'calendar' && r.view === 'edit' && !r.id) {
    const ev = S.list('events')[0] as { id: string } | undefined;
    if (ev) M?.applyNav?.({ tab: r.tab || 'month', view: 'edit', id: ev.id });
  }
}
let pristineKey = '', pristineData = '';
function capturePristine() {
  const f = document.querySelector('form.sheet, form[data-form="qa"]') as HTMLFormElement | null;
  const key = toHash(snapshot());
  if (!f) { pristineKey = ''; pristineData = ''; return; }
  if (pristineKey !== key) { pristineKey = key; pristineData = formSnap(f); }
}
function isDirty() {
  const f = document.querySelector('form.sheet, form[data-form="qa"]') as HTMLFormElement | null;
  if (!f) return false;
  return formSnap(f) !== pristineData;
}

function render() {
  let body = '';
  if (mod === 'home') body = homeView(st.entries) + (S.bus.me ? '' : mePick());
  else if (mod === 'settings' || (mod === 'health' && st.tab === 'sync')) body = settingsView(syncView(), S.bus.me);
  else if (mod !== 'health') body = MODS[mod].render();
  else if (st.tab === 'entry') body = entryView();
  else if (st.tab === 'day') body = childPick() + renderDay(st.entries.filter(e => e.child === st.child && e.date === st.dayDate), st.dayDate, todayStr());
  else if (st.tab === 'week') body = childPick() + renderWeek(st.entries.filter(e => e.child === st.child), st.weekOffset, todayStr());
  else if (st.tab === 'month') body = childPick() + renderMonth(st.entries.filter(e => e.child === st.child), st.monthOffset, todayStr());
  $app.innerHTML = `${banner()}${subtabs()}<main class="m-${mod}">${body}</main>${fab(body)}${bnav()}${moreSheet()}${qaSheet()}<div id="toast"></div>`;
  capturePristine();
  if (pendingToast) queueMicrotask(paintToast);
  if (!isApplying()) queueMicrotask(syncFromUi);
}
type ToastKind = 'ok' | 'err';
let pendingToast: { msg: string; kind: ToastKind } | null = null;
function paintToast() {
  const el = document.getElementById('toast'); if (!el || !pendingToast) return;
  const { msg, kind } = pendingToast;
  el.textContent = msg; el.className = 'show' + (kind === 'err' ? ' err' : '');
  const hold = kind === 'err' ? 4200 : 2600;
  setTimeout(() => { if (el.textContent === msg) { el.className = ''; if (pendingToast?.msg === msg) pendingToast = null; } }, hold);
}
function toast(msg: string, kind: ToastKind = 'ok') { pendingToast = { msg, kind }; paintToast(); }
const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
function setChild(name: string) {
  st.child = name || st.child;
  st.form.child = st.child;
  st.form.memberId = memberByName(st.child)?.id;
  db.setKV('lastChild', st.child);
}

// swipe right on a list item to tick it; swipe plan-mode days
let sx = 0, sy = 0, sEl: HTMLElement | null = null, planSwipe = false;
$app.addEventListener('touchstart', e => {
  const it = (e.target as HTMLElement).closest('.item') as HTMLElement | null;
  const pm = (e.target as HTMLElement).closest('.planmode');
  sEl = it; planSwipe = !it && !!pm && !(e.target as HTMLElement).closest('input,textarea,select,form.sheet');
  sx = e.touches[0].clientX; sy = e.touches[0].clientY;
}, { passive: true });
$app.addEventListener('touchmove', e => {
  if (sEl) {
    const dx = e.touches[0].clientX - sx; if (Math.abs(e.touches[0].clientY - sy) > 30) { sEl.style.transform = ''; sEl = null; return; }
    if (dx > 0) sEl.style.transform = `translateX(${Math.min(dx, 90)}px)`;
  }
}, { passive: true });
$app.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  if (sEl) { const el = sEl; sEl = null; el.style.transform = ''; if (dx > 70) (el.querySelector('.tick') as HTMLElement)?.click(); }
  else if (planSwipe && Math.abs(dy) < 60 && Math.abs(dx) > 50) { weekly.click(Object.assign(document.createElement('button'), { dataset: { pday: dx < 0 ? '1' : '-1' } })); }
  planSwipe = false;
});
$app.addEventListener('submit', async ev => {
  const f = ev.target as HTMLFormElement; ev.preventDefault();
  try {
    if (f.dataset.form === 'qa') { await qaSubmit(f); return; }
    const M = mod === 'home' || mod === 'settings' ? null : MODS[mod]; if (M?.submit) await M.submit(f);
  } catch (e) {
    toast('Couldn’t save: ' + shortErr(e), 'err');
  }
});
$app.addEventListener('change', async ev => {
  const t = ev.target as HTMLInputElement; const M = MODS[mod]; if (M?.change) await M.change(t);
});
$app.addEventListener('focusout', async ev => {
  const t = ev.target as HTMLTextAreaElement;
  if (t?.dataset?.wfield || t?.dataset?.dnotes) await onBlurField(t);
});
$app.addEventListener('input', e => {
  const t = e.target as HTMLInputElement; const f = st.form;
  if (t.id === 'notes') f.notes = t.value;
  if (t.id === 'date') f.date = t.value || todayStr();
  if (t.id === 'dayDate') { st.dayDate = t.value || todayStr(); render(); }
  if (t.id === 'temp') { const n = t.value === '' ? null : parseFloat(t.value); f.temp = n; if (n != null && n >= 38) f.fever = true; }
  if (t.dataset.mdose) { const i = +t.dataset.mdose; if (f.medDoses?.[i]) f.medDoses[i].dose = t.value; }
  if (t.dataset.mtime) { const i = +t.dataset.mtime; if (f.medDoses?.[i]) f.medDoses[i].time = t.value; }
});
$app.addEventListener('click', async ev => {
  const b = (ev.target as HTMLElement).closest('button,[data-go],[data-go2],[data-closemore],[data-qaclose],[data-qaopen]') as HTMLElement | null; if (!b) return;
  if (b.classList.contains('tick') && !matchMedia('(prefers-reduced-motion: reduce)').matches) { b.closest('.item')?.classList.add('ticking'); navigator.vibrate?.(12); await new Promise(r => setTimeout(r, 260)); }
  const d = b.dataset; const f = st.form;
  if (d.healthwho) setChild(d.healthwho);
  if ('closemore' in d || 'qaclose' in d || 'cancel' in d || 'rback' in d) { dismiss(); return; }
  if (d.mod === 'more') { if (moreOpen) { dismiss(); return; } moreOpen = true; return render(); }
  if (d.mod) { moreOpen = false; mod = d.mod as Mod; localStorage.setItem('lastMod', mod); if (mod === 'health') await refresh(); window.scrollTo(0, 0); return render(); }
  if (await qaClick(b)) return;
  if ('hmore' in d) { healthMore = !healthMore; return render(); }
  if (d.mtab) { MODS[mod].setTab(d.mtab); window.scrollTo(0, 0); return render(); }
  if (d.go2) {
    const [m, t] = d.go2.split('|'); mod = m as Mod;
    if (m === 'health') { if (t) st.tab = t as Tab; }
    else if (m === 'plan') { if (t) weekly.setTab(t); }
    else if (t) MODS[m]?.setTab(t);
    window.scrollTo(0, 0); return render();
  }
  if (d.plan) { setPlanDate(d.plan); mod = 'plan'; weekly.setTab('plan'); window.scrollTo(0, 0); return render(); }
  if (d.me) { S.bus.me = d.me; localStorage.setItem('me', d.me); return render(); }
  if (await settingsClick(b)) return render();
  if (mod === 'home') { if (d.ev) { mod = 'calendar'; await calendar.click(b); return; } if (d.tt) { await todos.click(b); return; } if (d.tedit) { mod = 'todos'; await todos.click(b); return; } }
  else if (mod !== 'health' && mod !== 'settings') { try { await MODS[mod].click(b); } catch (e) { toast('Couldn’t save: ' + shortErr(e), 'err'); } return; }
  if (d.go) { st.tab = d.go as Tab; return render(); }
  if (d.tab) { st.tab = d.tab as Tab; if (st.tab === 'sync') { /* settings */ } else if (st.tab !== 'entry') await refresh(); return render(); }
  if (d.child) { setChild(d.child); return render(); }
  if (d.mood) { f.mood = +d.mood; return render(); }
  if (d.pain) { f.pain = d.pain === 'na' ? null : +d.pain; if (!f.pain) f.painLocs = []; return render(); }
  if (d.sleep) { f.sleep = f.sleep === d.sleep ? null : d.sleep as Sleep; return render(); }
  if (d.appetite) { f.appetite = f.appetite === d.appetite ? null : d.appetite as Appetite; return render(); }
  if (d.ploc) { f.painLocs = toggle(f.painLocs, d.ploc); return render(); }
  if (d.med) {
    f.medDoses = f.medDoses ?? [];
    const i = f.medDoses.findIndex(x => x.name === d.med);
    if (i >= 0) { f.medDoses.splice(i, 1); f.meds = f.meds.filter(x => x !== d.med); }
    else { f.medDoses.push({ name: d.med, dose: '', time: nowTime() }); if (!f.meds.includes(d.med)) f.meds = [...f.meds, d.med]; }
    return render();
  }
  if (d.mdel) { const i = +d.mdel; const name = f.medDoses?.[i]?.name; if (f.medDoses) f.medDoses.splice(i, 1); if (name) f.meds = f.meds.filter(x => x !== name); return render(); }
  if (d.mo) { st.monthOffset = Math.min(0, st.monthOffset + +d.mo); return render(); }
  if (d.mday) { st.dayDate = d.mday; st.tab = 'day'; window.scrollTo(0, 0); return render(); }
  if (d.wk) { st.weekOffset += +d.wk; if (st.weekOffset > 0) st.weekOffset = 0; return render(); }
  if (d.dd) { const x = new Date(st.dayDate + 'T12:00'); x.setDate(x.getDate() + +d.dd); const s = x.toISOString().slice(0, 10); if (s <= todayStr()) st.dayDate = s; return render(); }
  if (d.del) { if (!confirm('Delete this entry?')) return; const e = await db.getEntry(d.del); if (e) { e.deleted = true; await saveEntry(e); await refresh(); render(); } return; }
  switch (b.id) {
    case 'rash': f.rash = !f.rash; return render();
    case 'naus': f.nauseous = !f.nauseous; return render();
    case 'const': f.constipated = !f.constipated; return render();
    case 'tired': f.tired = !f.tired; return render();
    case 'emo': f.emotional = !f.emotional; return render();
    case 'tummy': f.tummy = !f.tummy; return render();
    case 'cough': f.cough = !f.cough; return render();
    case 'nose': f.runnyNose = !f.runnyNose; return render();
    case 'fever': f.fever = !f.fever; return render();
    case 'addMed': { const n = prompt('New medicine name')?.trim(); if (n && !st.meds.meds.some(m => m.toLowerCase() === n.toLowerCase())) { await saveMeds([...st.meds.meds, n]); f.medDoses = f.medDoses ?? []; f.medDoses.push({ name: n, dose: '', time: nowTime() }); f.meds = [...f.meds, n]; } return render(); }
    case 'save': {
      const empty = f.mood === null && !(f.pain ?? 0) && !f.meds.length && !(f.medDoses?.length) && !f.rash && !f.constipated && !f.sleep && !f.tired && !f.emotional && !f.nauseous && !f.fever && f.temp == null && !f.tummy && !f.cough && !f.runnyNose && !f.appetite && f.pain === 0 && !f.notes.trim();
      if (empty) return toast('Nothing to save yet');
      f.child = st.child; f.memberId = memberByName(st.child)?.id; f.ts = Date.now();
      f.meds = (f.medDoses?.map(x => x.name) ?? f.meds);
      await saveEntry({ ...f, medDoses: [...(f.medDoses ?? [])] }); await refresh(); toast(`Saved for ${st.child} ✓`);
      st.form = blank(); window.scrollTo(0, 0); return render();
    }
    case 'google': case 'login': case 'create': {
      const a = st.adapter!; st.syncErr = '';
      try {
        if (b.id === 'google') await a.signInGoogle();
        else await a.signInEmail((document.getElementById('em') as HTMLInputElement).value.trim(), (document.getElementById('pw') as HTMLInputElement).value, b.id === 'create');
      } catch (e) { st.syncErr = (e as Error).message; render(); }
      return;
    }
    case 'signout': await st.adapter!.signOut(); return;
  }
});

(async () => {
  await S.loadAll(); await ensureMembers(); await ensureLists(); await ensureShopCats(); await ensureRecipeCats(); await ensureTodoLists();
  if (import.meta.env.DEV && location.hash.includes('demo') && !(await db.allEntries()).length) await (await import('./demo')).seed(db.putEntry, todayStr());
  await ensureMembers(); // pick up any people mentioned in just-seeded health entries
  if (import.meta.env.DEV && location.hash.includes('demo') && !S.list('events').length) await (await import('./demo')).seedV2(todayStr());
  S.bus.rerender = render; S.bus.toast = toast; S.bus.dismiss = dismiss; S.bus.me = localStorage.getItem('me') ?? '';
  const valid = members();
  const last = (await db.getKV<string>('lastChild')) ?? '';
  st.child = valid.some(m => m.name === last) ? last : (kids()[0]?.name ?? valid[0]?.name ?? 'Phoebe');
  const lastMod = localStorage.getItem('lastMod') || '';
  mod = (VALID_MODS as string[]).includes(lastMod) ? lastMod as Mod : 'home';
  await refresh(); st.form = blank();
  if (location.hash.includes('pain')) Object.assign(st.form, { mood: 7, pain: 4, painLocs: ['Left knee'], meds: ['Panado'], sleep: 'Woke up once', tired: true, rash: true, tummy: true, cough: true, appetite: 'ok', fever: false, temp: 37.4, medDoses: [{ name: 'Panado', dose: '7.5 ml', time: '07:30' }] });
  const raw = location.hash;
  const blankHash = !raw || raw === '#' || raw === '#demo' || raw === '#/demo';
  const route = blankHash ? emptyRoute(mod) : parse(raw);
  await applyRoute(route);
  boot(snapshot());
  initRouter({ snapshot, apply: applyRoute, render, dirty: isDirty });
  render(); initSync();
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    const base = import.meta.env.BASE_URL || './';
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
  }
})();
