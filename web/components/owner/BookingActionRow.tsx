'use client'

/**
 * BookingActionRow — table row for the owner booking list.
 *
 * For pending_owner bookings, shows Confirm + Decline buttons. Decline
 * opens an inline textarea for the optional reason, then submits.
 * Other statuses just show the badge and totals.
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { ApiError, patch } from '@/lib/api'
import { cn } from '@/lib/utils'

export type BookingStatus =
  | 'pending_owner'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'

export interface OwnerBookingRow {
  id: string
  yacht_name: string
  yacht_name_ar: string
  customer_name: string
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
  booking: OwnerBookingRow
  locale: string
  onUpdated: () => void
}

export function BookingActionRow({
  booking,
  locale,
  onUpdated,
}: Props): React.ReactElement {
  const t = useTranslations('owner.bookings')
  const tStatus = useTranslations('bookingList.status')

  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showDecline, setShowDecline] = React.useState(false)
  const [reason, setReason] = React.useState('')

  const yachtName =
    locale === 'ar' ? booking.yacht_name_ar : booking.yacht_name
  const formattedTotal =
    locale === 'ar'
      ? Number(booking.total_amount).toLocaleString('ar-EG')
      : Number(booking.total_amount).toLocaleString('en-US')

  async function handleConfirm(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await patch(`/bookings/${booking.id}/confirm/`)
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('actionError'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDecline(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await patch(`/bookings/${booking.id}/decline/`, { reason })
      setShowDecline(false)
      setReason('')
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('actionError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr className="border-b border-ink/10 last:border-b-0">
      <td className="px-3 py-3 text-sm text-ink">{booking.customer_name}</td>
      <td className="px-3 py-3 text-sm font-medium text-ink">{yachtName}</td>
      <td className="px-3 py-3 font-mono text-xs text-ink/70">
        {booking.start_date} → {booking.end_date}
      </td>
      <td className="px-3 py-3 text-center font-mono text-sm text-ink">
        {booking.num_passengers}
      </td>
      <td className="px-3 py-3 font-mono text-sm font-semibold text-ink">
        {formattedTotal}{' '}
        <span className="text-xs font-normal text-ink/50">
          {booking.currency}
        </span>
      </td>
      <td className="px-3 py-3">
        <span
          className={cn(
            'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
            statusBadgeMap[booking.status],
          )}
        >
          {tStatus(booking.status)}
        </span>
      </td>
      <td className="px-3 py-3">
        {booking.status === 'pending_owner' && !showDecline && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              isLoading={busy}
            >
              {t('confirm')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDecline(true)}
              disabled={busy}
            >
              {t('decline')}
            </Button>
          </div>
        )}
        {booking.status === 'pending_owner' && showDecline && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`reason-${booking.id}`}
              className="text-xs font-medium text-ink/70"
            >
              {t('declineReason')}
            </label>
            <textarea
              id={`reason-${booking.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="rounded-lg border border-ink/20 bg-white p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea/30"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleDecline}
                isLoading={busy}
              >
                {t('declineSubmit')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowDecline(false)
                  setReason('')
                }}
                disabled={busy}
              >
                {tStatus('cancelled')}
              </Button>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}
      </td>
    </tr>
  )
}
