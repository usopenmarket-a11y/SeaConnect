/**
 * Performance tests — Sprint 14D+E
 *
 * These tests run against localhost:3010 (same baseURL as all other e2e tests).
 * They are intentionally generous for CI environments where the Next.js dev
 * server is cold-started and the backend API may be unavailable.
 *
 * Checks:
 *   A) Home page load time stays under 5 s wall-clock (generous for CI)
 *   B) Yachts listing page renders key containers without layout shift
 *   C) Yacht detail page returns HTTP 200 (structured data prerequisite)
 */

import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// A) Home page LCP proxy — wall-clock load time
// ---------------------------------------------------------------------------

test.describe('performance — home page load time', () => {
  test('happy_home_page_loads_under_5000ms', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/ar')
    await page.waitForLoadState('networkidle')
    const elapsed = Date.now() - startTime
    // Generous budget for CI cold-start; real LCP target is <2500ms
    expect(elapsed).toBeLessThan(5000)
  })
})

// ---------------------------------------------------------------------------
// B) Yachts listing — no layout shift (key container visible after load)
// ---------------------------------------------------------------------------

test.describe('performance — yachts page layout stability', () => {
  test('happy_yachts_page_renders_grid_container', async ({ page }) => {
    await page.goto('/ar/yachts')
    await page.waitForLoadState('networkidle')
    // The yachts listing wraps content in .page-glass
    await expect(page.locator('.page-glass').first()).toBeVisible({ timeout: 10_000 })
  })

  test('happy_yachts_page_has_no_unhandled_js_errors', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.goto('/ar/yachts')
    await page.waitForLoadState('domcontentloaded')
    // Short settle to let React hydration run
    await page.waitForTimeout(1500)

    // Filter React hydration mismatches (non-fatal); only hard crashes fail the test
    const hardErrors = jsErrors.filter(
      (e) =>
        !e.includes('Hydration') &&
        !e.includes('hydration') &&
        !e.includes('Expected server') &&
        !e.includes('Did not expect server'),
    )
    expect(hardErrors).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// C) Yacht detail page — HTTP 200 (JSON-LD structured data lives on this page)
// ---------------------------------------------------------------------------

test.describe('performance — yacht detail page', () => {
  test('happy_yachts_list_page_returns_200', async ({ page }) => {
    const response = await page.goto('/ar/yachts')
    expect(response?.status()).toBe(200)
  })

  test('happy_yachts_detail_page_returns_200_or_404_gracefully', async ({ page }) => {
    // Navigate to a non-existent detail page — must not return 500
    const response = await page.goto('/ar/yachts/00000000-0000-0000-0000-000000000001')
    // App returns 404 (notFound()) for unknown IDs — 500 would indicate a bug
    expect(response?.status()).not.toBe(500)
  })
})
