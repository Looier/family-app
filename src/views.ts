import type { HealthEntry } from './types';
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const iso = (d: Date) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => new Date(s + 'T12:00').toLocaleDateString('en-ZA', o);
const time = (ts: number) => new Date(ts).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

function entryCard(e: HealthEntry) {
  const bits: string[] = [];
  if (e.mood !== null) bits.push(`<span class="pill mood">Mood ${e.mood}</span>`);
  bits.push(e.pain == null ? '<span class="pill">Pain: not reported</span>' : `<span class="pill pain">Pain ${e.pain}</span>`);
  if (e.sleep) bits.push(`<span class="pill sleep">Sleep: ${esc(e.sleep)}</span>`);
  if (e.tired) bits.push('<span class="pill">Tired</span>');
  if (e.emotional) bits.push('<span class="pill">Emotional</span>');
  if (e.nauseous) bits.push('<span class="pill">Nauseous</span>');
  if (e.tummy) bits.push('<span class="pill">Tummy ache</span>');
  if (e.fever || (e.temp != null && e.temp >= 38)) bits.push(`<span class="pill rash">Fever${e.temp != null ? ' ' + e.temp + '°C' : ''}</span>`);
  else if (e.temp != null) bits.push(`<span class="pill">${e.temp}°C</span>`);
  if (e.cough) bits.push('<span class="pill">Cough</span>');
  if (e.runnyNose) bits.push('<span class="pill">Runny nose</span>');
  if (e.appetite) bits.push(`<span class="pill">Appetite: ${esc(e.appetite)}</span>`);
  if (e.constipated) bits.push('<span class="pill">Constipated</span>');
  if (e.rash) bits.push(`<span class="pill rash">Rash${e.rashWhere || e.rashLocs.length ? ': ' + esc([e.rashWhere, ...e.rashLocs].filter(Boolean).join(', ')) : ''}</span>`);
  const meds = (e.medDoses && e.medDoses.length) ? e.medDoses.map(m => [m.name, m.dose, m.time].filter(Boolean).join(' ')).join(', ') : e.meds.join(', ');
  return `<div class="card entry"><div class="ehead"><b>${time(e.ts)}</b>${e.author ? `<small>${esc(e.author.split('@')[0])}</small>` : ''}<button class="del" data-del="${e.id}" aria-label="Delete">✕</button></div>
  <div>${bits.join(' ')}</div>
  ${e.painLocs.length ? `<p>📍 ${esc(e.painLocs.join(', '))}</p>` : ''}
  ${meds ? `<p>💊 ${esc(meds)}</p>` : ''}
  ${e.notes ? `<p class="note">${esc(e.notes)}</p>` : ''}</div>`;
}
export function renderDay(list: HealthEntry[], date: string, today: string) {
  list.sort((a, b) => a.ts - b.ts);
  return `<div class="pager"><button data-dd="-1">‹</button><input type="date" id="dayDate" value="${date}" max="${today}"><button data-dd="1" ${date >= today ? 'disabled' : ''}>›</button></div>
  <h2>${fmt(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
  ${list.length ? list.map(entryCard).join('') : '<p class="empty">No entries for this day.</p>'}`;
}

