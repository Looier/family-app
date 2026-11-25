/** 412x915 screenshots for 0.2.7: Home, Shop, Health entry (wake + pain side), Plan. */
import pkg from '/tmp/pw/node_modules/playwright-core/index.js';
const { chromium } = pkg;
import { mkdir } from 'node:fs/promises';

const base = (process.env.BASE_URL || 'http://127.0.0.1:5180').replace(/\/$/, '');
const shots = process.env.SHOTS || '/workspace/grok-bot/family-app/screenshots';
await mkdir(shots, { recursive: true });

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 412, height: 915 },
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
  serviceWorkers: 'block',
});
const page = await context.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.emulateMedia({ colorScheme: 'dark' });
await page.goto(base + '/#/home', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('me', 'Thinus'));
await page.reload({ waitUntil: 'networkidle' });

// Seed a little shop + health data so screenshots are representative
await page.evaluate(async () => {
  // Wait for app boot
  await new Promise(r => setTimeout(r, 400));
});

// Home
await page.goto(base + '/#/home', { waitUntil: 'networkidle' });
await page.waitForFunction(() => /Today|The kids|Plan/i.test(document.body.innerText), null, { timeout: 8000 });
await page.screenshot({ path: `${shots}/v027-home.png`, fullPage: false });
console.log('SHOT home');

// Shop: add items if needed, then shoot
await page.goto(base + '/#/shopping', { waitUntil: 'networkidle' });
await page.waitForSelector('.shopq input[name="name"]', { timeout: 8000 });
const already = await page.locator('body').innerText();
if (!/Bread/.test(already)) {
  for (const name of ['Bread', 'Strawberries', 'Yoghurt']) {
    await page.fill('.shopq input[name="name"]', name);
    await page.click('.shopq .addbtn');
    await page.waitForFunction(n => document.body.innerText.includes(n), name, { timeout: 5000 });
  }
}
await page.waitForTimeout(300);
await page.screenshot({ path: `${shots}/v027-shop.png`, fullPage: false });
console.log('SHOT shop');

// Health entry: wake options + pain side picker visible
await page.goto(base + '/#/health/entry', { waitUntil: 'networkidle' });
await page.waitForFunction(() => /How did they wake up/i.test(document.body.innerText), null, { timeout: 8000 });
if (await page.locator('[data-child="Jocelyn"]').count()) await page.click('[data-child="Jocelyn"]');
await page.click('[data-wake="pain"]');
await page.waitForSelector('[data-testid="pain-box"]', { timeout: 5000 });
await page.click('[data-ploc="Knee"]');
await page.waitForSelector('[data-testid="pain-side"]', { timeout: 5000 });
await page.evaluate(() => {
  const sel = document.querySelector('[data-wake].sel') || document.querySelector('[data-testid="wake-opts"]');
  if (sel) sel.scrollIntoView({ block: 'start' });
});
await page.waitForTimeout(250);
await page.screenshot({ path: `${shots}/v027-health-entry.png`, fullPage: false });
console.log('SHOT health-entry');

// Plan
await page.goto(base + '/#/plan', { waitUntil: 'networkidle' });
await page.waitForFunction(() => /Week of|Today/i.test(document.body.innerText), null, { timeout: 8000 });
await page.screenshot({ path: `${shots}/v027-plan.png`, fullPage: false });
console.log('SHOT plan');

console.log('ALL SHOTS in', shots);
await browser.close();
