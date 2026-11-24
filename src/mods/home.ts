import * as S from '../store';
import { esc, fmt, todayStr } from '../util';
import { allOn, evRow } from './calendar';
import { mealFor, mealLabel } from './meals';
import { dueToday, todoRow } from './todos';
import { shopSummary } from './shopping';
import { kids, ownerMini, isAssignedTo } from './members';
import type { HealthEntry } from '../types';
import { isPainOn } from '../types';
import { MOOD_FACE, icon, avatar } from '../icons';
import type { Module } from './types';

function flagged(e: HealthEntry) {
  return !!(e.fever || (e.temp != null && e.temp >= 38) || (e.pain ?? 0) > 3 || isPainOn(e) || e.tired || e.tummy || e.nauseous || e.cough || e.rash || e.emotional || e.appetite === 'poor' || e.appetite === 'none');
}
function kidLine(entries: HealthEntry[]) {
  const t = todayStr(); const list = kids();
  if (!list.length) return '<p class="muted">Add kids in Settings to track their health.</p>';
  return `<div class="kidlines">${list.map(k => {
    const es = entries.filter(e => e.child === k.name && e.date === t).sort((a, b) => b.ts - a.ts);
    const e = es[0];
    const flag = e && flagged(e);
    let detail = 'Not logged yet';
    if (e && !flag) detail = `${e.mood != null ? MOOD_FACE[e.mood - 1] + ' ' : ''}All good`;
    else if (e) {
      const bits: string[] = [];
      if (e.fever || (e.temp != null && e.temp >= 38)) bits.push(`Fever${e.temp != null ? ' ' + e.temp + '°C' : ''}`);
      else if (e.temp != null) bits.push(e.temp + '°C');
      if (isPainOn(e)) bits.push('Pain' + (e.pain != null && e.pain > 0 ? ' ' + e.pain : '') + (e.painLocs?.[0] || e.painDetail ? ' (' + [e.painLocs?.[0], e.painDetail].filter(Boolean).join(', ') + ')' : ''));
      if (e.tired) bits.push('Fatigue');
      if (e.tummy) bits.push('Tummy');
      if (e.cough) bits.push('Cough');
      if (e.nauseous) bits.push('Nausea');
      if (e.rash) bits.push('Rash');
      if (e.emotional) bits.push('Emotional');
      if (e.appetite === 'poor' || e.appetite === 'none') bits.push('Low appetite');
      detail = bits.slice(0, 3).join(' · ');
    }
    return `<button class="kidline ${e ? (flag ? 'flag' : 'ok') : 'need'}" data-go2="health|entry" data-healthwho="${esc(k.name)}">${avatar(k.name, 'sm')}<b>${esc(k.name)}</b><span>${detail}</span>${e ? '' : '<em>＋ Log</em>'}</button>`;
  }).join('')}</div>`;
}

const seeAll = (mod: string, sub: string, more: number) => more > 0 ? `<button class="link seeall" data-go2="${mod}|${sub}">See all (${more} more)</button>` : '';

export function homeView(entries: HealthEntry[]) {
  const t = todayStr(), ev = allOn(t), sup = mealFor(t);
  const due = dueToday().slice().sort((a, b) => {
    const am = isAssignedTo(a.who, S.bus.me) ? 0 : 1, bm = isAssignedTo(b.who, S.bus.me) ? 0 : 1;
    return am - bm || a.due.localeCompare(b.due);
  });
  const shop = shopSummary();
  const h = new Date().getHours(); const hi = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const cook = sup?.cook && sup.cook !== 'Unassigned' ? `<span class="cook">${ownerMini(sup.cook)} cooking</span>` : '';
  const evShow = ev.slice(0, 3), dueShow = due.slice(0, 3);
  return `<header class="hero-h">${S.bus.me ? avatar(S.bus.me, 'lg') : '<span class="av lg av-Family">★</span>'}<div><small>${fmt(t, { weekday: 'long', day: 'numeric', month: 'long' })}</small><h1>${hi}${S.bus.me ? ', ' + esc(S.bus.me) : ''}</h1></div></header>

  <div class="card tcard t-calendar quiet"><h3 data-go2="calendar|month" class="tap">${icon('calendar')} Today ${icon('chev', 'go')}</h3>${evShow.map(evRow).join('') || '<p class="empty-s">A quiet day – nothing on the calendar</p>'}${seeAll('calendar', 'month', ev.length - evShow.length)}</div>

  <div class="card tcard t-meals quiet"><h3 data-go2="plan|week" class="tap">${icon('meals')} Tonight ${icon('chev', 'go')}</h3><p class="big">${sup && (sup.text || sup.recipeId) ? esc(mealLabel(sup)) : '<span class="muted">Not planned yet</span>'}</p>${cook}</div>

  <div class="card tcard t-health quiet"><h3 data-go2="health|entry" class="tap">${icon('health')} The kids ${icon('chev', 'go')}</h3>${kidLine(entries)}</div>

  <div class="card tcard t-todos quiet"><h3 data-go2="todos|all" class="tap">${icon('todos')} To-dos ${icon('chev', 'go')}</h3>${dueShow.map(todoRow).join('') || '<p class="empty-s">All caught up</p>'}${seeAll('todos', 'all', due.length - dueShow.length)}</div>

  <div class="card tcard t-shopping quiet"><h3 data-go2="shopping|" class="tap">${icon('shopping')} Shopping ${icon('chev', 'go')}</h3>
    ${shop.length ? `<div class="shopcounts">${shop.map(s => `<span class="scpill" style="--sc:${s.color}">${s.icon} ${esc(s.name.split(' / ')[0])} <b>${s.n}</b></span>`).join('')}</div>` : '<p class="empty-s">Nothing to buy in your lists</p>'}
  </div>`;
}
export const home: Module = { tabs: () => [], tab: () => '', setTab: () => {}, render: () => '', click: () => false };
