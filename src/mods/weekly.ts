import * as S from '../store';
import { esc, fmt, todayStr, addDays, mondayOf, val, uid } from '../util';
import { avatar } from '../icons';
import { mealFor, mealLabel } from './meals';
import type { Meal, Recipe } from './meals';
import { kids, ownerRadios, asOwner, ownerMini, members } from './members';
import type { Module } from './types';
import type { Ev } from './calendar';
import { PCOL } from '../util';

export interface Activity { id: string; who: string; text: string; time: string }
export interface PlayDate { id: string; who: string; withWhom: string; where: string; time: string }
export interface DayPlan { id: string; date: string; activities: Activity[]; playDates: PlayDate[]; dropOff?: string; pickUp?: string; notes: string }
export interface WeekPlan { id: string; notes: string; goals: string }

export const dayId = (d: string) => 'day-' + d;
export const weekId = (mon: string) => 'week-' + mon;
export const getDay = (d: string) => S.get<DayPlan>('dayPlans', dayId(d));
export const getWeek = (mon: string) => S.get<WeekPlan>('weekPlans', weekId(mon));
const blankDay = (d: string): DayPlan => ({ id: dayId(d), date: d, activities: [], playDates: [], dropOff: '', pickUp: '', notes: '' });
const recipes = () => S.list<Recipe>('recipes').sort((a, b) => a.title.localeCompare(b.title));

let tab = 'week', wOff = 0, planDay = todayStr();
let picking: string | null = null; // date for supper picker
let editingAct: { date: string; id?: string } | null = null;
let editingPlay: { date: string; id?: string } | null = null;

export function setPlanDate(d: string) { planDay = d; wOff = Math.round((+new Date(mondayOf(d) + 'T12:00') - +new Date(mondayOf(todayStr()) + 'T12:00')) / 86400000 / 7); }
export function shiftPlanDay(n: number) { planDay = addDays(planDay, n); setPlanDate(planDay); }

/** Virtual calendar events derived from the weekly plan (not stored as events, so they stay in sync). */
export function planEventsOn(d: string): Ev[] {
  const p = getDay(d); const evs: Ev[] = [];
  if (!p) return evs;
  for (const a of p.activities) evs.push({ id: 'plan:act:' + a.id, title: a.text, date: d, allDay: !a.time, time: a.time || '', who: a.who || 'Family', repeat: 'none', notes: 'Kids’ activity' });
  for (const pd of p.playDates) evs.push({ id: 'plan:play:' + pd.id, title: `Play date with ${pd.withWhom}`, date: d, allDay: !pd.time, time: pd.time || '', who: pd.who || 'Family', repeat: 'none', notes: [pd.where, 'Play date'].filter(Boolean).join(' · ') });
  if (p.dropOff && p.dropOff !== 'Unassigned') evs.push({ id: 'plan:drop:' + d, title: 'School drop-off', date: d, allDay: true, time: '', who: p.dropOff === 'Both' ? 'Family' : p.dropOff, repeat: 'none', notes: 'From weekly plan' });
  if (p.pickUp && p.pickUp !== 'Unassigned') evs.push({ id: 'plan:pick:' + d, title: 'School pick-up', date: d, allDay: true, time: '', who: p.pickUp === 'Both' ? 'Family' : p.pickUp, repeat: 'none', notes: 'From weekly plan' });
  return evs;
}

async function saveDay(d: string, patch: Partial<DayPlan>) {
  const cur = getDay(d) ?? blankDay(d);
  await S.save<DayPlan>('dayPlans', { ...cur, ...patch, id: dayId(d), date: d, activities: patch.activities ?? cur.activities ?? [], playDates: patch.playDates ?? cur.playDates ?? [] });
}
async function saveCook(d: string, cook: string) {
  const m = mealFor(d, 'supper');
  await S.save<Meal>('mealPlan', { id: `${d}-supper`, date: d, slot: 'supper', text: m?.text ?? '', recipeId: m?.recipeId, cook } as Meal);
}

