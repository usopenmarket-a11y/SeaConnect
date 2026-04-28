'use client'

/**
 * OwnerSidebar — left-rail nav for the owner area.
 *
 * Logical CSS positioning so RTL rendering automatically mirrors. The
 * active link is determined from usePathname() and styled with the
 * brand sea color.
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
  hrefSegment: string
  labelKey: 'dashboard' | 'bookings' | 'myYachts'
}

const items: NavItem[] = [
  { hrefSegment: 'owner/dashboard', labelKey: 'dashboard' },
  { hrefSegment: 'owner/bookings', labelKey: 'bookings' },
  { hrefSegment: 'owner/yachts', labelKey: 'myYachts' },
]

export function OwnerSidebar({ locale }: Props): React.ReactElement {
  const t = useTranslations('owner.nav')
  const pathname = usePathname() ?? ''

  return (
    <nav
      aria-label="Owner navigation"
      className="flex flex-col gap-1 rounded-2xl bg-sand p-3"
    >
      {items.map((item) => {
        const href = `/${locale}/${item.hrefSegment}`
        const active = pathname.startsWith(href)
        return (
          <Link
            key={item.hrefSegment}
            href={href}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea',
              active
                ? 'bg-sea text-white'
                : 'text-ink/70 hover:bg-sea/10 hover:text-ink',
            )}
          >
            {t(item.labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}
