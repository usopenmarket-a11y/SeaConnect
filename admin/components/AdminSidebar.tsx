'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface NavEntry {
  /** Arabic label shown in sidebar */
  ar: string
  /** i18n key under admin.nav */
  key: string
  /** URL path segment after /[locale]/ */
  href: string
  /** Badge count — null means no badge */
  count: number | null
}

interface NavGroup {
  /** Arabic group header */
  labelAr: string
  /** i18n key under admin.nav for the group label */
  labelKey: string
  items: NavEntry[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelAr: 'الإدارة',
    labelKey: 'platformGroup',
    items: [
      { ar: 'نظرة عامة', key: 'overview', href: 'dashboard', count: null },
      { ar: 'المعاملات', key: 'transactions', href: 'transactions', count: 847 },
      { ar: 'الإيرادات', key: 'revenue', href: 'revenue', count: null },
      { ar: 'التقارير', key: 'reports', href: 'reports', count: null },
    ],
  },
  {
    labelAr: 'السوق',
    labelKey: 'marketplaceGroup',
    items: [
      { ar: 'القوارب', key: 'boats', href: 'boats', count: 183 },
      { ar: 'البائعون', key: 'vendors', href: 'vendors', count: 83 },
      { ar: 'البطولات', key: 'competitions', href: 'competitions', count: 12 },
      { ar: 'العملاء', key: 'users', href: 'users', count: 2543 },
    ],
  },
  {
    labelAr: 'المراجعة',
    labelKey: 'moderationGroup',
    items: [
      { ar: 'قيد المراجعة', key: 'pending', href: 'pending', count: 7 },
      { ar: 'البلاغات', key: 'disputes', href: 'disputes', count: 2 },
      { ar: 'تحقق KYC', key: 'kycQueue', href: 'kyc', count: 14 },
    ],
  },
]

/**
 * Admin portal sidebar — sticky, dark background, Arabic-first navigation.
 * Active state derived from current pathname via usePathname().
 */
export default function AdminSidebar({ locale }: { locale: string }) {
  const pathname = usePathname()
  const t = useTranslations('admin.nav')

  function isActive(href: string): boolean {
    return pathname.includes(`/${href}`)
  }

  return (
    <aside className="sidebar-dash">
      {/* Brand header */}
      <div className="brand-mini">
        <span className="dot" aria-hidden="true" />
        <span>{t('brandName')}</span>
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--ff-mono)',
            opacity: 0.6,
            letterSpacing: '0.1em',
            marginInlineStart: 'auto',
          }}
        >
          ADMIN
        </span>
      </div>

      {/* Navigation groups */}
      <nav aria-label="Admin navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.labelKey}>
            <div className="section-label" aria-hidden="true">
              {group.labelAr}
            </div>
            {group.items.map((item) => (
              <Link
                key={item.key}
                href={`/${locale}/${item.href}`}
                className={`nav-item${isActive(item.href) ? ' active' : ''}`}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <span>{item.ar}</span>
                {item.count !== null && (
                  <span className="n" aria-label={`${item.count} items`}>
                    {item.count.toLocaleString('en')}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 32,
          borderTop: '1px solid oklch(1 0 0 / 0.08)',
          marginBlockStart: 40,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 10,
            opacity: 0.4,
            letterSpacing: '0.1em',
            direction: 'ltr',
          }}
        >
          SEACONNECT · v0.1.0
        </div>
        <div
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 10,
            opacity: 0.35,
            letterSpacing: '0.08em',
            direction: 'ltr',
            marginTop: 4,
          }}
        >
          INTERNAL USE ONLY
        </div>
      </div>
    </aside>
  )
}
