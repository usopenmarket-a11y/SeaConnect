/**
 * Write review page — Server Component shell (auth-aware SSR).
 *
 * Passes yacht metadata to WriteReviewPageClient for the boat summary strip.
 * Auth is enforced client-side in PageClient (JWT checked before POST).
 *
 * ADR-003: Server Component for SSR/metadata.
 * ADR-015: strings from t().
 */

import * as React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import WriteReviewPageClient from './PageClient'

interface YachtBrief {
  id: string
  name: string
  name_ar: string
  media?: Array<{ url: string; is_primary: boolean }>
  departure_port?: { region?: { name_en: string } }
}

async function fetchYachtBrief(id: string): Promise<YachtBrief | null> {
  const apiUrl =
    process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
  try {
    const res = await fetch(`${apiUrl}/api/v1/yachts/${id}/`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return (await res.json()) as YachtBrief
  } catch {
    return null
  }
}

interface PageProps {
  params: { locale: string; id: string }
}

export async function generateMetadata({ params: { locale, id } }: PageProps): Promise<Metadata> {
  const yacht = await fetchYachtBrief(id)
  if (!yacht) return {}
  const name = locale === 'ar' ? (yacht.name_ar || yacht.name) : yacht.name
  return {
    title: `${locale === 'ar' ? 'اكتب تقييمك' : 'Write a Review'} — ${name} | سي كونكت`,
  }
}

export default async function WriteReviewPage({
  params: { locale, id },
}: PageProps): Promise<React.ReactElement> {
  const yacht = await fetchYachtBrief(id)
  if (!yacht) notFound()

  setRequestLocale(locale)

  const name = locale === 'ar' ? (yacht.name_ar || yacht.name) : yacht.name
  const heroImg =
    yacht.media?.find((m) => m.is_primary)?.url ?? yacht.media?.[0]?.url
  const regionEn = yacht.departure_port?.region?.name_en ?? 'Hurghada'

  return (
    <WriteReviewPageClient
      locale={locale}
      yachtId={id}
      yachtName={name}
      yachtImg={heroImg}
      regionEn={regionEn}
    />
  )
}
