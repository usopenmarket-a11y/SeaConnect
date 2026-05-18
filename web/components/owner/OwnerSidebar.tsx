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

  return (
    <aside className="sidebar-dash">
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
            >
              <span>{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
