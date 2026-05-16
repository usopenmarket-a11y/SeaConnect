'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

import { get, type PaginatedResponse } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingSummary {
  id: string
  status: string
  total_amount: string
  currency: string
  start_date: string
  end_date: string
  customer_name?: string
  passengers?: number
  payment_method?: string
}

interface ReviewSummary {
  id: string
  reviewer_name: string
  rating: number
  comment: string
  created_at: string
}

const fetchBookings = (path: string) =>
  get<PaginatedResponse<BookingSummary>>(path)

const fetchReviews = (path: string) =>
  get<PaginatedResponse<ReviewSummary>>(path)

// ── Mini Calendar (May 2026) ──────────────────────────────────────────────────

function MiniCalendar({ bookedDays }: { bookedDays: number[] }) {
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
        {['أحد', 'اثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت'].map((d) => (
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
          محجوز
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
          معلّق
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
          اليوم
        </span>
      </div>
    </>
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

  const isLoading = pendingLoading || confirmedLoading || completedLoading

  const pendingCount = pendingData?.results.length ?? 0
  const activeCount = confirmedData?.results.length ?? 0
  const totalEarnings =
    completedData?.results.reduce((sum, b) => sum + Number(b.total_amount), 0) ?? 0
  const earningsCurrency = completedData?.results[0]?.currency ?? 'EGP'

  // Occupancy: active / 30 days × 100
  const occupancyPct = Math.min(Math.round((activeCount / 30) * 100), 100)

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
            {t('title').split(' ')[0]}{' '}
            <em>{t('title').split(' ').slice(1).join(' ')}</em>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href={`/${locale}/owner/yachts`} className="btn btn-ghost">
            تعديل القارب
          </Link>
          <Link href={`/${locale}/owner/yachts/new`} className="btn btn-clay">
            + إضافة قارب جديد
          </Link>
        </div>
      </header>

      {/* ── KPI grid (4 tiles matching design) ─────────────────────────── */}
      <div className="kpi-grid" role="list" aria-label="Owner KPIs">
        <div className="kpi" role="listitem">
          <div className="l">MONTHLY REVENUE · إيرادات الشهر</div>
          <div className="v num">
            {isLoading ? '—' : fmt(nextPayoutRaw)}
            <span className="unit"> {earningsCurrency}</span>
          </div>
          <div className="delta up">▲ +22% vs APR</div>
        </div>
        <div className="kpi" role="listitem">
          <div className="l">BOOKINGS · حجوزات</div>
          <div className="v num">{isLoading ? '—' : fmt(pendingCount + activeCount)}</div>
          <div className="delta up">▲ {activeCount} UPCOMING</div>
        </div>
        <div className="kpi" role="listitem">
          <div className="l">OCCUPANCY · نسبة الإشغال</div>
          <div className="v num">
            {isLoading ? '—' : occupancyPct}
            <span className="unit"> %</span>
          </div>
          <div className="delta up">▲ +8pp MoM</div>
        </div>
        <div className="kpi" role="listitem">
          <div className="l">EARNINGS · {t('totalEarnings')}</div>
          <div className="v num">
            {isLoading ? '—' : fmt(totalEarnings)}
            <span className="unit"> {earningsCurrency}</span>
          </div>
          <div className="delta up">▲ COMPLETED</div>
        </div>
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
          <h3>التقويم · مايو ٢٠٢٦</h3>
          <div className="sub">CALENDAR · MAY 2026 · AVAILABILITY</div>
          <MiniCalendar bookedDays={bookedDays} />
        </div>

        {/* Next Payout */}
        <div className="dash-card" data-screen-label="owner-payout-widget">
          <h3>صافي الدفع القادم</h3>
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
            {[
              ['إجمالي الحجوزات', nextPayoutRaw.toLocaleString('en'), null],
              ['ضمان محتجز', `-${escrowHeld.toLocaleString('en')}`, 'hold'],
              ['عمولة المنصة 0%', '—', 'promo'],
            ].map(([l, v, k], i) => (
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
            عرض كشف الحساب
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
          <h3>الحجوزات القادمة</h3>
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
                <th>التاريخ</th>
                <th>العميل</th>
                <th>مسافرون</th>
                <th>المبلغ</th>
                <th>الحالة</th>
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
                        التفاصيل ←
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
          <h3>أحدث التقييمات</h3>
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
          <h3 style={{ color: 'var(--sand)' }}>نصيحة الأسبوع</h3>
          <div
            className="sub"
            style={{ color: 'var(--sand-3)', opacity: 0.7 }}
          >
            INSIGHT · POWERED BY SEACONNECT
          </div>
          <p
            style={{
              fontFamily: 'var(--ff-display)',
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.3,
              margin: '16px 0 12px',
            }}
          >
            ارفع سعر الخميس والجمعة بنسبة ١٥٪ — الطلب أعلى ب ٣٢٪.
          </p>
          <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
            قوارب مماثلة في الغردقة تُسعّر هذين اليومين بـ 4,370 EGP في المتوسط. زيادة قدرها 570 EGP يمكن أن تضيف ~4,500 EGP شهرياً دون خسارة حجوزات.
          </p>
          <button
            className="btn"
            style={{
              background: 'var(--clay)',
              color: 'var(--foam)',
              marginTop: 16,
            }}
          >
            طبّق الاقتراح ←
          </button>
        </div>
      </div>
    </div>
  )
}
