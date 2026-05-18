/**
 * SeaConnect — Mobile screenshot sweep (390×844 — iPhone 14 Pro)
 * Also sweeps at 768px (tablet) for comparison.
 *
 * Run: node e2e/mobile-sweep.mjs
 * Output: screenshots/mobile/ and screenshots/tablet/
 */

import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'

const BASE  = 'http://localhost:3010'
const ADMIN = 'http://localhost:3011'

const VIEWPORTS = [
  { name: 'mobile',  width: 390,  height: 844  },  // iPhone 14 Pro
  { name: 'tablet',  width: 768,  height: 1024 },  // iPad
]

const PAGES = [
  // ── Public ────────────────────────────────────────────────────────────
  { slug: '01-home-ar',             url: `${BASE}/ar`,                           wait: 1500 },
  { slug: '02-home-en',             url: `${BASE}/en`,                           wait: 1500 },
  { slug: '03-yachts-ar',           url: `${BASE}/ar/yachts`,                    wait: 1200 },
  { slug: '04-yachts-en',           url: `${BASE}/en/yachts`,                    wait: 1200 },
  { slug: '05-yacht-detail-ar',     url: `${BASE}/ar/yachts`,                    wait: 1200, clickFirst: '.boat-card' },
  { slug: '06-marketplace-ar',      url: `${BASE}/ar/marketplace`,               wait: 1200 },
  { slug: '07-marketplace-en',      url: `${BASE}/en/marketplace`,               wait: 1200 },
  { slug: '08-competitions-ar',     url: `${BASE}/ar/competitions`,              wait: 1200 },
  { slug: '09-competitions-en',     url: `${BASE}/en/competitions`,              wait: 1200 },
  { slug: '10-weather-ar',          url: `${BASE}/ar/weather`,                   wait: 1200 },
  { slug: '11-weather-en',          url: `${BASE}/en/weather`,                   wait: 1200 },
  { slug: '12-fishing-guide-ar',    url: `${BASE}/ar/fishing-guide`,             wait: 1200 },
  { slug: '13-fishing-guide-en',    url: `${BASE}/en/fishing-guide`,             wait: 1200 },
  { slug: '14-map-ar',              url: `${BASE}/ar/map`,                       wait: 2000 },
  { slug: '15-search-ar',           url: `${BASE}/ar/search?q=صيد`,              wait: 1200 },
  { slug: '16-search-en',           url: `${BASE}/en/search?q=fishing`,          wait: 1200 },
  // ── Auth ──────────────────────────────────────────────────────────────
  { slug: '17-login-ar',            url: `${BASE}/ar/login`,                     wait: 800  },
  { slug: '18-login-en',            url: `${BASE}/en/login`,                     wait: 800  },
  { slug: '19-register-ar',         url: `${BASE}/ar/register`,                  wait: 800  },
  { slug: '20-register-en',         url: `${BASE}/en/register`,                  wait: 800  },
  // ── Account pages (guest → shows redirect/guard state) ────────────────
  { slug: '21-notifications-ar',    url: `${BASE}/ar/notifications`,             wait: 800  },
  { slug: '22-settings-ar',         url: `${BASE}/ar/settings`,                  wait: 800  },
  { slug: '23-cart-ar',             url: `${BASE}/ar/cart`,                      wait: 800  },
  { slug: '24-bookings-ar',         url: `${BASE}/ar/bookings`,                  wait: 800  },
  // ── Owner dashboard (guard state) ─────────────────────────────────────
  { slug: '25-owner-dashboard-ar',  url: `${BASE}/ar/owner/dashboard`,           wait: 1000 },
  { slug: '26-owner-calendar-ar',   url: `${BASE}/ar/owner/calendar`,            wait: 1000 },
  { slug: '27-owner-bookings-ar',   url: `${BASE}/ar/owner/bookings`,            wait: 1000 },
  { slug: '28-owner-yachts-ar',     url: `${BASE}/ar/owner/yachts`,              wait: 1000 },
  { slug: '29-owner-payouts-ar',    url: `${BASE}/ar/owner/payouts`,             wait: 1000 },
  { slug: '30-owner-onboarding-ar', url: `${BASE}/ar/owner/onboarding`,          wait: 1000 },
  // ── Vendor dashboard (guard state) ────────────────────────────────────
  { slug: '31-vendor-dashboard-ar', url: `${BASE}/ar/vendor`,                    wait: 1000 },
  { slug: '32-vendor-products-ar',  url: `${BASE}/ar/vendor/products`,           wait: 1000 },
  { slug: '33-vendor-orders-ar',    url: `${BASE}/ar/vendor/orders`,             wait: 1000 },
  { slug: '34-vendor-calendar-ar',  url: `${BASE}/ar/vendor/calendar`,           wait: 1000 },
  { slug: '35-vendor-payouts-ar',   url: `${BASE}/ar/vendor/payouts`,            wait: 1000 },
]

// ── Issues collector ──────────────────────────────────────────────────────────
const allIssues = []

