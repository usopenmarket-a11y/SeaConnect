import { chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESIGN_FILE = `file://${resolve(__dirname, '../Design/SeaConnect.html')}`;

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Capture console messages and errors
  page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR', err.message));

  console.log('Loading design file...');
  await page.goto(DESIGN_FILE, { waitUntil: 'load', timeout: 60_000 });
  console.log('Load event fired');

  // Wait a bit for Babel
  await page.waitForTimeout(5000);

  const rootHtml = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML.slice(0, 500) : 'ROOT NOT FOUND';
  });
  console.log('ROOT HTML:', rootHtml);

  const scripts = await page.evaluate(() =>
    Array.from(document.scripts).map(s => ({ src: s.src, type: s.type, loaded: s.readyState }))
  );
  console.log('SCRIPTS:', JSON.stringify(scripts, null, 2));

  await page.screenshot({ path: '/tmp/seaconnect-diff/debug-design.png', fullPage: false });
  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
