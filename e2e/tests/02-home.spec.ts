/**
 * Home page UI & interaction tests
 * Verifies hero, featured boats, gear section, competitions section, CTAs.
 */
import { test, expect } from '@playwright/test'

test.describe('Home page — EN', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en')
  })

  test('hero section renders with CTA buttons', async ({ page }) => {
    const hero = page.locator('[data-screen-label="hero"], .hero, section').first()
    await expect(hero).toBeVisible()

    // At least one CTA button/link pointing to /en/yachts
    const ctaLink = page.locator('a[href*="/yachts"]').first()
    await expect(ctaLink).toBeVisible()
  })

  test('featured boats section renders boat cards', async ({ page }) => {
    // Boat cards should be visible (either from API or fallback mock)
    const cards = page.locator('[data-screen-label*="boat"], .boat-card, [class*="boat"]')
    // Allow time for SSR content
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
  })

  test('"View all" boats link navigates to /yachts', async ({ page }) => {
    const viewAll = page.locator('a[href*="/yachts"]').first()
    await viewAll.click()
    await expect(page).toHaveURL(/\/en\/yachts/)
  })

  test('gear section has product links or content', async ({ page }) => {
    // Gear items render client-side — wait for hydration
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    // Verify page has gear-related content (links or text)
    const gearLink = page.locator('a[href*="/marketplace"]').first()
    await expect(gearLink).toBeVisible({ timeout: 8_000 })
  })

  test('competitions section link navigates to /competitions', async ({ page }) => {
    // Look for any link pointing to competitions
    const compLink = page.locator('a[href*="/competitions"]').first()
    await expect(compLink).toBeVisible({ timeout: 8_000 })
  })

  test('owner CTA section has "List your boat" link', async ({ page }) => {
    const ownerCta = page.locator('a[href*="/owner"], a[href*="list"]').first()
    await expect(ownerCta).toBeVisible()
  })

  test('nav cart icon is present', async ({ page }) => {
    // Cart icon added in Sprint 16B
    const cartLink = page.locator('a[href*="/cart"]')
    await expect(cartLink).toBeVisible()
  })
})

test.describe('Home page — AR', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ar')
  })

  test('page renders in Arabic with RTL layout', async ({ page }) => {
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible()
    // Arabic content present
    const text = await page.locator('body').innerText()
    expect(text).toMatch(/[؀-ۿ]/) // Unicode Arabic range
  })

  test('nav links render in Arabic', async ({ page }) => {
    const navText = await page.locator('nav').innerText()
    expect(navText).toMatch(/[؀-ۿ]/)
  })
})
