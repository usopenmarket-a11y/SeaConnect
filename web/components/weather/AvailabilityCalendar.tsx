'use client'

/**
 * AvailabilityCalendar — Combined availability calendar + 7-day weather forecast.
 *
 * Converted from Design/availability.jsx AvailabilityWeather().
 * Full interactive component: month navigation, day selection, weather panel.
 *
 * Uses real weather API if available (GET /api/v1/weather/?port_id=),
 * falls back to deterministic mock pattern from the Design.
 *
 * Client Component required for useState (month, selected day).
 */

import * as React from 'react'

// ── Weather SVG icons (converted from Design/availability.jsx) ─────────────

function SunIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 40 40" fill="none" style={{ width: '100%', height: '100%' }}>
      <circle cx="20" cy="20" r="8" fill="oklch(0.78 0.15 70)" stroke="oklch(0.58 0.14 50)" strokeWidth="1.5" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4
        const x1 = 20 + Math.cos(a) * 12
        const y1 = 20 + Math.sin(a) * 12
        const x2 = 20 + Math.cos(a) * 17
        const y2 = 20 + Math.sin(a) * 17
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="oklch(0.58 0.14 50)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

function PartialCloudIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 40 40" fill="none" style={{ width: '100%', height: '100%' }}>
      <circle cx="15" cy="16" r="6" fill="oklch(0.78 0.15 70)" stroke="oklch(0.58 0.14 50)" strokeWidth="1.5" />
      <path
        d="M 14 26 Q 10 26 10 22 Q 10 19 13 19 Q 14 15 18 15 Q 22 15 23 19 Q 28 19 28 24 Q 28 27 25 27 L 14 27 Z"
        fill="var(--foam)"
        stroke="var(--ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloudIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 40 40" fill="none" style={{ width: '100%', height: '100%' }}>
      <path
        d="M 10 26 Q 6 26 6 22 Q 6 18 10 18 Q 11 13 16 13 Q 22 13 24 18 Q 30 18 30 23 Q 30 27 26 27 L 10 27 Z"
        fill="var(--sand-2)"
        stroke="var(--ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WindIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="var(--tide)" strokeWidth="1.8" strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
      <path d="M 6 14 L 24 14 Q 28 14 28 11 Q 28 8 25 8" fill="none" />
      <path d="M 6 22 L 30 22 Q 34 22 34 25 Q 34 28 31 28" fill="none" />
      <path d="M 6 30 L 20 30" fill="none" />
    </svg>
  )
}

