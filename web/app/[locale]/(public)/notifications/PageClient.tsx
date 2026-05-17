'use client'

/**
 * NotificationsPage — Client Component.
 *
 * Converted from Design/system-pages.jsx NotificationsPage() exactly.
 * Tab filtering, mark-as-read, unread dot indicator preserved.
 * Uses mock data matching the design — API integration is Sprint 11.
 *
 * ADR-014: logical CSS (inset-inline-*, ms-*, me-*, ps-*, pe-*).
 * ADR-015: all strings via useTranslations('notifications').
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'

// ── Types ────────────────────────────────────────────────────────────────────

type NotifType = 'booking' | 'payment' | 'alert' | 'system'
type TabId = 'all' | NotifType

interface Notification {
  id: number
  type: NotifType
  icon: string
  unread: boolean
  titleKey: string
  descKey: string
  time: string
  dateKey: string
}

// ── Mock data (matches Design/system-pages.jsx NOTIFS) ───────────────────────

const MOCK_NOTIFS: Notification[] = [
  {
    id: 1, type: 'booking', icon: '⚓', unread: true,
    titleKey: 'items.bookingConfirmed.title',
    descKey:  'items.bookingConfirmed.desc',
    time: '10:32', dateKey: 'dates.today',
  },
  {
    id: 2, type: 'payment', icon: '💳', unread: true,
    titleKey: 'items.fawryReceived.title',
    descKey:  'items.fawryReceived.desc',
    time: '09:15', dateKey: 'dates.today',
  },
  {
    id: 3, type: 'booking', icon: '⚓', unread: false,
    titleKey: 'items.tripReminder.title',
    descKey:  'items.tripReminder.desc',
    time: '08:00', dateKey: 'dates.today',
  },
  {
    id: 4, type: 'alert', icon: '🌊', unread: false,
    titleKey: 'items.weatherAlert.title',
    descKey:  'items.weatherAlert.desc',
    time: '18:44', dateKey: 'dates.yesterday',
  },
  {
    id: 5, type: 'system', icon: '🏆', unread: false,
    titleKey: 'items.newTournament.title',
    descKey:  'items.newTournament.desc',
    time: '12:00', dateKey: 'dates.yesterday',
  },
  {
    id: 6, type: 'payment', icon: '💳', unread: false,
    titleKey: 'items.refundComplete.title',
    descKey:  'items.refundComplete.desc',
    time: '10:20', dateKey: 'dates.may11',
  },
  {
    id: 7, type: 'booking', icon: '⚓', unread: false,
    titleKey: 'items.rateTrip.title',
    descKey:  'items.rateTrip.desc',
    time: '09:00', dateKey: 'dates.may11',
  },
  {
    id: 8, type: 'system', icon: '⭐', unread: false,
    titleKey: 'items.exclusiveOffer.title',
    descKey:  'items.exclusiveOffer.desc',
    time: '14:00', dateKey: 'dates.may10',
  },
]

const DATE_ORDER: string[] = [
  'dates.today',
  'dates.yesterday',
  'dates.may11',
  'dates.may10',
]

// ── Component ────────────────────────────────────────────────────────────────

export function NotificationsPageClient(): React.ReactElement {
  const t = useTranslations('notifications')

  const [activeTab, setActiveTab] = React.useState<TabId>('all')
  const [notifs, setNotifs] = React.useState<Notification[]>(MOCK_NOTIFS)

  const unreadCount = notifs.filter((n) => n.unread).length

  const tabs: { id: TabId; labelKey: string }[] = [
    { id: 'all',     labelKey: 'tabs.all'      },
    { id: 'booking', labelKey: 'tabs.bookings' },
    { id: 'payment', labelKey: 'tabs.payments' },
    { id: 'system',  labelKey: 'tabs.system'   },
  ]

  const visible = activeTab === 'all'
    ? notifs
    : notifs.filter((n) => n.type === activeTab)

  function markAllRead(): void {
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  function markRead(id: number): void {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    )
  }

  // Count unread per tab for badge display
  function tabUnreadCount(tabId: TabId): number {
    if (tabId === 'all') return unreadCount
    return notifs.filter((n) => n.type === tabId && n.unread).length
  }

  return (
    <div className="notif-shell" data-screen-label="notifications">
      {/* Header */}
      <div className="notif-header">
        <div className="notif-header-top">
          <div>
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                color: 'var(--clay)',
                marginBottom: 6,
              }}
            >
              {t('eyebrow')}
            </div>
            <h1>
              {t('heading')}
              {unreadCount > 0 && (
                <span
                  aria-label={t('unreadCount', { count: unreadCount })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'var(--clay)',
                    color: 'var(--foam)',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'var(--ff-mono)',
                    marginInlineEnd: 14,
                    verticalAlign: 'middle',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button className="mark-all" onClick={markAllRead}>
              {t('markAllRead')}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="notif-tabs">
          {tabs.map((tab) => {
            const count = tabUnreadCount(tab.id)
            return (
              <button
                key={tab.id}
                className={`notif-tab${activeTab === tab.id ? ' on' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {t(tab.labelKey)}
                {count > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'var(--clay)',
                      color: 'var(--foam)',
                      fontSize: 10,
                      fontWeight: 700,
                      marginInlineEnd: 6,
                      verticalAlign: 'middle',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {visible.length === 0 ? (
        <div className="notif-empty">
          <div className="big">🔔</div>
          <p>{t('empty')}</p>
        </div>
      ) : (
        <div className="notif-list">
          {DATE_ORDER.map((dateKey) => {
            const group = visible.filter((n) => n.dateKey === dateKey)
            if (group.length === 0) return null
            return (
              <div key={dateKey}>
                {/* Date separator */}
                <div
                  style={{
                    padding: '12px 48px',
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    color: 'var(--muted)',
                    background: 'oklch(0.955 0.015 85 / 0.5)',
                    borderBottom: '1px solid var(--rule)',
                    direction: 'ltr',
                  }}
                >
                  {t(dateKey).toUpperCase()}
                  {dateKey === 'dates.today' && (
                    <span style={{ marginInlineStart: 8 }}>
                      · {new Date().toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                {/* Notification items */}
                {group.map((n) => (
                  <div
                    key={n.id}
                    className={`notif-item${n.unread ? ' unread' : ''}`}
                    onClick={() => markRead(n.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') markRead(n.id)
                    }}
                  >
                    <div className={`notif-icon ${n.type}`} aria-hidden="true">
                      {n.icon}
                    </div>
                    <div className="notif-body">
                      <div className="title">{t(n.titleKey)}</div>
                      <div className="desc">{t(n.descKey)}</div>
                      <div className="meta">
                        <span>{n.time}</span>
                        <span className="dot" aria-hidden="true" />
                        <span style={{ textTransform: 'uppercase' }}>
                          {t(`types.${n.type}`)}
                        </span>
                      </div>
                    </div>
                    {n.unread && (
                      <div
                        className="notif-unread-dot"
                        aria-label={t('unread')}
                      />
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
