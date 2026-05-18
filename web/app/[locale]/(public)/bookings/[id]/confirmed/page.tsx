/**
 * Booking Confirmed Page — Server Component.
 *
 * Fetches booking data server-side. Renders the booking ticket
 * with green confirmed stamp, booking reference, and trip details.
 *
 * API: GET /api/v1/bookings/{id}/
 *
 * ADR-003 — Server Component for SSR (booking receipt is a permanent record).
 * ADR-014 — Logical CSS only, dir="rtl".
 * ADR-015 — All strings via getTranslations().
 */

import * as React from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types — match BookingDetailSerializer
// ---------------------------------------------------------------------------

interface DeparturePort {
  id: string
  name_en: string
  name_ar: string
  city_en: string
  city_ar: string
}

interface BookingDetail {
  id: string
  yacht_name: string
  yacht_name_ar: string
  customer_name: string
  start_date: string
  end_date: string
  num_passengers: number
  total_amount: string
  currency: string
  status: string
  departure_port: DeparturePort | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Data fetching — server-side only
// ---------------------------------------------------------------------------

async function fetchBooking(bookingId: string): Promise<BookingDetail | null> {
  const apiBase =
    (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010') +
    '/api/v1'

  try {
    const res = await fetch(`${apiBase}/bookings/${bookingId}/`, {
      next: { revalidate: 0 }, // booking detail should always be fresh
    })
    if (!res.ok) return null
    return (await res.json()) as BookingDetail
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface Props {
  params: { locale: string; id: string }
}

export default async function BookingConfirmedPage({
  params: { locale, id },
}: Props): Promise<React.ReactElement> {
  setRequestLocale(locale)

  const [t, booking] = await Promise.all([
    getTranslations('booking.confirmed'),
    fetchBooking(id),
  ])

  const tCommon = await getTranslations('common')

  // Derive display values
  const yachtName =
    locale === 'ar'
      ? (booking?.yacht_name_ar ?? booking?.yacht_name ?? '—')
      : (booking?.yacht_name ?? '—')

  const portName = booking?.departure_port
    ? locale === 'ar'
      ? booking.departure_port.name_ar
      : booking.departure_port.name_en
    : null

  // Generate booking reference from id when not returned by API
  const bookingRef = `SC-${id.replace(/-/g, '').substring(0, 8).toUpperCase()}`

  const formattedTotal = booking
    ? `${Number(booking.total_amount).toLocaleString('en-US')} ${booking.currency}`
    : '—'

  const formattedDate = booking?.start_date
    ? (() => {
        try {
          return new Date(booking.start_date).toLocaleDateString(
            locale === 'ar' ? 'ar-EG' : 'en-GB',
            { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
          )
        } catch {
          return booking.start_date
        }
      })()
    : '—'

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
          maxWidth: 600,
          background: 'var(--foam)',
          border: '1px solid var(--rule)',
          padding: '48px 40px',
          textAlign: 'center',
        }}
      >
        {/* Success icon */}
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

        {/* Confirmed stamp */}
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.15em',
            color: 'oklch(0.42 0.14 150)',
            marginBottom: 8,
          }}
        >
          {t('stamp')}
        </div>

        <h1
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 30,
            margin: '0 0 12px',
            color: 'oklch(0.30 0.12 150)',
          }}
        >
          {t('heading')}
        </h1>

        <p
          style={{
            color: 'var(--muted)',
            lineHeight: 1.7,
            maxWidth: 380,
            margin: '0 auto 28px',
          }}
        >
          {t('subheading')}
        </p>

        {/* Booking reference */}
        <div
          style={{
            background: 'var(--sand)',
            border: '1px solid var(--rule-strong)',
            padding: '16px 20px',
            marginBottom: 28,
            display: 'inline-block',
            minWidth: 280,
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
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--sea)',
              letterSpacing: '0.06em',
              direction: 'ltr',
            }}
          >
            {bookingRef}
          </div>
        </div>

        {/* Ticket details */}
        <div
          style={{
            background: 'var(--sand)',
            border: '1px solid var(--rule)',
            marginBottom: 28,
            textAlign: 'start',
          }}
        >
          {(
            [
              [t('fields.yacht'), yachtName],
              [t('fields.date'), formattedDate],
              [t('fields.passengers'), String(booking?.num_passengers ?? '—')],
              [t('fields.departurePort'), portName ?? '—'],
              [t('fields.total'), formattedTotal],
              [
                t('fields.status'),
                <span
                  key="status"
                  style={{ color: 'oklch(0.42 0.14 150)', fontWeight: 700 }}
                >
                  {t('confirmedStatus')}
                </span>,
              ],
            ] as Array<[string, React.ReactNode]>
          ).map(([label, value]) => (
            <div
              key={label}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                padding: '14px 20px',
                borderBottom: '1px solid var(--rule)',
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  paddingTop: 2,
                }}
              >
                {label}
              </span>
              <span style={{ fontSize: 14, color: 'var(--ink)' }}>{value}</span>
            </div>
          ))}
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
            href={`/${locale}/bookings`}
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
            {t('viewBookingsButton')}
          </Link>

          <Link
            href={`/${locale}`}
            className="btn btn-ghost"
            style={{
              display: 'inline-block',
              padding: '11px 32px',
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            {tCommon('back')} {t('homeLinkSuffix')}
          </Link>
        </div>
      </div>
    </main>
  )
}
