/** Phone-viewport: Shop list is the hero; tools and category pickers are sheets. */
import pkg from '/tmp/pw/node_modules/playwright-core/index.js';
const { chromium } = pkg;
import { mkdir } from 'node:fs/promises';

const base = (process.env.BASE_URL || 'http://127.0.0.1:5180').replace(/\/$/, '');
const shots = process.env.SHOTS || '/workspace/grok-bot/family-app/screenshots';
function assert(cond, msg) { if (!cond) throw new Error('CHECK FAIL: ' + msg); }

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR', e.message); });

const text = () => page.locator('body').innerText();

await page.goto(base + '/#/shopping', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('me', 'Thinus'));
await page.waitForFunction(() => /Add an item/i.test(document.body.innerText), null, { timeout: 8000 });

// No wrapping category grid or sort row on the main list
const body = await text();
assert(!/New category/i.test(body), 'category grid should not be on the main list');
assert(!/Date added/.test(body), 'sort row should not be on the main list');
assert(!/Qty, note or assignee/i.test(body), 'qty field should be hidden until more is tapped');
assert(await page.locator('.shopbar').count(), 'slim shop bar missing');
assert(await page.locator('.fab').count() === 0, 'floating + should be hidden on Shop');

// Add a couple of items so the list is visible in the upper half
await page.fill('.shopq input[name="name"]', 'Bread');
await page.click('.shopq .addbtn');
await page.waitForFunction(() => /Bread/.test(document.body.innerText), null, { timeout: 5000 });
await page.fill('.shopq input[name="name"]', 'Strawberries');
await page.click('.shopq .addbtn');
await page.waitForFunction(() => /Strawberries/.test(document.body.innerText), null, { timeout: 5000 });

const listY = await page.locator('.ssec').first().evaluate(el => el.getBoundingClientRect().top);
assert(listY < 280, 'list should start in the top half of the screen, was y=' + listY);

// Category picker is a sheet, not a wrapping grid on the page
await page.click('[data-togglepick]');
await page.waitForFunction(() => /Add to/i.test(document.body.innerText), null, { timeout: 5000 });
assert(await page.locator('.sheet.catpick').count(), 'category sheet missing');
assert(/Christmas/.test(await text()), 'categories listed in sheet');
await page.locator('.sheet.catpick [data-togglepick]').click();
await page.waitForFunction(() => !document.querySelector('.sheet.catpick'), null, { timeout: 5000 });

// Tools sheet: sort, filter, manage, quick add
await page.click('[data-shopmenu]');
await page.waitForFunction(() => /List options/i.test(document.body.innerText), null, { timeout: 5000 });
assert(/Manage categories/i.test(await text()), 'manage should live in the tools sheet');
assert(/Quick add/i.test(await text()), 'quick add should be reachable from the tools sheet');
await page.click('[data-ssort="added"]');
await page.waitForFunction(() => !/List options/i.test(document.body.innerText), null, { timeout: 5000 });

// More toggle reveals qty/note only then
await page.click('[data-qmore]');
await page.waitForSelector('#q-qty');
assert(await page.locator('#q-note').count(), 'note field missing after more');
await page.click('[data-qmore]');
await page.waitForFunction(() => !document.getElementById('q-qty'), null, { timeout: 5000 });


if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
console.log('SHOP CHECKS PASSED on', base);
await browser.close();
