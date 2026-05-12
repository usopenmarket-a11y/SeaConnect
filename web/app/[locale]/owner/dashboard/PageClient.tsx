'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

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

export function OwnerDashboardPage({ params: { locale } }: Props): React.ReactElement {
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

  const pendingCount = pendingData?.results.length ?? 0
  const activeCount = confirmedData?.results.length ?? 0
  const totalEarnings =
    completedData?.results.reduce((sum, b) => sum + Number(b.total_amount), 0) ?? 0
  const earningsCurrency = completedData?.results[0]?.currency ?? 'EGP'

  function fmt(n: number): string {
    return locale === 'ar' ? n.toLocaleString('ar-EG') : n.toLocaleString('en-US')
  }

  function fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(
        locale === 'ar' ? 'ar-EG' : 'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' },
      )
    } catch { return iso }
  }

  const pendingBookings = pendingData?.results ?? []

  return (
    <div className="dash-wrap">
      <header className="dash-head">
        <div>
          <div className="num-tag">§ OWNER · {locale.toUpperCase()} · DASHBOARD</div>
          <h1>{t('title').split(' ')[0]} <em>{t('title').split(' ').slice(1).join(' ')}</em></h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href={`/${locale}/owner/yachts`} className="btn btn-ghost">{t('viewAllBookings')}</Link>
        </div>
      </header>

      {/* KPI grid */}
      <div className="kpi-grid" role="list" aria-label="Owner KPIs">
        <div className="kpi" role="listitem">
          <div className="l">PENDING · {t('pendingBookings')}</div>
          <div className="v num">{isLoading ? '—' : fmt(pendingCount)}</div>
        </div>
        <div className="kpi" role="listitem">
          <div className="l">ACTIVE · {t('activeBookings')}</div>
          <div className="v num">{isLoading ? '—' : fmt(activeCount)}</div>
        </div>
        <div className="kpi" role="listitem">
          <div className="l">EARNINGS · {t('totalEarnings')}</div>
          <div className="v num">
            {isLoading ? '—' : fmt(totalEarnings)}
            <span className="unit">{earningsCurrency}</span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {pendingError && (
        <p role="alert" style={{ color: 'var(--clay)', fontFamily: 'var(--ff-mono)', fontSize: 13, marginBottom: 24 }}>
          {t('loadError')}
        </p>
      )}

      {/* Pending bookings card */}
      <div className="dash-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <h3>{t('pendingSectionTitle')}</h3>
          <Link
            href={`/${locale}/owner/bookings`}
            style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.05em', color: 'var(--sea)' }}
          >
            {t('viewAllBookings')} →
          </Link>
        </div>
        <div className="sub">PENDING APPROVAL · {pendingCount} {tCommon('loading').replace('...', '')}</div>

        {isLoading && (
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff-mono)', fontSize: 13, padding: '24px 0' }}>
            {tCommon('loading')}
          </p>
        )}

        {!isLoading && pendingBookings.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff-mono)', fontSize: 13, padding: '24px 0' }}>
            {t('noPendingBookings')}
          </p>
        )}

        {!isLoading && pendingBookings.length > 0 && (
          <table className="dash-table">
            <thead>
              <tr>
                <th>REF</th>
                <th>{t('pendingSectionTitle')}</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {pendingBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="num">#{booking.id.slice(0, 8).toUpperCase()}</td>
                  <td>
                    <span className="num" style={{ fontSize: 13 }}>
                      {fmtDate(booking.start_date)} — {fmtDate(booking.end_date)}
                    </span>
                  </td>
                  <td className="num">
                    {fmt(Number(booking.total_amount))}{' '}
                    <span style={{ opacity: 0.5, fontSize: 12 }}>{booking.currency}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
