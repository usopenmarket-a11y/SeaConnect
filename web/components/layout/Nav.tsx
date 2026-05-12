'use client'

/**
 * Nav — site-wide primary navigation.
 *
 * Matches Nav() from Design/shared.jsx exactly.
 * Client Component: needs usePathname() for active link highlighting.
 * ScrollProgress bar rendered inside Nav at fixed position.
 *
 * ADR-014: uses inset-inline-* logical positioning.
 * ADR-015: strings via i18n keys from nav namespace.
 */

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
import { ScrollProgress } from '@/components/layout/ScrollProgress'
import { get } from '@/lib/api'

// Minimal cart shape — only need item_count for the badge
interface CartBadgeData {
  item_count: number
}

const CART_KEY = '/marketplace/cart/'

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
  // Cart badge — silently fails when user is not logged in (data is undefined)
  const { data: cartData } = useSWR<CartBadgeData>(
    CART_KEY,
    (path: string) => get<CartBadgeData>(path),
    {
      // Don't retry on auth errors (401 when not logged in)
      shouldRetryOnError: false,
      // Refresh every 30s in the background while page is visible
      refreshInterval: 30000,
    },
  )
  const cartCount = cartData?.item_count ?? 0

  function isActive(href: string): boolean {
    const fullHref = `/${locale}${href}`
    if (href === '') {
      return pathname === fullHref || pathname === `/${locale}/`
    }
    return pathname.startsWith(fullHref)
  }

  const otherLocale = locale === 'ar' ? 'en' : 'ar'
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`)

  return (
    <>
      <ScrollProgress />
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

        {/* Right side: cart badge, lang toggle, list-your-boat ghost btn, avatar */}
        <div className="nav-right">
          {/* Cart icon with item count badge */}
          <Link
            href={`/${locale}/cart`}
            aria-label="السلة"
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              textDecoration: 'none',
              color: 'var(--ink)',
            }}
          >
            {/* Cart SVG icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {/* Badge — only shown when cart has items */}
            {cartCount > 0 && (
              <span
                aria-label={`${cartCount} منتج في السلة`}
                style={{
                  position: 'absolute',
                  top: 0,
                  insetInlineEnd: 0,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: 'var(--clay)',
                  color: '#fff',
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  lineHeight: 1,
                }}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

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
    </>
  )
}
