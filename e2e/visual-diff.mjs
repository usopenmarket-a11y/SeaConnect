/**
 * visual-diff.mjs
 * Screenshots design prototype (local HTTP) vs live app, saves PNGs to /tmp/seaconnect-diff/
 *
 * Pre-requisites:
 *   - Design served at http://localhost:8099 (python3 -m http.server 8099 --directory Design/)
 *   - App running at http://localhost:3010
 *   - API running at http://localhost:8010
 *
 * Run: node visual-diff.mjs
 */

import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = '/tmp/seaconnect-diff';
mkdirSync(OUT, { recursive: true });

// Design served over HTTP (avoids CORS blocking Babel's XHR fetch of .jsx files)
const DESIGN_BASE = 'http://localhost:8099/SeaConnect.html';
const APP_BASE    = 'http://localhost:3010';
const API_BASE    = 'http://localhost:8010';
const W = 1440;
const H = 900;

// Credentials for authenticated screens
const OWNER_CREDS  = { email: 'owner@seaconnect.local',  password: 'admin123' };

// [name, designPage (localStorage sc-page), designRole, appPath, auth?]
const SCREENS = [
  { name: '01-home',            designPage: 'home',   designRole: 'customer', app: '/ar' },
  { name: '02-yachts',          designPage: 'boats',  designRole: 'customer', app: '/ar/yachts' },
  { name: '03-yacht-detail',    designPage: 'detail', designRole: 'customer', app: null }, // dynamic — fetched below
  { name: '04-marketplace',     designPage: 'market', designRole: 'customer', app: '/ar/marketplace' },
  { name: '05-competitions',    designPage: 'comps',  designRole: 'customer', app: '/ar/competitions' },
  { name: '06-owner-dashboard', designPage: 'dash',   designRole: 'seller',   app: '/ar/owner/dashboard', auth: OWNER_CREDS },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getFirstYachtId() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/yachts/?ordering=-created_at`);
    const data = await res.json();
    return data.results?.[0]?.id ?? null;
  } catch { return null; }
}


async function screenshotDesign(ctx, screen) {
  const page = await ctx.newPage();
  try {
    // Set localStorage then reload so React picks up the page + role state
    await page.goto(DESIGN_BASE, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.evaluate(({ pg, role }) => {
      localStorage.setItem('sc-page', pg);
      localStorage.setItem('sc-role', role);
    }, { pg: screen.designPage, role: screen.designRole });

    await page.goto(DESIGN_BASE, { waitUntil: 'load', timeout: 40_000 });
    // Wait for Babel to compile + React to mount
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    }, { timeout: 40_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);

    const path = `${OUT}/${screen.name}--A-design.png`;
    await page.screenshot({ path, fullPage: true });
    console.log(`  ✓ design  → ${path}`);
  } catch (e) {
    console.warn(`  ✗ design failed: ${e.message}`);
  } finally {
    await page.close();
  }
}

async function screenshotApp(ctx, screen, creds) {
  const page = await ctx.newPage();
  try {
    if (creds) {
      // Log in via the real login form. Token lives in module memory (ADR-009),
      // so we must stay on the same page and use client-side navigation only —
      // any full page reload (page.goto) wipes the token from module memory.
      await page.goto(`${APP_BASE}/ar/login`, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForSelector('#email', { timeout: 10_000 });
      await page.fill('#email', creds.email);
      await page.fill('#password', creds.password);
      await page.click('button[type="submit"]');
      // Wait for client-side redirect away from login
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15_000 });
      await page.waitForTimeout(400);
      // Client-side navigate using Next.js router (preserves module memory — no full reload)
      await page.evaluate((href) => {
        if (window.next?.router) {
          window.next.router.push(href);
        } else {
          // Fallback: find matching <a> or use history API
          const a = document.querySelector(`a[href="${href}"]`);
          if (a) { a.click(); return; }
          window.history.pushState({}, '', href);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }, screen.app);
      // Wait for the navigation to complete and component to render
      await page.waitForTimeout(3000);
    } else {
      await page.goto(`${APP_BASE}${screen.app}`, { waitUntil: 'networkidle', timeout: 35_000 });
    }

    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);

    const path = `${OUT}/${screen.name}--B-app.png`;
    await page.screenshot({ path, fullPage: true });
    console.log(`  ✓ app     → ${path}`);
  } catch (e) {
    console.warn(`  ✗ app failed: ${e.message}`);
  } finally {
    await page.close();
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  // Resolve dynamic yacht ID
  const yachtId = await getFirstYachtId();
  if (yachtId) {
    const detailScreen = SCREENS.find(s => s.name === '03-yacht-detail');
    detailScreen.app = `/ar/yachts/${yachtId}`;
    console.log(`Using yacht ID: ${yachtId}`);
  } else {
    console.warn('Could not fetch yacht ID — skipping detail screen');
    SCREENS.find(s => s.name === '03-yacht-detail').app = null;
  }

  const browser = await chromium.launch({ headless: true });

  for (const screen of SCREENS) {
    if (!screen.app) {
      console.log(`\n── ${screen.name} — SKIPPED (no app path) ──`);
      continue;
    }
    console.log(`\n── ${screen.name} ──`);
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });

    await Promise.all([
      screenshotDesign(ctx, screen),
      screenshotApp(ctx, screen, screen.auth ?? null),
    ]);
    await ctx.close();
  }

  await browser.close();
  console.log(`\n✓ All screenshots saved to ${OUT}/`);
}

run().catch(e => { console.error(e); process.exit(1); });
