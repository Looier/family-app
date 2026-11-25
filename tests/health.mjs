/** Phone-viewport: log two days for one child and one day for the other; persist after reload. */
import pkg from '/tmp/pw/node_modules/playwright-core/index.js';
const { chromium } = pkg;
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const base = (process.env.BASE_URL || 'http://127.0.0.1:5180').replace(/\/$/, '');
const shots = process.env.SHOTS || '/workspace/grok-bot/family-app/screenshots';
function assert(cond, msg) { if (!cond) throw new Error('CHECK FAIL: ' + msg); }

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR', e.message); });

const text = () => page.locator('body').innerText();
const notesVal = () => page.locator('#notes').inputValue();
async function waitText(re, label, ms = 8000) {
  await page.waitForFunction(r => new RegExp(r, 'i').test(document.body.innerText), re, { timeout: ms });
  assert(new RegExp(re, 'i').test(await text()), (label || re) + ' text missing');
}
async function shot(name) {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}`, fullPage: false });
  console.log('SHOT', `${shots}/${name}`);
}

await page.goto(base + '/#/health/entry', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('me', 'Thinus'));
await page.reload({ waitUntil: 'networkidle' });
await waitText('Logging for', 'health entry header');

// Who am I on settings should not list the kids as app users
await page.goto(base + '/#/settings', { waitUntil: 'networkidle' });
await waitText('Who am I on this phone', 'settings');
const settings = await text();
assert(/Thinus/.test(settings) && /Juazel/.test(settings), 'adults missing from Who am I');
// The picker chips for "this phone" should not include the kids
const meNames = await page.$$eval('.mephone [data-me]', els => els.map(e => e.getAttribute('data-me')));
assert(meNames.includes('Thinus') && meNames.includes('Juazel'), 'Who am I adults: ' + meNames);
assert(!meNames.includes('Phoebe') && !meNames.includes('Jocelyn'), 'kids should not be Who am I options: ' + meNames);
console.log('WHO AM I ADULTS ONLY OK', meNames);

await page.goto(base + '/#/health/entry', { waitUntil: 'networkidle' });
await waitText('Logging for', 'back to entry');

// Select Jocelyn — header and selected chip must be obvious
await page.click('[data-child="Jocelyn"]');
await waitText('Logging for Jocelyn', 'jocelyn header');
const jocSel = await page.getAttribute('[data-child="Jocelyn"]', 'class');
assert(/\bsel\b/.test(jocSel || ''), 'Jocelyn chip not selected: ' + jocSel);
const phoebeSel = await page.getAttribute('[data-child="Phoebe"]', 'class');
assert(!/\bsel\b/.test(phoebeSel || ''), 'Phoebe still selected');
await shot('health-entry-selected.png');
console.log('SELECTED KID OK');

const today = await page.inputValue('#date');
assert(/^\d{4}-\d{2}-\d{2}$/.test(today), 'today date ' + today);
const ymd = d => d;
function addDays(s, n) {
  const d = new Date(s + 'T12:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
const yesterday = addDays(today, -1);
const stamp = Date.now().toString(36);
const nJToday = 'jocelyn-today-' + stamp;
const nJYest = 'jocelyn-yesterday-' + stamp;
const nPToday = 'phoebe-today-' + stamp;

// Jocelyn today: Fatigue + note
await page.click('#tired');
await page.fill('#notes', nJToday);
await page.click('#save');
await waitText('Saved for Jocelyn', 'save confirm jocelyn today');
await waitText('Editing saved entry', 'edit mode after save');
assert((await notesVal()) === nJToday, 'note missing after save: ' + (await notesVal()));
await page.evaluate(() => window.scrollTo(0, 0));
await shot('health-save-confirm.png');
console.log('JOCELYN TODAY SAVED', today);

// Jocelyn yesterday via previous-day button (must not keep today’s id/date)
await page.click('[data-edate="-1"]');
await page.waitForFunction(d => document.querySelector('#date')?.value === d, yesterday, { timeout: 5000 });
assert((await page.inputValue('#date')) === yesterday, 'did not move to yesterday');
// should be a fresh form, not still editing today’s entry
const bodyY = await text();
assert(/Logging for Jocelyn/.test(bodyY), 'header still jocelyn yesterday');
assert((await notesVal()) !== nJToday, 'today’s note leaked onto yesterday form: ' + (await notesVal()));
await page.click('#tired');
await page.fill('#notes', nJYest);
await page.click('#save');
await waitText('Saved for Jocelyn', 'save confirm jocelyn yesterday');
await waitText('Editing saved entry', 'edit mode yesterday');
assert((await notesVal()) === nJYest, 'yesterday note missing: ' + (await notesVal()));
console.log('JOCELYN YESTERDAY SAVED', yesterday);

// Back to today, then Phoebe today — must not overwrite Jocelyn
await page.click('[data-edate="1"]');
await page.waitForFunction(d => document.querySelector('#date')?.value === d, today, { timeout: 5000 });
await page.waitForFunction(n => document.getElementById('notes')?.value === n, nJToday, { timeout: 5000 });
assert((await notesVal()) === nJToday, 'jocelyn today not reloaded when returning');
await page.click('[data-child="Phoebe"]');
await waitText('Logging for Phoebe', 'phoebe header');
assert((await notesVal()) !== nJToday, 'jocelyn note still showing on phoebe form: ' + (await notesVal()));
await page.click('#tired');
await page.fill('#notes', nPToday);
await page.click('#save');
await waitText('Saved for Phoebe', 'save confirm phoebe today');
await waitText('Editing saved entry', 'edit mode phoebe');
assert((await notesVal()) === nPToday, 'phoebe note missing: ' + (await notesVal()));
console.log('PHOEBE TODAY SAVED', today);

// Reload and confirm all three under the right kid and day
await page.reload({ waitUntil: 'networkidle' });
await page.goto(base + '/#/health/entry', { waitUntil: 'networkidle' });
await waitText('Logging for', 'entry after reload');

async function show(child, date, note, label) {
  await page.click(`[data-child="${child}"]`);
  const cur = await page.inputValue('#date');
  if (cur !== date) {
    await page.fill('#date', date);
    await page.waitForFunction(d => document.querySelector('#date')?.value === d, date, { timeout: 5000 });
  }
  await waitText('Logging for ' + child, label + ' header');
  await waitText('Editing saved entry', label + ' still editing after reload');
  assert((await notesVal()) === note, label + ' note missing after reload: ' + (await notesVal()));
}

await show('Jocelyn', today, nJToday, 'jocelyn today');
await show('Jocelyn', yesterday, nJYest, 'jocelyn yesterday');
await show('Phoebe', today, nPToday, 'phoebe today');
console.log('ALL THREE PERSISTED AFTER RELOAD');

// Weekly view: selected child header + per-kid markers
await page.goto(base + '/#/health/week', { waitUntil: 'networkidle' });
await page.click('[data-child="Jocelyn"]');
await waitText('Weekly log for Jocelyn', 'weekly header');
assert(await page.locator('.weekmarks').count(), 'week marks missing');
await shot('health-weekly.png');
console.log('WEEKLY VIEW OK');

// Day views too
await page.goto(base + '/#/health/day', { waitUntil: 'networkidle' });
await page.click('[data-child="Jocelyn"]');
if ((await page.inputValue('#dayDate').catch(() => '')) !== today) {
  const inp = page.locator('#dayDate');
  if (await inp.count()) await inp.fill(today);
}
await waitText('Day log for Jocelyn', 'day header');
await waitText(nJToday, 'jocelyn today on day view');

// --- Wake-up options and two-step pain location (fresh profile) ---
const ctx2 = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const p2 = await ctx2.newPage();
p2.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR', e.message); });
await p2.goto(base + '/#/health/entry', { waitUntil: 'networkidle' });
await p2.evaluate(() => localStorage.setItem('me', 'Thinus'));
await p2.click('[data-child="Phoebe"]');
await p2.waitForFunction(() => /How did they wake up/i.test(document.body.innerText), null, { timeout: 8000 });
const wakeBtn = p2.locator('[data-wake="fine"]');
assert(await wakeBtn.count(), 'wake-up option missing');
await wakeBtn.click();
assert(await p2.locator('[data-wake="fine"].sel').count(), 'Woke up fine not selected');
await p2.fill('#wakeNote', 'Slept through and hopped out of bed');
await p2.click('#painflag');
await p2.waitForSelector('[data-testid="pain-box"]');
await p2.click('[data-ploc="Knee"]');
await p2.waitForSelector('[data-testid="pain-side"]');
assert(/Which Knee/i.test(await p2.locator('body').innerText()), 'side picker title missing');
await p2.click('[data-pside="Knee|Both"]');
await p2.waitForFunction(() => /Knee · Both/.test(document.body.innerText), null, { timeout: 5000 });
// Head is unpaired — should add immediately
await p2.click('[data-ploc="Head"]');
await p2.waitForFunction(() => /Head/.test(document.body.innerText) && /Knee · Both/.test(document.body.innerText), null, { timeout: 5000 });
await p2.click('#save');
await p2.waitForFunction(() => /Saved for Phoebe/i.test(document.body.innerText), null, { timeout: 8000 });
assert(await p2.locator('[data-wake="fine"].sel').count(), 'wake not selected after save');
assert(/Knee · Both/.test(await p2.locator('body').innerText()), 'pain tag missing after save');
await p2.reload({ waitUntil: 'networkidle' });
await p2.click('[data-child="Phoebe"]');
await p2.waitForFunction(() => /Editing saved entry/i.test(document.body.innerText), null, { timeout: 8000 });
assert(await p2.locator('[data-wake="fine"].sel').count(), 'wake not restored after reload');
assert((await p2.locator('#wakeNote').inputValue()) === 'Slept through and hopped out of bed', 'wake note missing after reload');
assert(/Knee · Both/.test(await p2.locator('body').innerText()), 'pain tag missing after reload');
assert(await p2.locator('[data-ploc="Knee"].sel').count(), 'Knee part not marked selected after reload');
console.log('WAKE + PAIN SIDE PICKER OK');
await ctx2.close();

if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
console.log('ALL HEALTH CHECKS PASSED on', base, { today, yesterday });
await browser.close();
