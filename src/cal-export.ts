import type { Ev } from './mods/calendar';

function stamp(date: string, time?: string, allDay?: boolean) {
  if (allDay || !time) return { date: date.replace(/-/g, ''), allDay: true };
  const t = time.replace(':', '') + '00';
  return { date: date.replace(/-/g, '') + 'T' + t, allDay: false };
}
function endStamp(e: Ev) {
  const s = stamp(e.date, e.time, e.allDay);
  if (s.allDay) {
    const d = new Date(e.date + 'T12:00'); d.setDate(d.getDate() + 1);
    const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
    return x.toISOString().slice(0, 10).replace(/-/g, '');
  }
  // default 1 hour
  const [h, m] = (e.time || '09:00').split(':').map(Number);
  const d = new Date(e.date + 'T12:00'); d.setHours(h, m + 60, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return e.date.replace(/-/g, '') + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
}
export function googleCalUrl(e: Ev) {
  const s = stamp(e.date, e.time, e.allDay);
  const dates = s.date + '/' + endStamp(e);
  const u = new URL('https://calendar.google.com/calendar/render');
  u.searchParams.set('action', 'TEMPLATE');
  u.searchParams.set('text', e.title || 'Event');
  u.searchParams.set('dates', dates);
  const bits = [e.who && e.who !== 'Family' ? 'Who: ' + e.who : '', e.notes || ''].filter(Boolean);
  if (bits.length) u.searchParams.set('details', bits.join('\n'));
  return u.toString();
}
export function icsText(e: Ev) {
  const s = stamp(e.date, e.time, e.allDay);
  const start = s.allDay ? `DTSTART;VALUE=DATE:${s.date}` : `DTSTART:${s.date}`;
  const end = s.allDay ? `DTEND;VALUE=DATE:${endStamp(e)}` : `DTEND:${endStamp(e)}`;
  const desc = [e.who && e.who !== 'Family' ? 'Who: ' + e.who : '', e.notes || ''].filter(Boolean).join('\\n');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Family app//EN', 'BEGIN:VEVENT',
    `UID:${e.id || Date.now()}@family-app`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    start, end, `SUMMARY:${(e.title || 'Event').replace(/\n/g, ' ')}`,
    desc ? `DESCRIPTION:${desc}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n') + '\r\n';
}
export function downloadIcs(e: Ev) {
  const blob = new Blob([icsText(e)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (e.title || 'event').replace(/[^\w]+/g, '-').slice(0, 40) + '.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function exportBar(e: Partial<Ev>) {
  if (!e.title || !e.date) return '';
  const ev = e as Ev;
  return `<div class="exportbar">
    <a class="tog" href="${googleCalUrl(ev)}" target="_blank" rel="noopener">Add to my Google Calendar</a>
    <button type="button" class="tog" data-ics>Download .ics</button>
  </div>`;
}