const r = () => S.bus.rerender();
const mon = () => addDays(mondayOf(todayStr()), wOff * 7);
const days = () => Array.from({ length: 7 }, (_, i) => addDays(mon(), i));

function supperLine(d: string) {
  const m = mealFor(d, 'supper');
  const label = mealLabel(m) || '';
  const cook = m?.cook && m.cook !== 'Unassigned' ? ownerMini(m.cook) : '';
  return `<button type="button" class="plan-sup" data-picksup="${d}"><small>Supper</small><b>${label ? esc(label) : '<span class="muted">＋ Plan supper</span>'}</b>${cook ? `<span class="cook">${cook} cooking</span>` : '<span class="muted cook">Who’s cooking?</span>'}</button>`;
}
function schoolLine(d: string, p?: DayPlan) {
  return `<div class="school"><div><small>Drop-off</small><b>${p?.dropOff && p.dropOff !== 'Unassigned' ? ownerMini(p.dropOff) : '<span class="muted">Not set</span>'}</b></div>
  <div><small>Pick-up</small><b>${p?.pickUp && p.pickUp !== 'Unassigned' ? ownerMini(p.pickUp) : '<span class="muted">Not set</span>'}</b></div></div>`;
}

function weekView() {
  const w = getWeek(mon());
  let h = `<div class="pager"><button data-pw="-1" aria-label="Previous week">‹</button><b>Week of ${fmt(mon(), { day: 'numeric', month: 'short' })}</b><button data-pw="1" aria-label="Next week">›</button></div>
  <div class="card weekmeta"><h3>This week</h3>
    <label>Notes<textarea data-wfield="notes" rows="2" placeholder="Anything the two of you want to remember…">${esc(w?.notes)}</textarea></label>
    <label>Goals<textarea data-wfield="goals" rows="2" placeholder="e.g. Batch-cook on Sunday">${esc(w?.goals)}</textarea></label>
    <button class="tog" data-copyweek>Copy last week</button>
  </div>`;
  for (const d of days()) {
    const p = getDay(d);
    h += `<article class="card daycard ${d === todayStr() ? 'today' : ''}" data-openday="${d}">
      <h3>${d === todayStr() ? 'Today · ' : ''}${fmt(d, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
      ${supperLine(d)}
      ${p?.activities?.length ? `<ul class="plist">${p.activities.map(a => `<li>${a.time ? `<time>${esc(a.time)}</time>` : ''}${avatar(a.who, 'sm')}<span>${esc(a.text)}</span></li>`).join('')}</ul>` : '<p class="muted">No kids’ activities</p>'}
      ${p?.playDates?.length ? `<ul class="plist play">${p.playDates.map(pd => `<li>${pd.time ? `<time>${esc(pd.time)}</time>` : ''}🧸 ${esc(pd.who)} with ${esc(pd.withWhom)}${pd.where ? ` · ${esc(pd.where)}` : ''}</li>`).join('')}</ul>` : ''}
      ${schoolLine(d, p)}
      ${p?.notes ? `<p class="note">${esc(p.notes)}</p>` : ''}
    </article>`;
  }
  return h;
}

function actRows(p: DayPlan) {
  if (!p.activities.length) return '<p class="muted">No activities yet</p>';
  return `<ul class="editlist">${p.activities.map(a => `<li><button type="button" class="iname" data-editact="${p.date}|${a.id}">${a.time ? `<time>${esc(a.time)}</time>` : ''}${avatar(a.who, 'sm')}<span>${esc(a.text)}</span></button><button type="button" class="del" data-delact="${p.date}|${a.id}" aria-label="Remove">✕</button></li>`).join('')}</ul>`;
}
function playRows(p: DayPlan) {
  if (!p.playDates.length) return '';
  return `<ul class="editlist">${p.playDates.map(pd => `<li><button type="button" class="iname" data-editplay="${p.date}|${pd.id}">${pd.time ? `<time>${esc(pd.time)}</time>` : ''}🧸 ${esc(pd.who)} with ${esc(pd.withWhom)}${pd.where ? `<small>${esc(pd.where)}</small>` : ''}</button><button type="button" class="del" data-delplay="${p.date}|${pd.id}" aria-label="Remove">✕</button></li>`).join('')}</ul>`;
}

