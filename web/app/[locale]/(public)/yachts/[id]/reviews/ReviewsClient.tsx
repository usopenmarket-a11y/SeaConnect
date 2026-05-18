'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface YachtReview {
  id: string
  rating: number
  title: string
  body: string
  customer_name: string
  created_at: string
  // optional rich fields (not yet in API — gracefully absent)
  customer_country?: string
  trip_type?: string
  photos?: string[]
  helpful_count?: number
}

interface CategoryScore {
  id: string
  labelKey: 'captain' | 'cleanliness' | 'equipment' | 'punctuality' | 'value' | 'safety'
  score: number
}

interface Props {
  locale: string
  yachtId: string
  yachtName: string
  heroImg?: string
  regionEn: string
  avgRating: number
  totalCount: number
  distribution: Record<number, number>
  reviews: YachtReview[]
  categoryScores?: CategoryScore[]
}

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

const DEFAULT_CATEGORY_SCORES: CategoryScore[] = [
  { id: 'captain',     labelKey: 'captain',     score: 0 },
  { id: 'cleanliness', labelKey: 'cleanliness', score: 0 },
  { id: 'equipment',   labelKey: 'equipment',   score: 0 },
  { id: 'punctuality', labelKey: 'punctuality', score: 0 },
  { id: 'value',       labelKey: 'value',       score: 0 },
  { id: 'safety',      labelKey: 'safety',      score: 0 },
]

