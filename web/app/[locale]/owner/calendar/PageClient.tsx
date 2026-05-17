'use client'

/**
 * Owner Calendar page — Client Component.
 *
 * Shows a full-month availability calendar for the owner's primary yacht.
 * Month navigation updates the API ?month= query param so day-status colours
 * reflect live booking data from:
 *   GET /api/v1/bookings/yachts/{id}/availability/?month=YYYY-MM
 *
 * Response shape:
 *   { yacht_id, month, days: { [date: string]: status }, pricing: { base_price, currency } }
 *
 * Status → cell colour mapping:
 *   'booked'  → dark / occupied (class: booked)
 *   'blocked' → red / blocked   (class: block)
 *   'limited' → amber / limited (class: limited)
 *   'open'    → green / open    (class: open)
 *
 * The yacht id is fetched from GET /api/v1/yachts/?owner=me (first result).
 * Both calls use the `get` helper from lib/api.ts which injects the Bearer
 * token automatically from the in-memory store (ADR-009).
 *
 * Mock fallback: when the API returns no data, the original deterministic
 * cell generator is used so the calendar is never empty.
 *
 * ADR-014 — logical CSS only.
 * ADR-015 — all strings via t() under owner.calendar.*.
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import { get, type PaginatedResponse } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type CellStatus = 'open' | 'limited' | 'booked' | 'block'

// Map API status strings to cell status
const API_STATUS_MAP: Record<string, CellStatus> = {
  open: 'open',
  limited: 'limited',
  booked: 'booked',
  blocked: 'block',
}

interface CalCell {
  empty: true
  day?: undefined
  status?: undefined
  booking?: undefined
  price?: undefined
}

interface CalDayCell {
  empty: false
  day: number
  status: CellStatus
  booking: string | null
  price: number
}

type Cell = CalCell | CalDayCell

interface YachtSummary {
  id: string
  name_ar: string
  price_per_day: string
}

interface AvailabilityResponse {
  yacht_id: string
  month: string
  days: Record<string, string>
  pricing: {
    base_price: string
    currency: string
  }
}

// ── Static display data ───────────────────────────────────────────────────────

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const MOCK_BOOKINGS = ['نور حسن', 'Liam Carter', 'أحمد لطفي', 'Sara K.', 'منى صبري']

// ── Calendar helpers ──────────────────────────────────────────────────────────

/**
 * Build a 42-cell (6×7) calendar grid from a YYYY-MM string and an optional
 * availability days map from the API.
 */
function buildCells(
  year: number,
  month: number,  // 0-indexed
  daysMap: Record<string, string> | null,
  basePrice: number,
): Cell[] {
  const daysInMonth = month === 1
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)
    : (DAYS_IN_MONTH[month] ?? 30)

  // getDay() is 0=Sun … 6=Sat; use first day of month for offset
  const startOffset = new Date(year, month, 1).getDay()
  const cells: Cell[] = []

  for (let i = 0; i < 42; i++) {
    const day = i - startOffset + 1
    if (day < 1 || day > daysInMonth) {
      cells.push({ empty: true })
      continue
    }

    // Build ISO date key matching API format: YYYY-MM-DD
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    const dateKey = `${year}-${mm}-${dd}`

    let cellStatus: CellStatus = 'open'
    let booking: string | null = null

    if (daysMap && daysMap[dateKey]) {
      const apiStatus = daysMap[dateKey]!
      cellStatus = API_STATUS_MAP[apiStatus] ?? 'open'
      if (cellStatus === 'booked') {
        // No customer name in availability response — show a placeholder
        booking = '●'
      }
    } else if (!daysMap) {
      // Mock fallback: deterministic pattern matching original design
      const variant = (day * 7 + month) % 13
      if (variant < 3) {
        cellStatus = 'booked'
        booking = MOCK_BOOKINGS[variant % 5] ?? null
      } else if (variant < 5) {
        cellStatus = 'limited'
      } else if (variant === 7) {
        cellStatus = 'block'
      }
    }

    cells.push({
      empty: false,
      day,
      status: cellStatus,
      booking,
      price: cellStatus === 'limited' ? Math.round(basePrice * 1.2) : basePrice,
    })
  }
  return cells
}

/** Derive calendar stats from cells. */
function calcStats(cells: Cell[]): { booked: number; open: number; blocked: number } {
  let booked = 0, open = 0, blocked = 0
  for (const c of cells) {
    if (c.empty) continue
    if (c.status === 'booked') booked++
    else if (c.status === 'block') blocked++
    else open++   // 'open' + 'limited' both count as open slots
  }
  return { booked, open, blocked }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  locale?: string
}

