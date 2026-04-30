'use client'

import * as React from 'react'
import useSWR from 'swr'

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

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'كل الحجوزات' },
  { key: 'upcoming', label: 'القادمة' },
  { key: 'completed', label: 'المكتملة' },
  { key: 'orders', label: 'طلبات المتجر' },
  { key: 'tournaments', label: 'البطولات' },
  { key: 'favourites', label: 'المفضّلة' },
]

const STATUS_MAP: Record<string, string> = {
  confirmed: 'قادمة',
  completed: 'مكتملة',
  pending_owner: 'قيد المراجعة',
  cancelled: 'ملغاة',
}

function getInitial(profile: UserProfile): string {
  return profile.first_name?.[0] ?? profile.email[0]?.toUpperCase() ?? 'م'
}

export function ProfilePage(): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<TabKey>('all')

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
          {profile ? getInitial(profile) : 'م'}
        </div>
        <div className="profile-info">
          <h2>{displayName || 'مستخدم سي كونكت'}</h2>
          {/* TODO: i18n for since/location */}
          <div className="since">
            MEMBER SINCE · {profile ? new Date(profile.date_joined).getFullYear() : '2026'} · EGYPT
          </div>
        </div>
        <div className="profile-stats">
          <div className="s">
            <div className="n num">{bookings.filter((b) => b.status === 'completed').length}</div>
            <div className="l">رحلات</div>
          </div>
          <div className="s">
            <div className="n num">0</div>
            <div className="l">بطولات</div>
          </div>
          <div className="s">
            <div className="n num">0</div>
            <div className="l">طلبات متجر</div>
          </div>
          <div className="s">
            <div className="n num">{bookings.length * 60}</div>
            <div className="l">نقاط</div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="pill-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`pill ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="section" style={{ paddingTop: 28 }}>
        {/* Upcoming bookings */}
        {(activeTab === 'all' || activeTab === 'upcoming') && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--ink)', paddingBottom: 12, marginBottom: 4 }}>
              <h3 className="display" style={{ fontSize: 30, fontWeight: 700 }}>قادمة</h3>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>· UPCOMING TRIPS</span>
            </div>
            {bookingsLoading && (
              <div className="mono" style={{ fontSize: 12, color: 'var(--muted)', padding: '20px 0' }}>LOADING…</div>
            )}
            {!bookingsLoading && visibleBookings.filter((b) => b.status === 'confirmed').length === 0 && (
              <div style={{ padding: '24px 0', color: 'var(--muted-2)', fontSize: 14 }}>لا توجد حجوزات قادمة</div>
            )}
            {visibleBookings.filter((b) => b.status === 'confirmed').map((b) => (
              <div key={b.id} className="booking-list-item">
                <div className="thumb" />
                <div>
                  <div className="name">{b.yacht_name ?? 'قارب'}</div>
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
              <h3 className="display" style={{ fontSize: 30, fontWeight: 700 }}>مكتملة</h3>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>· PAST TRIPS</span>
            </div>
            {!bookingsLoading && visibleBookings.filter((b) => b.status === 'completed').length === 0 && (
              <div style={{ padding: '24px 0', color: 'var(--muted-2)', fontSize: 14 }}>لا توجد رحلات مكتملة بعد</div>
            )}
            {visibleBookings.filter((b) => b.status === 'completed').map((b) => (
              <div key={b.id} className="booking-list-item">
                <div className="thumb" />
                <div>
                  <div className="name">{b.yacht_name ?? 'قارب'}</div>
                  <div className="sub">{b.start_date} · {b.pax ?? '—'} PAX</div>
                </div>
                <div className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 24, fontWeight: 700 }}>
                  {Number(b.total_amount).toLocaleString('en')}
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--muted)' }}> {b.currency}</span>
                </div>
                <span className="status done">مكتملة</span>
              </div>
            ))}
          </>
        )}

        {/* Store orders placeholder */}
        {activeTab === 'orders' && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--ink)', paddingBottom: 12, marginBottom: 16 }}>
              <h3 className="display" style={{ fontSize: 30, fontWeight: 700 }}>طلبات المتجر</h3>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>· GEAR ORDERS</span>
            </div>
            <div style={{ padding: '24px 0', color: 'var(--muted-2)', fontSize: 14 }}>
              {/* TODO: wire to GET /api/v1/marketplace/orders/ */}
              لا توجد طلبات متجر
            </div>
          </>
        )}

        {/* Tournaments placeholder */}
        {activeTab === 'tournaments' && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, borderBottom: '2px solid var(--ink)', paddingBottom: 12, marginBottom: 16 }}>
              <h3 className="display" style={{ fontSize: 30, fontWeight: 700 }}>البطولات</h3>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)' }}>· TOURNAMENTS</span>
            </div>
            <div style={{ padding: '24px 0', color: 'var(--muted-2)', fontSize: 14 }}>
              {/* TODO: wire to GET /api/v1/competitions/my-entries/ */}
              لم تسجّل في أي بطولة بعد
            </div>
          </>
        )}
      </div>
    </div>
  )
}
