'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

import { get, type PaginatedResponse } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingSummary {
  id: string
  yacht_id?: string
  status: string
  total_amount: string
  currency: string
  start_date: string
  end_date: string
  customer_name?: string
  passengers?: number
  payment_method?: string
}

interface PricingInsight {
  recommendation: string
  suggested_price: string
  currency: string
  comparable_count: number
  generated_at: string
}

interface ReviewSummary {
  id: string
  reviewer_name: string
  rating: number
  comment: string
  created_at: string
}

interface EarningsMonth {
  month: string        // "2026-05"
  earnings: string     // "38420.00"
  currency: string     // "EGP"
  bookings: number
  mom_delta: number    // 0.15 = +15%
}

interface EarningsResponse {
  results: EarningsMonth[]
}

const fetchBookings = (path: string) =>
  get<PaginatedResponse<BookingSummary>>(path)

const fetchReviews = (path: string) =>
  get<PaginatedResponse<ReviewSummary>>(path)

const fetchInsight = (path: string) =>
  get<PricingInsight>(path)

const fetchEarnings = (path: string) =>
  get<EarningsResponse>(path)

// ── Mini Calendar (May 2026) ──────────────────────────────────────────────────

interface MiniCalendarProps {
  bookedDays: number[]
  legendBooked: string
  legendHold: string
  legendToday: string
  weekdays: string[]
}

function MiniCalendar({ bookedDays, legendBooked, legendHold, legendToday, weekdays }: MiniCalendarProps) {
  const cal: Array<{ day: number | ''; booked: boolean; hold: boolean; today: boolean }> = []
  for (let i = 0; i < 35; i++) {
    const day = i - 2  // May 1 starts on Thursday (index 4), shift -2 for Sunday grid
    const d = day >= 1 && day <= 31 ? day : 0
    const booked = bookedDays.includes(d) || [5, 6, 12, 13, 19, 26, 27].includes(d)
    const hold = [14, 21].includes(d)
    const today = d === 16
    cal.push({ day: d || '', booked, hold, today })
  }
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
        {weekdays.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontFamily: 'var(--ff-mono)',
              fontSize: 10,
              color: 'var(--muted)',
              letterSpacing: '0.08em',
              padding: '6px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {cal.map((c, i) => (
          <div
            key={i}
            className={`cal-day${c.booked ? ' booked' : ''}${c.hold ? ' hold' : ''}${c.today ? ' today' : ''}`}
          >
            {c.day}
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 18,
          marginTop: 16,
          fontFamily: 'var(--ff-mono)',
          fontSize: 11,
          color: 'var(--muted)',
          letterSpacing: '0.05em',
        }}
      >
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              background: 'var(--ink)',
              marginInlineEnd: 6,
              verticalAlign: 'middle',
            }}
          />
          {legendBooked}
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              background: 'oklch(0.86 0.05 55)',
              marginInlineEnd: 6,
              verticalAlign: 'middle',
            }}
          />
          {legendHold}
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              border: '2px solid var(--clay)',
              marginInlineEnd: 6,
              verticalAlign: 'middle',
            }}
          />
          {legendToday}
        </span>
      </div>
    </>
  )
}

// ── Revenue Bar Chart ────────────────────────────────────────────────────────

interface RevenueChartProps {
  months: EarningsMonth[]
  chartMax: number
  locale: string
  isLoading: boolean
  labelRevenue: string
  labelNoData: string
}

