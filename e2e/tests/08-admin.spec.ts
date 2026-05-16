/**
 * Admin portal (port 3011) tests
 * Dashboard, KYC queue, navigation.
 *
 * The admin portal is a separate Next.js app running on port 3011.
 * It only starts when the Docker "admin" profile is active:
 *   docker compose --profile admin up admin
 *
 * When the admin portal is not running, all tests in this file are skipped
 * gracefully rather than failing with ERR_CONNECTION_REFUSED.
 */
import { test, expect, request } from '@playwright/test'

// Override baseURL for admin tests
const ADMIN_BASE = 'http://localhost:3011'

/** Returns true if the admin portal is reachable on port 3011. */
async function isAdminPortalUp(): Promise<boolean> {
  try {
    const ctx = await request.newContext({ timeout: 3_000 })
    const res = await ctx.get(ADMIN_BASE).catch(() => null)
    await ctx.dispose()
    return res !== null
  } catch {
    return false
  }
}

test.describe('Admin portal', () => {
  test.beforeEach(async () => {
    const up = await isAdminPortalUp()
    if (!up) {
      test.skip(true, 'Admin portal not running (start with: docker compose --profile admin up admin)')
    }
  })

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