function chart(naNote: string, days: string[], series: { vals: (number | null)[]; color: string; label: string; min: number; max: number }[]) {
  const W = 340, H = 170, L = 26, B = 22, T = 10, step = (W - L - 10) / 6;
  const y = (v: number) => T + (H - T - B) * (1 - v / 10);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img"><defs>${series.map((se, k) => `<linearGradient id="g${k}${se.label}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${se.color}" stop-opacity=".35"/><stop offset="1" stop-color="${se.color}" stop-opacity="0"/></linearGradient>`).join('')}</defs>`;
  for (let v = 0; v <= 10; v += 2) s += `<line x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="4" y="${y(v) + 4}" class="ax">${v}</text>`;
  days.forEach((d, i) => s += `<text x="${L + i * step}" y="${H - 5}" text-anchor="middle" class="ax">${fmt(d, { weekday: 'short' }).slice(0, 2)}</text>`);
  series.forEach((se, k) => {
    const pts = se.vals.map((v, i) => v === null ? null : [L + i * step, y(v)] as const);
    let path = ''; pts.forEach(p => { if (p) path += (path ? 'L' : 'M') + p[0] + ',' + p[1]; });
    const ok = pts.filter(Boolean) as (readonly [number, number])[]; if (ok.length > 1) s += `<path d="${path}L${ok[ok.length - 1][0]},${y(0)}L${ok[0][0]},${y(0)}Z" fill="url(#g${k}${se.label})"/>`;
    s += `<path d="${path}" fill="none" stroke="${se.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach(p => p && (s += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="var(--card)" stroke="${se.color}" stroke-width="2.5"/>`));
  });
  return s + '</svg>' + `<div class="legend">${series.map(x => `<span><i style="background:${x.color}"></i>${x.label}</span>`).join('')}<small>daily average${naNote}</small></div>`;
}
const tally = (arr: string[]) => { const m = new Map<string, number>(); arr.forEach(x => m.set(x, (m.get(x) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]); };
function bars(rows: [string, number][], unit: string) {
  if (!rows.length) return '<p class="empty">None this week</p>';
  const mx = Math.max(...rows.map(r => r[1]));
  return rows.map(([k, n]) => `<div class="bar"><span>${esc(k)}</span><div><i style="width:${(n / mx) * 100}%"></i></div><b>${n}${unit}</b></div>`).join('');
}
export function renderWeek(all: HealthEntry[], offset: number, today: string) {
  const end = new Date(today + 'T12:00'); end.setDate(end.getDate() + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(end); d.setDate(d.getDate() - 6 + i); return iso(d); });
  const wk = all.filter(e => e.date >= days[0] && e.date <= days[6]);
  const by = (d: string) => wk.filter(e => e.date === d);
  const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length * 10) / 10 : null;
  const mood = days.map(d => avg(by(d).flatMap(e => e.mood === null ? [] : [e.mood])));
  const pain = days.map(d => avg(by(d).flatMap(e => e.pain == null ? [] : [e.pain])));
  const SL: Record<string, [number, string]> = { 'Good': [1, 'ok'], 'Woke up once': [2, 'w1'], 'Woke up multiple times': [3, 'w2'], 'Woke up with pain': [4, 'wp'] };
  const sleepStrip = `<div class="strip">${days.map(d => { const w = by(d).map(e => e.sleep).filter(Boolean).sort((a, b) => SL[b!][0] - SL[a!][0])[0]; return `<span class="${w ? 'sl-' + SL[w][1] : ''}" title="${w ?? ''}">${fmt(d, { weekday: 'short' }).slice(0, 2)}<br>${w ? ['', '😴', '1×', '2+', '🤕'][SL[w][0]] : '–'}</span>`; }).join('')}</div><div class="legend"><small>😴 good · 1× woke once · 2+ woke often · 🤕 woke with pain (worst of the day)</small></div>`;
  const dayFlag = (f: (e: HealthEntry) => boolean) => days.filter(d => by(d).some(f));
  const rashDays = dayFlag(e => e.rash), conDays = dayFlag(e => e.constipated), tiredDays = dayFlag(e => !!e.tired), emoDays = dayFlag(e => !!e.emotional), nauDays = dayFlag(e => !!e.nauseous);
  const feverDays = dayFlag(e => !!e.fever || (e.temp != null && e.temp >= 38)), tumDays = dayFlag(e => !!e.tummy), coughDays = dayFlag(e => !!e.cough || !!e.runnyNose), appDays = dayFlag(e => e.appetite === 'poor' || e.appetite === 'none');
  const naDays = days.filter(d => by(d).length && by(d).every(e => e.pain == null)).length;
  const strip = (sel: string[]) => `<div class="strip">${days.map(d => `<span class="${sel.includes(d) ? 'on' : ''}">${fmt(d, { weekday: 'short' }).slice(0, 2)}</span>`).join('')}</div>`;
  const label = `${fmt(days[0], { day: 'numeric', month: 'short' })} – ${fmt(days[6], { day: 'numeric', month: 'short' })}`;
  return `<div class="pager"><button data-wk="-1">‹</button><b>${label}</b><button data-wk="1" ${offset >= 0 ? 'disabled' : ''}>›</button></div>
  <div class="card">${chart(naDays ? ` · pain not reported ${naDays}d` : '', days, [{ vals: mood, color: '#3fa37a', label: 'Mood', min: 1, max: 10 }, { vals: pain, color: '#e0645c', label: 'Pain', min: 0, max: 10 }])}</div>
  <div class="card"><h3>Sleep</h3>${sleepStrip}</div>
  <div class="card"><h3>Fever (${feverDays.length})</h3>${strip(feverDays)}<h3>Tummy ache (${tumDays.length})</h3>${strip(tumDays)}<h3>Cough / runny nose (${coughDays.length})</h3>${strip(coughDays)}<h3>Low appetite (${appDays.length})</h3>${strip(appDays)}<h3>Rash days (${rashDays.length})</h3>${strip(rashDays)}<h3>Constipated days (${conDays.length})</h3>${strip(conDays)}<h3>Tired days (${tiredDays.length})</h3>${strip(tiredDays)}<h3>Emotional days (${emoDays.length})</h3>${strip(emoDays)}<h3>Nauseous days (${nauDays.length})</h3>${strip(nauDays)}</div>
  <div class="card"><h3>Meds given</h3>${bars(tally(wk.flatMap(e => (e.medDoses && e.medDoses.length) ? e.medDoses.map(m => m.name) : e.meds)), '×')}</div>
  <div class="card"><h3>Where it hurt</h3>${bars(tally(wk.flatMap(e => e.painLocs)), '×')}</div>
  <p class="empty">${wk.length} entries this week</p>`;
}

