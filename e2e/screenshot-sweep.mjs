/**
 * SeaConnect — full screenshot sweep using Playwright
 * Run: node e2e/screenshot-sweep.mjs
 * Output: screenshots/ directory
 */

import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'

const BASE  = 'http://localhost:3010'
const ADMIN = 'http://localhost:3011'
const OUT   = '/mnt/e/Work/Projects/SeaConnect/screenshots'
mkdirSync(OUT, { recursive: true })

const PAGES = [
  // Public
  { slug: '01-home-ar',           url: `${BASE}/ar` },
  { slug: '02-home-en',           url: `${BASE}/en` },
  { slug: '03-yachts-ar',         url: `${BASE}/ar/yachts` },
  { slug: '04-yachts-en',         url: `${BASE}/en/yachts` },
  { slug: '05-marketplace-ar',    url: `${BASE}/ar/marketplace` },
  { slug: '06-competitions-ar',   url: `${BASE}/ar/competitions` },
  { slug: '07-weather-ar',        url: `${BASE}/ar/weather` },
  { slug: '08-fishing-guide-ar',  url: `${BASE}/ar/fishing-guide` },
  { slug: '09-map-ar',            url: `${BASE}/ar/map` },
  { slug: '10-search-ar',         url: `${BASE}/ar/search?q=صيد` },
  { slug: '11-search-en',         url: `${BASE}/en/search?q=fishing` },
  { slug: '12-notifications-ar',  url: `${BASE}/ar/notifications` },
  { slug: '13-settings-ar',       url: `${BASE}/ar/settings` },
  // Auth
  { slug: '14-login-ar',          url: `${BASE}/ar/login` },
  { slug: '15-login-en',          url: `${BASE}/en/login` },
  { slug: '16-register-ar',       url: `${BASE}/ar/register` },
  { slug: '17-register-en',       url: `${BASE}/en/register` },
  // Owner (will redirect to login — captures redirect state)
  { slug: '18-owner-dashboard',   url: `${BASE}/ar/owner/dashboard` },
  { slug: '19-owner-calendar',    url: `${BASE}/ar/owner/calendar` },
  { slug: '20-owner-payouts',     url: `${BASE}/ar/owner/payouts` },
  { slug: '21-owner-yachts',      url: `${BASE}/ar/owner/yachts` },
  { slug: '22-owner-onboarding',  url: `${BASE}/ar/owner/onboarding` },
  { slug: '23-owner-new-yacht',   url: `${BASE}/ar/owner/yachts/new` },
  // Vendor
  { slug: '24-vendor-dashboard',  url: `${BASE}/ar/vendor` },
  { slug: '25-vendor-products',   url: `${BASE}/ar/vendor/products` },
  { slug: '26-vendor-orders',     url: `${BASE}/ar/vendor/orders` },
  { slug: '27-vendor-calendar',   url: `${BASE}/ar/vendor/calendar` },
  { slug: '28-vendor-payouts',    url: `${BASE}/ar/vendor/payouts` },
  // Cart / Checkout
  { slug: '29-cart-ar',           url: `${BASE}/ar/cart` },
  { slug: '30-checkout-ar',       url: `${BASE}/ar/checkout` },
  // Admin portal
  { slug: '31-admin-dashboard',   url: `${ADMIN}/ar` },
  { slug: '32-admin-kyc',         url: `${ADMIN}/ar/kyc` },
  { slug: '33-admin-disputes',    url: `${ADMIN}/ar/disputes` },
  { slug: '34-admin-payouts',     url: `${ADMIN}/ar/payouts` },
  { slug: '35-admin-users',       url: `${ADMIN}/ar/users` },
]

const issues = []