async function capturePage(page, entry, outDir, vpName) {
  const issues = []
  let httpStatus = 200
  let jsErrors  = []
  let netFails  = []

  page.on('pageerror', (err) => jsErrors.push(err.message.slice(0, 120)))
  page.on('requestfailed', (req) => {
    const url = req.url()
    if (!url.includes('favicon') && !url.includes('_next/static')) {
      netFails.push(`${req.failure()?.errorText ?? 'fail'}: ${url.split('?')[0].slice(-60)}`)
    }
  })

  let redirected = false
  const resp = await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null)
  if (resp) {
    httpStatus = resp.status()
    if (resp.url() !== entry.url) redirected = true
  }

  await page.waitForTimeout(entry.wait ?? 1000)

  // Optional: click first matching element (for detail page)
  if (entry.clickFirst) {
    try {
      await page.click(entry.clickFirst, { timeout: 3000 })
      await page.waitForTimeout(1000)
    } catch { /* card may not exist */ }
  }

  // Capture full-page screenshot
  const filename = `${outDir}/${entry.slug}.png`
  await page.screenshot({ path: filename, fullPage: true })

  // ── Issue detection ────────────────────────────────────────────────────
  // 1. HTTP errors
  if (httpStatus >= 400) issues.push(`HTTP ${httpStatus}`)

  // 2. JS errors
  if (jsErrors.length) issues.push(`JS errors: ${jsErrors.slice(0,2).join(' | ')}`)

  // 3. Network failures (excluding benign)
  if (netFails.length) issues.push(`Net fail: ${netFails.slice(0,2).join(' | ')}`)

  // 4. Redirected (may be intentional auth guard)
  if (redirected) issues.push(`Redirected → ${page.url().split('?')[0].slice(-50)}`)

  // 5. Horizontal overflow — inject quick check
  const overflows = await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth
    const viewW = window.innerWidth
    if (docW <= viewW) return []
    // Find culprit elements
    const culprits = []
    document.querySelectorAll('*').forEach((el) => {
      if (el.scrollWidth > viewW + 4) {
        const tag = el.tagName.toLowerCase()
        const cls = Array.from(el.classList).slice(0,2).join('.')
        culprits.push(`${tag}${cls ? '.' + cls : ''}`)
      }
    })
    return [...new Set(culprits)].slice(0, 4)
  }).catch(() => [])
  if (overflows.length) issues.push(`H-overflow: ${overflows.join(', ')}`)

  // 6. Blank page check (no visible text content)
  const bodyText = await page.evaluate(() =>
    document.body?.innerText?.trim().length ?? 0
  ).catch(() => 0)
  if (bodyText < 20 && !entry.url.includes('/map')) issues.push('Possibly blank page')

  // 7. Fixed-width inline styles that break mobile
  const hardWidths = await page.evaluate(() => {
    const els = document.querySelectorAll('[style]')
    const hits = []
    for (const el of els) {
      const w = el.style.width
      if (w && w.endsWith('px') && parseInt(w) > 400) {
        hits.push(`${el.tagName.toLowerCase()}: width=${w}`)
      }
    }
    return hits.slice(0, 3)
  }).catch(() => [])
  if (hardWidths.length) issues.push(`Fixed px widths: ${hardWidths.join(' | ')}`)

  if (issues.length) {
    allIssues.push({ page: entry.slug, viewport: vpName, issues })
  }

  return { issues, filename }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true })

for (const vp of VIEWPORTS) {
  const outDir = `/mnt/e/Work/Projects/SeaConnect/screenshots/${vp.name}`
  mkdirSync(outDir, { recursive: true })

  console.log(`\n▶ ${vp.name.toUpperCase()} (${vp.width}×${vp.height}) — ${PAGES.length} pages`)

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    locale: 'ar-EG',
  })

  for (const entry of PAGES) {
    const page = await context.newPage()
    try {
      const { issues } = await capturePage(page, entry, outDir, vp.name)
      const icon = issues.length ? '✗' : '✓'
      console.log(`  ${icon} ${entry.slug}${issues.length ? ' — ' + issues[0] : ''}`)
    } catch (err) {
      console.log(`  ✗ ${entry.slug} — EXCEPTION: ${err.message.slice(0,80)}`)
      allIssues.push({ page: entry.slug, viewport: vp.name, issues: [`Exception: ${err.message.slice(0,80)}`] })
    } finally {
      await page.close()
    }
  }

  await context.close()
}

await browser.close()

// ── Report ────────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70))
console.log('MOBILE SWEEP REPORT')
console.log('═'.repeat(70))

if (allIssues.length === 0) {
  console.log('✅  All pages passed — no issues detected')
} else {
  const byPage = {}
  for (const { page, viewport, issues } of allIssues) {
    const key = `${page} [${viewport}]`
    byPage[key] = issues
  }
  for (const [key, issues] of Object.entries(byPage)) {
    console.log(`\n❌  ${key}`)
    for (const iss of issues) console.log(`     • ${iss}`)
  }
}

const reportPath = '/mnt/e/Work/Projects/SeaConnect/screenshots/mobile-report.json'
writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), issues: allIssues }, null, 2))
console.log(`\nReport → ${reportPath}`)
console.log(`Screenshots → /mnt/e/Work/Projects/SeaConnect/screenshots/mobile/`)
console.log(`            → /mnt/e/Work/Projects/SeaConnect/screenshots/tablet/`)