const SEV: Record<string, number> = { 'Good': 1, 'Woke up once': 2, 'Woke up multiple times': 3, 'Woke up with pain': 4 };
const SLEEP_COL = ['', '#3fa37a', '#e9a03b', '#e0645c', '#c94f63'];
const painBg = (p: number | null) => p === null ? 'var(--card)' : `hsl(${120 - p * 12} 60% ${p === 0 ? 88 : 82 - p * 2}%)`;
function gapChart(days: string[], series: { vals: (number | null)[]; color: string; label: string }[]) {
  const W = 360, H = 170, L = 24, B = 20, T = 10, step = (W - L - 8) / Math.max(1, days.length - 1);
  const y = (v: number) => T + (H - T - B) * (1 - v / 10);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img"><defs>${series.map((se, k) => `<linearGradient id="g${k}${se.label}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${se.color}" stop-opacity=".35"/><stop offset="1" stop-color="${se.color}" stop-opacity="0"/></linearGradient>`).join('')}</defs>`;
  for (let v = 0; v <= 10; v += 2) s += `<line x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="2" y="${y(v) + 4}" class="ax">${v}</text>`;
  days.forEach((d, i) => { const n = +d.slice(8); if (n === 1 || n % 5 === 0) s += `<text x="${L + i * step}" y="${H - 4}" text-anchor="middle" class="ax">${n}</text>`; });
  for (const se of series) {
    let path = '', pen = false;
    se.vals.forEach((v, i) => { if (v === null) { pen = false; return; } path += (pen ? 'L' : 'M') + (L + i * step) + ',' + y(v); pen = true; });
    s += `<path d="${path}" fill="none" stroke="${se.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
    se.vals.forEach((v, i) => v !== null && (s += `<circle cx="${L + i * step}" cy="${y(v)}" r="3" fill="${se.color}"/>`));
  }
  return s + '</svg>' + `<div class="legend">${series.map(x => `<span><i style="background:${x.color}"></i>${x.label}</span>`).join('')}<small>daily avg · gaps = no data</small></div>`;
}
export function renderMonth(all: HealthEntry[], offset: number, today: string) {
  const t = new Date(today + 'T12:00'); const first = new Date(t.getFullYear(), t.getMonth() + offset, 1, 12);
  const n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: n }, (_, i) => iso(new Date(first.getFullYear(), first.getMonth(), i + 1, 12)));
  const mo = all.filter(e => e.date >= days[0] && e.date <= days[n - 1]);
  const by = (d: string) => mo.filter(e => e.date === d);
  const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length * 10) / 10 : null;
  const pain = days.map(d => avg(by(d).flatMap(e => e.pain == null ? [] : [e.pain])));
  const mood = days.map(d => avg(by(d).flatMap(e => e.mood == null ? [] : [e.mood])));
  const lead = (first.getDay() + 6) % 7; // Monday first
  let grid = `<div class="cal">${['Mo','Tu','We','Th','Fr','Sa','Su'].map(x => `<b>${x}</b>`).join('')}${'<span></span>'.repeat(lead)}`;
  days.forEach((d, i) => {
    const es = by(d); const sl = Math.max(0, ...es.map(e => SEV[e.sleep ?? ''] ?? 0));
    const fl = [es.some(e => e.fever || (e.temp != null && e.temp >= 38)) && 'F', es.some(e => e.tummy) && 'U', es.some(e => e.cough || e.runnyNose) && 'K', es.some(e => e.rash) && 'R', es.some(e => e.constipated) && 'C', es.some(e => e.tired) && 'T', es.some(e => e.emotional) && 'E', es.some(e => e.nauseous) && 'N'].filter(Boolean).join('');
    grid += `<button data-mday="${d}" class="${d === today ? 'today' : ''}" ${d > today ? 'disabled' : ''} style="background:${es.length ? painBg(pain[i]) : 'var(--card)'}">
      <span class="dn">${i + 1}</span>${mood[i] !== null ? `<span class="mm">☺${Math.round(mood[i]!)}</span>` : ''}
      ${sl ? `<i class="sd" style="background:${SLEEP_COL[sl]}"></i>` : ''}${fl ? `<span class="fl">${fl}</span>` : ''}</button>`;
  });
  grid += '</div><div class="legend wrap"><small>Colour = avg pain (green 0 → red 10) · ☺ mood · dot = sleep · F fever U tummy K cough/nose R rash C constipated T tired E emotional N nauseous</small></div>';
  const count = (f: (e: HealthEntry) => boolean) => days.filter(d => by(d).some(f)).length;
  const ticks: [string, number][] = [['Fever', count(e => !!e.fever || (e.temp != null && e.temp >= 38))], ['Tummy ache', count(e => !!e.tummy)], ['Cough / runny nose', count(e => !!e.cough || !!e.runnyNose)], ['Low appetite', count(e => e.appetite === 'poor' || e.appetite === 'none')], ['Rash', count(e => e.rash)], ['Constipated', count(e => e.constipated)], ['Tired', count(e => !!e.tired)], ['Emotional', count(e => !!e.emotional)], ['Nauseous', count(e => !!e.nauseous)]];
  const sleeps: [string, number][] = Object.keys(SEV).map(k => [k, mo.filter(e => e.sleep === k).length]);
  const label = first.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  return `<div class="pager"><button data-mo="-1">‹</button><b>${label}</b><button data-mo="1" ${offset >= 0 ? 'disabled' : ''}>›</button></div>
  <div class="card">${grid}</div>
  <div class="card">${gapChart(days, [{ vals: mood, color: '#3fa37a', label: 'Mood' }, { vals: pain, color: '#e0645c', label: 'Pain' }])}</div>
  <div class="card"><h3>Days with…</h3>${bars(ticks.filter(x => x[1]), 'd')}</div>
  <div class="card"><h3>Sleep (nights logged)</h3>${bars(sleeps.filter(x => x[1]), '×')}</div>
  <div class="card"><h3>Meds given</h3>${bars(tally(mo.flatMap(e => (e.medDoses && e.medDoses.length) ? e.medDoses.map(m => m.name) : e.meds)), '×')}</div>
  <div class="card"><h3>Where it hurt</h3>${bars(tally(mo.flatMap(e => e.painLocs)), '×')}</div>
  <p class="empty">${mo.length} entries this month</p>`;
}
