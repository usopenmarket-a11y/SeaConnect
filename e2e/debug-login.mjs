import { chromium } from '@playwright/test';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  page.on('response', r => {
    if (r.url().includes('auth') || r.url().includes('login')) console.log('RES:', r.status(), r.url());
  });

  await page.goto('http://localhost:3010/ar/login', { waitUntil: 'networkidle', timeout: 30_000 });
  console.log('URL:', page.url());

  const emailInput = await page.$('#email');
  console.log('email input found:', !!emailInput);

  await page.fill('#email', 'owner@seaconnect.local');
  await page.fill('#password', 'admin123');

  const submitBtn = await page.$('button[type="submit"]');
  console.log('submit btn:', !!submitBtn, await submitBtn?.textContent());

  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  console.log('URL after submit:', page.url());

  await page.screenshot({ path: '/tmp/seaconnect-diff/debug-after.png' });
  await browser.close();
}
run().catch(e => { console.error(e); process.exit(1); });
