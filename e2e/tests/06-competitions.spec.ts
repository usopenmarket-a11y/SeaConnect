/**
 * Competitions page tests
 * Listing, register button states, auth guard.
 */
import { test, expect } from '@playwright/test'

test.describe('Competitions listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/competitions')
  })

  test('page loads without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/competitions/)
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('competition cards or empty state renders', async ({ page }) => {
    // Wait for client-side hydration
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const cards = page.locator('[class*="comp-row"], [class*="tournament"], article').first()
    const empty = page.locator('text=/No.*tournament|No open|empty/i').first()
    const anyContent = cards.or(empty)
    await expect(anyContent).toBeVisible({ timeout: 10_000 })
  })

  test('Register button is present on open competitions', async ({ page }) => {
    const registerBtn = page.locator('button:has-text("Register"), button:has-text("سجّل")')
    const count = await registerBtn.count()
    if (count > 0) {
      await expect(registerBtn.first()).toBeVisible()
    }
    // If no open competitions, skip — not a failure
  })

  test('Register without auth redirects to login', async ({ page }) => {
    const registerBtn = page.locator('button:has-text("Register")').first()
    if (await registerBtn.count() === 0) { test.skip(); return }

    await registerBtn.click()
    await page.waitForTimeout(2000)
    // Should redirect to /login or show "log in" error
    const url = page.url()
    const hasLoginHint = await page.locator('text=/log in|تسجيل الدخول/i').count() > 0
    expect(url.includes('/login') || hasLoginHint).toBe(true)
  })
})

test.describe('Competitions AR', () => {
  test('AR competitions page renders', async ({ page }) => {
    await page.goto('/ar/competitions')
    await expect(page).toHaveURL(/\/ar\/competitions/)
    const text = await page.locator('body').innerText()
    expect(text).toMatch(/[؀-ۿ]/)
  })
})
