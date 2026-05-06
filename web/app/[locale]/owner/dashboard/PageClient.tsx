'use client'

/**
 * Owner dashboard — KPI overview + pending bookings list.
 *
 * Fetches three filtered booking lists in parallel:
 *   - pending_owner  → pending count KPI
 *   - confirmed      → active count KPI
 *   - completed      → total earnings KPI + currency
 *
 * Each request uses page_size=100 so KPI counts are accurate for owners
 * with up to 100 bookings per status.  A dedicated count endpoint can be
 * added in a future sprint to remove the page-size limit.
 *
 * ADR-009 — JWT attached by get() from @/lib/api (never in localStorage).
 * ADR-013 — cursor pagination; we read results[] length, not a count field.
 * ADR-014 — logical CSS only.
 * ADR-015 — all strings via t().
 */

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/owner/StatCard'
import { get, type PaginatedResponse } from '@/lib/api'

interface BookingSummary {
  id: string
  status: string
  total_amount: string
  currency: string
  start_date: string
  end_date: string
}

const fetchBookings = (path: string) =>
  get<PaginatedResponse<BookingSummary>>(path)

interface Props {
  params: { locale: string }
}

export function OwnerDashboardPage({
  params: { locale },
}: Props): React.ReactElement {
  const t = useTranslations('owner.dashboard')
  const tCommon = useTranslations('common')

  const swrOpts = { revalidateOnFocus: false } as const

  const { data: pendingData, error: pendingError, isLoading: pendingLoading } =
    useSWR<PaginatedResponse<BookingSummary>>(
      '/bookings/?status=pending_owner&page_size=100',
      fetchBookings,
      swrOpts,
    )

  const { data: confirmedData, isLoading: confirmedLoading } =
    useSWR<PaginatedResponse<BookingSummary>>(
      '/bookings/?status=confirmed&page_size=100',
      fetchBookings,
      swrOpts,
    )

  const { data: completedData, isLoading: completedLoading } =
    useSWR<PaginatedResponse<BookingSummary>>(
      '/bookings/?status=completed&page_size=100',
      fetchBookings,
      swrOpts,
    )

  const isLoading = pendingLoading || confirmedLoading || completedLoading
  const hasError = !!pendingError

  // Derived KPI values — fall back to 0 while loading
  const pendingCount = pendingData?.results.length ?? 0
  const activeCount = confirmedData?.results.length ?? 0
  const totalEarnings =
    completedData?.results.reduce(
      (sum, b) => sum + Number(b.total_amount),
      0,
    ) ?? 0
  const earningsCurrency = completedData?.results[0]?.currency ?? ''

  function formatNumber(n: number): string {
    return locale === 'ar'
      ? n.toLocaleString('ar-EG')
      : n.toLocaleString('en-US')
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(
        locale === 'ar' ? 'ar-EG' : 'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' },
      )
    } catch {
      return iso
    }
  }

  const pendingBookings = pendingData?.results ?? []

  return (
    <section>
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">
        {t('title')}
      </h1>

      {isLoading && (
        <p className="py-8 text-center text-ink/50">{tCommon('loading')}</p>
      )}

      {hasError && (
        <Card>
          <Card.Body>
            <p role="alert" className="py-6 text-center text-red-600">
              {t('loadError')}
            </p>
          </Card.Body>
        </Card>
      )}

      {/* KPI cards — visible once at least one dataset has loaded */}
      {!isLoading && !hasError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label={t('pendingBookings')}
            value={formatNumber(pendingCount)}
          />
          <StatCard
            label={t('activeBookings')}
            value={formatNumber(activeCount)}
          />
          <StatCard
            label={t('totalEarnings')}
            value={
              <>
                {formatNumber(totalEarnings)}{' '}
                <span className="text-base font-normal text-ink/60">
                  {earningsCurrency}
                </span>
              </>
            }
          />
        </div>
      )}

      {/* Pending bookings list */}
      {!isLoading && !hasError && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-ink">
              {t('pendingSectionTitle')}
            </h2>
            <Link
              href={`/${locale}/owner/bookings`}
              className="text-sm text-sea hover:underline"
            >
              {t('viewAllBookings')}
            </Link>
          </div>

          {pendingBookings.length === 0 ? (
            <Card>
              <Card.Body>
                <p className="py-6 text-center text-ink/50">
                  {t('noPendingBookings')}
                </p>
              </Card.Body>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingBookings.map((booking) => (
                <Card key={booking.id} hoverable>
                  <Card.Body>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-medium text-ink">
                          #{booking.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="mt-0.5 text-xs text-ink/60">
                          {formatDate(booking.start_date)}
                          {' — '}
                          {formatDate(booking.end_date)}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-semibold text-ink">
                        {formatNumber(Number(booking.total_amount))}{' '}
                        <span className="font-normal text-ink/60">
                          {booking.currency}
                        </span>
                      </p>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
