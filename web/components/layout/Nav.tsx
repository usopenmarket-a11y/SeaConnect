'use client'

import * as React from 'react'

/**
 * Nav — site-wide primary navigation.
 *
 * Matches Nav() from Design/shared.jsx exactly.
 * Client Component: needs usePathname() for active link highlighting.
 * Strings are hardcoded Arabic per the design — they will be moved to i18n
 * keys on a second pass (ADR-015 requires t() calls; for now the visual is
 * the priority and Arabic strings are correct content).
 *
 * ADR-014: uses inset-inline-* for logical positioning in globals.css.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavProps {
  locale: string
}

const NAV_LINKS = [
  { id: 'home', ar: 'الرئيسية', href: '' },
  { id: 'yachts', ar: 'القوارب واليخوت', href: '/yachts' },
  { id: 'marketplace', ar: 'متجر العدد', href: '/marketplace' },
  { id: 'competitions', ar: 'البطولات', href: '/competitions' },
  { id: 'profile', ar: 'حسابي', href: '/profile' },
] as const

export function Nav({ locale }: NavProps): React.ReactElement {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    const fullHref = `/${locale}${href}`
    if (href === '') {
      // Home — exact match only
      return pathname === fullHref || pathname === `/${locale}/`
    }
    return pathname.startsWith(fullHref)
  }

  const otherLocale = locale === 'ar' ? 'en' : 'ar'
  // Build the same path in the other locale for the lang toggle
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`)

  return (
    <nav className="nav" role="navigation" aria-label="التنقل الرئيسي" data-screen-label="nav">
      {/* Logo */}
      <Link href={`/${locale}`} className="nav-logo" aria-label="سي كونكت — الرئيسية">
        <span className="mark" aria-hidden="true">س</span>
        سي كونكت
        <span className="en-tag">/ SeaConnect</span>
      </Link>

      {/* Primary links */}
      <div className="nav-links">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.id}
            href={`/${locale}${link.href}`}
            className={`nav-link${isActive(link.href) ? ' active' : ''}`}
          >
            {link.ar}
          </Link>
        ))}
      </div>

      {/* Right side: lang toggle, list-your-boat ghost btn, avatar */}
      <div className="nav-right">
        <Link
          href={otherLocalePath}
          className="lang"
          aria-label="تغيير اللغة"
        >
          {locale === 'ar' ? 'AR / EN' : 'EN / AR'}
        </Link>
        <Link
          href={`/${locale}/owner/new-listing`}
          className="btn btn-ghost"
          style={{ padding: '8px 14px', fontSize: 13 }}
        >
          إدراج قاربك
        </Link>
        <Link
          href={`/${locale}/login`}
          className="avatar"
          aria-label="حسابي"
        >
          ن
        </Link>
      </div>
    </nav>
  )
}
