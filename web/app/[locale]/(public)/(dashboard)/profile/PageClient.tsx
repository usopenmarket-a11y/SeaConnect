'use client'

import * as React from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'

import { get, type PaginatedResponse } from '@/lib/api'

interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  date_joined: string
}

interface BookingRow {
  id: string
  status: string
  total_amount: string
  currency: string
  start_date: string
  end_date: string
  yacht_name?: string
  pax: number
}

type TabKey = 'all' | 'upcoming' | 'completed' | 'orders' | 'tournaments' | 'favourites'

const TAB_KEYS: TabKey[] = ['all', 'upcoming', 'completed', 'orders', 'tournaments', 'favourites']

function getInitial(profile: UserProfile): string {
  return profile.first_name?.[0]?.toUpperCase() ?? profile.email[0]?.toUpperCase() ?? '?'
}

export function ProfilePage(): React.ReactElement {
  const t = useTranslations('profile')
  const [activeTab, setActiveTab] = React.useState<TabKey>('all')

  const STATUS_MAP: Record<string, string> = {
    confirmed: t('upcomingTrips'),
    completed: t('pastTrips'),
    pending_owner: t('status.pendingReview'),
    cancelled: t('status.cancelled'),
  }

  const { data: profile, isLoading: profileLoading } = useSWR<UserProfile>(
    '/accounts/me/',
    (path: string) => get<UserProfile>(path),
  )

  const { data: bookingsData, isLoading: bookingsLoading } = useSWR<PaginatedResponse<BookingRow>>(
    '/bookings/',
    (path: string) => get<PaginatedResponse<BookingRow>>(path),
  )

  const bookings = bookingsData?.results ?? []

  const visibleBookings = React.useMemo(() => {
    if (activeTab === 'all') return bookings
    if (activeTab === 'upcoming') return bookings.filter((b) => b.status === 'confirmed')
    if (activeTab === 'completed') return bookings.filter((b) => b.status === 'completed')
    return []
  }, [bookings, activeTab])

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
    : ''

  if (profileLoading) {
    return (
      <div dir="rtl" style={{ padding: '40px 48px' }}>
        <div className="mono" style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.1em' }}>LOADING…</div>
      </div>
    )
  }

  return (
    <div dir="rtl">
      {/* Profile header */}
      <div className="profile-header">
        <div
          className="profile-avatar"
          style={{ backgroundColor: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foam)', fontFamily: 'var(--ff-display)', fontSize: 56, fontWeight: 700 }}
        >
          {profile ? getInitial(profile) : '?'}
        </div>
        <div className="profile-info">
          <h2>{displayName || t('defaultName')}</h2>
          {/* TODO: i18n for since/location */}
          <div className="since">
            MEMBER SINCE · {profile ? new Date(profile.date_joined).getFullYear() : '2026'} · EGYPT
          </div>
        </div>
        <div className="profile-stats">
          <div className="s">
            <div className="n num">{bookings.filter((b) => b.status === 'completed').length}</div>
            <div className="l">{t('trips')}</div>
          </div>
          <div className="s">
            <div className="n num">0</div>
            <div className="l">{t('tournaments')}</div>
          </div>
          <div className="s">
            <div className="n num">0</div>
            <div className="l">{t('storeOrders')}</div>
          </div>
          <div className="s">
            <div className="n num">{bookings.length * 60}</div>
            <div className="l">{t('points')}</div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="pill-tabs">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`pill ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="section" style={{ paddingTop: 28 }}>
        {/* Upcoming bookings */}
        {(activeTab === 'all' || activeTab === 'upcoming') && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--ink)', paddingBottom: 12, marginBottom: 4 }}>
              <h3 className="display" style={{ fontSize: 30, fontWeight: 700 }}>{t('upcomingTrips')}</h3>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>· UPCOMING TRIPS</span>
            </div>
            {bookingsLoading && (
              <div className="mono" style={{ fontSize: 12, color: 'var(--muted)', padding: '20px 0' }}>LOADING…</div>
            )}
            {!bookingsLoading && visibleBookings.filter((b) => b.status === 'confirmed').length === 0 && (
              <div style={{ padding: '24px 0', color: 'var(--muted-2)', fontSize: 14 }}>{t('noUpcoming')}</div>
            )}
            {visibleBookings.filter((b) => b.status === 'confirmed').map((b) => (
              <div key={b.id} className="booking-list-item">
                <div className="thumb" />
                <div>
                  <div className="name">{b.yacht_name ?? t('defaultBoat')}</div>
                  <div className="sub">{b.start_date} · {b.pax ?? '—'} PAX</div>
                </div>
                <div className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 24, fontWeight: 700 }}>
                  {Number(b.total_amount).toLocaleString('en')}
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--muted)' }}> {b.currency}</span>
                </div>
                <span className="status upcoming">{STATUS_MAP[b.status] ?? b.status}</span>
              </div>
            ))}
          </>
        )}

        {/* Completed bookings */}
        {(activeTab === 'all' || activeTab === 'completed') && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--ink)', paddingBottom: 12, marginTop: 44, marginBottom: 4 }}>
              <h3 className="display" style={{ fontSize: 30, fontWeight: 700 }}>{t('pastTrips')}</h3>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>· PAST TRIPS</span>
            </div>
            {!bookingsLoading && visibleBookings.filter((b) => b.status === 'completed').length === 0 && (
              <div style={{ padding: '24px 0', color: 'var(--muted-2)', fontSize: 14 }}>{t('noCompleted')}</div>
            )}
            {visibleBookings.filter((b) => b.status === 'completed').map((b) => (
              <div key={b.id} className="booking-list-item">
                <div className="thumb" />
                <div>
                  <div className="name">{b.yacht_name ?? t('defaultBoat')}</div>
                  <div className="sub">{b.start_date} · {b.pax ?? '—'} PAX</div>
                </div>
                <div className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 24, fontWeight: 700 }}>
                  {Number(b.total_amount).toLocaleString('en')}
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--muted)' }}> {b.currency}</span>
                </div>
                <span className="status done">{t('pastTrips')}</span>
              </div>
            ))}
          </>
        )}

        {/* Store orders placeholder */}
        {activeTab === 'orders' && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--ink)', paddingBottom: 12, marginBottom: 16 }}>
              <h3 className="display" style={{ fontSize: 30, fontWeight: 700 }}>{t('storeOrdersTitle')}</h3>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>· GEAR ORDERS</span>
            </div>
            <div style={{ padding: '24px 0', color: 'var(--muted-2)', fontSize: 14 }}>
              {t('noOrders')}
            </div>
          </>
        )}

        {/* Tournaments placeholder */}
        {activeTab === 'tournaments' && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--ink)', paddingBottom: 12, marginBottom: 16 }}>
              <h3 className="display" style={{ fontSize: 30, fontWeight: 700 }}>{t('tournamentsTitle')}</h3>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>· TOURNAMENTS</span>
            </div>
            <div style={{ padding: '24px 0', color: 'var(--muted-2)', fontSize: 14 }}>
              {t('noTournaments')}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
