/** Smoke: every other add path still has a reachable control after the 0.2.7 declutter. */
import pkg from '/tmp/pw/node_modules/playwright-core/index.js';
const { chromium } = pkg;

const base = (process.env.BASE_URL || 'http://127.0.0.1:5182').replace(/\/$/, '');
function assert(cond, msg) { if (!cond) throw new Error('CHECK FAIL: ' + msg); }

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await context.newPage();
page.on('pageerror', e => { console.log('PAGEERROR', e.message); throw e; });
const text = () => page.locator('body').innerText();
const go = async (hash, re) => {
  await page.goto(base + '/' + hash, { waitUntil: 'networkidle' });
  await page.waitForFunction(r => new RegExp(r, 'i').test(document.body.innerText), re, { timeout: 8000 });
};

await page.goto(base + '/#/home', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('me', 'Thinus'));

// Shopping: inline add
await go('#/shopping', 'Add an item');
await page.fill('.shopq input[name="name"]', 'Milk');
await page.click('.shopq .addbtn');
await page.waitForFunction(() => /Milk/.test(document.body.innerText), null, { timeout: 5000 });
console.log('ADD shopping ok');

// To-dos: inline add
await go('#/todos', 'All lists|Nothing to do|Mine');
const todoInp = page.locator('form[data-form="todoadd"] input[name="title"], .quick input[name="title"]').first();
await todoInp.fill('Hang washing');
await page.locator('form[data-form="todoadd"] .addbtn, form[data-form="todoadd"] button[type="submit"], .quick .addbtn').first().click();
await page.waitForFunction(() => /Hang washing/.test(document.body.innerText), null, { timeout: 5000 });
console.log('ADD todo ok');

// Notes: Quick add (FAB or empty hint)
await go('#/notes', 'No notes yet|Quick add or the|Notes');
if (await page.locator('.fab, [data-qaopen]').count()) await page.locator('[data-qaopen]').first().click();
else await page.evaluate(() => document.querySelector('[data-qaopen]')?.click());
await page.waitForFunction(() => /Quick add/i.test(document.body.innerText), null, { timeout: 5000 });
await page.click('[data-qakind="note"]');
await page.fill('input[name="title"]', 'School run reminder');
await page.click('.qasheet .save, form[data-form="qa"] .save, .save');
await page.waitForFunction(() => /School run reminder|Note saved/i.test(document.body.innerText), null, { timeout: 5000 });
console.log('ADD note ok');

// Calendar event via Quick add
await go('#/calendar', 'Calendar|Today|Month');
await page.locator('[data-qaopen]').first().click();
await page.waitForFunction(() => /Quick add/i.test(document.body.innerText), null, { timeout: 5000 });
await page.click('[data-qakind="event"]');
await page.fill('input[name="title"]', 'Netball practice');
await page.click('.qasheet .save, .save');
await page.waitForFunction(() => /Event added|Netball practice/i.test(document.body.innerText), null, { timeout: 5000 });
console.log('ADD event ok');

// Wish: inline button
await go('#/wishes', 'Wishlists|Add a wish');
await page.click('[data-wnew]');
await page.waitForFunction(() => /Whose list|New wish|Edit wish/i.test(document.body.innerText), null, { timeout: 5000 });
await page.fill('input[name="name"]', 'Lego set');
await page.click('form[data-form="wish"] .save, .sheet .save, .save');
await page.waitForFunction(() => /Lego set/i.test(document.body.innerText), null, { timeout: 8000 });
console.log('ADD wish ok');

// Health: wake + save
await go('#/health/entry', 'How did they wake up');
if (await page.locator('[data-child="Phoebe"]').count()) await page.click('[data-child="Phoebe"]');
await page.click('[data-wake="fine"]');
await page.click('#save');
await page.waitForFunction(() => /Saved for Phoebe/i.test(document.body.innerText), null, { timeout: 8000 });
console.log('ADD health ok');

// Plan: open supper sheet
await go('#/plan', 'Plan supper|Week of');
await page.locator('[data-picksup]').first().click();
await page.waitForFunction(() => /Save typed meal/i.test(document.body.innerText), null, { timeout: 5000 });
await page.fill('input[name="text"]', 'Leftovers');
await page.click('form[data-form="plansup"] .save, .sheet .save');
await page.waitForFunction(() => /Leftovers/i.test(document.body.innerText), null, { timeout: 5000 });
console.log('ADD plan supper ok');

console.log('ALL ADD PATHS OK on', base);
await browser.close();
