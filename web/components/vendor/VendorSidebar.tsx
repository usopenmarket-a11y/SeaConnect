'use client'

/**
 * VendorSidebar — left-rail nav for the vendor area.
 *
 * Active link detected via usePathname().
 * ADR-014: logical CSS only (ms-, me-, ps-, pe-).
 * ADR-015: strings via t().
 */

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

interface Props {
  locale: string
}

interface NavItem {
  /** Path segment appended to /${locale}/ — empty string for the section root. */
  hrefSegment: string
  /** Whether to match exactly (true) or with startsWith (false). */
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
    <nav
      aria-label="Vendor navigation"
      className="flex flex-col gap-1 rounded-2xl bg-[--sand] p-3"
    >
      {items.map((item) => {
        const href = `/${locale}/${item.hrefSegment}`
        const active = item.exact
          ? pathname === href
          : pathname.startsWith(href)
        return (
          <Link
            key={item.hrefSegment}
            href={href}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--sea]',
              active
                ? 'bg-[--sea] text-white'
                : 'text-[--ink]/70 hover:bg-[--sea]/10 hover:text-[--ink]',
            )}
          >
            {t(item.labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}