function RevenueChart({
  months,
  chartMax,
  locale,
  isLoading,
  labelRevenue,
  labelNoData,
}: RevenueChartProps): React.ReactElement {
  function fmtMonth(ym: string): string {
    try {
      const [y, m] = ym.split('-')
      const d = new Date(Number(y), Number(m) - 1, 1)
      return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
        month: 'short',
      })
    } catch {
      return ym
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          height: 80,
          padding: '0 4px',
        }}
        aria-label={labelRevenue}
        role="img"
      >
        {[60, 40, 75, 50, 85, 65].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              background: 'var(--rule)',
              borderRadius: 3,
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    )
  }

  if (months.length === 0) {
    return (
      <p
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--muted)',
          fontFamily: 'var(--ff-mono)',
          padding: '16px 0',
        }}
      >
        {labelNoData}
      </p>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          height: 80,
        }}
        role="img"
        aria-label={labelRevenue}
      >
        {months.map((m) => {
          const heightPct = Math.max(
            4,
            Math.round((Number(m.earnings) / chartMax) * 100),
          )
          const isLatest = m === months[months.length - 1]
          return (
            <div
              key={m.month}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
              title={`${fmtMonth(m.month)}: ${Number(m.earnings).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} ${m.currency}`}
            >
              <div
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  minHeight: 4,
                  background: isLatest ? 'var(--sea)' : 'var(--sea-glow)',
                  borderRadius: 3,
                  opacity: isLatest ? 1 : 0.55,
                  transition: 'height 0.3s ease',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 9,
                  color: 'var(--muted)',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {fmtMonth(m.month)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  params: { locale: string }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OwnerDashboardPage({ params: { locale } }: Props): React.ReactElement {
  const t = useTranslations('owner.dashboard')
  const tCommon = useTranslations('common')

  const swrOpts = { revalidateOnFocus: false } as const

  const { data: pendingData, error: pendingError, isLoading: pendingLoading } =
    useSWR<PaginatedResponse<BookingSummary>>(
      '/bookings/?status=pending_owner&page_size=100',
      fetchBookings,
      swrOpts,
    )

  const { data: confirmedData, isLoading: confirmedLoading } =
    useSWR<PaginatedResponse<BookingSummary>>(
      '/bookings/?status=confirmed&page_size=100',
      fetchBookings,
      swrOpts,
    )

  const { data: completedData, isLoading: completedLoading } =
    useSWR<PaginatedResponse<BookingSummary>>(
      '/bookings/?status=completed&page_size=100',
      fetchBookings,
      swrOpts,
    )

  const { data: reviewsData } =
    useSWR<PaginatedResponse<ReviewSummary>>(
      '/yachts/reviews/?page_size=3',
      fetchReviews,
      swrOpts,
    )

  const { data: earningsData, isLoading: earningsLoading } =
    useSWR<EarningsResponse>(
      '/analytics/earnings/',
      fetchEarnings,
      swrOpts,
    )

  // Derive the owner's primary yacht ID from the first available booking.
  // Bookings are owner-scoped by the API so any yacht_id here belongs to them.
  const primaryYachtId: string | null =
    confirmedData?.results[0]?.yacht_id ??
    pendingData?.results[0]?.yacht_id ??
    completedData?.results[0]?.yacht_id ??
    null

  const { data: insightData, error: insightError, isLoading: insightLoading } =
    useSWR<PricingInsight>(
      primaryYachtId ? `/yachts/${primaryYachtId}/pricing-insight/` : null,
      fetchInsight,
      { ...swrOpts, shouldRetryOnError: false },
    )

  const isLoading = pendingLoading || confirmedLoading || completedLoading

  const pendingCount = pendingData?.results.length ?? 0
  const activeCount = confirmedData?.results.length ?? 0
  const totalEarnings =
    completedData?.results.reduce((sum, b) => sum + Number(b.total_amount), 0) ?? 0
  const earningsCurrency = completedData?.results[0]?.currency ?? 'EGP'

  // Occupancy: active / 30 days × 100
  const occupancyPct = Math.min(Math.round((activeCount / 30) * 100), 100)

  // Earnings chart — latest 6 months from API
  const earningsMonths: EarningsMonth[] = earningsData?.results?.slice(-6) ?? []
  const latestMonth: EarningsMonth | undefined = earningsMonths[earningsMonths.length - 1]
  const latestMomDelta: number | undefined = latestMonth?.mom_delta
  const chartMax = earningsMonths.reduce(
    (m, e) => Math.max(m, Number(e.earnings)),
    1,
  )

  // Next payout: sum of confirmed bookings
  const nextPayoutRaw =
    (confirmedData?.results ?? []).reduce((s, b) => s + Number(b.total_amount), 0)
  const escrowHeld = Math.round(nextPayoutRaw * 0.12)
  const nextPayout = nextPayoutRaw - escrowHeld

  // Bookings for upcoming table
  const upcomingBookings = [
    ...(confirmedData?.results ?? []),
    ...(pendingData?.results ?? []),
  ].slice(0, 5)

  // Booked days from API (for calendar highlight)
  const bookedDays = upcomingBookings
    .map((b) => new Date(b.start_date).getDate())
    .filter((d) => d >= 1 && d <= 31)

  // Reviews — fall back to design mock if API has none
  const reviews: ReviewSummary[] = reviewsData?.results?.length
    ? reviewsData.results.slice(0, 3)
    : [
        {
          id: '1',
          reviewer_name: 'عمرو عبد الحليم',
          rating: 5,
          comment: 'رحلة استثنائية — الربان خبير في مواقع التونة.',
          created_at: '2026-05-14',
        },
        {
          id: '2',
          reviewer_name: 'Liam Carter',
          rating: 5,
          comment: 'Best fishing day I\'ve had in Egypt. Top gear.',
          created_at: '2026-05-10',
        },
        {
          id: '3',
          reviewer_name: 'نادية الشامي',
          rating: 4,
          comment: 'عائلي ومريح، لكن مكيف الغرفة السفلية ضعيف.',
          created_at: '2026-05-03',
        },
      ]

  function fmt(n: number): string {
    return locale === 'ar' ? n.toLocaleString('ar-EG') : n.toLocaleString('en-US')
  }

  function fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(
        locale === 'ar' ? 'ar-EG' : 'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' },
      )
    } catch { return iso }
  }

  function fmtMomDelta(delta: number | undefined): string {
    if (delta === undefined || delta === null) return '—'
    const pct = Math.round(delta * 100)
    const sign = pct >= 0 ? '+' : ''
    return locale === 'ar'
      ? `${sign}${pct.toLocaleString('ar-EG')}%`
      : `${sign}${pct}%`
  }

  function fmtRelDate(iso: string): string {
    try {
      const d = new Date(iso)
      const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
      if (diff === 0) return locale === 'ar' ? 'اليوم' : 'Today'
      if (diff === 1) return locale === 'ar' ? 'البارحة' : 'Yesterday'
      if (diff < 7) return locale === 'ar' ? `${diff} أيام` : `${diff}d ago`
      if (diff < 30) return locale === 'ar' ? `${Math.floor(diff / 7)} أسبوع` : `${Math.floor(diff / 7)}w ago`
      return locale === 'ar' ? `${Math.floor(diff / 30)} شهر` : `${Math.floor(diff / 30)}mo ago`
    } catch { return iso }
  }

  function getStatusLabel(status: string): string {
    if (status === 'confirmed') return '✓ PAID'
    if (status === 'pending_owner') return '⏱ FAWRY PENDING'
    return status.toUpperCase()
  }

  function getStatusClass(status: string): string {
    if (status === 'confirmed') return 'pill-status ok'
    if (status === 'pending_owner') return 'pill-status pending'
    return 'pill-status'
  }

  const pendingBookings = pendingData?.results ?? []

  return (
    <div className="dash-wrap">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="dash-head">
        <div>
          <div className="num-tag">§ OWNER · {locale.toUpperCase()} · DASHBOARD</div>
          <h1>
            {t('titleGreet')}{' '}
            <em>{t('titleName')}</em>
          </h1>
          {/* Vessel status subtitle — matches design SellerDashContent dash-head */}
          <div
            style={{
              marginTop: 10,
              fontFamily: 'var(--ff-mono)',
              fontSize: 12,
              color: 'var(--muted)',
              letterSpacing: '0.05em',
              direction: 'ltr',
            }}
          >
            {t('vesselStatus')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href={`/${locale}/owner/yachts`} className="btn btn-ghost">
            {t('editBoat')}
          </Link>
          <Link href={`/${locale}/owner/yachts/new`} className="btn btn-clay">
            {t('addBoat')}
          </Link>
        </div>
      </header>

      {/* ── KPI grid (4 tiles matching design SellerDashContent) ──────── */}
      <div className="kpi-grid" role="list" aria-label={t('kpisAriaLabel')}>
        <div className="kpi" role="listitem">
          <div className="l">{t('kpiRevenue')}</div>
          <div className="v num">
            {isLoading ? '—' : fmt(nextPayoutRaw)}
            <span className="unit"> {earningsCurrency}</span>
          </div>
          <div className={`delta ${latestMomDelta !== undefined && latestMomDelta >= 0 ? 'up' : 'down'}`}>
            {earningsLoading
              ? '—'
              : latestMomDelta !== undefined
                ? `${latestMomDelta >= 0 ? '▲' : '▼'} ${fmtMomDelta(latestMomDelta)}`
                : `▲ ${t('kpiRevenueDelta')}`}
          </div>
        </div>
        <div className="kpi" role="listitem">
          <div className="l">{t('kpiBookings')}</div>
          <div className="v num">{isLoading ? '—' : fmt(pendingCount + activeCount)}</div>
          <div className="delta up">
            ▲ {isLoading ? '—' : activeCount} {t('kpiBookingsDeltaSuffix')}
          </div>
        </div>
        <div className="kpi" role="listitem">
          <div className="l">{t('kpiOccupancy')}</div>
          <div className="v num">
            {isLoading ? '—' : occupancyPct}
            <span className="unit"> %</span>
          </div>
          <div className="delta up">▲ {t('kpiOccupancyDelta')}</div>
        </div>
        {/* 4th KPI: Rating — matches design (4.92 / 5 · 148 REVIEWS) */}
        <div className="kpi" role="listitem">
          <div className="l">{t('kpiRating')}</div>
          <div className="v num">
            {reviews[0] ? (
              <>
                {(
                  reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                ).toFixed(2)}
                <span className="unit"> / 5</span>
              </>
            ) : (
              '—'
            )}
          </div>
          <div className="delta up">▲ {reviews.length} {t('kpiRatingDeltaSuffix')}</div>
        </div>
      </div>

      {/* ── Earnings chart ──────────────────────────────────────────────── */}
      <div className="dash-card" data-screen-label="owner-earnings-chart" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3>{t('earningsChartTitle')}</h3>
          {!earningsLoading && latestMonth && (
            <span
              className="num"
              style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--muted)', direction: 'ltr' }}
            >
              {latestMonth.month} ·{' '}
              {Number(latestMonth.earnings).toLocaleString(
                locale === 'ar' ? 'ar-EG' : 'en-US',
              )}{' '}
              {latestMonth.currency}
            </span>
          )}
        </div>
        <div className="sub">EARNINGS · 6-MONTH TREND · MoM CHANGE</div>
        <RevenueChart
          months={earningsMonths}
          chartMax={chartMax}
          locale={locale}
          isLoading={earningsLoading}
          labelRevenue={t('earningsChartAriaLabel')}
          labelNoData={t('earningsChartNoData')}
        />
      </div>

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {pendingError && (
        <p
          role="alert"
          style={{
            color: 'var(--clay)',
            fontFamily: 'var(--ff-mono)',
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          {t('loadError')}
        </p>
      )}

      {/* ── Row: Calendar + Next Payout ─────────────────────────────────── */}
      <div className="dash-row">
        {/* Calendar */}
        <div className="dash-card" data-screen-label="owner-calendar-widget">
          <h3>{t('calendarTitle')}</h3>
          <div className="sub">CALENDAR · MAY 2026 · AVAILABILITY</div>
          <MiniCalendar
            bookedDays={bookedDays}
            legendBooked={t('calLegendBooked')}
            legendHold={t('calLegendHold')}
            legendToday={t('calLegendToday')}
            weekdays={[
              t('calWeekdaySun'),
              t('calWeekdayMon'),
              t('calWeekdayTue'),
              t('calWeekdayWed'),
              t('calWeekdayThu'),
              t('calWeekdayFri'),
              t('calWeekdaySat'),
            ]}
          />
        </div>

        {/* Next Payout */}
        <div className="dash-card" data-screen-label="owner-payout-widget">
          <h3>{t('payoutTitle')}</h3>
          <div className="sub">NEXT PAYOUT · 15 MAY 2026</div>
          <div className="display" style={{ fontSize: 56, lineHeight: 1, marginTop: 8 }}>
            <span className="num">{isLoading ? '—' : nextPayout.toLocaleString('en')}</span>
            <span
              className="mono"
              style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginInlineStart: 6 }}
            >
              {earningsCurrency}
            </span>
          </div>
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--rule)' }}>
            {(
              [
                [t('payoutLineTotal'), nextPayoutRaw.toLocaleString('en'), null],
                [t('payoutLineEscrow'), `-${escrowHeld.toLocaleString('en')}`, 'hold'],
                [t('payoutLineCommission'), '—', 'promo'],
              ] as [string, string, string | null][]
            ).map(([l, v, k], i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    color:
                      k === 'promo'
                        ? 'oklch(0.48 0.13 155)'
                        : 'var(--muted-2)',
                  }}
                >
                  {l}
                </span>
                <span
                  className="num"
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    color: k === 'hold' ? 'var(--clay)' : 'inherit',
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
          <Link
            href={`/${locale}/owner/payouts`}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 16, display: 'block', textAlign: 'center' }}
          >
            {t('viewStatement')}
          </Link>
        </div>
      </div>

      {/* ── Upcoming bookings table ─────────────────────────────────────── */}
      <div className="dash-card" data-screen-label="owner-bookings-table">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 4,
          }}
        >
          <h3>{t('upcomingBookingsTitle')}</h3>
          <Link
            href={`/${locale}/owner/bookings`}
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 11,
              letterSpacing: '0.05em',
              color: 'var(--sea)',
            }}
          >
            {t('viewAllBookings')}
          </Link>
        </div>
        <div className="sub">
          UPCOMING BOOKINGS · {pendingCount + activeCount} TOTAL
        </div>

        {isLoading && (
          <p
            style={{
              textAlign: 'center',
              color: 'var(--muted)',
              fontFamily: 'var(--ff-mono)',
              fontSize: 13,
              padding: '24px 0',
            }}
          >
            {tCommon('loading')}
          </p>
        )}

        {!isLoading && upcomingBookings.length === 0 && (
          <p
            style={{
              textAlign: 'center',
              color: 'var(--muted)',
              fontFamily: 'var(--ff-mono)',
              fontSize: 13,
              padding: '24px 0',
            }}
          >
            {t('noPendingBookings')}
          </p>
        )}

        {!isLoading && upcomingBookings.length > 0 && (
          <table className="dash-table">
            <thead>
              <tr>
                <th>{t('tableDate')}</th>
                <th>{t('tableCustomer')}</th>
                <th>{t('tablePax')}</th>
                <th>{t('tableAmount')}</th>
                <th>{t('tableStatus')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {upcomingBookings.map((booking) => {
                const initials = (booking.customer_name ?? '?').charAt(0).toUpperCase()
                return (
                  <tr key={booking.id}>
                    <td className="num">
                      {fmtDate(booking.start_date)} · 06:00
                    </td>
                    <td
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'var(--clay)',
                          color: 'var(--foam)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--ff-display)',
                          fontSize: 14,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <span>{booking.customer_name ?? `#${booking.id.slice(0, 8).toUpperCase()}`}</span>
                    </td>
                    <td className="num">{booking.passengers ?? '—'}</td>
                    <td className="num">
                      {fmt(Number(booking.total_amount))}{' '}
                      <span style={{ opacity: 0.5, fontSize: 12 }}>
                        {booking.currency}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusClass(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/${locale}/owner/bookings`}
                        className="btn btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        {t('tableDetails')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Pending approvals fallback for empty upcoming list */}
        {!isLoading && upcomingBookings.length === 0 && pendingBookings.length > 0 && (
          <>
            <div className="sub" style={{ marginTop: 24 }}>
              PENDING APPROVAL · {pendingCount}
            </div>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>REF</th>
                  <th>{t('pendingSectionTitle')}</th>
                  <th>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {pendingBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="num">#{booking.id.slice(0, 8).toUpperCase()}</td>
                    <td>
                      <span className="num" style={{ fontSize: 13 }}>
                        {fmtDate(booking.start_date)} — {fmtDate(booking.end_date)}
                      </span>
                    </td>
                    <td className="num">
                      {fmt(Number(booking.total_amount))}{' '}
                      <span style={{ opacity: 0.5, fontSize: 12 }}>{booking.currency}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ── Row: Recent Reviews + AI Insight ───────────────────────────── */}
      <div className="dash-row" style={{ marginTop: 32 }}>
        {/* Recent Reviews */}
        <div className="dash-card" data-screen-label="owner-reviews-widget">
          <h3>{t('reviewsTitle')}</h3>
          <div className="sub">RECENT REVIEWS</div>
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{ padding: '14px 0', borderBottom: '1px solid var(--rule)' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--ff-display)',
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {r.reviewer_name}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--muted)',
                    letterSpacing: '0.1em',
                    direction: 'ltr',
                  }}
                >
                  {fmtRelDate(r.created_at)} · {'★'.repeat(r.rating)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: 'var(--ink-2)',
                  fontStyle: 'italic',
                }}
              >
                «{r.comment}»
              </div>
            </div>
          ))}
        </div>

        {/* AI Pricing Insight (dark card) */}
        <div
          className="dash-card"
          style={{
            background: 'var(--abyss)',
            color: 'var(--sand)',
            borderColor: 'var(--abyss)',
          }}
          data-screen-label="owner-ai-insight"
        >
          <h3 style={{ color: 'var(--sand)' }}>{t('insightTitle')}</h3>
          <div
            className="sub"
            style={{ color: 'var(--sand-3)', opacity: 0.7 }}
          >
            INSIGHT · POWERED BY SEACONNECT
          </div>

          {/* Loading skeleton */}
          {insightLoading && (
            <div aria-busy="true" aria-label={tCommon('loading')}>
              <div
                style={{
                  height: 28,
                  borderRadius: 4,
                  background: 'oklch(0.25 0.02 220 / 0.6)',
                  marginTop: 16,
                  marginBottom: 8,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  height: 16,
                  borderRadius: 4,
                  background: 'oklch(0.25 0.02 220 / 0.4)',
                  marginBottom: 6,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  height: 16,
                  width: '70%',
                  borderRadius: 4,
                  background: 'oklch(0.25 0.02 220 / 0.4)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          )}

          {/* Live AI recommendation */}
          {!insightLoading && insightData && (
            <>
              <p
                style={{
                  fontFamily: 'var(--ff-display)',
                  fontSize: 20,
                  fontWeight: 700,
                  lineHeight: 1.4,
                  margin: '16px 0 12px',
                  direction: 'rtl',
                }}
              >
                {insightData.recommendation}
              </p>
              <div
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 13,
                  opacity: 0.85,
                  marginBottom: 16,
                  direction: 'ltr',
                }}
              >
                {locale === 'ar' ? 'السعر المقترح' : 'Suggested price'}{' '}
                <strong>
                  {Number(insightData.suggested_price).toLocaleString(
                    locale === 'ar' ? 'ar-EG' : 'en-US',
                  )}{' '}
                  {insightData.currency}
                </strong>
                {insightData.comparable_count > 0 && (
                  <span style={{ opacity: 0.6, marginInlineStart: 8 }}>
                    · {insightData.comparable_count}{' '}
                    {locale === 'ar' ? 'يخوت مماثلة' : 'comparable yachts'}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Fallback — Ollama unavailable or no yacht linked yet */}
          {!insightLoading && (insightError || !primaryYachtId) && (
            <>
              <p
                style={{
                  fontFamily: 'var(--ff-display)',
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  margin: '16px 0 12px',
                }}
              >
                {t('insightHeadline')}
              </p>
              <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
                {t('insightBody')}
              </p>
            </>
          )}

          <button
            className="btn"
            style={{
              background: 'var(--clay)',
              color: 'var(--foam)',
              marginTop: 16,
            }}
          >
            {t('insightApply')}
          </button>
        </div>
      </div>
    </div>
  )
}
