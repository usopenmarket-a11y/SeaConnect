'use client'

/**
 * SettingsPage — Client Component.
 *
 * Converted from Design/system-pages.jsx SettingsPage() exactly.
 * Sidebar navigation: profile | notifs | payments | lang | security | about.
 *
 * Sprint 11C changes:
 *   - Profile panel fetches GET /api/v1/users/me/ via SWR on mount.
 *   - Name + phone fields switch to editable inputs on "Edit".
 *   - "Save" calls PATCH /api/v1/users/me/ with {first_name, last_name, phone}.
 *   - "Cancel" reverts to display state without saving.
 *   - Logout button shows a loading spinner while the logout request is in flight.
 *   - Language switcher replaces the locale segment in the current path.
 *
 * ADR-014: logical CSS (inset-inline-*, border-inline-*, ms-/me-/ps-/pe-).
 * ADR-015: all strings via useTranslations('settings').
 */

import * as React from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth, type AuthUser } from '@/lib/auth'
import { get, patch } from '@/lib/api'

// ── Types ────────────────────────────────────────────────────────────────────

type SidebarId = 'profile' | 'notifs' | 'payments' | 'lang' | 'security' | 'about'

interface NotifToggles {
  booking: boolean
  payment: boolean
  weather: boolean
  promo: boolean
  newsletter: boolean
}

interface ChannelToggle {
  key: string
  labelKey: string
  subKey: string
  on: boolean
}

interface ProfileDraft {
  first_name: string
  last_name: string
  phone: string
}

// ── Component ────────────────────────────────────────────────────────────────

