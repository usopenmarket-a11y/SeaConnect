'use client'

/**
 * Payment Processing Page — Client Component.
 *
 * Polls GET /api/v1/bookings/{bookingId}/ every 3 seconds.
 *   - status === 'confirmed'       → redirect to /{locale}/bookings/{id}/confirmed
 *   - status === 'payment_failed'  → redirect to /{locale}/bookings/{id}/failed
 *   - After 5 minutes (100 polls) → show timeout message
 *
 * ADR-009 — JWT attached by in-memory api client.
 * ADR-014 — Logical CSS only.
 * ADR-015 — All strings via t().
 */

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { get } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PollingStatus =
  | 'pending_owner'
  | 'confirmed'
  | 'payment_failed'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | string

interface BookingStatusResponse {
  id: string
  status: PollingStatus
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 100 // 100 × 3s = 5 minutes

// ---------------------------------------------------------------------------
// PageClient
// ---------------------------------------------------------------------------

interface Props {
  locale: string
}

export function PaymentProcessingPageClient({ locale }: Props): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('payment.processing')

  const [pollCount, setPollCount] = React.useState(0)
  const [timedOut, setTimedOut] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Read booking_id from URL or sessionStorage
  const bookingId = React.useMemo(() => {
    const urlId = searchParams.get('booking_id') ?? ''
    if (urlId) return urlId
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sc_booking_id') ?? ''
    }
    return ''
  }, [searchParams])

  React.useEffect(() => {
    if (!bookingId) {
      setErrorMsg(t('noBookingId'))
      return
    }

    let cancelled = false
    let currentPoll = 0

    async function poll(): Promise<void> {
      if (cancelled) return
      if (currentPoll >= MAX_POLLS) {
        if (!cancelled) setTimedOut(true)
        return
      }

      currentPoll++
      setPollCount(currentPoll)

      try {
        const data = await get<BookingStatusResponse>(`/bookings/${bookingId}/`)
        if (cancelled) return

        if (data.status === 'confirmed' || data.status === 'completed') {
          // Clear sessionStorage payment scratch data
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('sc_booking_id')
            sessionStorage.removeItem('sc_fawry_ref')
            sessionStorage.removeItem('sc_amount')
            sessionStorage.removeItem('sc_currency')
          }
          router.replace(`/${locale}/bookings/${bookingId}/confirmed`)
          return
        }

        if (
          data.status === 'payment_failed' ||
          data.status === 'declined' ||
          data.status === 'cancelled'
        ) {
          router.replace(`/${locale}/bookings/${bookingId}/failed`)
          return
        }

        // Still pending — schedule next poll
        window.setTimeout(() => {
          void poll()
        }, POLL_INTERVAL_MS)
      } catch {
        if (cancelled) return
        // Network error — keep polling
        window.setTimeout(() => {
          void poll()
        }, POLL_INTERVAL_MS)
      }
    }

    void poll()

    return () => {
      cancelled = true
    }
  }, [bookingId, locale, router, t])

  // -------------------------------------------------------------------------
  // Timeout state
  // -------------------------------------------------------------------------

  if (timedOut) {
    return (
      <main
        dir="rtl"
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
            maxWidth: 480,
            background: 'var(--foam)',
            border: '1px solid var(--rule)',
            padding: 40,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏱</div>
          <h2
            style={{
              fontFamily: 'var(--ff-display)',
              fontSize: 24,
              marginBottom: 12,
            }}
          >
            {t('timeoutTitle')}
          </h2>
          <p
            style={{
              color: 'var(--muted)',
              lineHeight: 1.7,
              marginBottom: 24,
            }}
          >
            {t('timeoutBody')}
          </p>
          <a
            href={`mailto:support@seaconnect.eg?subject=${t('timeoutEmailSubject')}&body=${t('timeoutEmailBody')} ${bookingId}`}
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: 'var(--sea)',
              color: 'var(--foam)',
              fontFamily: 'var(--ff-sans)',
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            {t('contactSupport')}
          </a>
        </div>
      </main>
    )
  }

  // -------------------------------------------------------------------------
  // Error state (no booking ID)
  // -------------------------------------------------------------------------

  if (errorMsg) {
    return (
      <main
        dir="rtl"
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
            maxWidth: 480,
            background: 'var(--foam)',
            border: '1px solid var(--rule)',
            padding: 40,
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'oklch(0.45 0.18 25)', fontSize: 15 }}>
            {errorMsg}
          </p>
        </div>
      </main>
    )
  }

  // -------------------------------------------------------------------------
  // Polling state (default)
  // -------------------------------------------------------------------------

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <main
        dir="rtl"
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
          maxWidth: 480,
          width: '100%',
          background: 'var(--foam)',
          border: '1px solid var(--rule)',
          padding: '56px 40px',
          textAlign: 'center',
        }}
      >
        {/* CSS-only animated spinner */}
        <div
          style={{
            position: 'relative',
            width: 72,
            height: 72,
            margin: '0 auto 28px',
          }}
        >
          <svg
            viewBox="0 0 72 72"
            fill="none"
            width={72}
            height={72}
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Track */}
            <circle
              cx="36"
              cy="36"
              r="30"
              stroke="oklch(0.92 0.015 220)"
              strokeWidth="4"
            />
            {/* Animated arc */}
            <circle
              cx="36"
              cy="36"
              r="30"
              stroke="oklch(0.38 0.08 220)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="48 140"
              style={{
                transformOrigin: '50% 50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          </svg>
          {/* Anchor icon centred */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            ⚓
          </span>
        </div>

        <h2
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 26,
            marginBottom: 10,
          }}
        >
          {t('heading')}
        </h2>

        <p
          style={{
            color: 'var(--muted)',
            lineHeight: 1.7,
            maxWidth: 320,
            margin: '0 auto 12px',
          }}
        >
          {t('body')}
        </p>

        <p
          className="mono"
          style={{
            color: 'var(--muted)',
            fontSize: 11,
            letterSpacing: '0.06em',
          }}
        >
          {t('processingLabel')}
          {pollCount > 0 && (
            <span style={{ marginInlineStart: 8, opacity: 0.6 }}>
              ({pollCount})
            </span>
          )}
        </p>
      </div>
      </main>
    </>
  )
}