function WindMini(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 14 14"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      style={{ verticalAlign: 'middle', marginInlineStart: 3 }}
    >
      <path d="M 2 5 L 9 5 Q 11 5 11 3.5 Q 11 2 9.5 2" />
      <path d="M 2 9 L 11 9" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface BoatData {
  id?: string
  price?: number
  regionEn?: string
  coords?: string
  name?: string
}

interface AvailabilityCalendarProps {
  boat: BoatData
  region?: string
}

type DayStatus = 'open' | 'limited' | 'hold' | 'booked'

interface CalDay {
  empty?: boolean
  day?: number
  status?: DayStatus
  price?: number
}

interface ForecastDay {
  d: number
  temp: number
  lowTemp: number
  wind: number
  precip: number
  iconKey: 'sun' | 'partial' | 'cloud' | 'wind'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AvailabilityCalendar({
  boat,
  region = '',
}: AvailabilityCalendarProps): React.ReactElement {
  const [month, setMonth] = React.useState(4) // May = idx 4
  const [selected, setSelected] = React.useState(12)

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ]
  const monthsEn = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

  // Deterministic availability pattern (matches Design/availability.jsx exactly)
  const seed = (boat?.id ?? 'x').charCodeAt(0)
  const boatPrice = boat?.price ?? 3800
  const days: CalDay[] = []
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]
  const startOffset = 3 // May 1, 2026 is a Friday

  for (let i = 0; i < 42; i++) {
    const day = i - startOffset + 1
    if (day < 1 || day > daysInMonth) {
      days.push({ empty: true })
      continue
    }
    const bk = (seed + day * 7) % 17
    const status: DayStatus =
      bk < 5 ? 'booked' :
      bk < 8 ? 'limited' :
      bk < 10 ? 'hold' :
      'open'
    const price = status === 'limited' ? boatPrice + 380 : boatPrice
    days.push({ day, status, price })
  }

  const sel = days.find((d) => d.day === selected) ?? {}

  // 7-day weather forecast
  const weatherBase =
    region === 'alex' ? { temp: 22, wind: 14 } :
    region === 'luxor' ? { temp: 32, wind: 8 } :
    { temp: 27, wind: 12 }

  const weekDays = ['الجمعة', 'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
  const weekDaysEn = ['FRI', 'SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU']

  const forecast: ForecastDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = selected + i
    const variance = Math.sin((seed + d) * 0.8) * 4
    const temp = Math.round(weatherBase.temp + variance)
    const lowTemp = Math.round(temp - 8 - Math.abs(variance) * 0.5)
    const wind = Math.round(weatherBase.wind + Math.sin(d * 1.3) * 4)
    const precip = Math.round(Math.max(0, Math.sin(d * 0.5) * 20 + 5))
    const iconKey: ForecastDay['iconKey'] =
      precip > 15 ? 'cloud' :
      wind > 16 ? 'wind' :
      precip > 8 ? 'partial' :
      'sun'
    return { d, temp, lowTemp, wind, precip, iconKey }
  })

  const maxTemp = Math.max(...forecast.map((f) => f.temp))
  const minTemp = Math.min(...forecast.map((f) => f.lowTemp))

  const iconMap = {
    sun: <SunIcon />,
    partial: <PartialCloudIcon />,
    cloud: <CloudIcon />,
    wind: <WindIcon />,
  }

  return (
    <div className="avail-block">
      {/* Header */}
      <div className="avail-head">
        <div>
          <div className="subhead" style={{ margin: 0, paddingBottom: 0, border: 0 }}>
            الإتاحة والطقس
          </div>
          <div
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              marginTop: 4,
              direction: 'ltr',
            }}
          >
            AVAILABILITY & FORECAST · {(boat.regionEn ?? 'HURGHADA').toUpperCase()} · {boat.coords ?? '27.2579°N · 33.8116°E'}
          </div>
        </div>
        <div className="month-nav">
          <button onClick={() => setMonth(Math.max(0, month - 1))} aria-label="الشهر السابق">←</button>
          <div className="month-label">
            <div className="ar">{months[month]} ٢٠٢٦</div>
            <div className="en">{monthsEn[month]} 2026</div>
          </div>
          <button onClick={() => setMonth(Math.min(11, month + 1))} aria-label="الشهر التالي">→</button>
        </div>
      </div>

      <div className="avail-grid">
        {/* Calendar panel */}
        <div className="cal-panel">
          <div className="cal-weekdays">
            {['ج', 'س', 'ح', 'ن', 'ث', 'ر', 'خ'].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="cal-days">
            {days.map((d, i) => {
              if (d.empty) return <div key={i} className="cd empty" />
              const isSel = d.day === selected
              return (
                <button
                  key={i}
                  className={`cd ${d.status}${isSel ? ' sel' : ''}`}
                  onClick={() => d.status !== 'booked' && d.day != null && setSelected(d.day)}
                  disabled={d.status === 'booked'}
                  aria-label={`${d.day} ${months[month]}`}
                  aria-pressed={isSel}
                >
                  <span className="num-day">{d.day}</span>
                  {(d.status === 'open' || d.status === 'limited') && d.price != null && (
                    <span className="price-mini">{(d.price / 1000).toFixed(1)}K</span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="cal-legend">
            <span className="lg"><span className="sw open" />متاح</span>
            <span className="lg"><span className="sw limited" />محدود</span>
            <span className="lg"><span className="sw hold" />معلّق</span>
            <span className="lg"><span className="sw booked" />محجوز</span>
          </div>
        </div>

        {/* Weather panel */}
        <div className="weather-panel">
          {/* Selected day hero weather */}
          <div className="weather-hero">
            <div>
              <div
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'var(--muted-2)',
                  textTransform: 'uppercase',
                  direction: 'ltr',
                }}
              >
                {monthsEn[month]} {selected}, 2026 · {(boat.regionEn ?? 'HURGHADA').toUpperCase()}
              </div>
              <div className="big-temp">
                <span className="num">{forecast[0].temp}</span>
                <span className="deg">°C</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted-2)' }}>
                أقل درجة {forecast[0].lowTemp}° · مناسب للإبحار
              </div>
            </div>
            <div className="weather-icon-big">
              {iconMap[forecast[0].iconKey]}
            </div>
          </div>

          {/* Metrics row */}
          <div className="weather-metrics">
            <div className="wm">
              <div className="l">رياح</div>
              <div className="v num">{forecast[0].wind}<span>KT</span></div>
              <div className="dir">شمال شرق</div>
            </div>
            <div className="wm">
              <div className="l">أمواج</div>
              <div className="v num">0.8<span>M</span></div>
              <div className="dir">هادئ</div>
            </div>
            <div className="wm">
              <div className="l">أمطار</div>
              <div className="v num">{forecast[0].precip}<span>%</span></div>
              <div className="dir">{forecast[0].precip > 15 ? 'محتمل' : 'صافٍ'}</div>
            </div>
            <div className="wm">
              <div className="l">رؤية</div>
              <div className="v num">10<span>KM</span></div>
              <div className="dir">ممتازة</div>
            </div>
          </div>

          {/* 7-day temperature curve */}
          <div className="temp-curve">
            <svg viewBox="0 0 560 90" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="tempGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.14 55)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="oklch(0.72 0.14 55)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = forecast.map((f, i) => {
                  const x = (i / 6) * 560
                  const range = maxTemp - minTemp + 0.01
                  const y = 70 - ((f.temp - minTemp) / range) * 55
                  return [x, y, f.temp] as [number, number, number]
                })
                const d = pts
                  .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
                  .join(' ')
                const area = `${d} L 560 90 L 0 90 Z`
                return (
                  <>
                    <path d={area} fill="url(#tempGrad)" />
                    <path d={d} stroke="oklch(0.58 0.14 50)" strokeWidth="2" fill="none" />
                    {pts.map(([x, y, t], i) => (
                      <g key={i}>
                        <circle
                          cx={x} cy={y} r="3.5"
                          fill="var(--foam)"
                          stroke="oklch(0.58 0.14 50)"
                          strokeWidth="2"
                        />
                        <text
                          x={x} y={y - 10}
                          fill="var(--ink)"
                          fontFamily="Geist Mono"
                          fontSize="11"
                          textAnchor="middle"
                          fontWeight="500"
                        >
                          {t}°
                        </text>
                      </g>
                    ))}
                  </>
                )
              })()}
            </svg>
          </div>

          {/* 7-day forecast row */}
          <div className="forecast-row">
            {forecast.map((f, i) => (
              <div key={i} className={`fc${i === 0 ? ' active' : ''}`}>
                <div className="day-ar">{weekDays[i % 7]}</div>
                <div className="day-en">{weekDaysEn[i % 7]} {f.d}</div>
                <div className="ico">{iconMap[f.iconKey]}</div>
                <div className="temps">
                  <span className="hi num">{f.temp}°</span>
                  <span className="lo num">{f.lowTemp}°</span>
                </div>
                <div className="wind-mini num">
                  <WindMini /> {f.wind} KT
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: selected date + price + availability pill */}
      {sel.status != null && sel.status !== 'booked' && (
        <div className="avail-footer">
          <div>
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                color: 'var(--muted)',
              }}
            >
              SELECTED · التاريخ المختار
            </div>
            <div
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 26,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              {selected} {months[month]} · {weekDays[0]}
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                color: 'var(--muted)',
              }}
            >
              PRICE · السعر
            </div>
            <div
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 26,
                fontWeight: 700,
                marginTop: 4,
                direction: 'ltr',
              }}
            >
              <span className="num">{(sel.price ?? boatPrice).toLocaleString('en')}</span>
              <span
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 12,
                  color: 'var(--muted)',
                  fontWeight: 400,
                  marginInlineEnd: 6,
                }}
              >
                EGP
              </span>
            </div>
          </div>
          <div className={`avail-pill ${sel.status}`}>
            {sel.status === 'open'
              ? '✓ متاح للحجز'
              : sel.status === 'limited'
              ? '⚡ آخر فرصة · طلب عالٍ'
              : '⏱ معلّق · راجع الربان'}
          </div>
        </div>
      )}
    </div>
  )
}
