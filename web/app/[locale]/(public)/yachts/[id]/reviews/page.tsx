/**
 * Reviews page — Server Component shell (SSR for SEO, ADR-003).
 * Fetches yacht summary + all reviews server-side, passes to ReviewsClient
 * for interactive sort/filter/helpful-vote.
 */

import * as React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import ReviewsClient from './ReviewsClient'

// ── Types ─────────────────────────────────────────────────────────────────────

interface YachtReview {
  id: string
  rating: number
  title: string
  body: string
  customer_name: string
  created_at: string
  customer_country?: string
  trip_type?: string
  photos?: string[]
  helpful_count?: number
}

interface YachtSummary {
  id: string
  name: string
  name_ar: string
  average_rating: string
  review_count: number
  media?: Array<{ url: string; is_primary: boolean }>
  departure_port?: { region?: { name_en: string } }
}

// ── Data fetching ─────────────────────────────────────────────────────────────

const API =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8090'

async function fetchYachtSummary(id: string): Promise<YachtSummary | null> {
  try {
    const res = await fetch(`${API}/api/v1/yachts/${id}/`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return (await res.json()) as YachtSummary
  } catch {
    return null
  }
}

async function fetchAllReviews(yachtId: string): Promise<YachtReview[]> {
  const reviews: YachtReview[] = []
  let url: string | null = `${API}/api/v1/yachts/${yachtId}/reviews/?page_size=50`
  try {
    while (url) {
      const res = await fetch(url, { next: { revalidate: 60 }, headers: { Accept: 'application/json' } })
      if (!res.ok) break
      const data: { results?: YachtReview[]; next?: string | null } = await res.json()
      reviews.push(...(data.results ?? []))
      url = data.next ?? null
    }
  } catch { /* return what we have */ }
  return reviews
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDistribution(reviews: YachtReview[]): Record<number, number> {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) {
    const s = Math.min(5, Math.max(1, Math.round(r.rating)))
    dist[s] = (dist[s] ?? 0) + 1
  }
  return dist
}

// ── Metadata ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: { locale: string; id: string }
}

export async function generateMetadata({ params: { locale, id } }: PageProps): Promise<Metadata> {
  const yacht = await fetchYachtSummary(id)
  if (!yacht) return {}
  const name = locale === 'ar' ? (yacht.name_ar || yacht.name) : yacht.name
  return {
    title: `${locale === 'ar' ? 'تقييمات' : 'Reviews'} — ${name} | سي كونكت`,
    description: `${yacht.review_count} ${locale === 'ar' ? 'تقييم' : 'reviews'} · ${name}`,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function YachtReviewsPage({
  params: { locale, id },
}: PageProps): Promise<React.ReactElement> {
  const [yacht, reviews] = await Promise.all([fetchYachtSummary(id), fetchAllReviews(id)])
  if (!yacht) notFound()

  setRequestLocale(locale)

  const name = locale === 'ar' ? (yacht.name_ar || yacht.name) : yacht.name
  const avgRating = parseFloat(yacht.average_rating ?? '0') || 0
  const totalCount = yacht.review_count ?? reviews.length
  const heroImg = yacht.media?.find((m) => m.is_primary)?.url ?? yacht.media?.[0]?.url
  const regionEn = yacht.departure_port?.region?.name_en ?? 'Hurghada'
  const distribution = buildDistribution(reviews)

  return (
    <ReviewsClient
      locale={locale}
      yachtId={id}
      yachtName={name}
      heroImg={heroImg}
      regionEn={regionEn}
      avgRating={avgRating}
      totalCount={totalCount}
      distribution={distribution}
      reviews={reviews}
    />
  )
}
