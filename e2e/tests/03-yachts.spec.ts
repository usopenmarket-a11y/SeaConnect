/**
 * Yachts listing & detail page tests
 * Verifies filters, cards, navigation to detail, book button.
 */
import { test, expect } from '@playwright/test'

test.describe('Yachts listing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/yachts')
  })

  test('page renders yacht cards or empty state', async ({ page }) => {
    // Either cards or empty message — never a crash
    const cards = page.locator('[class*="boat-card"], [class*="yacht-card"], [data-screen-label*="yacht"]')
    const empty = page.locator('text=/No yachts|empty/i')
    await expect(cards.first().or(empty)).toBeVisible({ timeout: 10_000 })
  })

  test('filter panel is visible', async ({ page }) => {
    const filters = page.locator('[class*="filter"], form, [data-screen-label*="filter"]').first()
    await expect(filters).toBeVisible()
  })

  test('yacht type filter renders options', async ({ page }) => {
    const typeSelect = page.locator('select[name*="type"], select').first()
    await expect(typeSelect).toBeVisible()
    const options = await typeSelect.locator('option').count()
    expect(options).toBeGreaterThan(1) // at least "All Types" + one type
  })

  test('search/filter button is clickable', async ({ page }) => {
    const btn = page.locator('button[type="submit"], button:has-text("Search"), button:has-text("بحث")').first()
    await expect(btn).toBeVisible()
    await btn.click()
    // Should not crash — URL may update with params
    await expect(page).toHaveURL(/\/yachts/)
  })

  test('clear filters button resets URL', async ({ page }) => {
    // Set a filter first
    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption({ index: 1 }).catch(() => {})

    const clearBtn = page.locator('button:has-text("Clear"), button:has-text("مسح")').first()
    if (await clearBtn.isVisible()) {
      await clearBtn.click()
      await expect(page).toHaveURL(/\/en\/yachts$/)
    }
  })
})

test.describe('Yachts listing — AR', () => {
  test('AR listing page renders', async ({ page }) => {
    await page.goto('/ar/yachts')
    await expect(page).toHaveURL(/\/ar\/yachts/)
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(10)
  })
})

test.describe('Yacht detail page', () => {
  test('clicking a yacht card navigates to detail', async ({ page }) => {
    await page.goto('/en/yachts')
    const card = page.locator('a[href*="/yachts/"]').first()
    const count = await card.count()
    if (count > 0) {
      const href = await card.getAttribute('href')
      await card.click()
      await page.waitForURL(/\/yachts\/.+/, { timeout: 10_000 })
      await expect(page).toHaveURL(/\/yachts\/.+/)
    } else {
      test.skip() // No yachts in DB yet — skip detail test
    }
  })

  test('detail page has Book Now button', async ({ page }) => {
    await page.goto('/en/yachts')
    const card = page.locator('a[href*="/yachts/"]').first()
    if (await card.count() > 0) {
      await card.click()
      await page.waitForURL(/\/yachts\/.+/)
      const bookBtn = page.locator('a[href*="/book"], button:has-text("Book")').first()
      await expect(bookBtn).toBeVisible({ timeout: 5_000 })
    } else {
      test.skip()
    }
  })
})
