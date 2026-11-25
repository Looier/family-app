/** History / back-button checks for v2.3.1. Serve the production build with `npx vite preview --port 4173`, then `node tests/back.mjs` (needs playwright-core and Chrome). */
import pkg from '/tmp/pw/node_modules/playwright-core/index.js';
const { chromium } = pkg;

const base = (process.env.BASE_URL || 'http://127.0.0.1:5182').replace(/\/$/, '');
function assert(cond, msg) { if (!cond) throw new Error('CHECK FAIL: ' + msg); }

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
page.on('pageerror', e => { console.log('PAGEERROR', e.message); throw e; });

const text = () => page.locator('body').innerText();
const hash = () => page.evaluate(() => location.hash);
async function waitHash(re, label) {
  await page.waitForFunction(r => new RegExp(r).test(location.hash), re, { timeout: 5000 });
  assert(new RegExp(re).test(await hash()), (label || re) + ' hash=' + await hash());
}
async function waitText(re, label) {
  await page.waitForFunction(r => new RegExp(r, 'i').test(document.body.innerText), re, { timeout: 5000 });
  assert(new RegExp(re, 'i').test(await text()), (label || re) + ' text missing');
}

// Start behind a gate page so back-from-home can leave the app
await page.goto(base + '/gate.html', { waitUntil: 'networkidle' });
assert(/exit-gate/.test(await text()), 'gate page');

