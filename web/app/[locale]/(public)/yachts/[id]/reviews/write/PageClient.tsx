'use client'

/**
 * WriteReviewPageClient — interactive client component.
 *
 * Matches WriteReviewPage() from Design/reviews.jsx:
 * - Interactive star picker (hover + click)
 * - Title + body fields with char-count guard
 * - Submit → POST /api/v1/yachts/{id}/reviews/ → redirect on success
 * - Success state with CTA buttons
 *
 * ADR-009: reads JWT from in-memory store via getAccessToken().
 * ADR-015: all strings from t() — no hardcoded text.
 * ADR-014: logical CSS (marginInlineStart, etc.).
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { post } from '@/lib/api'
import type { ApiError } from '@/lib/api'

interface Props {
  locale: string
  yachtId: string
  yachtName: string
  yachtImg?: string
  regionEn?: string
}

interface ReviewPayload {
  rating: number
  title: string
  body: string
}

export default function WriteReviewPageClient({
  locale,
  yachtId,
  yachtName,
  yachtImg,
  regionEn = 'Hurghada',
}: Props) {
  const t = useTranslations('yachts.reviews')
  const router = useRouter()

  const [hoverStar, setHoverStar] = React.useState(0)
  const [selectedStar, setSelectedStar] = React.useState(0)
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState('')

  const starLabels = ['', t('starLabel1'), t('starLabel2'), t('starLabel3'), t('starLabel4'), t('starLabel5')]
  const canSubmit = selectedStar > 0 && body.length >= 10 && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setErrorMsg('')
    try {
      await post<ReviewPayload>(`/yachts/${yachtId}/reviews/`, {
        rating: selectedStar,
        title,
        body,
      })
      setSubmitted(true)
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr.status === 401) {
        setErrorMsg(t('errorUnauthorized'))
      } else if (apiErr.code === 'ALREADY_REVIEWED') {
        setErrorMsg(t('errorAlreadyReviewed'))
      } else if (apiErr.code === 'NO_COMPLETED_BOOKING') {
        setErrorMsg(t('errorNoBooking'))
      } else {
        setErrorMsg(apiErr.message ?? 'An error occurred.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Success state
  if (submitted) {
    return (
      <div className="pay-screen">
        <div className="pay-result-card success">
          <div className="result-icon-wrap success">
            <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
              <circle
                cx="32"
                cy="32"
                r="30"
                fill="oklch(0.42 0.14 150 / 0.12)"
                stroke="oklch(0.42 0.14 150)"
                strokeWidth="2"
              />
              <path
                d="M20 32l8 8 16-16"
                stroke="oklch(0.42 0.14 150)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2
            style={{
              fontFamily: 'var(--ff-display)',
              fontSize: 26,
              margin: '16px 0 8px',
            }}
          >
            {t('successTitle')}
          </h2>
          <p
            style={{
              color: 'var(--muted)',
              textAlign: 'center',
              lineHeight: 1.7,
              maxWidth: 300,
            }}
          >
            {t('successBody')}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 24,
              width: '100%',
              maxWidth: 320,
            }}
          >
            <button
              className="btn btn-primary"
              onClick={() => router.push(`/${locale}/yachts`)}
              style={{ flex: 1 }}
            >
              {t('successExplore')}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => router.push(`/${locale}`)}
              style={{ flex: 1 }}
            >
              {t('successHome')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="write-review-layout">
      {/* Back link */}
      <button
        className="back-btn"
        onClick={() => router.push(`/${locale}/yachts/${yachtId}/reviews`)}
        style={{ marginBottom: 16 }}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        {t('backToReviews')}
      </button>

      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: '0.1em',
          color: 'var(--muted)',
          marginBottom: 8,
        }}
      >
        WRITE A REVIEW · {t('title').toUpperCase()}
      </div>

      {/* Boat summary strip */}
      <div className="write-review-boat">
        {yachtImg && (
          <div
            className="pay-boat-img"
            style={{
              backgroundImage: `url(${yachtImg})`,
              width: 56,
              height: 56,
              borderRadius: 8,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              flexShrink: 0,
            }}
          />
        )}
        <div>
          <div style={{ fontWeight: 700 }}>{yachtName}</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{regionEn}</div>
        </div>
      </div>

      {/* Overall star rating */}
      <div className="review-section">
        <div className="review-section-title">{t('ratingLabel')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 4, cursor: 'pointer' }}>
            {[1, 2, 3, 4, 5].map((s) => {
              const active = hoverStar >= s || selectedStar >= s
              return (
                <span
                  key={s}
                  style={{
                    fontSize: 28,
                    transition: 'transform 0.1s',
                    transform: active ? 'scale(1.15)' : 'scale(1)',
                    userSelect: 'none',
                  }}
                  onMouseEnter={() => setHoverStar(s)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => setSelectedStar(s)}
                >
                  {active ? '⭐' : '☆'}
                </span>
              )
            })}
          </div>
          {(hoverStar || selectedStar) > 0 && (
            <span style={{ fontSize: 15, color: 'var(--sea)', fontWeight: 600 }}>
              {starLabels[hoverStar || selectedStar]}
            </span>
          )}
        </div>
      </div>

      {/* Title (optional) */}
      <div className="review-section">
        <div className="review-section-title">{t('titleLabel')}</div>
        <input
          className="form-field"
          style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--rule)' }}
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
        />
      </div>

      {/* Body (required) */}
      <div className="review-section">
        <div className="review-section-title">
          {t('bodyLabel')}
          <span
            style={{
              color: body.length < 10 ? 'var(--muted)' : 'oklch(0.42 0.14 150)',
              fontSize: 12,
              fontFamily: 'var(--ff-mono)',
              marginInlineStart: 'auto',
              fontWeight: 400,
            }}
          >
            {t('bodyMinChars', { count: body.length })}
          </span>
        </div>
        <textarea
          className="review-textarea"
          placeholder={t('bodyPlaceholder')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          maxLength={5000}
        />
      </div>

      {/* Error message */}
      {errorMsg && (
        <div
          style={{
            background: 'oklch(0.95 0.04 25)',
            border: '1px solid oklch(0.80 0.12 25)',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: 14,
            color: 'oklch(0.40 0.15 25)',
            marginBottom: 12,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Submit row */}
      <div className="review-submit-row">
        <button
          className="btn btn-ghost"
          onClick={() => router.push(`/${locale}/yachts/${yachtId}/reviews`)}
        >
          {t('cancelBtn')}
        </button>
        <button
          className={`btn btn-primary${!canSubmit ? ' disabled' : ''}`}
          disabled={!canSubmit}
          onClick={handleSubmit}
          style={{ minWidth: 160 }}
        >
          {submitting ? '...' : t('submitBtn')}
        </button>
      </div>

      {!canSubmit && !submitting && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--muted)',
            marginTop: 8,
          }}
        >
          {selectedStar === 0
            ? '* ' + t('ratingLabel').replace(' *', '')
            : '* ' + t('bodyMinChars', { count: body.length })}
        </div>
      )}
    </div>
  )
}