export function SettingsPageClient(): React.ReactElement {
  const t = useTranslations('settings')
  const { logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const currentLocale = pathname.split('/')[1] ?? 'ar'

  // ── SWR — fetch current user profile ───────────────────────────────────
  const { data: profile, mutate } = useSWR<AuthUser>(
    '/users/me/',
    (path: string) => get<AuthUser>(path),
    { revalidateOnFocus: false },
  )

  // ── Sidebar state ───────────────────────────────────────────────────────
  const [active, setActive] = React.useState<SidebarId>('profile')

  // ── Notification toggles ────────────────────────────────────────────────
  const [notifToggles, setNotifToggles] = React.useState<NotifToggles>({
    booking: true,
    payment: true,
    weather: true,
    promo: false,
    newsletter: false,
  })
  const [channels, setChannels] = React.useState<ChannelToggle[]>([
    { key: 'inApp',    labelKey: 'notifs.channels.inApp.label',    subKey: 'notifs.channels.inApp.sub',    on: true  },
    { key: 'sms',      labelKey: 'notifs.channels.sms.label',      subKey: 'notifs.channels.sms.sub',      on: true  },
    { key: 'whatsapp', labelKey: 'notifs.channels.whatsapp.label', subKey: 'notifs.channels.whatsapp.sub', on: true  },
    { key: 'email',    labelKey: 'notifs.channels.email.label',    subKey: 'notifs.channels.email.sub',    on: false },
  ])

  // ── Profile edit state ──────────────────────────────────────────────────
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<ProfileDraft>({
    first_name: '',
    last_name: '',
    phone: '',
  })

  // Sync draft when profile loads or edit mode opens
  React.useEffect(() => {
    if (profile && isEditing) {
      setDraft({
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        phone: profile.phone ?? '',
      })
    }
  }, [profile, isEditing])

  // ── Logout state ────────────────────────────────────────────────────────
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  // ── Handlers ────────────────────────────────────────────────────────────

  function toggleNotif(key: keyof NotifToggles): void {
    setNotifToggles((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleChannel(key: string): void {
    setChannels((prev) =>
      prev.map((c) => (c.key === key ? { ...c, on: !c.on } : c)),
    )
  }

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
    router.push(`/${currentLocale}/login`)
  }

  function switchLocale(locale: string): void {
    const segments = pathname.split('/')
    segments[1] = locale
    router.push(segments.join('/'))
  }

  function handleEditClick(): void {
    setSaveSuccess(false)
    setSaveError(null)
    setDraft({
      first_name: profile?.first_name ?? '',
      last_name: profile?.last_name ?? '',
      phone: profile?.phone ?? '',
    })
    setIsEditing(true)
  }

  function handleCancelClick(): void {
    setIsEditing(false)
    setSaveError(null)
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const updated = await patch<AuthUser>('/users/me/', {
        first_name: draft.first_name,
        last_name: draft.last_name,
        phone: draft.phone || null,
      })
      // Update SWR cache with server-confirmed data
      await mutate(updated, false)
      setIsEditing(false)
      setSaveSuccess(true)
      // Clear success banner after 4 s
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch {
      setSaveError(t('profile.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  // ── Sidebar config ───────────────────────────────────────────────────────

  const sidebar: { id: SidebarId; icon: string; labelKey: string; subKey: string }[] = [
    { id: 'profile',  icon: '👤', labelKey: 'sidebar.profile.label',   subKey: 'sidebar.profile.sub'   },
    { id: 'notifs',   icon: '🔔', labelKey: 'sidebar.notifs.label',    subKey: 'sidebar.notifs.sub'    },
    { id: 'payments', icon: '💳', labelKey: 'sidebar.payments.label',  subKey: 'sidebar.payments.sub'  },
    { id: 'lang',     icon: '🌐', labelKey: 'sidebar.lang.label',      subKey: 'sidebar.lang.sub'      },
    { id: 'security', icon: '🔐', labelKey: 'sidebar.security.label',  subKey: 'sidebar.security.sub'  },
    { id: 'about',    icon: 'ℹ️', labelKey: 'sidebar.about.label',     subKey: 'sidebar.about.sub'     },
  ]

  // ── Derived display values ───────────────────────────────────────────────

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
    : '—'

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="settings-shell" data-screen-label="settings">
      {/* Page header */}
      <div className="settings-header">
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
        <h1>{t('heading')}</h1>
      </div>

      <div className="settings-body">
        {/* ── Sidebar ── */}
        <div className="settings-sidebar">
          {sidebar.map((s) => (
            <div
              key={s.id}
              className={`settings-sidebar-item${active === s.id ? ' on' : ''}`}
              onClick={() => setActive(s.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setActive(s.id)
              }}
            >
              <span className="icon" aria-hidden="true">{s.icon}</span>
              <div>
                <div>{t(s.labelKey)}</div>
                <div
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    color: 'var(--muted)',
                    marginTop: 2,
                  }}
                >
                  {t(s.subKey)}
                </div>
              </div>
            </div>
          ))}

          {/* Logout */}
          <div
            style={{
              margin: '24px 16px 0',
              borderTop: '1px solid var(--rule)',
              paddingTop: 16,
            }}
          >
            <button
              className="btn-danger"
              style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-busy={isLoggingOut}
            >
              {isLoggingOut ? (
                <span
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    marginInlineEnd: 6,
                    verticalAlign: 'middle',
                  }}
                  aria-hidden="true"
                />
              ) : (
                <span aria-hidden="true">⏻ </span>
              )}
              {t('logoutBtn')}
            </button>
          </div>
        </div>

        {/* ── Content panels ── */}
        <div className="settings-content">

          {/* ── Profile ──────────────────────────────────────────────── */}
          {active === 'profile' && (
            <>
              <div className="settings-section-title">{t('profile.title')}</div>

              {/* Avatar row — shows live name from API */}
              <div className="avatar-edit-row">
                <div className="avatar-big" aria-hidden="true">
                  {profile ? (profile.first_name?.[0] ?? profile.email[0]).toUpperCase() : '…'}
                </div>
                <div className="avatar-edit-info">
                  <div className="name">
                    {profile ? displayName : t('profile.loading')}
                  </div>
                  <div className="since">
                    {profile
                      ? profile.email
                      : '—'}
                  </div>
                  <div className="change-photo">{t('profile.changePhoto')}</div>
                </div>
              </div>

              {/* Success / Error banners */}
              {saveSuccess && (
                <div
                  style={{
                    padding: '10px 16px',
                    background: 'oklch(0.94 0.06 155)',
                    color: 'oklch(0.30 0.12 155)',
                    borderRadius: 6,
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                  role="status"
                >
                  {t('profile.saveSuccess')}
                </div>
              )}
              {saveError && (
                <div
                  style={{
                    padding: '10px 16px',
                    background: 'oklch(0.94 0.06 28)',
                    color: 'oklch(0.40 0.16 28)',
                    borderRadius: 6,
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                  role="alert"
                >
                  {saveError}
                </div>
              )}

              {/* Full name row */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="label">{t('profile.fields.fullName')}</div>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <input
                        type="text"
                        value={draft.first_name}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, first_name: e.target.value }))
                        }
                        placeholder={profile?.first_name ?? ''}
                        style={{
                          fontFamily: 'var(--ff-sans)',
                          fontSize: 13,
                          padding: '6px 10px',
                          border: '1px solid var(--rule-strong)',
                          borderRadius: 4,
                          width: 120,
                        }}
                        aria-label="First name"
                      />
                      <input
                        type="text"
                        value={draft.last_name}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, last_name: e.target.value }))
                        }
                        placeholder={profile?.last_name ?? ''}
                        style={{
                          fontFamily: 'var(--ff-sans)',
                          fontSize: 13,
                          padding: '6px 10px',
                          border: '1px solid var(--rule-strong)',
                          borderRadius: 4,
                          width: 120,
                        }}
                        aria-label="Last name"
                      />
                    </div>
                  ) : (
                    <div className="sub">
                      {profile ? displayName : t('profile.loading')}
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <button
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      color: 'var(--clay)',
                      border: '1px solid var(--clay)',
                      padding: '6px 14px',
                    }}
                    onClick={handleEditClick}
                  >
                    {t('profile.editBtn')}
                  </button>
                )}
              </div>

              {/* Phone row */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="label">{t('profile.fields.phone')}</div>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={draft.phone}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, phone: e.target.value }))
                      }
                      placeholder="+201012345678"
                      style={{
                        fontFamily: 'var(--ff-mono)',
                        fontSize: 13,
                        padding: '6px 10px',
                        border: '1px solid var(--rule-strong)',
                        borderRadius: 4,
                        marginTop: 4,
                        width: 200,
                        direction: 'ltr',
                      }}
                      dir="ltr"
                      aria-label="Phone number"
                    />
                  ) : (
                    <div className="sub" style={{ direction: 'ltr' }}>
                      {profile?.phone ?? '—'}
                    </div>
                  )}
                </div>
              </div>

              {/* Email row — read-only, never editable */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="label">{t('profile.fields.email')}</div>
                  <div className="sub" style={{ direction: 'ltr' }}>
                    {profile?.email ?? '—'}
                  </div>
                </div>
              </div>

              {/* Role row */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="label">{t('profile.fields.city')}</div>
                  <div className="sub">
                    {profile?.role ?? '—'}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
                {isEditing ? (
                  <>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '12px 32px' }}
                      onClick={handleSave}
                      disabled={isSaving}
                      aria-busy={isSaving}
                    >
                      {isSaving ? t('profile.saving') : t('profile.saveBtn')}
                    </button>
                    <button
                      style={{
                        fontFamily: 'var(--ff-mono)',
                        fontSize: 11,
                        letterSpacing: '0.08em',
                        color: 'var(--muted)',
                        border: '1px solid var(--rule)',
                        padding: '12px 24px',
                      }}
                      onClick={handleCancelClick}
                      disabled={isSaving}
                    >
                      {t('profile.cancelBtn')}
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ padding: '12px 32px' }}
                    onClick={handleEditClick}
                  >
                    {t('profile.editBtn')}
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── Notifications ─────────────────────────────────────────── */}
          {active === 'notifs' && (
            <>
              <div className="settings-section-title">{t('notifs.title')}</div>
              <div className="settings-section">
                {(
                  [
                    { k: 'booking',    labelKey: 'notifs.prefs.booking.label',    subKey: 'notifs.prefs.booking.sub'    },
                    { k: 'payment',    labelKey: 'notifs.prefs.payment.label',    subKey: 'notifs.prefs.payment.sub'    },
                    { k: 'weather',    labelKey: 'notifs.prefs.weather.label',    subKey: 'notifs.prefs.weather.sub'    },
                    { k: 'promo',      labelKey: 'notifs.prefs.promo.label',      subKey: 'notifs.prefs.promo.sub'      },
                    { k: 'newsletter', labelKey: 'notifs.prefs.newsletter.label', subKey: 'notifs.prefs.newsletter.sub' },
                  ] as { k: keyof NotifToggles; labelKey: string; subKey: string }[]
                ).map(({ k, labelKey, subKey }) => (
                  <div className="settings-row" key={k}>
                    <div className="settings-row-info">
                      <div className="label">{t(labelKey)}</div>
                      <div className="sub">{t(subKey)}</div>
                    </div>
                    <button
                      className={`toggle${notifToggles[k] ? ' on' : ''}`}
                      onClick={() => toggleNotif(k)}
                      aria-pressed={notifToggles[k]}
                      aria-label={t(labelKey)}
                    />
                  </div>
                ))}
              </div>

              <div className="settings-section">
                <div className="settings-section-title">{t('notifs.channelsTitle')}</div>
                {channels.map((ch) => (
                  <div className="settings-row" key={ch.key}>
                    <div className="settings-row-info">
                      <div className="label">{t(ch.labelKey)}</div>
                      <div className="sub">{t(ch.subKey)}</div>
                    </div>
                    <button
                      className={`toggle${ch.on ? ' on' : ''}`}
                      onClick={() => toggleChannel(ch.key)}
                      aria-pressed={ch.on}
                      aria-label={t(ch.labelKey)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Payments ──────────────────────────────────────────────── */}
          {active === 'payments' && (
            <>
              <div className="settings-section-title">{t('payments.title')}</div>
              <div className="settings-section">
                <div className="pm-list">
                  {[
                    { logo: 'FAWRY',          detailKey: 'payments.methods.fawry',     badge: t('payments.defaultBadge') },
                    { logo: 'VF CASH',        detailKey: 'payments.methods.vfCash',    badge: undefined },
                    { logo: 'INSTAPAY',       detailKey: 'payments.methods.instapay',  badge: undefined },
                    { logo: 'VISA •••• 4821', detailKey: 'payments.methods.visa',      badge: undefined },
                  ].map(({ logo, detailKey, badge }) => (
                    <div key={logo} className="pm-row">
                      <div className="pm-logo">{logo}</div>
                      <div className="pm-detail">{t(detailKey)}</div>
                      {badge && <div className="pm-badge">{badge}</div>}
                      <button
                        style={{
                          fontFamily: 'var(--ff-mono)',
                          fontSize: 10,
                          letterSpacing: '0.1em',
                          color: 'var(--muted)',
                          border: '1px solid var(--rule)',
                          padding: '5px 10px',
                        }}
                      >
                        {t('payments.removeBtn')}
                      </button>
                    </div>
                  ))}
                  <div className="pm-add">
                    <span style={{ fontSize: 18 }} aria-hidden="true">＋</span>
                    <span>{t('payments.addMethod')}</span>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">{t('payments.historyTitle')}</div>
                {[
                  { ref: 'SC-2026-0421', amount: '8,200',  date: '2026-05-12', typeKey: 'payments.txTypes.booking',  statusKey: 'payments.txStatus.completed', refund: false },
                  { ref: 'SC-2026-0397', amount: '3,400',  date: '2026-05-10', typeKey: 'payments.txTypes.refund',   statusKey: 'payments.txStatus.completed', refund: true  },
                  { ref: 'SC-2026-0351', amount: '12,500', date: '2026-04-28', typeKey: 'payments.txTypes.booking',  statusKey: 'payments.txStatus.completed', refund: false },
                ].map((tx) => (
                  <div className="settings-row" key={tx.ref}>
                    <div className="settings-row-info">
                      <div className="label" style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, direction: 'ltr' }}>
                        {tx.ref}
                      </div>
                      <div className="sub" style={{ direction: 'ltr' }}>
                        {tx.date} · {t(tx.typeKey)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div
                        style={{
                          fontFamily: 'var(--ff-mono)',
                          fontWeight: 700,
                          color: tx.refund ? 'oklch(0.55 0.13 155)' : 'var(--ink)',
                          direction: 'ltr',
                        }}
                      >
                        {tx.refund ? '+' : ''}{tx.amount} EGP
                      </div>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--muted)' }}>
                        {t(tx.statusKey)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Language & Region ─────────────────────────────────────── */}
          {active === 'lang' && (
            <>
              <div className="settings-section-title">{t('lang.title')}</div>
              <div className="settings-section">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="label">{t('lang.appLang.label')}</div>
                    <div className="sub">{t('lang.appLang.sub')}</div>
                  </div>
                  <div className="lang-seg">
                    <button
                      className={currentLocale === 'ar' ? 'on' : ''}
                      onClick={() => switchLocale('ar')}
                    >
                      {t('lang.arabic')}
                    </button>
                    <button
                      className={currentLocale === 'en' ? 'on' : ''}
                      onClick={() => switchLocale('en')}
                    >
                      {t('lang.english')}
                    </button>
                  </div>
                </div>

                {[
                  { labelKey: 'lang.timezone.label', subKey: 'lang.timezone.value', dir: 'ltr' as const },
                  { labelKey: 'lang.currency.label', subKey: 'lang.currency.value', dir: 'inherit' as const },
                  { labelKey: 'lang.dateFormat.label', subKey: 'lang.dateFormat.value', dir: 'ltr' as const },
                ].map(({ labelKey, subKey, dir }) => (
                  <div className="settings-row" key={labelKey}>
                    <div className="settings-row-info">
                      <div className="label">{t(labelKey)}</div>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--ff-mono)',
                        fontSize: 12,
                        color: 'var(--muted-2)',
                        direction: dir,
                      }}
                    >
                      {t(subKey)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Security ──────────────────────────────────────────────── */}
          {active === 'security' && (
            <>
              <div className="settings-section-title">{t('security.title')}</div>
              <div className="settings-section">
                {[
                  { labelKey: 'security.twoFactor.label',   subKey: 'security.twoFactor.sub',   on: true  },
                  { labelKey: 'security.biometric.label',   subKey: 'security.biometric.sub',   on: false },
                  { labelKey: 'security.loginAlert.label',  subKey: 'security.loginAlert.sub',  on: true  },
                ].map(({ labelKey, subKey, on }) => (
                  <div className="settings-row" key={labelKey}>
                    <div className="settings-row-info">
                      <div className="label">{t(labelKey)}</div>
                      <div className="sub">{t(subKey)}</div>
                    </div>
                    <button
                      className={`toggle${on ? ' on' : ''}`}
                      aria-pressed={on}
                      aria-label={t(labelKey)}
                    />
                  </div>
                ))}
              </div>

              <div className="settings-section">
                <div className="settings-section-title">{t('security.yourData')}</div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="label">{t('security.downloadData.label')}</div>
                    <div className="sub">{t('security.downloadData.sub')}</div>
                  </div>
                  <button
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      color: 'var(--ink)',
                      border: '1px solid var(--rule-strong)',
                      padding: '8px 16px',
                    }}
                  >
                    {t('security.downloadData.btn')}
                  </button>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="label" style={{ color: 'oklch(0.50 0.18 28)' }}>
                      {t('security.deleteAccount.label')}
                    </div>
                    <div className="sub">{t('security.deleteAccount.sub')}</div>
                  </div>
                  <button
                    className="btn-danger"
                    style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}
                  >
                    {t('security.deleteAccount.btn')}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── About ─────────────────────────────────────────────────── */}
          {active === 'about' && (
            <>
              <div className="settings-section-title">{t('about.title')}</div>
              <div className="settings-section">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    marginBottom: 28,
                    paddingBottom: 28,
                    borderBottom: '1px solid var(--rule)',
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      background: 'var(--ink)',
                      color: 'var(--foam)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--ff-display)',
                      fontSize: 28,
                      fontWeight: 700,
                    }}
                    aria-hidden="true"
                  >
                    س
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, fontWeight: 700 }}>
                      {t('about.appName')}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--ff-mono)',
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        color: 'var(--muted)',
                        marginTop: 4,
                        direction: 'ltr',
                      }}
                    >
                      {t('about.version')}
                    </div>
                  </div>
                </div>

                {[
                  { labelKey: 'about.links.terms',        subKey: 'about.links.termsSub'        },
                  { labelKey: 'about.links.privacy',      subKey: 'about.links.privacySub'      },
                  { labelKey: 'about.links.cancellation', subKey: 'about.links.cancellationSub' },
                  { labelKey: 'about.links.guidelines',   subKey: 'about.links.guidelinesSub'   },
                  { labelKey: 'about.links.support',      subKey: 'about.links.supportSub'      },
                ].map(({ labelKey, subKey }) => (
                  <div className="settings-row" key={labelKey} style={{ cursor: 'pointer' }}>
                    <div className="settings-row-info">
                      <div className="label">{t(labelKey)}</div>
                      <div className="sub">{t(subKey)}</div>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: 18 }} aria-hidden="true">›</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 24,
                  padding: '16px 0',
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: 'var(--muted)',
                  direction: 'ltr',
                  lineHeight: 1.8,
                }}
              >
                {t('about.copyright')}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Spinner keyframe — injected once via a style tag */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
