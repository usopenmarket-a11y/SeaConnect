'use client'

/**
 * Booking detail page — Client Component using SWR.
 *
 * Sprint 3 deliverable. Visible to either the booking customer or the
 * yacht owner (server enforces scope via queryset filtering — a 404 is
 * returned for a booking the caller does not own). Cancel button is shown
 * only when status is pending_owner or confirmed.
 *
 * ADR-012 — events are rendered straight from the immutable backend log.
 * ADR-014 — Logical CSS only. ADR-015 — All strings via t().
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

import { AuthGuard } from '@/components/auth/AuthGuard'
import {
  BookingTimeline,
  type TimelineEvent,
} from '@/components/bookings/BookingTimeline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, get, patch } from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types — match BookingDetailSerializer
// ---------------------------------------------------------------------------

type BookingStatus =
  | 'pending_owner'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'

interface BookingDetailResponse {
  id: string
  yacht_id: string
  yacht_name: string
  yacht_name_ar: string
  customer_name: string
  start_date: string
  end_date: string
  num_passengers: number
  total_amount: string
  currency: string
  status: BookingStatus
  decline_reason: string | null
  departure_port: {
    id: string
    name_en: string
    name_ar: string
    city_en: string
    city_ar: string
  } | null
  events: TimelineEvent[]
  created_at: string
  updated_at: string
}

const statusBadgeMap: Record<BookingStatus, string> = {
  pending_owner: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-sea/10 text-sea',
}

const fetcher = (path: string) => get<BookingDetailResponse>(path)

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

interface InnerProps {
  locale: string
  bookingId: string
}

function BookingDetailInner({
  locale,
  bookingId,
}: InnerProps): React.ReactElement {
  const t = useTranslations('bookingDetail')
  const tCommon = useTranslations('common')
  const tStatus = useTranslations('bookingList.status')

  const { data, error, isLoading, mutate } = useSWR<BookingDetailResponse>(
    `/bookings/${bookingId}/`,
    fetcher,
  )

  const [cancelling, setCancelling] = React.useState(false)
  const [cancelError, setCancelError] = React.useState<string | null>(null)
  const [confirmingCancel, setConfirmingCancel] = React.useState(false)

  async function handleCancel(): Promise<void> {
    if (!data) return
    setCancelling(true)
    setCancelError(null)
    try {
      const updated = await patch<BookingDetailResponse>(
        `/bookings/${bookingId}/cancel/`,
      )
      void mutate(updated, { revalidate: false })
    } catch (err) {
      if (err instanceof ApiError) {
        setCancelError(err.message)
      } else if (err instanceof Error) {
        setCancelError(err.message)
      } else {
        setCancelError(t('cancelError'))
      }
    } finally {
      setCancelling(false)
      setConfirmingCancel(false)
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="py-8 text-center text-ink/50">{tCommon('loading')}</p>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <Card.Body>
            <p role="alert" className="py-8 text-center text-red-600">
              {t('loadError')}
            </p>
          </Card.Body>
        </Card>
      </main>
    )
  }

  const yachtName = locale === 'ar' ? data.yacht_name_ar : data.yacht_name
  const portName = data.departure_port
    ? locale === 'ar'
      ? data.departure_port.name_ar
      : data.departure_port.name_en
    : null
  const formattedTotal =
    locale === 'ar'
      ? Number(data.total_amount).toLocaleString('ar-EG')
      : Number(data.total_amount).toLocaleString('en-US')

  const canCancel =
    data.status === 'pending_owner' || data.status === 'confirmed'

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Card>
        <Card.Header>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">
                {t('title')}
              </h1>
              <p className="mt-1 text-sm text-ink/60">{yachtName}</p>
            </div>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-sm font-medium',
                statusBadgeMap[data.status],
              )}
            >
              {tStatus(data.status)}
            </span>
          </div>
        </Card.Header>

        <Card.Body>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink/50">
                {t('yacht')}
              </dt>
              <dd className="font-semibold text-ink">{yachtName}</dd>
            </div>

            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink/50">
                {t('passengers')}
              </dt>
              <dd className="font-mono font-semibold text-ink">
                {data.num_passengers}
              </dd>
            </div>

            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink/50">
                {t('totalAmount')}
              </dt>
              <dd className="font-mono font-semibold text-ink">
                {formattedTotal}{' '}
                <span className="text-xs font-normal text-ink/60">
                  {data.currency}
                </span>
              </dd>
            </div>

            {portName && (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink/50">
                  {t('departurePort')}
                </dt>
                <dd className="font-semibold text-ink">{portName}</dd>
              </div>
            )}

            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink/50">
                {t('startDate')}
              </dt>
              <dd className="font-mono text-xs text-ink">{data.start_date}</dd>
            </div>

            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink/50">
                {t('endDate')}
              </dt>
              <dd className="font-mono text-xs text-ink">{data.end_date}</dd>
            </div>
          </dl>

          {data.decline_reason && (
            <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-medium">{t('declineReason')}</p>
              <p>{data.decline_reason}</p>
            </div>
          )}
        </Card.Body>

        <Card.Footer>
          <div className="flex flex-col gap-3">
            {cancelError && (
              <p role="alert" className="text-sm text-red-600">
                {cancelError}
              </p>
            )}
            {canCancel && !confirmingCancel && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setConfirmingCancel(true)}
              >
                {t('cancelBooking')}
              </Button>
            )}
            {canCancel && confirmingCancel && (
              <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  {t('confirmCancel')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCancel}
                    isLoading={cancelling}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {cancelling ? t('cancelling') : t('cancelBooking')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmingCancel(false)}
                    disabled={cancelling}
                    className="flex-1"
                  >
                    {tCommon('back')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card.Footer>
      </Card>

      {/* Timeline */}
      <section
        aria-labelledby="timeline-heading"
        className="mt-8 rounded-2xl bg-sand p-6"
      >
        <h2
          id="timeline-heading"
          className="mb-4 font-display text-lg font-bold text-ink"
        >
          {t('timeline')}
        </h2>
        <BookingTimeline events={data.events} locale={locale} />
      </section>
    </main>
  )
}

interface PageProps {
  params: { locale: string; id: string }
}

export function BookingDetailPage({
  params: { locale, id },
}: PageProps): React.ReactElement {
  return (
    <AuthGuard locale={locale}>
      <BookingDetailInner locale={locale} bookingId={id} />
    </AuthGuard>
  )
}
