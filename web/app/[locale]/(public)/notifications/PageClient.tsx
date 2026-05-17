'use client'

/**
 * NotificationsPage — Client Component.
 *
 * Sprint 11B: replaced mock data with live API calls.
 *   - useSWR('/notifications/') — lists the authenticated user's in-app notifications
 *   - post('/notifications/{id}/read/') — marks a single item as read on click
 *   - post('/notifications/read-all/') — bulk marks all as read
 *
 * API shape (NotificationSerializer):
 *   id, notification_type, channel, status, title_ar, title_en, body_ar, body_en,
 *   title (localised), body (localised), reference_id, reference_type,
 *   sent_at, read_at, created_at
 *
 * ADR-009: JWT token is in-memory via api.ts — never in localStorage.
 * ADR-013: list endpoint uses cursor pagination; we only render page 1 for now.
 * ADR-014: logical CSS (inset-inline-*, ms-*, me-*, ps-*, pe-*).
 * ADR-015: all strings via useTranslations('notifications').
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import { get, post } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'

// ── API types ────────────────────────────────────────────────────────────────

/** Raw notification shape returned by NotificationSerializer. */
interface ApiNotification {
  id: string
  notification_type: string
  channel: string
  status: string       // 'pending' | 'sent' | 'read' | 'failed'
  title_ar: string
  title_en: string
  body_ar: string
  body_en: string
  /** Localised convenience field resolved server-side from recipient.preferred_lang */
  title: string
  /** Localised convenience field resolved server-side from recipient.preferred_lang */
  body: string
  reference_id: string | null
  reference_type: string
  sent_at: string | null
  read_at: string | null
  created_at: string
}

// ── Local display types ──────────────────────────────────────────────────────

type NotifType = 'booking' | 'payment' | 'alert' | 'system'
type TabId = 'all' | NotifType

/** Maps notification_type values from the API to the 4 display categories. */
function toNotifType(apiType: string): NotifType {
  if (apiType.startsWith('booking')) return 'booking'
  if (apiType.startsWith('payment') || apiType.startsWith('payout')) return 'payment'
  if (apiType === 'competition_reminder') return 'system'
  return 'system'
}

/** Returns an emoji icon for the notification_type. */
function toIcon(apiType: string): string {
  if (apiType.startsWith('booking')) return '⚓'
  if (apiType.startsWith('payment') || apiType.startsWith('payout')) return '💳'
  if (apiType === 'competition_reminder') return '🏆'
  return '🔔'
}

// ── SWR fetcher ─────────────────────────────────────────────────────────────

const NOTIFICATIONS_KEY = '/notifications/'

function fetchNotifications(): Promise<PaginatedResponse<ApiNotification>> {
  return get<PaginatedResponse<ApiNotification>>(NOTIFICATIONS_KEY)
}

// ── Component ────────────────────────────────────────────────────────────────