function dayEditor(d: string) {
  const p = getDay(d) ?? blankDay(d);
  const m = mealFor(d, 'supper');
  const kidOpts = kids().length ? kids() : members();
  return `<div class="planmode"><div class="plannav"><button data-pday="-1">‹</button><div><b>${fmt(d, { weekday: 'long' })}</b><small>${fmt(d, { day: 'numeric', month: 'long' })}${d === todayStr() ? ' · Today' : ''}</small></div><button data-pday="1">›</button></div>
  <div class="dots-days">${days().map(x => `<button data-openday="${x}" class="${x === d ? 'sel' : ''} ${x === todayStr() ? 'today' : ''}" aria-label="${fmt(x, { weekday: 'short' })}">${fmt(x, { weekday: 'short' }).slice(0, 1)}</button>`).join('')}</div>
  <div class="card tcard t-meals">${supperLine(d)}
    <h3>Who’s cooking?</h3>${cookPicker(d, m?.cook ?? '')}
  </div>
  <div class="card"><h3>Kids’ activities</h3>${actRows(p)}<button class="chip add" data-newact="${d}">＋ Activity</button></div>
  <div class="card"><h3>Play dates</h3>${playRows(p) || '<p class="muted">None yet</p>'}<button class="chip add" data-newplay="${d}">＋ Play date</button></div>
  <div class="card"><h3>School drop-off</h3>${ownerRadios('drop-' + d, p.dropOff ?? '')}
    <h3>School pick-up</h3>${ownerRadios('pick-' + d, p.pickUp ?? '')}</div>
  <div class="card"><h3>Notes for ${fmt(d, { weekday: 'short' })}</h3>
    <textarea data-dnotes="${d}" rows="2" placeholder="Anything else for this day…">${esc(p.notes)}</textarea>
  </div>
  <p class="muted small">Kid names used above: ${kidOpts.map(k => k.name).join(', ') || 'add kids in Settings'}</p></div>`;
}

function cookPicker(d: string, cur: string) {
  const v = asOwner(cur);
  return `<div class="radios ochips">${['Thinus', 'Juazel', 'Both', 'Unassigned'].map(o => `<button type="button" class="chip mechip ${v === o ? 'sel' : ''}" data-setcook="${d}|${o}">${avatar(o)}${o === 'Unassigned' ? 'Not set' : o}</button>`).join('')}</div>`;
}

function actForm() {
  const { date, id } = editingAct!;
  const p = getDay(date) ?? blankDay(date);
  const a = p.activities.find(x => x.id === id) ?? { id: '', who: kids()[0]?.name ?? members()[0]?.name ?? 'Family', text: '', time: '' };
  const people = ['Family', ...members().map(m => m.name)];
  return `<form class="sheet" data-form="activity"><h2>${id ? 'Edit activity' : 'New activity'}</h2>
    <input name="text" required placeholder="e.g. Swimming, Netball, Piano" value="${esc(a.text)}">
    <label class="row">Time <input type="time" name="time" value="${esc(a.time)}"></label>
    <h3>Who</h3><div class="radios">${people.map(o => `<label class="rad"><input type="radio" name="who" value="${esc(o)}" ${o === a.who ? 'checked' : ''}><span style="--c:${PCOL[o] ?? '#888'}">${avatar(o)} ${esc(o)}</span></label>`).join('')}</div>
    <button class="save">Save</button><div class="toggles"><button type="button" class="tog" data-cancel>Cancel</button></div></form>`;
}
function playForm() {
  const { date, id } = editingPlay!;
  const p = getDay(date) ?? blankDay(date);
  const pd = p.playDates.find(x => x.id === id) ?? { id: '', who: kids()[0]?.name ?? 'Phoebe', withWhom: '', where: '', time: '' };
  const kidList = kids().length ? kids().map(k => k.name) : members().map(m => m.name);
  return `<form class="sheet" data-form="play"><h2>${id ? 'Edit play date' : 'New play date'}</h2>
    <h3>Whose play date?</h3><div class="radios">${kidList.map(o => `<label class="rad"><input type="radio" name="who" value="${esc(o)}" ${o === pd.who ? 'checked' : ''}><span>${avatar(o)} ${esc(o)}</span></label>`).join('')}</div>
    <input name="withWhom" required placeholder="With whom?" value="${esc(pd.withWhom)}">
    <input name="where" placeholder="Where?" value="${esc(pd.where)}">
    <label class="row">Time <input type="time" name="time" value="${esc(pd.time)}"></label>
    <button class="save">Save</button><div class="toggles"><button type="button" class="tog" data-cancel>Cancel</button></div></form>`;
}