async function capture(context, { slug, url }) {
  const page = await context.newPage()
  const pageIssues = []

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text()
      // Filter noise
      if (!txt.includes('googletagmanager') && !txt.includes('favicon') && !txt.includes('LeafletMap')) {
        pageIssues.push({ type: 'js-error', text: txt.slice(0, 300) })
      }
    }
  })

  page.on('requestfailed', req => {
    const u = req.url()
    if (!u.includes('googletagmanager') && !u.includes('fonts.googleapis') && !u.includes('hot-update')) {
      pageIssues.push({ type: 'network-fail', url: u, reason: req.failure()?.errorText })
    }
  })

  let httpStatus = 0
  let finalUrl = url

  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 })
    httpStatus = res?.status() ?? 0
    finalUrl = page.url()

    // Wait for hydration
    await page.waitForTimeout(2500)

    // Screenshot
    await page.screenshot({ path: `${OUT}/${slug}.png`, fullPage: true })

    // Detect error states
    const title = await page.title()
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 800) ?? '')

    // Check for Next.js error overlay
    const hasErrorOverlay = await page.locator('nextjs-portal, #__next-build-watcher').count()
    if (hasErrorOverlay > 0) {
      pageIssues.push({ type: 'nextjs-error-overlay', text: 'Next.js error overlay visible' })
    }

    // Check for blank page (no meaningful content)
    if (bodyText.trim().length < 50 && httpStatus === 200) {
      pageIssues.push({ type: 'blank-page', text: `Only ${bodyText.trim().length} chars rendered` })
    }

    // Check for server error text
    if (/application error|internal server error|unhandled.*error/i.test(bodyText)) {
      pageIssues.push({ type: 'server-error', text: bodyText.slice(0, 300) })
    }

    // Check for 404 when not expected
    if (httpStatus === 404) {
      pageIssues.push({ type: 'http-404', text: title })
    }
    if (httpStatus >= 500) {
      pageIssues.push({ type: `http-${httpStatus}`, text: bodyText.slice(0, 200) })
    }

    // Note redirects
    if (finalUrl !== url && !finalUrl.includes('login')) {
      pageIssues.push({ type: 'unexpected-redirect', from: url, to: finalUrl })
    }

    const icon = pageIssues.length ? '⚠' : '✓'
    console.log(`${icon} [${httpStatus}] ${slug}${pageIssues.length ? ` → ${pageIssues.map(i=>i.type).join(', ')}` : ''}`)

  } catch (err) {
    pageIssues.push({ type: 'crash', error: err.message })
    console.log(`✗ ${slug} — ${err.message.slice(0, 100)}`)
    try { await page.screenshot({ path: `${OUT}/${slug}.png`, fullPage: false, timeout: 5000 }) } catch {}
  }

  if (pageIssues.length) {
    issues.push({ page: slug, url, final_url: finalUrl, status: httpStatus, issues: pageIssues })
  }

  await page.close()
}

async function main() {
  console.log(`\n🚢 SeaConnect screenshot sweep — ${PAGES.length} pages\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar',
    timezoneId: 'Africa/Cairo',
  })

  for (const p of PAGES) {
    await capture(context, p)
  }

  await browser.close()

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    base_url: BASE,
    admin_url: ADMIN,
    total: PAGES.length,
    clean: PAGES.length - issues.length,
    with_issues: issues.length,
    issues,
  }
  writeFileSync(`${OUT}/issues-report.json`, JSON.stringify(report, null, 2))

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`📸 ${PAGES.length} pages captured → ${OUT}/`)
  console.log(`✅ Clean: ${report.clean}   ⚠️  Issues: ${report.with_issues}`)

  if (issues.length > 0) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log('ISSUES FOUND:')
    console.log(`${'═'.repeat(60)}`)
    for (const p of issues) {
      console.log(`\n❌ ${p.page}`)
      console.log(`   URL: ${p.url}${p.final_url !== p.url ? ` → ${p.final_url}` : ''}`)
      console.log(`   HTTP: ${p.status}`)
      for (const i of p.issues) {
        const detail = i.text || i.error || i.url || JSON.stringify(i)
        console.log(`   • [${i.type}] ${detail.slice(0, 200)}`)
      }
    }
  }

  console.log(`\n📋 Full report: ${OUT}/issues-report.json\n`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
