/**
 * Booking Failed Page — Server Component.
 *
 * Shows when payment fails or is declined. Provides retry and support links.
 *
 * API: GET /api/v1/bookings/{id}/  — used to surface the booking reference.
 *
 * ADR-014 — Logical CSS only, dir="rtl".
 * ADR-015 — All strings via getTranslations().
 */

import * as React from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookingBasic {
  id: string
  yacht_name: string
  yacht_name_ar: string
  status: string
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchBookingBasic(bookingId: string): Promise<BookingBasic | null> {
  const apiBase =
    (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010') +
    '/api/v1'

  try {
    const res = await fetch(`${apiBase}/bookings/${bookingId}/`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    return (await res.json()) as BookingBasic
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface Props {
  params: { locale: string; id: string }
  // yachtId is available via referrer / sessionStorage on client — not needed
  // server-side for this read-only page
}

export default async function BookingFailedPage({
  params: { locale, id },
}: Props): Promise<React.ReactElement> {
  setRequestLocale(locale)

  const [t, booking] = await Promise.all([
    getTranslations('booking.failed'),
    fetchBookingBasic(id),
  ])

  const bookingRef = `SC-${id.replace(/-/g, '').substring(0, 8).toUpperCase()}`

  // The payment page URL — we don't know the yachtId here server-side,
  // so we link back to /bookings list where user can retry from there.
  const retryHref = `/${locale}/bookings`

  return (
    <main
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      style={{
        fontFamily: 'var(--ff-sans)',
        minHeight: '100vh',
        background: 'var(--pearl)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--pad)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--foam)',
          border: '1px solid var(--rule)',
          padding: '48px 40px',
          textAlign: 'center',
        }}
      >
        {/* Error icon */}
        <div style={{ marginBottom: 20 }}>
          <svg
            viewBox="0 0 64 64"
            fill="none"
            width={72}
            height={72}
            style={{ display: 'inline-block' }}
            aria-hidden="true"
          >
            <circle
              cx="32"
              cy="32"
              r="30"
              fill="oklch(0.45 0.18 25 / 0.10)"
              stroke="oklch(0.45 0.18 25)"
              strokeWidth="2"
            />
            <path
              d="M22 22l20 20M42 22L22 42"
              stroke="oklch(0.45 0.18 25)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Eyebrow */}
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.15em',
            color: 'oklch(0.45 0.18 25)',
            marginBottom: 8,
          }}
        >
          {t('stamp')}
        </div>

        <h1
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 28,
            margin: '0 0 12px',
            color: 'oklch(0.35 0.18 25)',
          }}
        >
          {t('heading')}
        </h1>

        <p
          style={{
            color: 'var(--muted)',
            lineHeight: 1.7,
            maxWidth: 340,
            margin: '0 auto 24px',
          }}
        >
          {t('body')}
        </p>

        {/* Booking reference */}
        {booking && (
          <div
            style={{
              background: 'var(--sand)',
              border: '1px solid var(--rule-strong)',
              padding: '12px 20px',
              marginBottom: 24,
              display: 'inline-block',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 4,
              }}
            >
              {t('referenceLabel')}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: '0.06em',
                direction: 'ltr',
              }}
            >
              {bookingRef}
            </div>
          </div>
        )}

        {/* Reason box */}
        <div
          style={{
            background: 'oklch(0.97 0.03 25)',
            border: '1px solid oklch(0.85 0.06 25)',
            padding: '16px 20px',
            marginBottom: 28,
            textAlign: 'start',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 6,
              color: 'oklch(0.35 0.18 25)',
              fontSize: 13,
            }}
          >
            {t('possibleReasonsTitle')}
          </div>
          <ul
            style={{
              paddingInlineStart: 18,
              fontSize: 13,
              color: 'var(--muted)',
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            <li>{t('reason1')}</li>
            <li>{t('reason2')}</li>
            <li>{t('reason3')}</li>
          </ul>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <Link
            href={retryHref}
            className="btn btn-clay"
            style={{
              display: 'inline-block',
              padding: '13px 32px',
              fontSize: 15,
              textDecoration: 'none',
              minWidth: 260,
              textAlign: 'center',
            }}
          >
            {t('retryButton')}
          </Link>

          <a
            href={`mailto:support@seaconnect.eg?subject=${t('supportEmailSubject')}&body=${t('supportEmailBody')} ${bookingRef}`}
            style={{
              display: 'inline-block',
              padding: '11px 28px',
              background: 'none',
              border: '1px solid var(--rule-strong)',
              color: 'var(--ink)',
              fontFamily: 'var(--ff-sans)',
              fontSize: 13,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {t('contactSupport')}
          </a>
        </div>

        {/* Fine print */}
        <p
          style={{
            marginTop: 20,
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1.6,
          }}
        >
          {t('noCharge')}
        </p>
      </div>
    </main>
  )
}
