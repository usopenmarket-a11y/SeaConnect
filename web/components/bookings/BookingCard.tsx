'use client'

/**
 * BookingCard — single row of the customer booking list.
 *
 * Locale-aware yacht name (Arabic first per ADR-015), color-coded status
 * badge, and a link to the booking detail page. Logical CSS only (ADR-014).
 */

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export type BookingStatus =
  | 'pending_owner'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'

export interface BookingCardData {
  id: string
  yacht_id: string
  yacht_name: string
  yacht_name_ar: string
  start_date: string
  end_date: string
  num_passengers: number
  total_amount: string
  currency: string
  status: BookingStatus
}

const statusBadgeMap: Record<BookingStatus, string> = {
  pending_owner: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-sea/10 text-sea',
}

interface Props {
  booking: BookingCardData
  locale: string
}

export function BookingCard({ booking, locale }: Props): React.ReactElement {
  const t = useTranslations('bookingList')

  const yachtName =
    locale === 'ar' ? booking.yacht_name_ar : booking.yacht_name
  const formattedTotal =
    locale === 'ar'
      ? Number(booking.total_amount).toLocaleString('ar-EG')
      : Number(booking.total_amount).toLocaleString('en-US')

  return (
    <Link
      href={`/${locale}/bookings/${booking.id}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2"
    >
      <Card hoverable>
        <Card.Body>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="font-display text-base font-bold text-ink">
                {yachtName}
              </p>
              <p className="text-sm text-ink/60">
                <span className="font-medium text-ink/80">
                  {t('dates')}:
                </span>{' '}
                <span className="font-mono">
                  {booking.start_date} → {booking.end_date}
                </span>
              </p>
              <p className="text-sm text-ink/60">
                <span className="font-medium text-ink/80">
                  {t('passengers')}:
                </span>{' '}
                <span className="font-mono">{booking.num_passengers}</span>
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  statusBadgeMap[booking.status],
                )}
              >
                {t(`status.${booking.status}`)}
              </span>
              <p className="font-mono text-sm font-semibold text-ink">
                {formattedTotal}{' '}
                <span className="text-xs font-normal text-ink/60">
                  {booking.currency}
                </span>
              </p>
            </div>
          </div>
        </Card.Body>
      </Card>
    </Link>
  )
}