export default function ReviewsClient({
  locale,
  yachtId,
  yachtName,
  heroImg,
  regionEn,
  avgRating,
  totalCount,
  distribution,
  reviews,
  categoryScores,
}: Props) {
  const t = useTranslations('yachts.reviews')
  const tCat = useTranslations('yachts.reviews.categories')

  const [sortBy, setSortBy] = React.useState<'recent' | 'highest' | 'lowest' | 'helpful'>('recent')
  const [filterStar, setFilterStar] = React.useState(0)
  const [helpful, setHelpful] = React.useState<Record<string, 'yes' | 'no'>>({})

  const cats = categoryScores ?? DEFAULT_CATEGORY_SCORES

  const sorted = React.useMemo(() => {
    const filtered = filterStar > 0 ? reviews.filter((r) => r.rating === filterStar) : reviews
    return [...filtered].sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating
      if (sortBy === 'lowest')  return a.rating - b.rating
      if (sortBy === 'helpful') return (b.helpful_count ?? 0) - (a.helpful_count ?? 0)
      // recent: newest created_at first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [reviews, filterStar, sortBy])

  return (
    <div className="reviews-layout">
      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div className="reviews-header">
        {/* Boat strip */}
        <div className="reviews-boat-strip">
          {heroImg && (
            <div className="reviews-boat-img" style={{ backgroundImage: `url(${heroImg})` }} />
          )}
          <div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22 }}>{yachtName}</div>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>{regionEn}</div>
          </div>
          <Link
            href={`/${locale}/yachts/${yachtId}/reviews/write`}
            className="btn btn-primary"
            style={{ marginInlineStart: 'auto', whiteSpace: 'nowrap' }}
          >
            {t('writeReview')}
          </Link>
        </div>

        {/* Rating summary: big number | distribution bars | category score bars */}
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
              {avgRating > 0 ? avgRating.toFixed(2) : '—'}
            </div>
            <StarRow rating={Math.round(avgRating)} size={18} />
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
              {t('totalReviews', { count: totalCount })}
            </div>
          </div>

          {/* Distribution bars — each row is clickable to filter */}
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
                <button
                  key={star}
                  className={`rating-bar-row${filterStar === star ? ' active' : ''}`}
                  onClick={() => setFilterStar((f) => (f === star ? 0 : star))}
                  style={{ cursor: 'pointer', background: 'none', border: '1px solid transparent' }}
                >
                  <span className="mono" style={{ fontSize: 12, minWidth: 8 }}>{star}</span>
                  <span style={{ fontSize: 12 }}>⭐</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', minWidth: 28, textAlign: 'end' }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Category vertical bar charts */}
          <div className="category-scores">
            {cats.map((c) => (
              <div className="cat-score" key={c.id}>
                <div className="cat-score-bar-wrap">
                  <div
                    className="cat-score-bar"
                    style={{ height: c.score > 0 ? `${(c.score / 5) * 100}%` : '0%' }}
                  />
                </div>
                <div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                  {c.score > 0 ? c.score.toFixed(1) : '—'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', maxWidth: 42 }}>
                  {tCat(c.labelKey)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Controls: filter chip + sort ────────────────────────────────── */}
      <div className="reviews-controls">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {filterStar > 0 && (
            <button
              className="filter-chip"
              onClick={() => setFilterStar(0)}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {filterStar} ⭐ ×
            </button>
          )}
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            {sorted.length} {t('totalReviews', { count: sorted.length }).replace(/\d+\s/, '')}
            {filterStar > 0 ? ` · ${filterStar} ⭐` : ''}
          </span>
        </div>

        <div className="sort-row">
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{t('sortBy')}:</span>
          {(['recent', 'highest', 'helpful'] as const).map((s) => (
            <button
              key={s}
              className={`sort-btn${sortBy === s ? ' active' : ''}`}
              onClick={() => setSortBy(s)}
            >
              {s === 'recent' ? t('sortRecent') : s === 'highest' ? t('sortHighest') : 'الأفيد'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Review list ─────────────────────────────────────────────────── */}
      <div className="review-list">
        {sorted.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 15 }}>
            {filterStar > 0 ? `لا توجد تقييمات بـ${filterStar} نجوم` : t('noReviews')}
          </div>
        ) : (
          sorted.map((r) => {
            const initials = r.customer_name
              .split(' ')
              .map((w) => w[0] ?? '')
              .slice(0, 2)
              .join('')
            const dateLabel = new Date(r.created_at).toLocaleDateString(
              locale === 'ar' ? 'ar-EG' : 'en-US',
              { year: 'numeric', month: 'long' }
            )
            const helpfulVote = helpful[r.id]
            const helpfulCount = (r.helpful_count ?? 0) + (helpfulVote === 'yes' ? 1 : 0)

            return (
              <div className="review-item" key={r.id}>
                {/* Review header: avatar | name/trip | stars/date */}
                <div className="review-item-header">
                  <div className="reviewer-avatar">{initials}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {r.customer_name}
                      {r.customer_country && (
                        <span style={{ fontWeight: 400, fontSize: 13, marginInlineStart: 6 }}>
                          {r.customer_country}
                        </span>
                      )}
                    </div>
                    {r.trip_type && (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.trip_type}</div>
                    )}
                  </div>
                  <div style={{ marginInlineStart: 'auto', textAlign: 'end' }}>
                    <StarRow rating={r.rating} size={14} />
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{dateLabel}</div>
                  </div>
                </div>

                {/* Title */}
                {r.title && (
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{r.title}</div>
                )}

                {/* Body */}
                <p className="review-text">{r.body}</p>

                {/* Photos */}
                {r.photos && r.photos.length > 0 && (
                  <div className="review-photos">
                    {r.photos.map((p, i) => (
                      <div
                        key={i}
                        className="review-photo"
                        style={{ backgroundImage: `url(${p})` }}
                      />
                    ))}
                  </div>
                )}

                {/* Helpful */}
                <div className="review-helpful">
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>هل كان هذا مفيداً؟</span>
                  <button
                    className={`helpful-btn${helpfulVote === 'yes' ? ' active' : ''}`}
                    style={helpfulVote === 'yes' ? { background: 'var(--sand-2)', borderColor: 'var(--sea)' } : {}}
                    onClick={() =>
                      setHelpful((h) => ({ ...h, [r.id]: h[r.id] === 'yes' ? 'no' : 'yes' }))
                    }
                    disabled={helpfulVote === 'no'}
                  >
                    👍 نعم ({helpfulCount})
                  </button>
                  <button
                    className={`helpful-btn${helpfulVote === 'no' ? ' active' : ''}`}
                    style={helpfulVote === 'no' ? { background: 'var(--sand-2)' } : {}}
                    onClick={() =>
                      setHelpful((h) => ({ ...h, [r.id]: h[r.id] === 'no' ? undefined as never : 'no' }))
                    }
                    disabled={helpfulVote === 'yes'}
                  >
                    👎 لا
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom CTA */}
      {sorted.length > 0 && (
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <Link href={`/${locale}/yachts/${yachtId}/reviews/write`} className="btn btn-primary">
            {t('writeReview')}
          </Link>
        </div>
      )}
    </div>
  )
}