await page.goto(base + '/#demo-home', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('me', 'Thinus'));
await page.reload({ waitUntil: 'networkidle' });
await waitText('Good (morning|afternoon|evening), Thinus', 'home greeting');
await waitHash(/^#\/home$/, 'canonical home');
console.log('HOME', await hash());

// --- More > Wishlists > item form, then goBack repeatedly ---
await page.click('button.bnav-i[data-mod="more"]');
await waitText('Wishlists', 'more sheet');
await waitHash(/more=1/, 'more in hash');
console.log('MORE', await hash());

await page.click('[data-mod="wishes"]');
await waitText('Wishlists', 'wishes page');
await waitHash(/^#\/wishes$/, 'wishes hash');
assert(!/more=1/.test(await hash()), 'more closed on wishes');
console.log('WISHES', await hash(), (await text()).slice(0, 200));

if (await page.locator('[data-wedit]').count()) await page.locator('[data-wedit]').first().click();
else await page.click('[data-wnew]');
await waitText('Edit wish|New wish|Whose list', 'wish form');
await waitHash(/#\/wishes\//, 'wish form hash');
console.log('WISH FORM', await hash());

await page.goBack();
await waitHash(/^#\/wishes$/, 'back to wishes list');
await waitText('Wishlists', 'list after back');
assert(!/Whose list|Edit wish/.test(await text()) || /Lego|headphones/.test(await text()), 'form closed');
console.log('BACK 1 wishes list', await hash());

await page.goBack();
await waitHash(/more=1/, 'back to more sheet');
await waitText('Gift ideas, kept as a surprise', 'more grid');
console.log('BACK 2 more', await hash());

await page.goBack();
await waitHash(/^#\/home$/, 'back to home');
await waitText('Good (morning|afternoon|evening)', 'home after back');
console.log('BACK 3 home', await hash());

// --- Back at home root leaves the app ---
await page.goBack();
await page.waitForFunction(() => /exit-gate/.test(document.body.innerText) || location.pathname.includes('gate'), { timeout: 5000 });
assert(/exit-gate/.test(await text()) || /gate/.test(page.url()), 'left app to gate, url=' + page.url());
console.log('LEFT APP', page.url());

// Return to the app
await page.goto(base + '/#/home', { waitUntil: 'networkidle' });
await waitText('Good (morning|afternoon|evening)', 'home again');

// --- Shopping > category manage sheet ---
await page.click('button.bnav-i[data-mod="shopping"]');
await waitHash(/#\/shopping/, 'shopping');
await waitText('Food / Groceries|Add an item', 'shopping list');
await page.click('[data-shopmenu]');
await waitText('List options|Manage categories', 'tools sheet');
await waitHash(/tools/, 'tools hash');
await page.click('[data-manage]');
await waitText('Shopping categories', 'manage sheet');
await waitHash(/manage/, 'manage hash');
console.log('MANAGE', await hash());
await page.goBack();
await waitHash(/tools/, 'back to tools sheet');
await waitText('List options|Manage categories', 'tools after manage back');
await page.goBack();
await waitHash(/#\/shopping(\/?|\/list)?$/, 'back to shopping list');
await waitText('Add an item|Food / Groceries', 'list after manage back');
assert(!/Archive/.test(await text()) || /Food \/ Groceries/.test(await text()), 'manage closed');
console.log('BACK shopping', await hash());

// --- Plan mode ---
await page.click('button.bnav-i[data-mod="plan"]');
await waitHash(/#\/plan/, 'plan');
await waitText('Week of|This week|Plan mode', 'plan week');
await page.click('[data-mtab="plan"]');
await waitHash(/#\/plan\/plan/, 'plan mode hash');
await waitText('Drop-off|Pick-up|Supper', 'plan mode day');
console.log('PLAN MODE', await hash());
await page.goBack();
await waitHash(/^#\/plan\/?$/, 'back to plan week');
await waitText('Week of|This week', 'week view');
console.log('BACK plan week', await hash());

// --- In-app Cancel on a wish form ---
await page.click('button.bnav-i[data-mod="more"]');
await waitText('Wishlists');
await page.click('[data-mod="wishes"]');
await waitHash(/^#\/wishes$/);
if (await page.locator('[data-wedit]').count()) await page.locator('[data-wedit]').first().click();
else await page.click('[data-wnew]');
await waitHash(/#\/wishes\//);
await page.click('[data-cancel]');
await waitHash(/^#\/wishes$/, 'in-app cancel to list');
await waitText('Wishlists', 'list after cancel');
console.log('IN-APP cancel', await hash());

// --- In-app recipe back arrow ---
await page.goto(base + '/#/meals/book', { waitUntil: 'networkidle' });
await waitText('Spaghetti|Chicken|Boerewors|Recipes', 'recipe book');
await waitHash(/#\/meals\/book/);
await page.click('[data-rview]');
await waitHash(/detail|\/meals\/book\//, 'recipe detail');
await waitText('Ingredients|Add ingredients|Method', 'recipe detail body');
await page.click('[data-rback]');
await waitHash(/^#\/meals\/book\/?$/, 'in-app rback to book');
await waitText('Spaghetti|Chicken|＋ New category', 'book after rback');
console.log('IN-APP rback', await hash());

// --- Deep link + refresh (manage, wishes, plan mode) ---
for (const [h, re] of [
  ['#/shopping/manage', 'Shopping categories'],
  ['#/wishes', 'Wishlists'],
  ['#/plan/plan', 'Drop-off|Pick-up|Supper'],
  ['#/home?more=1', 'Gift ideas'],
  ['#/home?qa=1', 'Quick add'],
]) {
  await page.goto(base + '/' + h, { waitUntil: 'networkidle' });
  await waitText(re, 'deep ' + h);
  await page.reload({ waitUntil: 'networkidle' });
  await waitText(re, 'refresh ' + h);
  console.log('DEEP+REFRESH', h, 'ok');
}

// --- Dirty form: type, back, keep, then discard ---
await page.goto(base + '/#/wishes', { waitUntil: 'networkidle' });
await waitHash(/^#\/wishes$/);
if (await page.locator('[data-wedit]').count()) await page.locator('[data-wedit]').first().click();
else await page.click('[data-wnew]');
await waitHash(/#\/wishes\//);
await page.fill('input[name="name"]', 'Changed wish title xyz');
page.once('dialog', d => d.dismiss());
await page.goBack();
await page.waitForTimeout(400);
assert(/Changed wish title xyz|Edit wish|Whose list/.test(await text()), 'kept form after dismissing discard');
assert(/#\/wishes\//.test(await hash()), 'still on form hash ' + await hash());
console.log('DIRTY keep', await hash());
page.once('dialog', d => d.accept());
await page.goBack();
await waitHash(/^#\/wishes$/, 'discarded to list');
console.log('DIRTY discard', await hash());

// --- SW registered in prod build ---
const sw = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'no-api';
  const r = await navigator.serviceWorker.ready;
  return r.active?.scriptURL || r.installing?.scriptURL || 'ready-no-script';
});
console.log('SW', sw);
assert(/sw\.js/.test(sw), 'service worker ready: ' + sw);

console.log('ALL CHECKS PASSED');
await browser.close();
