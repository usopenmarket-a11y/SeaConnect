/**
 * Search & Filters page — Server Component shell.
 *
 * Route: /{locale}/search?q=...
 *
 * This shell resolves i18n strings server-side and passes them to the
 * fully SWR-driven SearchPageClient. The client handles:
 *   - Tab switching: Yachts / Gear
 *   - Region facet filter (Yachts tab only)
 *   - Sort dropdown
 *   - Live API calls via SWR
 *
 * ADR-003: SSR shell for SEO (page title, description, hreflang).
 * ADR-014: logical CSS.
 * ADR-015: strings via getTranslations('search').
 */

import * as React from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SearchPageClient } from './PageClient'

interface PageProps {
  params: { locale: string }
  searchParams: { q?: string }
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params: { locale },
  searchParams,
}: PageProps): Promise<Metadata> {
  const q = searchParams.q ?? ''
  const t = await getTranslations({ locale, namespace: 'search' })
  return {
    title: q
      ? t('metaTitleQuery', { query: q })
      : t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/search${q ? `?q=${encodeURIComponent(q)}` : ''}`,
      languages: {
        ar: `/ar/search${q ? `?q=${encodeURIComponent(q)}` : ''}`,
        en: `/en/search${q ? `?q=${encodeURIComponent(q)}` : ''}`,
      },
    },
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

  return (
    <SearchPageClient
      initialQuery={q}
      locale={locale}
      tabYachtsLabel={t('tabYachts')}
      tabGearLabel={t('tabGear')}
      noResultsLabel={t('noResults')}
      noResultsSubLabel={t('noResultsSub')}
      resultsCountLabel={t('resultsMeta')}
      resultsForLabel={t('resultsFor')}
      filtersLabel={t('filtersLabel')}
      activeLabel={t('activeLabel')}
      searchPlaceholder={t('searchPlaceholder')}
      sortRelevanceLabel={t('sort.relevance')}
      sortPriceAscLabel={t('sort.priceAsc')}
      sortPriceDescLabel={t('sort.priceDesc')}
      sortNewestLabel={t('sort.newest')}
      allRegionsLabel={t('allRegions')}
      regionFacetLabel={t('regionFacet')}
      gearPriceLabel={t('gearOutOfStock')}
      gearVendorLabel={t('gearVendor')}
      applyFiltersLabel={t('applyFilters')}
      clearAllLabel={t('clearAll')}
    />
  )
}
