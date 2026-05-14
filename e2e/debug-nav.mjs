import { chromium } from '@playwright/test';

const APP_BASE = 'http://localhost:3010';
const CREDS = { email: 'owner@seaconnect.local', password: 'admin123' };

async function run() {
  const browser = await chromium.launch({ headless: false }); // headed to watch
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Login
  await page.goto(`${APP_BASE}/ar/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', CREDS.email);
  await page.fill('#password', CREDS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15_000 });
  console.log('After login URL:', page.url());
  await page.waitForTimeout(500);

  // Check what's in window after login
  const hasRouter = await page.evaluate(() => typeof window.__NEXT_DATA__ !== 'undefined');
  console.log('Has Next data:', hasRouter);

  // Try clicking a link to owner dashboard if it exists
  const ownerLink = await page.$('a[href*="owner/dashboard"]');
  console.log('Owner dashboard link found:', !!ownerLink);

  // Try using Next router via window
  const result = await page.evaluate(() => {
    // Look for the Next.js router
    const keys = Object.keys(window).filter(k => k.toLowerCase().includes('next') || k.toLowerCase().includes('router'));
    return keys;
  });
  console.log('Window Next keys:', result);

  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/seaconnect-diff/debug-nav.png' });
  console.log('Final URL:', page.url());
  await browser.close();
}
run().catch(e => { console.error(e); process.exit(1); });
