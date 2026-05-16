/**
 * i18n / language parity tests — Sprint test coverage area 4 (UI side).
 *
 * Tests:
 *   A) HTML lang + dir attributes set correctly per locale
 *   B) Nav logo text matches locale
 *   C) Language toggle switches URL from /ar/... to /en/... (and vice-versa)
 *   D) Login page locale-specific strings (eyebrow, title)
 *   E) EN pages render without JS errors
 */
import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// A) HTML attributes per locale
//
// Note: Next.js sets dir and lang on the .app-shell wrapper div (not on <html>).
// This is verified against the actual layout.tsx implementation.
// We also accept dir/lang on html for forward-compatibility.
// ---------------------------------------------------------------------------

test.describe('i18n — HTML lang + dir attributes', () => {
  test('happy_ar_locale_sets_rtl_and_lang_ar', async ({ page }) => {
    await page.goto('/ar')
    // dir attribute is on the .app-shell div, not <html> — check [dir] selector
    const dir = await page.locator('[dir]').first().getAttribute('dir')
    expect(dir).toBe('rtl')

    // lang is on the .app-shell div or <html> — accept either
    const lang =
      (await page.locator('[lang]').first().getAttribute('lang').catch(() => null)) ||
      (await page.locator('html').getAttribute('lang').catch(() => null))
    expect(lang).toMatch(/ar/)
  })

  test('happy_en_locale_sets_ltr_and_lang_en', async ({ page }) => {
    await page.goto('/en')
    const dir = await page.locator('[dir]').first().getAttribute('dir')
    expect(dir === null || dir === 'ltr').toBeTruthy()

    const lang =
      (await page.locator('[lang]').first().getAttribute('lang').catch(() => null)) ||
      (await page.locator('html').getAttribute('lang').catch(() => null))
    expect(lang).toMatch(/en/)
  })
})

// ---------------------------------------------------------------------------
// B) Nav logo text per locale
// ---------------------------------------------------------------------------

test.describe('i18n — Nav logo text', () => {
  test('happy_ar_logo_contains_arabic_name', async ({ page }) => {
    await page.goto('/ar')
    const logo = page.locator('.nav-logo, [class*="logo"]').first()
    await expect(logo).toBeVisible({ timeout: 10_000 })
    await expect(logo).toContainText('سي كونكت')
  })

  test('happy_en_logo_contains_english_name', async ({ page }) => {
    await page.goto('/en')
    const logo = page.locator('.nav-logo, [class*="logo"]').first()
    await expect(logo).toBeVisible({ timeout: 10_000 })
    await expect(logo).toContainText('SeaConnect')
  })
})

// ---------------------------------------------------------------------------
// C) Language toggle switches locale in URL
// ---------------------------------------------------------------------------

test.describe('i18n — Language switcher', () => {
  test('happy_switch_from_ar_to_en_changes_url', async ({ page }) => {
    await page.goto('/ar/yachts')
    // Lang switcher is an <a class="lang"> anchor with href pointing to the /en/ equivalent
    const toggle = page.locator('a.lang, a[class*="lang"]').first()
    await expect(toggle).toBeVisible({ timeout: 10_000 })
    await toggle.click()
    // URL must now contain /en/
    await expect(page).toHaveURL(/\/en\//, { timeout: 8_000 })
  })

  test('happy_switch_from_en_to_ar_changes_url', async ({ page }) => {
    await page.goto('/en/yachts')
    // Lang switcher is an <a class="lang"> anchor with href pointing to the /ar/ equivalent
    const toggle = page.locator('a.lang, a[class*="lang"]').first()
    await expect(toggle).toBeVisible({ timeout: 10_000 })
    await toggle.click()
    // URL must now contain /ar/
    await expect(page).toHaveURL(/\/ar\//, { timeout: 8_000 })
  })
})

// ---------------------------------------------------------------------------
// D) Login page locale-specific strings
// ---------------------------------------------------------------------------

test.describe('i18n — Login page locale strings', () => {
  test('happy_ar_login_eyebrow_contains_sign_in', async ({ page }) => {
    await page.goto('/ar/login')
    await expect(page.locator('.auth-eyebrow')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.auth-eyebrow')).toContainText('SIGN IN')
  })

  test('happy_ar_login_title_contains_arabic_welcome', async ({ page }) => {
    await page.goto('/ar/login')
    // auth-title contains 'مرحباً' (Welcome in Arabic)
    await expect(page.locator('.auth-title, [class*="auth-title"]').first()).toContainText('مرحباً', {
      timeout: 10_000,
    })
  })

  test('happy_en_login_page_renders_without_js_error', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    await page.goto('/en/login')
    await page.waitForLoadState('domcontentloaded')

    // Allow React hydration errors to surface then check
    await page.waitForTimeout(1500)

    // Filter out known non-fatal hydration mismatches; hard errors must not exist
    const hardErrors = jsErrors.filter(
      (e) =>
        !e.includes('Hydration') &&
        !e.includes('hydration') &&
        !e.includes('Expected server') &&
        !e.includes('Did not expect server')
    )
    expect(hardErrors).toHaveLength(0)

    // Page must at minimum have an auth-outer wrapper
    await expect(page.locator('.auth-outer, [class*="auth"]').first()).toBeVisible({ timeout: 10_000 })
  })
})
