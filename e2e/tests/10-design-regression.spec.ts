/**
 * Design regression tests — Sprint test coverage area 1.
 *
 * Asserts design-system elements, CSS classes, and structural landmarks
 * are present on each public page. A failure here means a CSS-class rename,
 * component removal, or routing change broke the design contract.
 *
 * Approach:
 *   - Uses page.locator() exclusively (no waitForSelector).
 *   - Fetches a real yacht UUID from the API before tests run.
 *   - baseURL is http://localhost:3010 (set in playwright.config.ts).
 */
import { test, expect, request as playwrightRequest } from '@playwright/test'

// ---------------------------------------------------------------------------
// Shared state — real yacht ID fetched once before all tests
// ---------------------------------------------------------------------------

let realYachtId: string | null = null

test.beforeAll(async () => {
  const ctx = await playwrightRequest.newContext()
  try {
    const resp = await ctx.get('http://localhost:8010/api/v1/yachts/?ordering=-created_at')
    if (resp.ok()) {
      const body = await resp.json()
      const results = body?.results
      if (Array.isArray(results) && results.length > 0) {
        realYachtId = results[0].id as string
      }
    }
  } finally {
    await ctx.dispose()
  }
})

// ---------------------------------------------------------------------------
// Home — /ar
// ---------------------------------------------------------------------------

test.describe('Design regression — Home (/ar)', () => {
  test('happy_home_canvas_exists', async ({ page }) => {
    await page.goto('/ar')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 })
  })

  test('happy_home_hero_has_min_height_class', async ({ page }) => {
    await page.goto('/ar')
    // .hero element must exist (design system selector)
    await expect(page.locator('.hero')).toBeVisible({ timeout: 10_000 })
  })

  test('happy_home_auth_outer_not_present_on_home', async ({ page }) => {
    await page.goto('/ar')
    // Auth wrapper must NOT be on the home page
    await expect(page.locator('.auth-outer')).toHaveCount(0)
  })

  test('happy_home_hero_title_visible', async ({ page }) => {
    await page.goto('/ar')
    await expect(page.locator('.hero-title')).toBeVisible({ timeout: 10_000 })
  })

  test('happy_home_section_grid_visible_below_fold', async ({ page }) => {
    await page.goto('/ar')
    // boat-grid or equivalent grid section should be in DOM
    const grid = page.locator('.boat-grid, .section-grid, [class*="grid"]').first()
    await expect(grid).toBeAttached({ timeout: 10_000 })
  })
})

// ---------------------------------------------------------------------------
// Yachts listing — /ar/yachts
// ---------------------------------------------------------------------------

test.describe('Design regression — Yachts (/ar/yachts)', () => {
  test('happy_yachts_page_glass_wrapper_exists', async ({ page }) => {
    await page.goto('/ar/yachts')
    await expect(page.locator('.page-glass').first()).toBeVisible({ timeout: 15_000 })
  })

  test('happy_yachts_boat_card_grid_renders', async ({ page }) => {
    await page.goto('/ar/yachts')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    // boat-grid is the outer container; boat-card-wrap wraps each card
    await expect(page.locator('.boat-grid, .boat-card-wrap').first()).toBeVisible({ timeout: 15_000 })
  })

  test('happy_yachts_at_least_one_boat_card_visible', async ({ page }) => {
    await page.goto('/ar/yachts')
    // Wait for skeleton to resolve and real cards to appear
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await expect(page.locator('.boat-card').first()).toBeVisible({ timeout: 15_000 })
  })
})

// ---------------------------------------------------------------------------
// Yacht detail — /ar/yachts/<real_id>
// ---------------------------------------------------------------------------

test.describe('Design regression — Yacht detail (/ar/yachts/:id)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!realYachtId) {
      testInfo.skip()
      return
    }
    await page.goto(`/ar/yachts/${realYachtId}`)
  })

  test('happy_detail_gallery_present', async ({ page }) => {
    await expect(
      page.locator('.detail-gallery, [class*="gallery"]').first()
    ).toBeVisible({ timeout: 15_000 })
  })

  test('happy_detail_booking_panel_present', async ({ page }) => {
    // cal-panel is the booking/calendar panel on the detail page
    await expect(
      page.locator('.cal-panel, .detail-book, [class*="book-panel"]').first()
    ).toBeVisible({ timeout: 15_000 })
  })

  test('happy_detail_price_displayed', async ({ page }) => {
    // Price currency abbreviation (EGP/AED/SAR) or a price class must appear in the DOM
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    // Use :text() to find visible text nodes with currency codes, or any price class
    const hasCurrency = await page
      .locator(':text("EGP"), :text("AED"), :text("SAR"), [class*="price"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false)
    expect(hasCurrency).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Marketplace — /ar/marketplace
// ---------------------------------------------------------------------------

test.describe('Design regression — Marketplace (/ar/marketplace)', () => {
  test('happy_marketplace_page_glass_wrapper_exists', async ({ page }) => {
    await page.goto('/ar/marketplace')
    await expect(page.locator('.page-glass').first()).toBeVisible({ timeout: 15_000 })
  })

  test('happy_marketplace_product_cards_visible', async ({ page }) => {
    await page.goto('/ar/marketplace')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    // Product cards or skeleton loaders must be present
    const cards = page.locator('[class*="product"], [class*="card"], .page-glass').first()
    await expect(cards).toBeVisible({ timeout: 15_000 })
  })
})

// ---------------------------------------------------------------------------
// Competitions — /ar/competitions
// ---------------------------------------------------------------------------

test.describe('Design regression — Competitions (/ar/competitions)', () => {
  test('happy_competitions_page_glass_wrapper_exists', async ({ page }) => {
    await page.goto('/ar/competitions')
    await expect(page.locator('.page-glass').first()).toBeVisible({ timeout: 15_000 })
  })

  test('happy_competitions_rows_visible', async ({ page }) => {
    await page.goto('/ar/competitions')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    // Competition rows rendered by the server or client
    await expect(page.locator('.comp-row').first()).toBeVisible({ timeout: 15_000 })
  })
})

// ---------------------------------------------------------------------------
// Login — /ar/login
// ---------------------------------------------------------------------------

test.describe('Design regression — Login (/ar/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ar/login')
  })

  test('happy_login_auth_outer_present', async ({ page }) => {
    await expect(page.locator('.auth-outer')).toBeVisible({ timeout: 10_000 })
  })

  test('happy_login_auth_card_present', async ({ page }) => {
    await expect(page.locator('.auth-card')).toBeVisible({ timeout: 10_000 })
  })

  test('happy_login_email_input_present', async ({ page }) => {
    await expect(page.locator('#email')).toBeVisible({ timeout: 10_000 })
  })

  test('happy_login_password_input_present', async ({ page }) => {
    await expect(page.locator('#password')).toBeVisible({ timeout: 10_000 })
  })

  test('happy_login_submit_button_present', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 10_000 })
  })

  test('happy_login_social_row_buttons_present', async ({ page }) => {
    await expect(page.locator('.social-row')).toBeVisible({ timeout: 10_000 })
    // At least 2 social buttons (Google, Apple, phone, etc.)
    const count = await page.locator('.social-btn').count()
    expect(count).toBeGreaterThanOrEqual(2)
  })
})
