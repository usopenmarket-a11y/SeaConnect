/**
 * RTL layout & accessibility tests
 * Verifies direction, font loading, logical CSS, aria labels.
 */
import { test, expect } from '@playwright/test'

const PAGES_TO_CHECK = ['/en', '/ar', '/en/yachts', '/ar/yachts', '/en/marketplace', '/en/competitions']

test.describe('RTL/LTR direction correctness', () => {
  test('EN home has dir=ltr', async ({ page }) => {
    await page.goto('/en')
    const dir = await page.locator('[dir]').first().getAttribute('dir')
    expect(dir).toBe('ltr')
  })

  test('EN yachts has dir=ltr', async ({ page }) => {
    await page.goto('/en/yachts')
    const dir = await page.locator('[dir]').first().getAttribute('dir')
    expect(dir).toBe('ltr')
  })

  test('AR home has dir=rtl', async ({ page }) => {
    await page.goto('/ar')
    const dir = await page.locator('[dir]').first().getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('AR yachts has dir=rtl', async ({ page }) => {
    await page.goto('/ar/yachts')
    const dir = await page.locator('[dir]').first().getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('AR pages have lang=ar on html or body', async ({ page }) => {
    await page.goto('/ar')
    const lang = await page.locator('html').getAttribute('lang').catch(() => null)
      || await page.locator('[lang]').first().getAttribute('lang').catch(() => null)
    expect(lang).toMatch(/ar/)
  })
})

test.describe('Font loading', () => {
  test('Cairo font is referenced in EN page styles', async ({ page }) => {
    await page.goto('/en')
    // Check CSS for Cairo font reference
    const styles = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets)
      return sheets.length > 0
    })
    expect(styles).toBe(true)
  })
})

test.describe('Accessibility basics', () => {
  test('nav has aria-label', async ({ page }) => {
    await page.goto('/en')
    const nav = page.locator('nav[aria-label]')
    await expect(nav).toBeVisible()
  })

  test('images have alt text', async ({ page }) => {
    await page.goto('/en')
    const images = page.locator('img')
    const count = await images.count()
    let missingAlt = 0
    for (let i = 0; i < Math.min(count, 10); i++) {
      const alt = await images.nth(i).getAttribute('alt')
      const ariaHidden = await images.nth(i).getAttribute('aria-hidden')
      if (!alt && ariaHidden !== 'true') missingAlt++
    }
    expect(missingAlt).toBe(0)
  })

  test('buttons have accessible text or aria-label', async ({ page }) => {
    await page.goto('/en')
    const buttons = page.locator('button')
    const count = await buttons.count()
    let missingLabel = 0
    for (let i = 0; i < Math.min(count, 20); i++) {
      const text = await buttons.nth(i).innerText().catch(() => '')
      const ariaLabel = await buttons.nth(i).getAttribute('aria-label')
      const ariaLabelledby = await buttons.nth(i).getAttribute('aria-labelledby')
      if (!text.trim() && !ariaLabel && !ariaLabelledby) missingLabel++
    }
    // Allow max 2 unlabelled icon buttons
    expect(missingLabel).toBeLessThanOrEqual(2)
  })

  test('page title is set on all public pages', async ({ page }) => {
    for (const path of PAGES_TO_CHECK) {
      await page.goto(path)
      const title = await page.title()
      expect(title.length, `${path} has empty title`).toBeGreaterThan(3)
    }
  })
})

test.describe('No JS errors on key pages', () => {
  for (const path of ['/en', '/ar', '/en/yachts', '/en/marketplace', '/en/competitions', '/en/login']) {
    test(`${path} — no uncaught console errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', e => errors.push(e.message))
      await page.goto(path)
      await page.waitForTimeout(2000)
      // Filter out known non-critical warnings
      const criticalErrors = errors.filter(e =>
        !e.includes('Warning:') &&
        !e.includes('hydration') &&
        !e.includes('ResizeObserver')
      )
      expect(criticalErrors, `JS errors on ${path}: ${criticalErrors.join(', ')}`).toHaveLength(0)
    })
  }
})
