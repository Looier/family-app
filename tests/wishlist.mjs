/** Phone-viewport: add a wishlist item via Quick Add and via the Wishlists form, then assert it survives reload. */
import pkg from '/tmp/pw/node_modules/playwright-core/index.js';
const { chromium } = pkg;

const base = (process.env.BASE_URL || 'http://127.0.0.1:5180').replace(/\/$/, '');
function assert(cond, msg) { if (!cond) throw new Error('CHECK FAIL: ' + msg); }

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR', e.message); });

const text = () => page.locator('body').innerText();
async function waitText(re, label, ms = 8000) {
  await page.waitForFunction(r => new RegExp(r, 'i').test(document.body.innerText), re, { timeout: ms });
  assert(new RegExp(re, 'i').test(await text()), (label || re) + ' text missing');
}

async function boot() {
  await page.goto(base + '/#/wishes', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('me', 'Thinus'));
  await page.reload({ waitUntil: 'networkidle' });
  await waitText('Wishlists', 'wishlists screen');
}

const stamp = Date.now().toString(36);
const qaName = 'QA wish ' + stamp;
const formName = 'Form wish ' + stamp;

await boot();

// --- Path 1: Quick Add > Wishlist item > Add ---
await page.click('button.fab[data-qaopen]');
await waitText('Quick add', 'qa sheet');
await page.click('[data-qakind="wish"]');
await waitText('Whose list', 'wish qa fields');
await page.fill('form[data-form="qa"] input[name="title"]', qaName);
await page.click('form[data-form="qa"] button.save');
await page.waitForFunction(n => document.body.innerText.includes(n), qaName, { timeout: 8000 });
assert((await text()).includes(qaName), 'QA wish not visible after add: ' + (await text()).slice(0, 400));
console.log('QA ADD OK', qaName);

await page.reload({ waitUntil: 'networkidle' });
await waitText('Wishlists', 'wishlists after reload 1');
await page.waitForFunction(n => document.body.innerText.includes(n), qaName, { timeout: 8000 });
assert((await text()).includes(qaName), 'QA wish lost after reload');
console.log('QA PERSIST OK');

// --- Path 2: Wishlists full form (#/wishes/new) > Save ---
await page.goto(base + '/#/wishes/new', { waitUntil: 'networkidle' });
await waitText('New wish', 'wish form');
await page.fill('form[data-form="wish"] input[name="name"]', formName);
await page.click('form[data-form="wish"] button.save');
await page.waitForFunction(n => document.body.innerText.includes(n), formName, { timeout: 8000 });
assert((await text()).includes(formName), 'form wish not visible after save: ' + (await text()).slice(0, 400));
assert((await text()).includes(qaName), 'QA wish disappeared after form save');
console.log('FORM ADD OK', formName);

await page.reload({ waitUntil: 'networkidle' });
await page.goto(base + '/#/wishes', { waitUntil: 'networkidle' });
await waitText('Wishlists', 'wishlists after reload 2');
await page.waitForFunction(({ a, b }) => document.body.innerText.includes(a) && document.body.innerText.includes(b), { a: qaName, b: formName }, { timeout: 8000 }).catch(async () => {
  throw new Error('persist wait failed. body=' + (await text()).slice(0, 800));
});
assert((await text()).includes(qaName) && (await text()).includes(formName), 'wishes lost after second reload');
console.log('FORM PERSIST OK');

// Starter recipes should appear in the book and be pickable as supper.
await page.goto(base + '/#/meals/book', { waitUntil: 'networkidle' });
await waitText('Chicken wraps', 'seed recipe in book');
await waitText('Chicken espetada', 'braai seed recipe in book');
await waitText('Spaghetti Bolognese', 'everyday seed recipe in book');
console.log('SEED RECIPES IN BOOK OK');

await page.goto(base + '/#/plan', { waitUntil: 'networkidle' });
await waitText('Weekly plan|Week of|Plan mode', 'plan screen');
const supper = page.locator('[data-picksup]').first();
if (await supper.count()) {
  await supper.click();
} else {
  const mealslot = page.locator('button[data-pick]').first();
  if (await mealslot.count()) await mealslot.click();
}
await page.waitForTimeout(400);
const body = await text();
assert(/Chicken wraps|Spaghetti Bolognese|Steak|Hotdogs/.test(body), 'seed recipes not pickable as supper: ' + body.slice(0, 500));
console.log('SEED RECIPES PICKABLE OK');

if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
console.log('ALL WISHLIST + SEED CHECKS PASSED on', base);
await browser.close();