export function OwnerCalendarPage({ locale = 'ar' }: Props): React.ReactElement {
  const t = useTranslations('owner.calendar')

  // Current displayed year + month (0-indexed month)
  const now = new Date()
  const [year, setYear] = React.useState(now.getFullYear())
  const [month, setMonth] = React.useState(now.getMonth())

  // Month string for API: YYYY-MM
  const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`

  // ── Fetch owner's primary yacht id ──────────────────────────────────────────
  const { data: yachtsData } = useSWR<PaginatedResponse<YachtSummary>>(
    '/yachts/?owner=me',
    (path: string) => get<PaginatedResponse<YachtSummary>>(path),
    { revalidateOnFocus: false },
  )
  const yachtId: string | undefined = yachtsData?.results[0]?.id

  // ── Fetch availability for the current month ─────────────────────────────────
  const availabilityKey = yachtId
    ? `/bookings/yachts/${yachtId}/availability/?month=${monthParam}`
    : null

  const { data: availData } = useSWR<AvailabilityResponse>(
    availabilityKey,
    (path: string) => get<AvailabilityResponse>(path),
    { revalidateOnFocus: false },
  )

  // Base price: prefer API pricing, fall back to yacht's price_per_day, then 2280
  const basePrice =
    availData?.pricing?.base_price
      ? Number(availData.pricing.base_price)
      : Number(yachtsData?.results[0]?.price_per_day ?? 2280)

  const currency = availData?.pricing?.currency ?? 'EGP'

  // Build cells — pass null daysMap when no API data to trigger mock fallback
  const daysMap: Record<string, string> | null =
    availData?.days && Object.keys(availData.days).length > 0
      ? availData.days
      : null

  const cells = React.useMemo(
    () => buildCells(year, month, daysMap, basePrice),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, month, availData, basePrice],
  )

  const stats = React.useMemo(() => calcStats(cells), [cells])

  // ── Month navigation ────────────────────────────────────────────────────────

  function prevMonth(): void {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth(): void {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  // Revenue estimate: booked days × base price (rough display only)
  const revenueK = ((stats.booked * basePrice) / 1000).toFixed(1)

  return (
    <div dir="rtl">
      {/* Toolbar */}
      <div className="cal-toolbar">
        <div className="month-nav">
          <button onClick={prevMonth} aria-label={t('prevMonth')}>←</button>
          <div className="month-label">
            <div className="ar">{MONTHS_AR[month]} {year}</div>
            <div className="en">{MONTHS_EN[month]} {year}</div>
          </div>
          <button onClick={nextMonth} aria-label={t('nextMonth')}>→</button>
        </div>

        <div className="cal-stats">
          <div><span className="mono">{t('statsBooked')}</span><span className="num">{stats.booked}</span></div>
          <div><span className="mono">{t('statsOpen')}</span><span className="num">{stats.open}</span></div>
          <div><span className="mono">{t('statsBlocked')}</span><span className="num">{stats.blocked}</span></div>
          <div><span className="mono">{t('statsRevenue')}</span><span className="num">{revenueK}K</span></div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost">{t('addPricingRule')}</button>
          <button className="btn btn-clay">{t('blockDates')}</button>
        </div>
      </div>

      {/* Big calendar */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="big-cal-weekdays">
          {[
            t('weekdaySun'),
            t('weekdayMon'),
            t('weekdayTue'),
            t('weekdayWed'),
            t('weekdayThu'),
            t('weekdayFri'),
            t('weekdaySat'),
          ].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="big-cal-grid">
          {cells.map((c, i) => {
            if (c.empty) return <div key={i} className="bcal empty" />
            return (
              <div key={i} className={`bcal ${c.status}`}>
                <div className="head">
                  <span className="day-num">{c.day}</span>
                  <span className="mono price">
                    {c.status !== 'block' && c.status !== 'booked'
                      ? `${((c.price ?? 0) / 1000).toFixed(1)}K`
                      : ''}
                  </span>
                </div>
                {c.status === 'booked' && (
                  <div className="event">
                    <div className="dot-bk" />
                    <div className="ev-name">{c.booking}</div>
                    <div className="ev-time mono">06:00 · 6P</div>
                  </div>
                )}
                {c.status === 'limited' && (
                  <div className="event mini">
                    <span className="mono">{t('hot')}</span>
                  </div>
                )}
                {c.status === 'block' && (
                  <div className="event mini block">
                    <span className="mono">{t('maintenance')}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom panels */}
      <div className="dash-row" style={{ marginTop: 24, gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="dash-card">
          <h3>{t('pricingRulesTitle')}</h3>
          <div className="sub">3 PRICING RULES ACTIVE</div>
          {[
            [t('ruleWeekend'), t('ruleWeekendDetail')],
            [t('rulePeakSeason'), t('rulePeakSeasonDetail')],
            [t('ruleMultiDay'), t('ruleMultiDayDetail')],
          ].map(([title, detail]) => (
            <div key={title} className="rule-row">
              <div>
                <div className="t">{title}</div>
                <div className="d mono">{detail}</div>
              </div>
              <span className="dot-on" />
            </div>
          ))}
        </div>

        <div className="dash-card">
          <h3>{t('blockedDatesTitle')}</h3>
          <div className="sub">BLOCKED DATES</div>
          {[
            [t('blockedDate1'), t('blockedDate1Reason')],
            [t('blockedDate2'), t('blockedDate2Reason')],
            [t('blockedDate3'), t('blockedDate3Reason')],
          ].map(([date, reason]) => (
            <div key={date} className="rule-row">
              <div>
                <div className="t">{date}</div>
                <div className="d">{reason}</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>↺</button>
            </div>
          ))}
        </div>

        <div className="dash-card" style={{ background: 'var(--abyss)', color: 'var(--sand)', borderColor: 'var(--abyss)' }}>
          <h3 style={{ color: 'var(--sand)' }}>{t('smartSuggestion')}</h3>
          <div className="sub" style={{ color: 'var(--sand-3)', opacity: 0.7 }}>SMART SUGGESTION</div>
          <p style={{ fontFamily: 'var(--ff-display)', fontSize: 18, fontWeight: 700, lineHeight: 1.4, margin: '14px 0 12px' }}>
            {t('smartSuggestionBody')}
          </p>
          <button className="btn" style={{ background: 'var(--clay)', color: 'var(--foam)', marginTop: 8 }}>{t('applyBtn')}</button>
        </div>
      </div>
    </div>
  )
}
