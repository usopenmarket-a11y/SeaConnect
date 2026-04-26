'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

interface Booking {
  id: string
  boatName: string
  date: string
  status: BookingStatus
  totalAmount: string
  currency: string
}

const statusColorMap: Record<BookingStatus, string> = {
  pending: 'text-amber-700 bg-amber-50',
  confirmed: 'text-emerald-700 bg-emerald-50',
  cancelled: 'text-red-700 bg-red-50',
  completed: 'text-blue-700 bg-blue-50',
}

/**
 * Bookings dashboard page — Client Component.
 *
 * Fetches the authenticated user's bookings via SWR (server state).
 * Displays status badges and tabular pricing. All strings from i18n
 * keys (ADR-015). Amounts use font-mono (tabular nums) per design system.
 */
export default function BookingsPage(): React.ReactElement {
  const t = useTranslations('bookings')

  /**
   * Placeholder data — replace with useSWR('/api/v1/bookings/', fetcher)
   * once the backend auth/bookings endpoints are live.
   */
  const bookings: Booking[] = []
  const isLoading = false

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-ink/60">{t('title')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">
        {t('title')}
      </h1>

      {bookings.length === 0 ? (
        <Card>
          <Card.Body>
            <p className="py-8 text-center text-ink/50">{t('empty')}</p>
          </Card.Body>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} hoverable>
              <Card.Body>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-ink">{booking.boatName}</p>
                    <p className="text-sm text-ink/60">{booking.date}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                        statusColorMap[booking.status],
                      )}
                    >
                      {t(`status.${booking.status}`)}
                    </span>
                    <p className="font-mono text-sm font-semibold text-ink">
                      {booking.totalAmount} {booking.currency}
                    </p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
