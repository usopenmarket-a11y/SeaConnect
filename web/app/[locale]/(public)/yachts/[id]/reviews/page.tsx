/**
 * Full reviews page — Server Component (ADR-003: SSR for SEO).
 *
 * Matches ReviewsPage() from Design/reviews.jsx.
 * - Rating summary: big number, star bar, distribution bars
 * - Review cards: customer name, stars, date, title, body
 * - "Write a Review" CTA button
 *
 * ADR-014: logical CSS utilities.
 * ADR-015: all strings via t().
 */

import * as React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

// ── Types ─────────────────────────────────────────────────────────────────────

interface YachtReview {
  id: string
  rating: number
  title: string
  body: string
  customer_name: string
  created_at: string
}

interface YachtSummary {
  id: string
  name: string
  name_ar: string
  average_rating: string
  review_count: number
  media?: Array<{ url: string; is_primary: boolean }>
  departure_port?: {
    region?: { name_en: string }
  }
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchYachtSummary(id: string): Promise<YachtSummary | null> {
  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
  try {
    const res = await fetch(`${apiUrl}/api/v1/yachts/${id}/`, {
      cache: 'no-store',
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
  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
  const reviews: YachtReview[] = []
  let url: string | null = `${apiUrl}/api/v1/yachts/${yachtId}/reviews/?page_size=50`
  try {
    while (url) {
      const res: Response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
      if (!res.ok) break
      const data: { results?: YachtReview[]; next?: string | null } = await res.json()
      reviews.push(...(data.results ?? []))
      // CursorPagination provides a full URL in `next` — follow until exhausted
      url = data.next ?? null
    }
  } catch {
    // return whatever we have
  }
  return reviews
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDistribution(reviews: YachtReview[]): Record<number, number> {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) {
    const s = Math.min(5, Math.max(1, r.rating))
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
    title: `${locale === 'ar' ? 'تقييمات' : 'Reviews'} ${name} | سي كونكت`,
  }
}

// ── StarRow helper ────────────────────────────────────────────────────────────

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          viewBox="0 0 20 20"
          width={size}
          height={size}
          fill={s <= rating ? 'oklch(0.78 0.18 80)' : 'oklch(0.88 0 0)'}
        >
          <path d="M10 1l2.39 7.26H19l-5.36 3.94 2.04 6.8L10 15.27 4.32 19l2.04-6.8L1 8.26h6.61z" />
        </svg>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function YachtReviewsPage({
  params: { locale, id },
}: PageProps): Promise<React.ReactElement> {
  const [yacht, reviews] = await Promise.all([fetchYachtSummary(id), fetchAllReviews(id)])
  if (!yacht) notFound()

  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'yachts.reviews' })

  const name = locale === 'ar' ? (yacht.name_ar || yacht.name) : yacht.name
  const avgRating = parseFloat(yacht.average_rating ?? '0') || 0
  const totalCount = yacht.review_count ?? reviews.length
  const heroImg = yacht.media?.find((m) => m.is_primary)?.url ?? yacht.media?.[0]?.url
  const regionEn = yacht.departure_port?.region?.name_en ?? 'Hurghada'
  const distribution = buildDistribution(reviews)

  return (
    <div className="reviews-layout">
      {/* Header: boat strip */}
      <div className="reviews-header">
        <div className="reviews-boat-strip">
          {heroImg && (
            <div
              className="reviews-boat-img"
              style={{ backgroundImage: `url(${heroImg})` }}
            />
          )}
          <div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22 }}>{name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>{regionEn}</div>
          </div>
          <Link
            href={`/${locale}/yachts/${id}/reviews/write`}
            className="btn btn-primary"
            style={{ marginInlineStart: 'auto' }}
          >
            {t('writeReview')}
          </Link>
        </div>

        {/* Rating summary */}
        <div className="rating-summary">
          {/* Big number */}
          <div className="rating-big-num">
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1,
                color: 'var(--sea)',
              }}
            >
              {avgRating.toFixed(2)}
            </div>
            <StarRow rating={Math.round(avgRating)} size={18} />
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
              {t('totalReviews', { count: totalCount })}
            </div>
          </div>

          {/* Distribution bars */}
          <div className="rating-bars">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = distribution[star] ?? 0
              const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
              const barColor =
                star >= 4
                  ? 'oklch(0.78 0.18 80)'
                  : star === 3
                  ? 'oklch(0.70 0.15 70)'
                  : 'oklch(0.55 0.18 25)'
              return (
                <div key={star} className="rating-bar-row">
                  <span className="mono" style={{ fontSize: 12, minWidth: 8 }}>
                    {star}
                  </span>
                  <span style={{ fontSize: 12 }}>⭐</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: 'var(--muted)', minWidth: 28, textAlign: 'end' }}
                  >
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Review list */}
      <div className="review-list">
        {reviews.length === 0 ? (
          <div
            style={{
              padding: '40px 0',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 15,
            }}
          >
            {t('noReviews')}
          </div>
        ) : (
          reviews.map((r) => {
            const initials = r.customer_name
              .split(' ')
              .map((w) => w[0] ?? '')
              .slice(0, 2)
              .join('')
              .toUpperCase()
            return (
              <div className="review-item" key={r.id}>
                <div className="review-item-header">
                  <div className="reviewer-avatar">{initials}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.customer_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {r.created_at.slice(0, 10)}
                    </div>
                  </div>
                  <div style={{ marginInlineStart: 'auto', textAlign: 'end' }}>
                    <StarRow rating={r.rating} size={14} />
                  </div>
                </div>
                {r.title && (
                  <div
                    style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}
                  >
                    {r.title}
                  </div>
                )}
                <p className="review-text">{r.body}</p>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <Link
          href={`/${locale}/yachts/${id}/reviews/write`}
          className="btn btn-primary"
        >
          {t('writeReview')}
        </Link>
      </div>
    </div>
  )
}
