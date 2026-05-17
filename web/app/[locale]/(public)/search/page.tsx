/**
 * Search & Filters page — Server Component shell.
 *
 * Route: /{locale}/search?q=...&type=yachts|products|ports
 * Converted from Design/system-pages.jsx SearchPage() exactly.
 *
 * Server Component fetches initial yacht results for the `q` param.
 * Client Component handles filter chips, sort, and incremental updates.
 *
 * ADR-003: SSR for SEO (initial results rendered server-side).
 * ADR-013: CursorPagination from /api/v1/yachts/?search={q}.
 * ADR-014: logical CSS.
 * ADR-015: strings via getTranslations('search').
 */

import * as React from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SearchPageClient } from './PageClient'
import type { BoatCardData } from '@/components/boats/BoatCard'

interface PageProps {
  params: { locale: string }
  searchParams: { q?: string; type?: string }
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params: { locale },
  searchParams,
}: PageProps): Promise<Metadata> {
  const q = searchParams.q ?? ''
  return {
    title:
      locale === 'ar'
        ? q
          ? `نتائج البحث عن "${q}" | سي كونكت`
          : 'البحث والفلترة | سي كونكت'
        : q
          ? `Search results for "${q}" | SeaConnect`
          : 'Search & Filters | SeaConnect',
    description:
      locale === 'ar'
        ? 'ابحث عن قوارب، معدات بحرية، وموانئ في مصر'
        : 'Search for yachts, marine gear, and ports in Egypt',
  }
}

// ── API types ─────────────────────────────────────────────────────────────────

interface ApiYacht {
  id: string
  name: string
  name_ar: string
  yacht_type?: string
  capacity?: number
  price_per_day?: string
  currency?: string
  primary_image_url?: string | null
  departure_port?: { id: string; name_ar: string; name_en: string } | null
  region?: string
  rating?: number
}

// ── API fetch ─────────────────────────────────────────────────────────────────

async function fetchSearchResults(
  q: string,
  locale: string,
): Promise<BoatCardData[]> {
  if (!q.trim()) return []

  const apiUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8010'

  const params = new URLSearchParams({ search: q, ordering: '-created_at' })

  try {
    const res = await fetch(`${apiUrl}/api/v1/yachts/?${params.toString()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { results?: ApiYacht[] }
    const results = data.results ?? []

    return results.map((y) => ({
      id: y.id,
      name: locale === 'ar' ? (y.name_ar || y.name) : y.name,
      nameEn: y.name,
      type: locale === 'ar' ? (y.yacht_type ?? '') : (y.yacht_type ?? ''),
      typeEn: y.yacht_type ?? '',
      region: y.departure_port?.name_ar ?? y.region ?? '',
      regionEn: y.departure_port?.name_en ?? y.region ?? '',
      pax: y.capacity ?? 0,
      price: parseFloat(y.price_per_day ?? '0'),
      currency: y.currency ?? 'EGP',
      rating: y.rating ?? 0,
      img: y.primary_image_url ?? '',
    }))
  } catch {
    return []
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SearchPage({
  params: { locale },
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'search' })
  const q = searchParams.q ?? ''

  const initialResults = await fetchSearchResults(q, locale)

  return (
    <SearchPageClient
      initialQuery={q}
      initialResults={initialResults}
      locale={locale}
      noResultsLabel={t('noResults')}
      noResultsSubLabel={t('noResultsSub')}
      resultsMetaLabel={t('resultsMeta')}
      filtersLabel={t('filtersLabel')}
      activeLabel={t('activeLabel')}
      searchPlaceholder={t('searchPlaceholder')}
      sortRecommended={t('sort.recommended')}
      sortPriceAsc={t('sort.priceAsc')}
      sortPriceDesc={t('sort.priceDesc')}
      sortRating={t('sort.rating')}
      applyFiltersLabel={t('applyFilters')}
      clearAllLabel={t('clearAll')}
    />
  )
}