function supperSheet() {
  const d = picking!, cur = mealFor(d, 'supper');
  return `<form class="sheet" data-form="plansup"><h2>Supper · ${fmt(d, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
    <input name="text" placeholder="Type a meal (e.g. Leftovers, Braai)…" value="${cur && !cur.recipeId ? esc(cur.text) : ''}">
    <button class="save">Save typed meal</button>
    <h3>…or pick a recipe</h3>
    <div class="chips">${recipes().map(x => `<button type="button" class="chip ${cur?.recipeId === x.id ? 'sel' : ''}" data-pickr="${x.id}">${esc(x.title)}</button>`).join('') || '<p class="empty">No recipes yet – add some in Meals</p>'}</div>
    <div class="toggles"><button type="button" class="tog" data-cancel>Cancel</button>${cur && (cur.text || cur.recipeId) ? '<button type="button" class="tog danger" data-clearsup>Clear supper</button>' : ''}</div></form>`;
}

function summaryView() {
  const w = getWeek(mon());
  let h = `<div class="pager no-print"><button data-pw="-1">‹</button><b>Week of ${fmt(mon(), { day: 'numeric', month: 'short' })}</b><button data-pw="1">›</button></div>
  <div class="sum-head"><h2>Weekly plan</h2><p class="muted">${fmt(mon(), { day: 'numeric', month: 'short' })} – ${fmt(addDays(mon(), 6), { day: 'numeric', month: 'short', year: 'numeric' })}</p>
    <button class="save no-print" data-print>🖨 Print / save as PDF</button></div>
  ${w?.goals || w?.notes ? `<div class="card"><h3>This week</h3>${w?.goals ? `<p><b>Goals.</b> ${esc(w.goals)}</p>` : ''}${w?.notes ? `<p>${esc(w.notes)}</p>` : ''}</div>` : ''}`;
  h += `<div class="weeksum">${days().map(d => {
    const p = getDay(d); const m = mealFor(d, 'supper'); const label = mealLabel(m);
    return `<section class="sumday ${d === todayStr() ? 'today' : ''}">
      <h3>${fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}</h3>
      <p><b>Supper</b> ${label ? esc(label) : '—'} ${m?.cook && m.cook !== 'Unassigned' ? `· ${esc(m.cook === 'Both' ? 'both cooking' : m.cook + ' cooking')}` : ''}</p>
      ${p?.activities?.length ? `<p><b>Activities</b> ${p.activities.map(a => `${a.time ? a.time + ' ' : ''}${esc(a.text)} (${esc(a.who)})`).join('; ')}</p>` : ''}
      ${p?.playDates?.length ? `<p><b>Play dates</b> ${p.playDates.map(pd => `${pd.time ? pd.time + ' ' : ''}${esc(pd.who)} with ${esc(pd.withWhom)}${pd.where ? ' at ' + esc(pd.where) : ''}`).join('; ')}</p>` : ''}
      <p><b>Drop-off</b> ${p?.dropOff && p.dropOff !== 'Unassigned' ? esc(p.dropOff) : '—'} · <b>Pick-up</b> ${p?.pickUp && p.pickUp !== 'Unassigned' ? esc(p.pickUp) : '—'}</p>
      ${p?.notes ? `<p class="note">${esc(p.notes)}</p>` : ''}
    </section>`;
  }).join('')}</div>`;
  return h;
}

