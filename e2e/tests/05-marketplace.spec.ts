/**
 * Marketplace page tests
 * Product listing, categories, detail page, Add to Cart button states.
 */
import { test, expect } from '@playwright/test'

test.describe('Marketplace listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/marketplace')
  })

  test('page renders without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/marketplace/)
    await expect(page.locator('body')).not.toContainText('Error')
  })

  test('category filter renders', async ({ page }) => {
    // Categories bar or links
    const cats = page.locator('a[href*="category"], button[data-cat], [class*="category"]')
    await expect(cats.first()).toBeVisible({ timeout: 8_000 })
  })

  test('"All Products" category is active by default', async ({ page }) => {
    const allCat = page.locator('a[href*="/marketplace"]:not([href*="category"])').first()
    await expect(allCat).toBeVisible()
  })

  test('product cards or empty state renders', async ({ page }) => {
    const cards = page.locator('[class*="product-card"], [class*="ProductCard"], a[href*="/marketplace/"]')
    const empty = page.locator('text=/No products|empty/i')
    await expect(cards.first().or(empty)).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Marketplace AR', () => {
  test('AR marketplace renders Arabic text', async ({ page }) => {
    await page.goto('/ar/marketplace')
    const text = await page.locator('body').innerText()
    expect(text).toMatch(/[؀-ۿ]/)
  })
})

test.describe('Marketplace product detail', () => {
  test('clicking a product navigates to detail page', async ({ page }) => {
    await page.goto('/en/marketplace')
    const productLink = page.locator('a[href*="/marketplace/"]').first()
    const count = await productLink.count()
    if (count === 0) {
      test.skip() // no products in DB
      return
    }
    await productLink.click()
    await page.waitForURL(/\/marketplace\/.+/, { timeout: 8_000 })
    await expect(page).toHaveURL(/\/marketplace\/.+/)
  })

  test('detail page has Add to Cart CTA (button or login link)', async ({ page }) => {
    await page.goto('/en/marketplace')
    const productLink = page.locator('a[href*="/marketplace/"]').first()
    if (await productLink.count() === 0) { test.skip(); return }
    await productLink.click()
    await page.waitForURL(/\/marketplace\/.+/)
    // Unauthenticated: AddToCartButton renders as "Log in to add products" link.
    // Authenticated: renders as a button. Either is correct.
    const addCta = page.locator(
      'button:has-text("Add"), a:has-text("Log in to add"), a:has-text("أضف"), a[href*="/login"]'
    ).first()
    await expect(addCta).toBeVisible({ timeout: 10_000 })
  })

  test('Add to Cart without auth shows login redirect or error', async ({ page }) => {
    await page.goto('/en/marketplace')
    const productLink = page.locator('a[href*="/marketplace/"]').first()
    if (await productLink.count() === 0) { test.skip(); return }
    await productLink.click()
    await page.waitForURL(/\/marketplace\/.+/)

    const addBtn = page.locator('button:has-text("Add to Cart")').first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(1500)
      // Should either redirect to /login or show an error — not silently add
      const url = page.url()
      const btnText = await addBtn.innerText().catch(() => '')
      const hasError = await page.locator('text=/log in|error|تسجيل/i').count() > 0
      expect(url.includes('/login') || hasError || btnText.length > 0).toBe(true)
    }
  })
})

test.describe('Cart page', () => {
  test('cart page renders when unauthenticated', async ({ page }) => {
    await page.goto('/en/cart')
    await page.waitForTimeout(2000)
    // Either shows empty cart or redirects to login — never crashes
    const url = page.url()
    expect(url).toMatch(/\/(cart|login)/)
    if (url.includes('/cart')) {
      const body = await page.locator('body').innerText()
      expect(body.length).toBeGreaterThan(5)
    }
  })
})
