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
  exact?: boolean
  labelKey: 'products' | 'dashboard'
}

const items: NavItem[] = [
  { hrefSegment: 'vendor', exact: true, labelKey: 'dashboard' },
  { hrefSegment: 'vendor/products', labelKey: 'products' },
]

export function VendorSidebar({ locale }: Props): React.ReactElement {
  const t = useTranslations('vendor.nav')
  const pathname = usePathname() ?? ''

  return (
    <aside className="sidebar-dash">
      <div className="brand-mini">
        <span className="dot" aria-hidden="true" />
        <span>سي كونكت</span>
        <span style={{ fontSize: 10, fontFamily: 'var(--ff-mono)', opacity: 0.6, letterSpacing: '0.1em', marginInlineStart: 'auto' }}>VENDOR</span>
      </div>
      <nav aria-label="Vendor navigation">
        {items.map((item) => {
          const href = `/${locale}/${item.hrefSegment}`
          const active = item.exact ? pathname === href : pathname.startsWith(href)
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