async function copyLastWeek() {
  const thisMon = mon(), lastMon = addDays(thisMon, -7);
  if (!confirm(`Copy meals, activities, play dates, school runs and week notes from the week of ${fmt(lastMon, { day: 'numeric', month: 'short' })}? This week’s plan will be replaced.`)) return;
  const prevW = getWeek(lastMon);
  if (prevW) await S.save<WeekPlan>('weekPlans', { id: weekId(thisMon), notes: prevW.notes, goals: prevW.goals } as WeekPlan);
  for (let i = 0; i < 7; i++) {
    const from = addDays(lastMon, i), to = addDays(thisMon, i);
    for (const slot of ['supper', 'lunch'] as const) {
      const m = mealFor(from, slot);
      if (m && (m.text || m.recipeId || m.cook)) await S.save<Meal>('mealPlan', { id: `${to}-${slot}`, date: to, slot, text: m.text, recipeId: m.recipeId, cook: m.cook } as Meal);
    }
    const p = getDay(from);
    if (p) await S.save<DayPlan>('dayPlans', {
      id: dayId(to), date: to, dropOff: p.dropOff, pickUp: p.pickUp, notes: p.notes,
      activities: (p.activities ?? []).map(a => ({ ...a, id: uid() })),
      playDates: (p.playDates ?? []).map(a => ({ ...a, id: uid() })),
    } as DayPlan);
  }
  S.bus.toast('Last week copied ✓'); r();
}

async function saveWeekField(field: 'notes' | 'goals', value: string) {
  const w = getWeek(mon()) ?? { id: weekId(mon()), notes: '', goals: '' };
  await S.save<WeekPlan>('weekPlans', { ...w, id: weekId(mon()), [field]: value } as WeekPlan);
}

