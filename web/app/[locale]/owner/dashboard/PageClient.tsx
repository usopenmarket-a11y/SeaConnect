'use client'

/**
 * Owner dashboard — KPI overview.
 *
 * Pulls a single page of bookings (the owner is scoped server-side by
 * role) and computes:
 *   - pending_owner count
 *   - confirmed count
 *   - total earnings = sum of total_amount where status === 'completed'
 *
 * The list endpoint pages at 20; the dashboard's pending count may
 * undercount if the owner has more than 20 bookings. Sprint 5 should
 * add a `?status=` filter and a dedicated count endpoint.
 *
 * ADR-014 — logical CSS only. ADR-015 — all strings via t().
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/owner/StatCard'
import { get } from '@/lib/api'

interface BookingRow {
  id: string
  status: 'pending_owner' | 'confirmed' | 'declined' | 'cancelled' | 'completed'
  total_amount: string
  currency: string
}

interface BookingListResponse {
  results: BookingRow[]
  has_more: boolean
}

const fetcher = (path: string) => get<BookingListResponse>(path)

interface Props {
  params: { locale: string }
}

export function OwnerDashboardPage({
  params: { locale },
}: Props): React.ReactElement {
  const t = useTranslations('owner.dashboard')
  const tCommon = useTranslations('common')

  const { data, error, isLoading } = useSWR<BookingListResponse>(
    '/bookings/',
    fetcher,
  )

  const stats = React.useMemo(() => {
    if (!data) return null
    let pending = 0
    let confirmed = 0
    let earnings = 0
    let earningsCurrency = ''
    for (const b of data.results) {
      if (b.status === 'pending_owner') pending += 1
      if (b.status === 'confirmed') confirmed += 1
      if (b.status === 'completed') {
        earnings += Number(b.total_amount)
        earningsCurrency = earningsCurrency || b.currency
      }
    }
    return { pending, confirmed, earnings, earningsCurrency }
  }, [data])

  function formatNumber(n: number): string {
    return locale === 'ar' ? n.toLocaleString('ar-EG') : n.toLocaleString('en-US')
  }

  return (
    <section>
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">
        {t('title')}
      </h1>

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

      {!isLoading && !error && stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label={t('pendingBookings')}
            value={formatNumber(stats.pending)}
          />
          <StatCard
            label={t('activeBookings')}
            value={formatNumber(stats.confirmed)}
          />
          <StatCard
            label={t('totalEarnings')}
            value={
              <>
                {formatNumber(stats.earnings)}{' '}
                <span className="text-base font-normal text-ink/60">
                  {stats.earningsCurrency}
                </span>
              </>
            }
          />
        </div>
      )}
    </section>
  )
}