export function NotificationsPageClient(): React.ReactElement {
  const t = useTranslations('notifications')

  const [activeTab, setActiveTab] = React.useState<TabId>('all')
  const [optimisticRead, setOptimisticRead] = React.useState<Set<string>>(new Set())

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<ApiNotification>>(
    NOTIFICATIONS_KEY,
    fetchNotifications,
    { shouldRetryOnError: false, refreshInterval: 60_000 },
  )

  // ── Derived state ────────────────────────────────────────────────────────

  const apiNotifs: ApiNotification[] = data?.results ?? []

  /** Returns true when the item is unread, respecting optimistic local updates. */
  function isUnread(n: ApiNotification): boolean {
    if (optimisticRead.has(n.id)) return false
    return n.status !== 'read'
  }

  const tabs: { id: TabId; labelKey: string }[] = [
    { id: 'all',     labelKey: 'tabs.all'      },
    { id: 'booking', labelKey: 'tabs.bookings' },
    { id: 'payment', labelKey: 'tabs.payments' },
    { id: 'system',  labelKey: 'tabs.system'   },
  ]

  const visible =
    activeTab === 'all'
      ? apiNotifs
      : apiNotifs.filter((n) => toNotifType(n.notification_type) === activeTab)

  const unreadCount = apiNotifs.filter(isUnread).length

  function tabUnreadCount(tabId: TabId): number {
    if (tabId === 'all') return unreadCount
    return apiNotifs.filter(
      (n) => toNotifType(n.notification_type) === tabId && isUnread(n),
    ).length
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function markRead(id: string): Promise<void> {
    // Optimistic update first — instant UI feedback
    setOptimisticRead((prev) => new Set(prev).add(id))
    try {
      await post(`/notifications/${id}/read/`, {})
      // Revalidate to get server truth; keep optimistic flag until done
      await mutate()
    } catch {
      // On error, roll back the optimistic flag
      setOptimisticRead((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function markAllRead(): Promise<void> {
    // Optimistically mark every visible unread item
    const toMark = new Set(apiNotifs.filter(isUnread).map((n) => n.id))
    setOptimisticRead((prev) => new Set(Array.from(prev).concat(Array.from(toMark))))
    try {
      await post('/notifications/read-all/', {})
      await mutate()
    } catch {
      // Roll back optimistic flags on error
      setOptimisticRead((prev) => {
        const next = new Set(prev)
        toMark.forEach((id) => next.delete(id))
        return next
      })
    }
  }

  // ── Date grouping ─────────────────────────────────────────────────────────

  /**
   * Groups notifications by calendar day relative to today.
   * Returns a stable, ordered list of {label, items} groups.
   */
  function groupByDate(
    notifs: ApiNotification[],
  ): { label: string; items: ApiNotification[] }[] {
    const now = new Date()
    const todayStr = now.toDateString()
    const yestStr = new Date(now.getTime() - 86_400_000).toDateString()

    const buckets: Record<string, ApiNotification[]> = {}
    for (const n of notifs) {
      const d = new Date(n.created_at)
      const ds = d.toDateString()
      const key =
        ds === todayStr
          ? '__today__'
          : ds === yestStr
          ? '__yesterday__'
          : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(n)
    }

    // Order: today first, then yesterday, then past dates newest-first
    const orderedKeys: string[] = []
    if (buckets['__today__']) orderedKeys.push('__today__')
    if (buckets['__yesterday__']) orderedKeys.push('__yesterday__')
    Object.keys(buckets)
      .filter((k) => k !== '__today__' && k !== '__yesterday__')
      .forEach((k) => orderedKeys.push(k))

    return orderedKeys.map((k) => ({
      label:
        k === '__today__'
          ? t('dates.today')
          : k === '__yesterday__'
          ? t('dates.yesterday')
          : k,
      items: buckets[k],
    }))
  }

  const groups = groupByDate(visible)

  // ── Render ────────────────────────────────────────────────────────────────

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
      {isLoading ? (
        /* Loading skeleton */
        <div className="notif-list" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="notif-item"
              style={{ opacity: 0.4, pointerEvents: 'none' }}
              aria-hidden="true"
            >
              <div
                className="notif-icon system"
                style={{
                  background: 'var(--rule)',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                }}
              />
              <div className="notif-body">
                <div
                  className="title"
                  style={{
                    width: '60%',
                    height: 14,
                    background: 'var(--rule)',
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                />
                <div
                  className="desc"
                  style={{
                    width: '90%',
                    height: 12,
                    background: 'var(--rule)',
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error state */
        <div className="notif-empty">
          <div className="big">⚠️</div>
          <p>{t('loadError')}</p>
        </div>
      ) : visible.length === 0 ? (
        /* Empty state */
        <div className="notif-empty">
          <div className="big">🔔</div>
          <p>{t('empty')}</p>
        </div>
      ) : (
        <div className="notif-list">
          {groups.map(({ label, items }) => (
            <div key={label}>
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
                {label.toUpperCase()}
              </div>

              {/* Notification items */}
              {items.map((n) => {
                const unread = isUnread(n)
                const notifType = toNotifType(n.notification_type)
                const timeStr = new Date(n.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                return (
                  <div
                    key={n.id}
                    className={`notif-item${unread ? ' unread' : ''}`}
                    onClick={() => { if (unread) void markRead(n.id) }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && unread) {
                        void markRead(n.id)
                      }
                    }}
                  >
                    <div className={`notif-icon ${notifType}`} aria-hidden="true">
                      {toIcon(n.notification_type)}
                    </div>
                    <div className="notif-body">
                      <div className="title">{n.title}</div>
                      <div className="desc">{n.body}</div>
                      <div className="meta">
                        <span>{timeStr}</span>
                        <span className="dot" aria-hidden="true" />
                        <span style={{ textTransform: 'uppercase' }}>
                          {t(`types.${notifType}`)}
                        </span>
                      </div>
                    </div>
                    {unread && (
                      <div
                        className="notif-unread-dot"
                        aria-label={t('unread')}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
