'use client'

/**
 * Customer / owner booking list — Client Component using SWR.
 *
 * Sprint 3 deliverable: replaces the Sprint 2 stub. Hits
 * GET /api/v1/bookings/ — backend scopes results by role (customer or
 * yacht owner). Status badges are color-coded; locale-aware yacht names.
 *
 * ADR-009 — auth via in-memory token; AuthGuard redirects unauthenticated
 *           visitors to login.
 * ADR-013 — CursorPagination response is unwrapped to the `results` array;
 *           pagination UI deferred (page-1 is enough until backlog grows).
 * ADR-014 — Logical CSS only.
 * ADR-015 — All strings via t().
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

import { AuthGuard } from '@/components/auth/AuthGuard'
import {
  BookingCard,
  type BookingCardData,
} from '@/components/bookings/BookingCard'
import { Card } from '@/components/ui/Card'
import { get } from '@/lib/api'

interface BookingListResponse {
  results: BookingCardData[]
  next_cursor: string | null
  has_more: boolean
}

interface InnerProps {
  locale: string
}

const fetcher = (path: string) => get<BookingListResponse>(path)

function BookingsListInner({ locale }: InnerProps): React.ReactElement {
  const t = useTranslations('bookingList')
  const tCommon = useTranslations('common')
  const { data, error, isLoading } = useSWR<BookingListResponse>(
    '/bookings/',
    fetcher,
  )

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">
        {t('title')}
      </h1>

      {isLoading && (
        <p className="py-8 text-center text-ink/50">{tCommon('loading')}</p>
      )}

      {error && (
        <Card>
          <Card.Body>
            <p role="alert" className="py-8 text-center text-red-600">
              {t('loadError')}
            </p>
          </Card.Body>
        </Card>
      )}

      {!isLoading && !error && data && data.results.length === 0 && (
        <Card>
          <Card.Body>
            <p className="py-8 text-center text-ink/50">{t('empty')}</p>
          </Card.Body>
        </Card>
      )}

      {!isLoading && !error && data && data.results.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.results.map((booking) => (
            <BookingCard key={booking.id} booking={booking} locale={locale} />
          ))}
        </div>
      )}
    </main>
  )
}

interface PageProps {
  params: { locale: string }
}

export function BookingsListPage({
  params: { locale },
}: PageProps): React.ReactElement {
  return (
    <AuthGuard locale={locale}>
      <BookingsListInner locale={locale} />
    </AuthGuard>
  )
}
