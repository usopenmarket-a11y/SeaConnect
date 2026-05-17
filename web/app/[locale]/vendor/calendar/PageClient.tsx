'use client'

/**
 * Vendor Calendar page — Client Component.
 *
 * Month view showing delivery dates for vendor orders.
 * Colour coding: pending / confirmed (processing/shipped) / delivered.
 * Based on SellerCalendar() from Design/seller-pages.jsx.
 *
 * Mock data until Sprint 12 API wiring.
 *
 * ADR-014 — logical CSS only (inset-inline-*, border-inline-start).
 * ADR-015 — all strings via t() — never hardcoded in JSX.
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'

// ── Types ─────────────────────────────────────────────────────────────────────

type DayStatus = 'pending' | 'confirmed' | 'delivered' | 'open'

interface CalendarEvent {
  customerName: string
  status: DayStatus
  orderId: string
}

interface CalendarDay {
  day: number
  status: DayStatus
  events: CalendarEvent[]
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_EVENTS: Record<number, CalendarEvent[]> = {
  5:  [{ customerName: 'نور حسن', status: 'delivered', orderId: 'ORD-7398' }],
  8:  [{ customerName: 'Liam Carter', status: 'confirmed', orderId: 'ORD-7418' }],
  12: [{ customerName: 'أحمد لطفي', status: 'pending', orderId: 'ORD-7421' }],
  15: [{ customerName: 'Sara Klein', status: 'confirmed', orderId: 'ORD-7409' }],
  19: [{ customerName: 'منى صبري', status: 'pending', orderId: 'ORD-7385' }],
  22: [{ customerName: 'Liam Carter', status: 'delivered', orderId: 'ORD-7355' }],
  26: [{ customerName: 'أحمد لطفي', status: 'confirmed', orderId: 'ORD-7340' }],
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  locale: string
}

export function VendorCalendarPageClient({ locale }: Props): React.ReactElement {
  const t = useTranslations('vendor.calendar')

  const now = new Date()
  const [year, setYear] = React.useState(now.getFullYear())
  const [month, setMonth] = React.useState(now.getMonth()) // 0-indexed

  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ]
  const monthNamesEn = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ]

  function goToPrev(): void {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else { setMonth((m) => m - 1) }
  }

  function goToNext(): void {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else { setMonth((m) => m + 1) }
  }

  // Build calendar cells (Sun–Sat grid, 42 slots)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDay = new Date(year, month, 1).getDay() // 0=Sun

  const cells: Array<CalendarDay | null> = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const events = MOCK_EVENTS[d] ?? []
    const primaryStatus: DayStatus = events.length > 0 ? events[0].status : 'open'
    cells.push({ day: d, status: primaryStatus, events })
  }
  // Pad to fill last row
  while (cells.length % 7 !== 0) cells.push(null)

  // Stats
  const pendingCount = Object.values(MOCK_EVENTS).flat().filter((e) => e.status === 'pending').length
  const confirmedCount = Object.values(MOCK_EVENTS).flat().filter((e) => e.status === 'confirmed').length
  const deliveredCount = Object.values(MOCK_EVENTS).flat().filter((e) => e.status === 'delivered').length

  return (
    <section>
      <h1 className="mb-6 font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>
        {t('title')}
      </h1>

      {/* Calendar toolbar */}
      <div className="cal-toolbar">
        <div className="month-nav">
          <button
            type="button"
            onClick={goToPrev}
            aria-label={t('prevMonth')}
          >
            {locale === 'ar' ? '→' : '←'}
          </button>
          <div className="month-label">
            <div className="ar">{monthNamesAr[month]} {year}</div>
            <div className="en">{monthNamesEn[month]} {year}</div>
          </div>
          <button
            type="button"
            onClick={goToNext}
            aria-label={t('nextMonth')}
          >
            {locale === 'ar' ? '←' : '→'}
          </button>
        </div>

        <div className="cal-stats">
          <div>
            <span className="mono">{t('stats.pending')}</span>
            <span className="num">{pendingCount}</span>
          </div>
          <div>
            <span className="mono">{t('stats.confirmed')}</span>
            <span className="num">{confirmedCount}</span>
          </div>
          <div>
            <span className="mono">{t('stats.delivered')}</span>
            <span className="num">{deliveredCount}</span>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Weekday headers */}
        <div className="big-cal-weekdays">
          {[
            t('weekday.sun'), t('weekday.mon'), t('weekday.tue'),
            t('weekday.wed'), t('weekday.thu'), t('weekday.fri'), t('weekday.sat'),
          ].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="big-cal-grid">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} className="bcal empty" />
            return (
              <div key={i} className={`bcal ${cell.status !== 'open' ? 'booked' : 'open'}`}>
                <div className="head">
                  <span className="day-num">{cell.day}</span>
                </div>
                {cell.events.map((ev) => (
                  <div key={ev.orderId} className="event">
                    <div
                      className="dot-bk"
                      style={
                        ev.status === 'pending'
                          ? { background: 'var(--clay)' }
                          : ev.status === 'delivered'
                          ? { background: 'oklch(0.48 0.13 155)' }
                          : undefined
                      }
                    />
                    <div className="ev-name">{ev.customerName}</div>
                    <div className="ev-time mono" style={{ direction: 'ltr', fontSize: 10, opacity: 0.7 }}>
                      {ev.orderId}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
        {(
          [
            { status: 'pending',   colorVar: 'var(--clay)',               labelKey: 'legend.pending'   },
            { status: 'confirmed', colorVar: 'var(--sea)',                labelKey: 'legend.confirmed' },
            { status: 'delivered', colorVar: 'oklch(0.48 0.13 155)',      labelKey: 'legend.delivered' },
          ] as const
        ).map(({ colorVar, labelKey }) => (
          <div key={labelKey} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: colorVar }} />
            <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>{t(labelKey)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
