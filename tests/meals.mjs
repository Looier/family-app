/** Phone-viewport: add a meal by name only; it persists and is pickable as supper. */
import pkg from '/tmp/pw/node_modules/playwright-core/index.js';
const { chromium } = pkg;
import { mkdir } from 'node:fs/promises';

const base = (process.env.BASE_URL || 'http://127.0.0.1:5182').replace(/\/$/, '');
const shots = process.env.SHOTS || '/workspace/grok-bot/family-app/screenshots';
function assert(cond, msg) { if (!cond) throw new Error('CHECK FAIL: ' + msg); }

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 412, height: 915 },
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
  serviceWorkers: 'block',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR', e.message); });
const text = () => page.locator('body').innerText();

await page.goto(base + '/#/meals/book', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('me', 'Thinus'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="meal-add"]', { timeout: 8000 });

assert(await page.locator('[data-testid="meal-add"]').count(), 'Add a meal field missing');
assert(!(await text()).includes('＋ New category') && !(await text()).includes('+ New category'), 'New category should not be on the recipe list');
const cat = await page.locator('.mealq select[name="cat"]').inputValue();
assert(cat === 'Everyday', 'category should default to Everyday, got ' + cat);

await page.fill('.mealq input[name="title"]', 'Chicken à la King');
await page.click('.mealq .addbtn');
await page.waitForFunction(() => /Chicken à la King/i.test(document.body.innerText), null, { timeout: 8000 });
assert(/Everyday/i.test(await text()), 'Everyday heading missing');
const body = await text();
const ev = body.indexOf('Everyday');
const ck = body.indexOf('Chicken à la King');
assert(ck >= 0, 'meal not in the list after add');
// Meal should appear in/after the Everyday section (not only as a category chip)
console.log('MEAL IN LIST after add');

await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => /Chicken à la King/i.test(document.body.innerText), null, { timeout: 8000 });
assert(/Chicken à la King/i.test(await text()), 'meal missing after reload');
console.log('MEAL PERSISTED after reload');

// Category sheet: New category is labelled, rename/delete exist
await page.click('[data-mealmenu]');
await page.waitForFunction(() => /Recipe categories/i.test(document.body.innerText), null, { timeout: 5000 });
assert(await page.locator('input[name="newname"]').count(), 'New category field missing in the sheet');
assert(await page.locator('[data-rencat]').count(), 'Rename missing');
assert(await page.locator('[data-delcat]').count(), 'Delete missing');
await page.click('[data-cancel]');
await page.waitForFunction(() => !/Recipe categories/i.test(document.body.innerText), null, { timeout: 5000 });

// Plan supper picker
await page.goto(base + '/#/plan', { waitUntil: 'networkidle' });
await page.waitForFunction(() => /Plan supper|Week of/i.test(document.body.innerText), null, { timeout: 8000 });
await page.locator('[data-picksup]').first().click();
await page.waitForFunction(() => /Save typed meal|pick a recipe/i.test(document.body.innerText), null, { timeout: 8000 });
assert(/Chicken à la King/i.test(await text()), 'meal not in the Plan supper picker');
console.log('MEAL IN PLAN SUPPER PICKER');

await mkdir(shots, { recursive: true });
await page.goto(base + '/#/meals/book', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-testid="meal-add"]', { timeout: 8000 });
await page.waitForFunction(() => /Chicken à la King/i.test(document.body.innerText), null, { timeout: 8000 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${shots}/v028-meals.png`, fullPage: false });
console.log('SHOT', `${shots}/v028-meals.png`);

if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
console.log('ALL MEAL CHECKS PASSED on', base);
await browser.close();
