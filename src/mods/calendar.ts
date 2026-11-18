import * as S from '../store';
import { esc, fmt, todayStr, addDays, iso, PCOL, val, checked, radios } from '../util';
import { avatar } from '../icons';
import { whoOptions } from './members';
import { planEventsOn } from './weekly';
import type { Module } from './types';
import { exportBar, downloadIcs } from '../cal-export';
export interface Ev { id: string; title: string; date: string; allDay: boolean; time?: string; end?: string; who: string; repeat: 'none' | 'weekly' | 'monthly' | 'yearly'; notes: string }
const REP = ['none', 'weekly', 'monthly', 'yearly'] as const;
let tab = 'month', mOff = 0, selDay = todayStr(), edit: Partial<Ev> | null = null;
export function occursOn(e: Ev, d: string) {
  if (d < e.date) return false; if (d === e.date) return true;
  const a = new Date(e.date + 'T12:00'), b = new Date(d + 'T12:00');
  if (e.repeat === 'weekly') return a.getDay() === b.getDay();
  if (e.repeat === 'monthly') return a.getDate() === b.getDate();
  if (e.repeat === 'yearly') return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
  return false;
}
export const eventsOn = (d: string) => S.list<Ev>('events').filter(e => occursOn(e, d)).sort((x, y) => (x.allDay ? '' : x.time ?? '').localeCompare(y.allDay ? '' : y.time ?? ''));
export const allOn = (d: string) => [...eventsOn(d), ...planEventsOn(d)].sort((x, y) => (x.allDay ? '' : x.time ?? '').localeCompare(y.allDay ? '' : y.time ?? ''));
export const evRow = (e: Ev) => {
  const plan = e.id.startsWith('plan:');
  return `<button class="evrow" ${plan ? `data-plan="${e.date}"` : `data-ev="${e.id}"`} style="--c:${PCOL[e.who] ?? '#888'}">${avatar(e.who)}<span class="evt"><b>${esc(e.title)}${e.repeat !== 'none' ? ' 🔁' : ''}</b><small>${e.allDay ? 'All day' : esc(e.time)} · ${esc(e.who)}${plan ? ' · plan' : ''}</small></span></button>`;
};
function month() {
  const t = new Date(todayStr() + 'T12:00'); const first = new Date(t.getFullYear(), t.getMonth() + mOff, 1, 12);
  const n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(); const lead = (first.getDay() + 6) % 7;
  let g = `<div class="pager"><button data-cm="-1">‹</button><b>${first.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</b><button data-cm="1">›</button></div>
  <div class="card"><div class="cal">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(x => `<b>${x}</b>`).join('')}${'<span></span>'.repeat(lead)}`;
  for (let i = 1; i <= n; i++) {
    const d = iso(new Date(first.getFullYear(), first.getMonth(), i, 12)); const es = allOn(d);
    g += `<button data-cday="${d}" class="${d === todayStr() ? 'today' : ''} ${d === selDay ? 'picked' : ''}"><span class="dn">${i}</span><span class="dots">${es.slice(0, 4).map(e => `<i style="background:${PCOL[e.who]}"></i>`).join('')}</span></button>`;
  }
  g += `</div><div class="legend wrap">${whoOptions().map(p => `<span><i style="background:${PCOL[p] ?? '#888'}"></i>${esc(p)}</span>`).join('')}</div></div>`;
  const es = allOn(selDay);
  return g + `<h2>${selDay === todayStr() ? 'Today · ' : ''}${fmt(selDay, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>${es.map(evRow).join('') || '<p class="empty">Nothing planned</p>'}`;
}
function agenda() {
  let h = ''; for (let i = 0; i < 60; i++) { const d = addDays(todayStr(), i); const es = allOn(d); if (es.length) h += `<h3 class="${i === 0 ? 'todayh' : ''}">${i === 0 ? 'Today · ' : i === 1 ? 'Tomorrow · ' : ''}${fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}</h3>${es.map(evRow).join('')}`; }
  return `<h2>Next 60 days</h2>${h || '<p class="empty">No upcoming events</p>'}<p class="empty small">Google / Outlook calendar sync: planned for later.</p>`;
}
function form() {
  const e = edit!;
  return `<form class="sheet" data-form="event"><h2>${e.id ? 'Edit event' : 'New event'}</h2>
  <input name="title" placeholder="What?" required value="${esc(e.title)}" autofocus>
  <label class="row">Date <input type="date" name="date" required value="${e.date}"></label>
  <label class="chk"><input type="checkbox" name="allDay" ${e.allDay ? 'checked' : ''}> All day</label>
  <label class="row">Time <input type="time" name="time" value="${esc(e.time ?? '')}"></label>
  <h3>Who</h3>${radios('who', whoOptions(), e.who ?? 'Family', PCOL)}
  <details class="morefold"><summary>More details</summary>
  <h3>Repeat</h3>${radios('repeat', REP, e.repeat ?? 'none')}
  <textarea name="notes" rows="2" placeholder="Notes">${esc(e.notes)}</textarea>
  </details>
  ${e.id && e.title && e.date ? exportBar(e) : ''}
  <button class="save">Save</button><div class="toggles"><button type="button" class="tog" data-cancel>Cancel</button>${e.id ? `<button type="button" class="tog danger" data-delev="${e.id}">Delete</button>` : ''}</div></form>`;
}
export const calendar: Module = {
  nav: () => edit ? { tab, view: edit.id ? 'edit' : 'new', id: edit.id } : { tab },
  applyNav: n => {
    if (n.tab === 'agenda' || n.tab === 'month') tab = n.tab;
    else if (!n.view) tab = tab;
    if (n.view === 'new') edit = { date: selDay, allDay: true, who: 'Family', repeat: 'none' };
    else if (n.view === 'edit' && n.id) { const e = S.get<Ev>('events', n.id); edit = e ? { ...e } : { date: selDay, allDay: true, who: 'Family', repeat: 'none' }; }
    else edit = null;
  },
  tabs: () => [['month', 'Month'], ['agenda', 'Agenda']], tab: () => tab,
  setTab: t => { if (t === 'new') edit = { date: selDay, allDay: true, who: 'Family', repeat: 'none' }; else { tab = t; edit = null; } },
  render: () => edit ? form() : tab === 'agenda' ? agenda() : month(),
  click: async b => {
    const d = b.dataset;
    if (d.cm) { mOff += +d.cm; S.bus.rerender(); return true; }
    if (d.cday) { selDay = d.cday; S.bus.rerender(); return true; }
    if (d.newev) { edit = { date: d.newev, allDay: true, who: 'Family', repeat: 'none' }; S.bus.rerender(); return true; }
    if (d.plan) return false; // main.ts opens Weekly Plan for this day
    if (d.ev) { edit = { ...S.get<Ev>('events', d.ev)! }; S.bus.rerender(); return true; }
    if ('cancel' in d) { edit = null; S.bus.rerender(); return true; }
    if ('ics' in d) { if (edit?.title && edit?.date) downloadIcs(edit as Ev); return true; }
    if (d.delev) { if (confirm('Delete this event' + (edit?.repeat !== 'none' ? ' (all repeats)?' : '?'))) { await S.remove('events', d.delev); edit = null; S.bus.rerender(); } return true; }
    return false;
  },
  submit: async f => {
    const time = val(f, 'time'); const allDay = checked(f, 'allDay') || !time;
    await S.save<Ev>('events', { ...(edit as Ev), title: val(f, 'title'), date: val(f, 'date'), allDay, time: allDay ? '' : time, who: val(f, 'who') || 'Family', repeat: (val(f, 'repeat') || 'none') as Ev['repeat'], notes: val(f, 'notes') });
    selDay = val(f, 'date'); edit = null; S.bus.toast('Event saved ✓'); S.bus.rerender();
  },
  change: t => { if (t.name === 'time' && t.value) { const c = t.form?.elements.namedItem('allDay') as HTMLInputElement; if (c) c.checked = false; } return false; },
};
