'use client'

/**
 * Payment Display Page — Client Component.
 *
 * Shown after Fawry payment is initiated. Reads booking_id and fawry_ref
 * from URL search params (set by the booking wizard) or falls back to
 * sessionStorage for hard-reload resilience.
 *
 * ADR-009 — no tokens in localStorage / sessionStorage. Only non-sensitive
 *            display data (fawry reference, amount) is stored here.
 * ADR-014 — Logical CSS only: ms-/me-/ps-/pe-. dir="rtl" on root.
 * ADR-015 — All strings via t() — never hardcoded.
 */

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a seconds count as MM:SS */
function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 24 hours in seconds */
const TWENTY_FOUR_HOURS = 24 * 60 * 60

// ---------------------------------------------------------------------------
// PageClient
// ---------------------------------------------------------------------------

interface Props {
  locale: string
  yachtId: string
}

export function PaymentDisplayPageClient({ locale, yachtId }: Props): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('payment.fawry')

  // Read params from URL, fall back to sessionStorage
  const [bookingId, setBookingId] = React.useState<string>('')
  const [fawryRef, setFawryRef] = React.useState<string>('')
  const [amount, setAmount] = React.useState<string>('')
  const [currency, setCurrency] = React.useState<string>('EGP')
  const [copied, setCopied] = React.useState(false)
  const [secondsLeft, setSecondsLeft] = React.useState<number>(TWENTY_FOUR_HOURS)

  // Hydrate from URL params or sessionStorage on mount
  React.useEffect(() => {
    const urlBookingId = searchParams.get('booking_id') ?? ''
    const urlFawryRef = searchParams.get('fawry_ref') ?? ''
    const urlAmount = searchParams.get('amount') ?? ''
    const urlCurrency = searchParams.get('currency') ?? 'EGP'

    const storedBookingId = typeof window !== 'undefined'
      ? (sessionStorage.getItem('sc_booking_id') ?? '')
      : ''
    const storedFawryRef = typeof window !== 'undefined'
      ? (sessionStorage.getItem('sc_fawry_ref') ?? '')
      : ''
    const storedAmount = typeof window !== 'undefined'
      ? (sessionStorage.getItem('sc_amount') ?? '')
      : ''
    const storedCurrency = typeof window !== 'undefined'
      ? (sessionStorage.getItem('sc_currency') ?? 'EGP')
      : 'EGP'

    setBookingId(urlBookingId || storedBookingId)
    setFawryRef(urlFawryRef || storedFawryRef)
    setAmount(urlAmount || storedAmount)
    setCurrency(urlCurrency || storedCurrency)

    // Persist to sessionStorage if coming from URL
    if (typeof window !== 'undefined') {
      if (urlBookingId) sessionStorage.setItem('sc_booking_id', urlBookingId)
      if (urlFawryRef) sessionStorage.setItem('sc_fawry_ref', urlFawryRef)
      if (urlAmount) sessionStorage.setItem('sc_amount', urlAmount)
      if (urlCurrency) sessionStorage.setItem('sc_currency', urlCurrency)
    }
  }, [searchParams])

  // Countdown timer — ticks every second
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  async function handleCopy(): Promise<void> {
    if (!fawryRef) return
    try {
      await navigator.clipboard.writeText(fawryRef)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard not available — silently ignore
    }
  }

  function handleIPaid(): void {
    const id = bookingId
    router.push(`/${locale}/yachts/${yachtId}/book/processing?booking_id=${id}`)
  }

  function handleCancel(): void {
    // Clear sessionStorage payment data
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sc_booking_id')
      sessionStorage.removeItem('sc_fawry_ref')
      sessionStorage.removeItem('sc_amount')
      sessionStorage.removeItem('sc_currency')
    }
    router.push(`/${locale}/yachts/${yachtId}`)
  }

  const isExpired = secondsLeft === 0
  const displayRef = fawryRef || '—'
  const displayAmount = amount
    ? `${Number(amount).toLocaleString('en-US')} ${currency}`
    : '—'

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
          width: '100%',
          maxWidth: 560,
          background: 'var(--foam)',
          border: '1px solid var(--rule)',
          padding: 40,
        }}
      >
        {/* Header */}
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            marginBottom: 8,
          }}
        >
          {t('eyebrow')}
        </div>
        <h1
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 28,
            margin: '0 0 28px',
          }}
        >
          {t('heading')}
        </h1>

        {/* Fawry reference */}
        <div
          style={{
            background: 'var(--sand)',
            border: '1px solid var(--rule-strong)',
            padding: '24px 20px',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              marginBottom: 8,
            }}
          >
            {t('referenceLabel')}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: 'var(--sea)',
              letterSpacing: '0.08em',
              marginBottom: 12,
              direction: 'ltr',
            }}
          >
            {displayRef}
          </div>
          <button
            onClick={() => void handleCopy()}
            style={{
              background: copied ? 'oklch(0.42 0.14 150 / 0.1)' : 'var(--foam)',
              border: `1px solid ${copied ? 'oklch(0.42 0.14 150)' : 'var(--rule-strong)'}`,
              color: copied ? 'oklch(0.35 0.12 150)' : 'var(--ink)',
              fontFamily: 'var(--ff-sans)',
              fontSize: 13,
              padding: '8px 20px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {copied ? t('copied') : t('copy')}
          </button>
        </div>

        {/* Amount + expiry row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: 'var(--sand)',
              border: '1px solid var(--rule)',
              padding: '16px',
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
              {t('amountLabel')}
            </div>
            <div
              className="mono"
              style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}
            >
              {displayAmount}
            </div>
          </div>

          <div
            style={{
              background: isExpired ? 'oklch(0.94 0.04 25)' : 'var(--sand)',
              border: `1px solid ${isExpired ? 'oklch(0.72 0.12 25)' : 'var(--rule)'}`,
              padding: '16px',
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
              {t('expiryLabel')}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: isExpired ? 'oklch(0.45 0.18 25)' : 'var(--ink)',
              }}
            >
              {isExpired ? t('expired') : formatCountdown(secondsLeft)}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div
          style={{
            background: 'var(--sand)',
            border: '1px dashed var(--rule-strong)',
            padding: '20px',
            marginBottom: 28,
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              marginBottom: 10,
            }}
          >
            {t('instructionsLabel')}
          </div>
          <ol
            style={{
              paddingInlineStart: 20,
              fontSize: 14,
              lineHeight: 1.8,
              color: 'var(--ink-2)',
              margin: 0,
            }}
          >
            <li>{t('step1')}</li>
            <li>
              {t('step2Before')} <strong>{t('step2BillPay')}</strong>{' '}
              {t('step2Then')} <strong>{t('step2SeaConnect')}</strong>
            </li>
            <li>
              {t('step3Before')}{' '}
              <span
                className="mono"
                style={{ color: 'var(--sea)', fontWeight: 700 }}
              >
                {displayRef}
              </span>
            </li>
            <li>
              {t('step4Before')}{' '}
              <strong className="mono">{displayAmount}</strong>
            </li>
            <li>{t('step5')}</li>
          </ol>
        </div>

        {/* Note */}
        <div
          style={{
            background: 'oklch(0.55 0.08 220 / 0.06)',
            border: '1px solid oklch(0.55 0.08 220 / 0.2)',
            padding: '12px 16px',
            fontSize: 13,
            color: 'var(--muted)',
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          {t('note')}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn btn-clay"
            onClick={handleIPaid}
            disabled={isExpired}
            style={{ fontSize: 15, padding: '14px 28px' }}
          >
            {t('iPaidButton')}
          </button>

          <button
            className="btn btn-ghost"
            onClick={handleCancel}
            style={{ fontSize: 13 }}
          >
            {t('cancelPayment')}
          </button>
        </div>
      </div>
    </main>
  )
}
