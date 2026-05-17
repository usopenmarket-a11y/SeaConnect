/**
 * SeaConnect — full-system Puppeteer screenshot sweep
 * Captures every public + owner + vendor + admin page in AR and EN.
 * Saves to ./screenshots/<page-slug>.png
 * Logs all console errors, network failures, and missing elements.
 */

import puppeteer from 'puppeteer'
import { writeFileSync } from 'fs'

const BASE = 'http://localhost:3010'
const ADMIN = 'http://localhost:3011'
const OUT = '/mnt/e/Work/Projects/SeaConnect/screenshots'

const PAGES = [
  // ── Public ──────────────────────────────────────────────────────────────
  { slug: '01-home-ar',          url: `${BASE}/ar`,                       auth: false },
  { slug: '02-home-en',          url: `${BASE}/en`,                       auth: false },
  { slug: '03-yachts-ar',        url: `${BASE}/ar/yachts`,                auth: false },
  { slug: '04-yachts-en',        url: `${BASE}/en/yachts`,                auth: false },
  { slug: '05-marketplace-ar',   url: `${BASE}/ar/marketplace`,           auth: false },
  { slug: '06-marketplace-en',   url: `${BASE}/en/marketplace`,           auth: false },
  { slug: '07-competitions-ar',  url: `${BASE}/ar/competitions`,          auth: false },
  { slug: '08-weather-ar',       url: `${BASE}/ar/weather`,               auth: false },
  { slug: '09-fishing-guide-ar', url: `${BASE}/ar/fishing-guide`,         auth: false },
  { slug: '10-map-ar',           url: `${BASE}/ar/map`,                   auth: false },
  { slug: '11-search-ar',        url: `${BASE}/ar/search?q=صيد`,          auth: false },
  { slug: '12-search-en',        url: `${BASE}/en/search?q=fishing`,      auth: false },
  { slug: '13-notifications-ar', url: `${BASE}/ar/notifications`,         auth: false },
  { slug: '14-settings-ar',      url: `${BASE}/ar/settings`,              auth: false },
  // ── Auth ────────────────────────────────────────────────────────────────
  { slug: '15-login-ar',         url: `${BASE}/ar/login`,                 auth: false },
  { slug: '16-login-en',         url: `${BASE}/en/login`,                 auth: false },
  { slug: '17-register-ar',      url: `${BASE}/ar/register`,              auth: false },
  { slug: '18-register-en',      url: `${BASE}/en/register`,              auth: false },
  // ── Owner (needs auth — will redirect but we capture the redirect) ──────
  { slug: '19-owner-dashboard',  url: `${BASE}/ar/owner/dashboard`,       auth: false },
  { slug: '20-owner-calendar',   url: `${BASE}/ar/owner/calendar`,        auth: false },
  { slug: '21-owner-payouts',    url: `${BASE}/ar/owner/payouts`,         auth: false },
  { slug: '22-owner-yachts',     url: `${BASE}/ar/owner/yachts`,          auth: false },
  { slug: '23-owner-onboarding', url: `${BASE}/ar/owner/onboarding`,      auth: false },
  // ── Vendor ───────────────────────────────────────────────────────────────
  { slug: '24-vendor-dashboard', url: `${BASE}/ar/vendor`,                auth: false },
  { slug: '25-vendor-products',  url: `${BASE}/ar/vendor/products`,       auth: false },
  { slug: '26-vendor-orders',    url: `${BASE}/ar/vendor/orders`,         auth: false },
  { slug: '27-vendor-payouts',   url: `${BASE}/ar/vendor/payouts`,        auth: false },
  // ── Admin portal ────────────────────────────────────────────────────────
  { slug: '28-admin-dashboard',  url: `${ADMIN}/ar`,                      auth: false },
  { slug: '29-admin-kyc',        url: `${ADMIN}/ar/kyc`,                  auth: false },
  { slug: '30-admin-disputes',   url: `${ADMIN}/ar/disputes`,             auth: false },
  { slug: '31-admin-payouts',    url: `${ADMIN}/ar/payouts`,              auth: false },
  { slug: '32-admin-users',      url: `${ADMIN}/ar/users`,                auth: false },
]

const issues = []

async function capture(browser, { slug, url }) {
  const page = await browser.newPage()
  const pageIssues = []

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      pageIssues.push({ type: 'console-error', text: msg.text() })
    }
  })

  // Collect failed network requests
  page.on('requestfailed', req => {
    const url = req.url()
    // Ignore expected failures (analytics, fonts CDN in dev)
    if (!url.includes('googletagmanager') && !url.includes('fonts.googleapis')) {
      pageIssues.push({ type: 'network-fail', url, reason: req.failure()?.errorText })
    }
  })

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

  let status = 0
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    status = res?.status() ?? 0

    // Wait a bit for client-side hydration
    await new Promise(r => setTimeout(r, 2000))

    // Full-page screenshot
    await page.screenshot({
      path: `${OUT}/${slug}.png`,
      fullPage: true,
    })

    // Check for visible error boundaries
    const errorBoundary = await page.$('[data-error-boundary], .error-boundary, h2:has-text("Something went wrong")')
    if (errorBoundary) {
      pageIssues.push({ type: 'error-boundary', text: 'Error boundary rendered on page' })
    }

    // Check for 404/500 text
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500))
    if (/404|not found|500|internal server error/i.test(bodyText) && status !== 200) {
      pageIssues.push({ type: 'error-page', status, text: bodyText.slice(0, 200) })
    }

    console.log(`✓ ${slug} (${status})${pageIssues.length ? ` — ${pageIssues.length} issues` : ''}`)
  } catch (err) {
    pageIssues.push({ type: 'timeout-or-crash', error: err.message })
    console.log(`✗ ${slug} — ${err.message}`)
    // Still try a screenshot
    try { await page.screenshot({ path: `${OUT}/${slug}.png`, fullPage: false }) } catch {}
  }

  if (pageIssues.length) {
    issues.push({ page: slug, url, status, issues: pageIssues })
  }

  await page.close()
}

async function main() {
  console.log(`\n🔍 SeaConnect — screenshot sweep (${PAGES.length} pages)\n`)

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  for (const p of PAGES) {
    await capture(browser, p)
  }

  await browser.close()

  // Write issues report
  const report = {
    timestamp: new Date().toISOString(),
    total_pages: PAGES.length,
    pages_with_issues: issues.length,
    issues,
  }
  writeFileSync(`${OUT}/issues-report.json`, JSON.stringify(report, null, 2))

  console.log(`\n📊 Report: ${issues.length}/${PAGES.length} pages had issues`)
  console.log(`📁 Screenshots saved to ${OUT}/`)
  console.log(`📋 Full report: ${OUT}/issues-report.json\n`)

  if (issues.length) {
    console.log('── Issues summary ──────────────────────────────────────')
    for (const p of issues) {
      console.log(`\n❌ ${p.page} (${p.url})`)
      for (const i of p.issues) {
        console.log(`   • [${i.type}] ${i.text || i.error || i.url || ''}`)
      }
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