export const weekly: Module = {
  nav: () => {
    if (editingPlay) return { tab, view: 'play', id: editingPlay.date + (editingPlay.id ? '_' + editingPlay.id : '') };
    if (editingAct) return { tab, view: 'act', id: editingAct.date + (editingAct.id ? '_' + editingAct.id : '') };
    if (picking) return { tab, view: 'supper', id: picking };
    if (tab === 'plan') return { tab: 'plan', id: planDay };
    return { tab };
  },
  applyNav: n => {
    const t = n.tab === 'planmode' ? 'plan' : (n.tab || tab);
    if (t === 'week' || t === 'plan' || t === 'summary') tab = t;
    if (tab === 'plan') {
      const day = (n.id || '').split('_')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) setPlanDate(day);
    }
    if (n.view === 'play') { const [date, id] = (n.id || planDay).split('_'); editingPlay = { date, id }; editingAct = null; picking = null; }
    else if (n.view === 'act') { const [date, id] = (n.id || planDay).split('_'); editingAct = { date, id }; editingPlay = null; picking = null; }
    else if (n.view === 'supper') { picking = n.id || planDay; editingAct = editingPlay = null; }
    else { picking = editingAct = editingPlay = null; }
  },
  tabs: () => [['week', 'Week'], ['plan', 'Plan mode'], ['summary', 'Summary']],
  tab: () => tab,
  setTab: t => { tab = t === 'planmode' ? 'plan' : t; picking = editingAct = editingPlay = null; if (t === 'plan' || t === 'planmode') setPlanDate(planDay || todayStr()); },
  render: () => editingAct ? actForm() : editingPlay ? playForm() : picking ? supperSheet() : tab === 'plan' ? dayEditor(planDay) : tab === 'summary' ? summaryView() : weekView(),
  click: async b => {
    const d = b.dataset;
    if (d.pw) { wOff += +d.pw; planDay = addDays(planDay, +d.pw * 7); r(); return true; }
    if (d.pday) { shiftPlanDay(+d.pday); r(); return true; }
    if (d.openday) { planDay = d.openday; tab = 'plan'; r(); return true; }
    if (d.picksup) { picking = d.picksup; r(); return true; }
    if (d.pickr) {
      const date = picking!; const rec = S.get<Recipe>('recipes', d.pickr)!; const cur = mealFor(date, 'supper');
      await S.save<Meal>('mealPlan', { id: `${date}-supper`, date, slot: 'supper', text: rec.title, recipeId: rec.id, cook: cur?.cook } as Meal);
      picking = null; r(); return true;
    }
    if ('clearsup' in d && picking) { const cur = mealFor(picking, 'supper'); if (cur?.cook) await S.save<Meal>('mealPlan', { id: `${picking}-supper`, date: picking, slot: 'supper', text: '', recipeId: undefined, cook: cur.cook } as Meal); else await S.remove('mealPlan', `${picking}-supper`); picking = null; r(); return true; }
    if (d.setcook) { const [date, cook] = d.setcook.split('|'); await saveCook(date, cook); r(); return true; }
    if (d.newact) { editingAct = { date: d.newact }; r(); return true; }
    if (d.newplay) { editingPlay = { date: d.newplay }; r(); return true; }
    if (d.editact) { const [date, id] = d.editact.split('|'); editingAct = { date, id }; r(); return true; }
    if (d.editplay) { const [date, id] = d.editplay.split('|'); editingPlay = { date, id }; r(); return true; }
    if (d.delact) { const [date, id] = d.delact.split('|'); const p = getDay(date)!; await saveDay(date, { activities: p.activities.filter(a => a.id !== id) }); r(); return true; }
    if (d.delplay) { const [date, id] = d.delplay.split('|'); const p = getDay(date)!; await saveDay(date, { playDates: p.playDates.filter(a => a.id !== id) }); r(); return true; }
    if ('copyweek' in d) { await copyLastWeek(); return true; }
    if ('print' in d) { window.print(); return true; }
    if ('cancel' in d) { picking = editingAct = editingPlay = null; r(); return true; }
    return false;
  },
  change: async t => {
    if (t.name?.startsWith('drop-') || t.name?.startsWith('pick-')) {
      const date = t.name.slice(5); const field = t.name.startsWith('drop-') ? 'dropOff' : 'pickUp';
      await saveDay(date, { [field]: t.value }); r(); return true;
    }
    return false;
  },
  submit: async f => {
    if (f.dataset.form === 'plansup' && picking) {
      const text = val(f, 'text'); const date = picking; const cur = mealFor(date, 'supper');
      if (text) await S.save<Meal>('mealPlan', { id: `${date}-supper`, date, slot: 'supper', text, recipeId: undefined, cook: cur?.cook } as Meal);
      picking = null; r(); return;
    }
    if (f.dataset.form === 'activity' && editingAct) {
      const date = editingAct.date; const p = getDay(date) ?? blankDay(date);
      const rec: Activity = { id: editingAct.id || uid(), text: val(f, 'text'), time: val(f, 'time'), who: val(f, 'who') || 'Family' };
      const activities = editingAct.id ? p.activities.map(a => a.id === rec.id ? rec : a) : [...p.activities, rec];
      await saveDay(date, { activities }); editingAct = null; r(); return;
    }
    if (f.dataset.form === 'play' && editingPlay) {
      const date = editingPlay.date; const p = getDay(date) ?? blankDay(date);
      const rec: PlayDate = { id: editingPlay.id || uid(), who: val(f, 'who'), withWhom: val(f, 'withWhom'), where: val(f, 'where'), time: val(f, 'time') };
      const playDates = editingPlay.id ? p.playDates.map(a => a.id === rec.id ? rec : a) : [...(p.playDates ?? []), rec];
      await saveDay(date, { playDates }); editingPlay = null; r(); return;
    }
  },
};

export async function onBlurField(t: HTMLTextAreaElement) {
  if (t.dataset.wfield === 'notes' || t.dataset.wfield === 'goals') { await saveWeekField(t.dataset.wfield, t.value); return true; }
  if (t.dataset.dnotes) { await saveDay(t.dataset.dnotes, { notes: t.value }); return true; }
  return false;
}
