/**
 * Weather Advisory Page — Server Component shell.
 *
 * Converted from Design/weather-fishing.jsx WeatherPage() (ADR-003: SSR metadata).
 * The interactive port-selector + SWR fetch lives in WeatherPageClient.
 * Server-side work here is limited to metadata generation and locale set.
 *
 * API used by the client component:
 *   GET /api/v1/weather/?port_id={slug}
 *
 * ADR-015: strings via next-intl.
 */

import * as React from 'react'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { WeatherPageClient } from './PageClient'

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
        ? 'حالة الطقس البحري | سي كونكت'
        : 'Marine Weather Advisory | SeaConnect',
    description:
      locale === 'ar'
        ? 'تقارير الطقس البحري وحالة الأمواج والرياح لموانئ مصر — يُحدَّث كل ساعة'
        : 'Marine weather reports, wave height and wind conditions for Egypt ports — updated hourly',
    alternates: {
      canonical: `/${locale}/weather`,
      languages: { ar: '/ar/weather', en: '/en/weather' },
    },
    openGraph: {
      title:
        locale === 'ar'
          ? 'حالة الطقس البحري | سي كونكت'
          : 'Marine Weather Advisory | SeaConnect',
      description:
        locale === 'ar'
          ? 'تقارير الطقس البحري وحالة الأمواج والرياح لموانئ مصر — يُحدَّث كل ساعة'
          : 'Marine weather reports, wave height and wind conditions for Egypt ports — updated hourly',
      images: [{ url: '/og/weather.jpg', width: 1200, height: 630 }],
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface WeatherPageProps {
  params: { locale: string }
}

export default function WeatherPage({
  params: { locale },
}: WeatherPageProps): React.ReactElement {
  setRequestLocale(locale)
  return <WeatherPageClient locale={locale} />
}
