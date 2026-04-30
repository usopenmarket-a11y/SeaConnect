'use client'

import * as React from 'react'

type CellStatus = 'open' | 'limited' | 'booked' | 'block'

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

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const BOOKINGS = ['نور حسن', 'Liam Carter', 'أحمد لطفي', 'Sara K.', 'منى صبري']

function buildCells(month: number): Cell[] {
  const daysInMonth = DAYS_IN_MONTH[month] ?? 30
  const startOffset = 4
  const cells: Cell[] = []

  for (let i = 0; i < 42; i++) {
    const day = i - startOffset + 1
    if (day < 1 || day > daysInMonth) {
      cells.push({ empty: true })
      continue
    }
    const variant = (day * 7 + month) % 13
    let cellStatus: CellStatus = 'open'
    let booking: string | null = null
    if (variant < 3) {
      cellStatus = 'booked'
      booking = BOOKINGS[variant % 5] ?? null
    } else if (variant < 5) {
      cellStatus = 'limited'
    } else if (variant === 7) {
      cellStatus = 'block'
    }
    cells.push({ empty: false, day, status: cellStatus, booking, price: cellStatus === 'limited' ? 2660 : 2280 })
  }
  return cells
}

export function OwnerCalendarPage(): React.ReactElement {
  const [month, setMonth] = React.useState(4)
  const cells = React.useMemo(() => buildCells(month), [month])

  return (
    <div dir="rtl">
      {/* Toolbar */}
      <div className="cal-toolbar">
        <div className="month-nav">
          <button onClick={() => setMonth((m) => Math.max(0, m - 1))}>←</button>
          <div className="month-label">
            <div className="ar">{MONTHS_AR[month]} ٢٠٢٦</div>
            <div className="en">{MONTHS_EN[month]} 2026</div>
          </div>
          <button onClick={() => setMonth((m) => Math.min(11, m + 1))}>→</button>
        </div>

        <div className="cal-stats">
          <div><span className="mono">BOOKED</span><span className="num">12</span></div>
          <div><span className="mono">OPEN</span><span className="num">17</span></div>
          <div><span className="mono">BLOCKED</span><span className="num">2</span></div>
          <div><span className="mono">REVENUE</span><span className="num">48.6K</span></div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost">قاعدة تسعير +</button>
          <button className="btn btn-clay">حظر تواريخ</button>
        </div>
      </div>

      {/* Big calendar */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="big-cal-weekdays">
          {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((d) => (
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
                    {c.status !== 'block' && c.status !== 'booked' ? `${((c.price ?? 0) / 1000).toFixed(1)}K` : ''}
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
                    <span className="mono">⚡ HOT · ١ متبقي</span>
                  </div>
                )}
                {c.status === 'block' && (
                  <div className="event mini block">
                    <span className="mono">⛔ صيانة</span>
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
          <h3>قواعد التسعير النشطة</h3>
          <div className="sub">3 PRICING RULES ACTIVE</div>
          {[
            ['عطلة نهاية الأسبوع', '+30% خميس + جمعة'],
            ['ذروة الموسم', '+20% يونيو – أغسطس'],
            ['عرض ٣ أيام', '−10% خصم متعدد الأيام'],
          ].map(([t, d]) => (
            <div key={t} className="rule-row">
              <div>
                <div className="t">{t}</div>
                <div className="d mono">{d}</div>
              </div>
              <span className="dot-on" />
            </div>
          ))}
        </div>

        <div className="dash-card">
          <h3>التواريخ المحظورة</h3>
          <div className="sub">BLOCKED DATES</div>
          {[
            ['١٤ مايو', 'صيانة المحرك'],
            ['٢١ مايو', 'إجازة شخصية'],
            ['٢٨–٢٩ مايو', 'فحص خفر السواحل'],
          ].map(([d, r]) => (
            <div key={d} className="rule-row">
              <div>
                <div className="t">{d}</div>
                <div className="d">{r}</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>↺</button>
            </div>
          ))}
        </div>

        <div className="dash-card" style={{ background: 'var(--abyss)', color: 'var(--sand)', borderColor: 'var(--abyss)' }}>
          <h3 style={{ color: 'var(--sand)' }}>اقتراح ذكي</h3>
          <div className="sub" style={{ color: 'var(--sand-3)', opacity: 0.7 }}>SMART SUGGESTION</div>
          <p style={{ fontFamily: 'var(--ff-display)', fontSize: 18, fontWeight: 700, lineHeight: 1.4, margin: '14px 0 12px' }}>
            ٧ تواريخ مفتوحة في الأسبوع القادم — السعر أعلى ١٢٪ من المتوسط. خفّض ٥٪ لزيادة الحجز.
          </p>
          <button className="btn" style={{ background: 'var(--clay)', color: 'var(--foam)', marginTop: 8 }}>طبّق ←</button>
        </div>
      </div>
    </div>
  )
}
