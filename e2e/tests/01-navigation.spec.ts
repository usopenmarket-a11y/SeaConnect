/**
 * Navigation & URL routing tests
 * Verifies every public page loads, nav links resolve, locale switching works,
 * and 404 fallback is correct.
 */
import { test, expect } from '@playwright/test'

// Titles are set by generateMetadata — all pages use "SeaConnect" as brand suffix.
// Match the actual titles returned by the server.
const PUBLIC_ROUTES = [
  { path: '/en',               title: /SeaConnect/,         label: 'Home EN' },
  { path: '/ar',               title: /سي كونكت|SeaConnect/,  label: 'Home AR' },
  { path: '/en/yachts',        title: /SeaConnect|Yacht/i,  label: 'Yachts EN' },
  { path: '/ar/yachts',        title: /القوارب|سي كونكت/,   label: 'Yachts AR' },
  { path: '/en/marketplace',   title: /SeaConnect/,         label: 'Marketplace EN' },
  { path: '/ar/marketplace',   title: /SeaConnect|سي كونكت/,label: 'Marketplace AR' },
  { path: '/en/competitions',  title: /SeaConnect/,         label: 'Competitions EN' },
  { path: '/ar/competitions',  title: /SeaConnect|سي كونكت/,label: 'Competitions AR' },
  { path: '/en/login',         title: /SeaConnect/,         label: 'Login EN' },
  { path: '/ar/login',         title: /SeaConnect|سي كونكت/,label: 'Login AR' },
  { path: '/en/register',      title: /SeaConnect/,         label: 'Register EN' },
  { path: '/ar/register',      title: /SeaConnect|سي كونكت/,label: 'Register AR' },
]

test.describe('Public page routing', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.label} — ${route.path} returns 200`, async ({ page }) => {
      const response = await page.goto(route.path)
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(route.title)
    })
  }
})

test.describe('Nav bar links', () => {
  test('EN nav — all links resolve without 404', async ({ page }) => {
    await page.goto('/en')
    const navLinks = page.locator('nav a[href]')
    const count = await navLinks.count()
    expect(count).toBeGreaterThan(3)

    const hrefs: string[] = []
    for (let i = 0; i < count; i++) {
      const href = await navLinks.nth(i).getAttribute('href')
      // Skip owner/vendor routes that require auth (will 404 redirect or auth-guard)
      if (href && href.startsWith('/') && !href.includes('#')
          && !href.includes('/owner/') && !href.includes('/vendor/')
          && !href.includes('/new-listing')) {
        hrefs.push(href)
      }
    }

    for (const href of hrefs) {
      const res = await page.goto(href)
      expect(res?.status(), `Nav link ${href} returned non-200`).toBeLessThan(400)
    }
  })

  test('AR nav — logo links to /ar home', async ({ page }) => {
    await page.goto('/ar')
    const logo = page.locator('nav .nav-logo, nav a[aria-label*="سي كونكت"]').first()
    await expect(logo).toBeVisible()
    const href = await logo.getAttribute('href')
    expect(href).toMatch(/\/ar/)
  })
})

test.describe('Locale switching', () => {
  test('/ redirects to /ar or /en', async ({ page }) => {
    const res = await page.goto('/')
    // Should redirect to a locale-prefixed URL
    expect(page.url()).toMatch(/\/(ar|en)/)
  })

  test('EN page has dir=ltr', async ({ page }) => {
    await page.goto('/en')
    // dir is set on the .app-shell div, not on html/body
    const dirEl = page.locator('[dir]').first()
    await expect(dirEl).toBeVisible()
    const dir = await dirEl.getAttribute('dir')
    expect(dir).toBe('ltr')
  })

  test('AR page has dir=rtl', async ({ page }) => {
    await page.goto('/ar')
    const dirEl = page.locator('[dir]').first()
    await expect(dirEl).toBeVisible()
    const dir = await dirEl.getAttribute('dir')
    expect(dir).toBe('rtl')
  })
})

test.describe('404 handling', () => {
  test('unknown route returns 404 page not a crash', async ({ page }) => {
    const res = await page.goto('/en/this-page-does-not-exist-xyz')
    // Next.js returns 404 for unknown routes
    expect(res?.status()).toBe(404)
    // Should not be a blank page or JS error
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(5)
  })
})
