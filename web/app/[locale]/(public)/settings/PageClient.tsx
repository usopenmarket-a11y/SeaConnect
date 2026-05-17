'use client'

/**
 * SettingsPage — Client Component.
 *
 * Converted from Design/system-pages.jsx SettingsPage() exactly.
 * Sidebar navigation: profile | notifs | payments | lang | security | about.
 * Language switcher wired to Next.js locale routing.
 * Logout wired to useAuth().logout().
 *
 * ADR-014: logical CSS (inset-inline-*, border-inline-*, etc.).
 * ADR-015: all strings via useTranslations('settings').
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'

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

// ── Component ────────────────────────────────────────────────────────────────

export function SettingsPageClient(): React.ReactElement {
  const t = useTranslations('settings')
  const { logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [active, setActive] = React.useState<SidebarId>('profile')
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

  function toggleNotif(key: keyof NotifToggles): void {
    setNotifToggles((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleChannel(key: string): void {
    setChannels((prev) =>
      prev.map((c) => (c.key === key ? { ...c, on: !c.on } : c)),
    )
  }

  async function handleLogout(): Promise<void> {
    await logout()
    // Navigate to login after logout — replace locale segment from pathname
    const locale = pathname.split('/')[1] ?? 'ar'
    router.push(`/${locale}/login`)
  }

  // Language switcher: change locale by replacing the locale segment in the URL
  function switchLocale(locale: string): void {
    const segments = pathname.split('/')
    segments[1] = locale
    router.push(segments.join('/'))
  }

  const currentLocale = pathname.split('/')[1] ?? 'ar'

  const sidebar: { id: SidebarId; icon: string; labelKey: string; subKey: string }[] = [
    { id: 'profile',  icon: '👤', labelKey: 'sidebar.profile.label',   subKey: 'sidebar.profile.sub'   },
    { id: 'notifs',   icon: '🔔', labelKey: 'sidebar.notifs.label',    subKey: 'sidebar.notifs.sub'    },
    { id: 'payments', icon: '💳', labelKey: 'sidebar.payments.label',  subKey: 'sidebar.payments.sub'  },
    { id: 'lang',     icon: '🌐', labelKey: 'sidebar.lang.label',      subKey: 'sidebar.lang.sub'      },
    { id: 'security', icon: '🔐', labelKey: 'sidebar.security.label',  subKey: 'sidebar.security.sub'  },
    { id: 'about',    icon: 'ℹ️', labelKey: 'sidebar.about.label',     subKey: 'sidebar.about.sub'     },
  ]

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
            >
              ⏻ {t('logoutBtn')}
            </button>
          </div>
        </div>

        {/* ── Content panels ── */}
        <div className="settings-content">

          {/* Profile */}
          {active === 'profile' && (
            <>
              <div className="settings-section-title">{t('profile.title')}</div>
              <div className="avatar-edit-row">
                <div className="avatar-big" aria-hidden="true">ن</div>
                <div className="avatar-edit-info">
                  <div className="name">{t('profile.avatarName')}</div>
                  <div className="since">{t('profile.memberSince')}</div>
                  <div className="change-photo">{t('profile.changePhoto')}</div>
                </div>
              </div>

              {[
                { labelKey: 'profile.fields.fullName',  valueKey: 'profile.fieldValues.fullName', dir: 'inherit' },
                { labelKey: 'profile.fields.phone',     valueKey: 'profile.fieldValues.phone',    dir: 'ltr'     },
                { labelKey: 'profile.fields.email',     valueKey: 'profile.fieldValues.email',    dir: 'ltr'     },
                { labelKey: 'profile.fields.city',      valueKey: 'profile.fieldValues.city',     dir: 'inherit' },
              ].map(({ labelKey, valueKey, dir }) => (
                <div className="settings-row" key={labelKey}>
                  <div className="settings-row-info">
                    <div className="label">{t(labelKey)}</div>
                    <div className="sub" style={{ direction: dir as React.CSSProperties['direction'] }}>
                      {t(valueKey)}
                    </div>
                  </div>
                  <button
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      color: 'var(--clay)',
                      border: '1px solid var(--clay)',
                      padding: '6px 14px',
                    }}
                  >
                    {t('profile.editBtn')}
                  </button>
                </div>
              ))}

              <div style={{ marginTop: 28 }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: '12px 32px' }}
                >
                  {t('profile.saveBtn')}
                </button>
              </div>
            </>
          )}

          {/* Notifications */}
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

          {/* Payments */}
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

          {/* Language & Region */}
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

          {/* Security */}
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

          {/* About */}
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
    </div>
  )
}
