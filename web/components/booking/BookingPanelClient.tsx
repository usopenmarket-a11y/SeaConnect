'use client'

/**
 * BookingPanelClient — interactive booking panel on the yacht detail page.
 *
 * Replaces the static <div className="booking-panel"> Server Component markup.
 * Listens for the 'sc:date-selected' CustomEvent dispatched by
 * AvailabilityCalendarWithBooking when the user clicks a day on the calendar,
 * then updates:
 *   - The trip date input display
 *   - The "Book Now" link href to include ?date=YYYY-MM-DD
 *
 * ADR-015 — all strings via t() props passed from the Server Component parent.
 * ADR-018 — currency from yacht API response, never hardcoded.
 */

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface BookingPanelClientProps {
  yachtId: string
  locale: string
  priceNum: number
  currency: string
  capacity: number
  serviceFee: number
  insuranceFee: number
  total: number
  displayRating: number
  displayReviewCount: number
  bookHref: string  // base href without ?date= param
}

export function BookingPanelClient({
  yachtId,
  locale,
  priceNum,
  currency,
  capacity,
  serviceFee,
  insuranceFee,
  total,
  displayRating,
  displayReviewCount,
  bookHref,
}: BookingPanelClientProps): React.ReactElement {
  const t = useTranslations('yachts.detail')
  const tBook = useTranslations('yachts')

  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  React.useEffect(() => {
    function onDateSelected(e: Event): void {
      const isoDate = (e as CustomEvent<string>).detail
      setSelectedDate(isoDate)
    }
    window.addEventListener('sc:date-selected', onDateSelected)
    return () => window.removeEventListener('sc:date-selected', onDateSelected)
  }, [])

  const bookLink = selectedDate ? `${bookHref}?date=${selectedDate}` : bookHref

  // Format the selected date for display
  const dateDisplay = React.useMemo(() => {
    if (!selectedDate) return t('tripDatePlaceholder')
    const d = new Date(selectedDate + 'T00:00:00')
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  }, [selectedDate, locale, t])

  return (
    <div className="booking-panel" data-screen-label="booking-panel">
      <div className="price-row">
        <div className="price">
          <span className="num">{priceNum.toLocaleString('en')}</span>
          <span className="unit"> {currency} / {t('perDay')}</span>
        </div>
        <div className="rating">
          <div className="v">★ {displayRating.toFixed(2)}</div>
          <div>{displayReviewCount} {t('reviews')}</div>
        </div>
      </div>

      <div className="form-field">
        <label>{t('tripDate')}</label>
        <input
          readOnly
          value={dateDisplay}
          onChange={() => {}}
          style={selectedDate ? { color: 'var(--ink)', fontWeight: 600 } : {}}
        />
      </div>

      <div className="form-grid-2">
        <div className="form-field">
          <label>{t('departure')}</label>
          <select defaultValue="6:00">
            <option>{t('time0600am')}</option>
          </select>
        </div>
        <div className="form-field">
          <label>{t('return')}</label>
          <select defaultValue="16:00">
            <option>{t('time0400pm')}</option>
          </select>
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field">
          <label>{t('duration')}</label>
          <select>
            <option>{t('durationFullDay')}</option>
          </select>
        </div>
        <div className="form-field">
          <label>{t('passengers')}</label>
          <select>
            <option>{t('passengersDefault', { count: capacity })}</option>
          </select>
        </div>
      </div>

      <div className="line-items">
        <div className="row">
          <span className="l">{priceNum.toLocaleString('en')} {currency} × {t('oneDay')}</span>
          <span className="v">{priceNum.toLocaleString('en')}</span>
        </div>
        <div className="row">
          <span className="l">{t('serviceFee')}</span>
          <span className="v">{serviceFee.toLocaleString('en')}</span>
        </div>
        <div className="row">
          <span className="l">{t('tripInsurance')}</span>
          <span className="v">{insuranceFee}</span>
        </div>
        <div className="row total">
          <span className="l">{t('total')}</span>
          <span className="v">{total.toLocaleString('en')} {currency}</span>
        </div>
      </div>

      <Link
        href={bookLink}
        className="btn btn-clay btn-lg cta-shimmer"
        style={{ width: '100%', marginTop: 18, display: 'flex', justifyContent: 'center' }}
      >
        {tBook('detail.bookNow')} ←
      </Link>

      {selectedDate && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 14px',
            background: 'oklch(0.97 0.05 145)',
            border: '1px solid oklch(0.80 0.12 145)',
            borderRadius: 6,
            fontSize: 12,
            color: 'oklch(0.35 0.12 145)',
            fontFamily: 'var(--ff-mono)',
            letterSpacing: '0.06em',
            textAlign: 'center',
          }}
        >
          ✓ {dateDisplay}
        </div>
      )}

      <div className="guarantee">
        ✓ {t('guarantee1')}<br />
        ✓ {t('guarantee2')}<br />
        ✓ {t('guarantee3')}
      </div>
    </div>
  )
}
