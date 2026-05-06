'use client'

/**
 * YachtFilters — Client Component.
 *
 * Renders filter controls (yacht type, capacity, max price) and pushes the
 * selected values into the URL search-params via next/navigation router.
 * The parent Server Component reads those params and passes them to the API.
 *
 * Rules followed:
 *   ADR-014 — logical CSS only (no ml-/mr-)
 *   ADR-015 — all strings via next-intl; none hardcoded in JSX
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface YachtFiltersProps {
  locale: string
}

const YACHT_TYPES = [
  { value: 'fishing', labelKey: 'typeFishing' },
  { value: 'luxury', labelKey: 'typeLuxury' },
  { value: 'catamaran', labelKey: 'typeCatamaran' },
  { value: 'felucca', labelKey: 'typeFelucca' },
] as const

export function YachtFilters({ locale }: YachtFiltersProps): React.ReactElement {
  const t = useTranslations('yachts.filters')
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const [capacityMin, setCapacityMin] = React.useState<string>(
    params.get('capacity_min') ?? '',
  )
  const [priceMax, setPriceMax] = React.useState<string>(
    params.get('price_max') ?? '',
  )
  const [yachtType, setYachtType] = React.useState<string>(
    params.get('yacht_type') ?? '',
  )

  function applyFilters(): void {
    const q = new URLSearchParams()
    if (capacityMin) q.set('capacity_min', capacityMin)
    if (priceMax) q.set('price_max', priceMax)
    if (yachtType) q.set('yacht_type', yachtType)
    router.push(`${pathname}?${q.toString()}`)
  }

  function clearFilters(): void {
    setCapacityMin('')
    setPriceMax('')
    setYachtType('')
    router.push(pathname)
  }

  return (
    <div
      className="yacht-filters"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      data-screen-label="yacht-filters"
    >
      {/* Yacht type */}
      <div className="filter-group">
        <label className="filter-label">{t('type')}</label>
        <select
          className="filter-select"
          value={yachtType}
          onChange={(e) => setYachtType(e.target.value)}
        >
          <option value="">{t('allTypes')}</option>
          {YACHT_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Minimum capacity */}
      <div className="filter-group">
        <label className="filter-label">{t('capacity')}</label>
        <input
          className="filter-input"
          type="number"
          min={1}
          value={capacityMin}
          onChange={(e) => setCapacityMin(e.target.value)}
          placeholder="1+"
        />
      </div>

      {/* Maximum price */}
      <div className="filter-group">
        <label className="filter-label">{t('priceMax')}</label>
        <input
          className="filter-input"
          type="number"
          min={0}
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          placeholder="5000"
        />
      </div>

      <button className="btn btn-clay" onClick={applyFilters}>
        {t('btn')}
      </button>
      <button className="btn btn-ghost" onClick={clearFilters}>
        {t('clear')}
      </button>
    </div>
  )
}
