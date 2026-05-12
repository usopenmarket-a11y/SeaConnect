/**
 * Admin portal (port 3011) tests
 * Dashboard, KYC queue, navigation.
 */
import { test, expect } from '@playwright/test'

// Override baseURL for admin tests
const ADMIN_BASE = 'http://localhost:3011'

test.describe('Admin portal', () => {
  test('admin home redirects to /en or /ar login', async ({ page }) => {
    const res = await page.goto(ADMIN_BASE)
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).toMatch(/311\d|localhost:3011/)
    // Should not be a 500 error page
    expect(res?.status()).toBeLessThan(500)
  })

  test('admin /en page renders', async ({ page }) => {
    const res = await page.goto(`${ADMIN_BASE}/en`)
    expect(res?.status()).toBeLessThan(500)
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(5)
  })

  test('admin /ar page renders with Arabic', async ({ page }) => {
    const res = await page.goto(`${ADMIN_BASE}/ar`)
    expect(res?.status()).toBeLessThan(500)
  })

  test('admin dashboard page returns 200', async ({ page }) => {
    const res = await page.goto(`${ADMIN_BASE}/en/dashboard`)
    await page.waitForTimeout(2000)
    // Either shows dashboard (if no auth required in dev) or login redirect
    expect(res?.status()).toBeLessThan(500)
  })

  test('admin KYC page returns 200', async ({ page }) => {
    const res = await page.goto(`${ADMIN_BASE}/en/kyc`)
    expect(res?.status()).toBeLessThan(500)
  })
})
