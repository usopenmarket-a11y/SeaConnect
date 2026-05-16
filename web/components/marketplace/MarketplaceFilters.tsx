'use client'

/**
 * MarketplaceFilters — Client Component.
 *
 * Renders the category pill tabs row + inline price/rating filters bar
 * from Design/altpages.jsx Marketplace() — preserved exactly:
 *   • category pills (كل المنتجات, صنارات وبكرات … etc.) — match design
 *   • min/max price inputs
 *   • rating filter (★ 4+, ★ 4.5+)
 *   • "showing N results" count
 *
 * All selected values are pushed into URL searchParams so the parent Server
 * Component can read them and forward to the API (same pattern as YachtFilters).
 *
 * ADR-014: logical CSS only — no ml-/mr-, uses ms-/me- Tailwind or inline logical.
 * ADR-015: all strings via next-intl t() — never hardcoded.
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

// ── Static category list (matches Design/altpages.jsx Marketplace categories) ──

const CATEGORIES = [
  { slug: 'all', labelKey: 'catAll' },
  { slug: 'rods-reels', labelKey: 'catRodsReels' },
  { slug: 'lures', labelKey: 'catLures' },
  { slug: 'tackle-boxes', labelKey: 'catTackleBoxes' },
  { slug: 'clothing', labelKey: 'catClothing' },
  { slug: 'safety', labelKey: 'catSafety' },
  { slug: 'electronics', labelKey: 'catElectronics' },
] as const

const RATING_OPTIONS = [
  { value: '', labelKey: 'ratingAny' },
  { value: '4', labelKey: 'rating4plus' },
  { value: '4.5', labelKey: 'rating45plus' },
] as const

interface MarketplaceFiltersProps {
  locale: string
  /** Total product count — passed down from server for "showing N results" */
  resultCount?: number
}

export function MarketplaceFilters({
  locale,
  resultCount,
}: MarketplaceFiltersProps): React.ReactElement {
  const t = useTranslations('marketplace.filters')
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const activeCategory = params.get('category') ?? 'all'
  const [priceMin, setPriceMin] = React.useState<string>(params.get('price_min') ?? '')
  const [priceMax, setPriceMax] = React.useState<string>(params.get('price_max') ?? '')
  const [rating, setRating] = React.useState<string>(params.get('rating') ?? '')

  function buildQuery(overrides: Record<string, string>): string {
    const q = new URLSearchParams()
    const cat = overrides.category ?? activeCategory
    if (cat && cat !== 'all') q.set('category', cat)

    const pm = overrides.price_min ?? priceMin
    const px = overrides.price_max ?? priceMax
    const rt = overrides.rating ?? rating
    if (pm) q.set('price_min', pm)
    if (px) q.set('price_max', px)
    if (rt) q.set('rating', rt)
    return q.toString()
  }

  function handleCategoryClick(slug: string): void {
    const qs = buildQuery({ category: slug })
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function applyFilters(): void {
    const qs = buildQuery({})
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function clearFilters(): void {
    setPriceMin('')
    setPriceMax('')
    setRating('')
    router.push(pathname)
  }

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <>
      {/* ── Category pill tabs (matches design pill-tabs row) ─────────────── */}
      <div className="pill-tabs" data-screen-label="marketplace-category-tabs" dir={dir}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.slug || (cat.slug === 'all' && !params.get('category'))
          return (
            <button
              key={cat.slug}
              className={`pill${isActive ? ' active' : ''}`}
              onClick={() => handleCategoryClick(cat.slug)}
              type="button"
            >
              {t(cat.labelKey)}
            </button>
          )
        })}
      </div>

      {/* ── Price + Rating filter bar (below pills) ───────────────────────── */}
      <div
        className="marketplace-filter-bar"
        data-screen-label="marketplace-filter-bar"
        dir={dir}
      >
        {/* Showing N results */}
        {resultCount !== undefined && (
          <span className="mfb-count mono">
            {t('showing', { count: resultCount })}
          </span>
        )}

        <div className="mfb-right">
          {/* Price range */}
          <div className="filter-group">
            <label className="filter-label">{t('priceRange')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                className="filter-input"
                type="number"
                min={0}
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder={t('priceMinPlaceholder')}
                style={{ width: 90 }}
                aria-label={t('priceMinPlaceholder')}
              />
              <span
                className="mono"
                style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}
              >
                —
              </span>
              <input
                className="filter-input"
                type="number"
                min={0}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder={t('priceMaxPlaceholder')}
                style={{ width: 90 }}
                aria-label={t('priceMaxPlaceholder')}
              />
            </div>
          </div>

          {/* Rating filter */}
          <div className="filter-group">
            <label className="filter-label">{t('rating')}</label>
            <select
              className="filter-select"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            >
              {RATING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-clay" onClick={applyFilters} type="button">
            {t('apply')}
          </button>
          <button className="btn btn-ghost" onClick={clearFilters} type="button">
            {t('clear')}
          </button>
        </div>
      </div>
    </>
  )
}
