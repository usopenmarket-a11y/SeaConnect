/**
 * Fishing Guide Page — Server Component (ADR-003: SSR for SEO).
 *
 * Converted from Design/weather-fishing.jsx FishingGuidePage() exactly.
 *
 * Server-side: fetches `GET /api/v1/fishing/whats-biting/?port_id={id}` and
 *   `GET /api/v1/fishing/seasons/?port_id={id}` for the default port (Hurghada).
 *   When the API is unavailable the design's embedded species data is used as
 *   fallback so the page is never empty.
 *
 * Interactive month + region filter is handled by FishingGuideClient via
 * the fallback dataset (the real API is per-port, not per-region; region
 * labels in the design are editorial, not separate API resources).
 *
 * ADR-015: all strings via next-intl t('fishingGuide.*').
 * ADR-014: logical CSS only (ms-, me-, ps-, pe-).
 */

import * as React from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { FishingGuideClient } from './FishingGuideClient'
import type { SpeciesFromApi, SeasonFromApi } from './FishingGuideClient'

// ── Metadata ──────────────────────────────────────────────────────────────────

interface MetadataProps {
  params: { locale: string }
}

export async function generateMetadata({
  params: { locale },
}: MetadataProps): Promise<Metadata> {
  return {
    title:
      locale === 'ar'
        ? 'دليل الصيد | سي كونكت'
        : 'Fishing Guide | SeaConnect',
    description:
      locale === 'ar'
        ? 'مواسم أسماك البحر الأحمر والمتوسط والنيل — أحسن وقت للصيد، الأساليب، الأعماق'
        : 'Egypt fishing season guide — best times, methods and depths for Red Sea, Mediterranean and Nile',
    alternates: {
      canonical: `/${locale}/fishing-guide`,
      languages: { ar: '/ar/fishing-guide', en: '/en/fishing-guide' },
    },
    openGraph: {
      title:
        locale === 'ar'
          ? 'دليل الصيد | سي كونكت'
          : 'Fishing Guide | SeaConnect',
      description:
        locale === 'ar'
          ? 'مواسم أسماك البحر الأحمر والمتوسط والنيل — أحسن وقت للصيد، الأساليب، الأعماق'
          : 'Egypt fishing season guide — best times, methods and depths for Red Sea, Mediterranean and Nile',
      images: [{ url: '/og/fishing.jpg', width: 1200, height: 630 }],
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
  }
}

// ── API fetch helpers ─────────────────────────────────────────────────────────

/**
 * Fetch what's biting at the default Hurghada port this month.
 * Returns an empty array on any error (fallback data is used client-side).
 */
async function fetchWhatsBiting(): Promise<SpeciesFromApi[]> {
  const apiUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8010'
  try {
    // port_id here is the slug used by the seed command — replace with a real
    // UUID once the DeparturePort seed is stable in staging.
    const res = await fetch(
      `${apiUrl}/api/v1/fishing/whats-biting/?port_id=hurghada`,
      { cache: 'no-store', headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as SpeciesFromApi[]
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/**
 * Fetch all 12-month season records for the default Hurghada port.
 * Returns an empty array on any error (fallback data is used client-side).
 */
async function fetchSeasons(): Promise<SeasonFromApi[]> {
  const apiUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8010'
  try {
    const res = await fetch(
      `${apiUrl}/api/v1/fishing/seasons/?port_id=hurghada`,
      { cache: 'no-store', headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return []
    const data = (await res.json()) as SeasonFromApi[]
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface FishingGuidePageProps {
  params: { locale: string }
}

export default async function FishingGuidePage({
  params: { locale },
}: FishingGuidePageProps): Promise<React.ReactElement> {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'fishingGuide' })

  const [whatsBiting, seasons] = await Promise.all([
    fetchWhatsBiting(),
    fetchSeasons(),
  ])

  // Pass server-fetched data into the Client Component so it can merge with
  // the built-in fallback and enable the month/region filter interaction.
  return (
    <FishingGuideClient
      locale={locale}
      whatsBiting={whatsBiting}
      seasons={seasons}
      pageTitle={t('heading')}
    />
  )
}
