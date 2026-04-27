'use client'

/**
 * Owner booking list — confirm/decline actions inline.
 *
 * Uses SWR; mutate() refreshes the list after a confirm or decline so
 * the row's status badge updates without a page reload. Status filter
 * tabs work client-side over the fetched results.
 *
 * ADR-013: cursor pagination — page 1 only for now (deferred to Sprint 5).
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

import {
  BookingActionRow,
  type BookingStatus,
  type OwnerBookingRow,
} from '@/components/owner/BookingActionRow'
import { Card } from '@/components/ui/Card'
import { get } from '@/lib/api'
import { cn } from '@/lib/utils'

interface BookingListResponse {
  results: OwnerBookingRow[]
  has_more: boolean
}

const fetcher = (path: string) => get<BookingListResponse>(path)

type FilterKey = 'all' | 'pending' | 'confirmed' | 'completed'

const filters: { key: FilterKey; statuses: BookingStatus[] | null }[] = [
  { key: 'all', statuses: null },
  { key: 'pending', statuses: ['pending_owner'] },
  { key: 'confirmed', statuses: ['confirmed'] },
  { key: 'completed', statuses: ['completed'] },
]

interface Props {
  params: { locale: string }
}

export function OwnerBookingsPage({
  params: { locale },
}: Props): React.ReactElement {
  const t = useTranslations('owner.bookings')
  const tCommon = useTranslations('common')

  const [active, setActive] = React.useState<FilterKey>('all')

  const { data, error, isLoading, mutate } = useSWR<BookingListResponse>(
    '/bookings/',
    fetcher,
  )

  const visible = React.useMemo(() => {
    if (!data) return []
    const filter = filters.find((f) => f.key === active)
    if (!filter || filter.statuses === null) return data.results
    return data.results.filter((row) => filter!.statuses!.includes(row.status))
  }, [data, active])

  return (
    <section>
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">
        {t('title')}
      </h1>

      {/* Filter tabs */}
      <div role="tablist" className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={active === f.key}
            onClick={() => setActive(f.key)}
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea',
              active === f.key
                ? 'bg-sea text-white'
                : 'bg-sand text-ink/70 hover:bg-sea/10',
            )}
          >
            {t(`filter.${f.key}`)}
          </button>
        ))}
      </div>

      {isLoading && (
        <p className="py-8 text-center text-ink/50">{tCommon('loading')}</p>
      )}

      {error && (
        <Card>
          <Card.Body>
            <p role="alert" className="py-6 text-center text-red-600">
              {t('loadError')}
            </p>
          </Card.Body>
        </Card>
      )}

      {!isLoading && !error && visible.length === 0 && (
        <Card>
          <Card.Body>
            <p className="py-8 text-center text-ink/50">{t('empty')}</p>
          </Card.Body>
        </Card>
      )}

      {!isLoading && !error && visible.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-sand p-2">
          <table className="min-w-full text-start">
            <thead>
              <tr className="text-xs font-medium uppercase tracking-wide text-ink/50">
                <th className="px-3 py-2 text-start">{t('customer')}</th>
                <th className="px-3 py-2 text-start">{t('yacht')}</th>
                <th className="px-3 py-2 text-start">{t('dates')}</th>
                <th className="px-3 py-2 text-center">{t('passengers')}</th>
                <th className="px-3 py-2 text-start">{t('total')}</th>
                <th className="px-3 py-2 text-start">{t('filter.confirmed')}</th>
                <th className="px-3 py-2 text-start">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <BookingActionRow
                  key={row.id}
                  booking={row}
                  locale={locale}
                  onUpdated={() => void mutate()}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
