'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  locale: string
}

interface NavItem {
  hrefSegment: string
  labelKey: 'dashboard' | 'bookings' | 'myYachts' | 'calendar' | 'payouts' | 'onboarding'
}

const items: NavItem[] = [
  { hrefSegment: 'owner/dashboard', labelKey: 'dashboard' },
  { hrefSegment: 'owner/calendar', labelKey: 'calendar' },
  { hrefSegment: 'owner/bookings', labelKey: 'bookings' },
  { hrefSegment: 'owner/yachts', labelKey: 'myYachts' },
  { hrefSegment: 'owner/payouts', labelKey: 'payouts' },
  { hrefSegment: 'owner/onboarding', labelKey: 'onboarding' },
]

export function OwnerSidebar({ locale }: Props): React.ReactElement {
  const t = useTranslations('owner.nav')
  const pathname = usePathname() ?? ''
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Close on navigation
  React.useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <>
      {/* Mobile toggle button — visible only on mobile via CSS */}
      <button
        className="dash-mobile-menu-btn"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        aria-label={t('ariaLabel')}
        style={{
          display: 'none',  /* CSS overrides to flex on mobile */
          position: 'fixed',
          bottom: 20,
          insetInlineEnd: 20,
          zIndex: 201,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--clay)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px oklch(0.40 0.15 30 / 0.35)',
          fontSize: 20,
        }}
      >
        ☰
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'oklch(0.14 0.04 240 / 0.45)',
            zIndex: 199,
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar-dash${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="brand-mini">
          <span className="dot" aria-hidden="true" />
          <span>سي كونكت</span>
          <span style={{ fontSize: 10, fontFamily: 'var(--ff-mono)', opacity: 0.6, letterSpacing: '0.1em', marginInlineStart: 'auto' }}>OWNER</span>
        </div>
        <nav aria-label={t('ariaLabel')}>
          {items.map((item) => {
            const href = `/${locale}/${item.hrefSegment}`
            const active = pathname.startsWith(href)
            return (
              <Link
                key={item.hrefSegment}
                href={href}
                className={`nav-item${active ? ' active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <span>{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
