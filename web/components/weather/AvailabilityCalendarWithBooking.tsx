'use client'

/**
 * AvailabilityCalendarWithBooking — Client Component wrapper around AvailabilityCalendar.
 *
 * Holds `selectedDate` state. When the user clicks an available day on the calendar
 * a "Book This Date" button appears. Clicking it navigates to the booking page with
 * the selected date pre-filled as a `?date=YYYY-MM-DD` search parameter.
 *
 * This wrapper exists because the yacht detail page is a Server Component (ADR-003)
 * and cannot pass callback props directly. This island is imported instead of the
 * bare AvailabilityCalendar.
 *
 * ADR-015 — button label via i18n key.
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AvailabilityCalendar } from './AvailabilityCalendar'

// ── Types ──────────────────────────────────────────────────────────────────────

interface BoatData {
  id?: string
  price?: number
  regionEn?: string
  coords?: string
  name?: string
}

interface AvailabilityCalendarWithBookingProps {
  boat: BoatData
  region?: string
  yachtId: string
  locale: string
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AvailabilityCalendarWithBooking({
  boat,
  region,
  yachtId,
  locale,
}: AvailabilityCalendarWithBookingProps): React.ReactElement {
  const router = useRouter()
  const tCal = useTranslations('calendar')
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  function handleDateSelect(isoDate: string): void {
    setSelectedDate(isoDate)
    // Notify the booking panel on the same page (cross-island communication)
    window.dispatchEvent(new CustomEvent('sc:date-selected', { detail: isoDate }))
  }

  function handleBookThisDate(): void {
    if (!selectedDate) return
    router.push(`/${locale}/yachts/${yachtId}/book?date=${selectedDate}`)
  }

  return (
    <div>
      <AvailabilityCalendar
        boat={boat}
        region={region}
        yachtId={yachtId}
        locale={locale}
        onDateSelect={handleDateSelect}
      />
      {selectedDate && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            className="btn btn-clay"
            style={{ fontSize: 15, padding: '12px 32px' }}
            onClick={handleBookThisDate}
          >
            {tCal('bookThisDate')}
          </button>
        </div>
      )}
    </div>
  )
}
