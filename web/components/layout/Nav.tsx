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
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import { ScrollProgress } from '@/components/layout/ScrollProgress'
import { get, getAccessToken } from '@/lib/api'
import type { PaginatedResponse } from '@/lib/api'
import { useAuth } from '@/lib/auth'

/** Returns true once the page has scrolled past the hero (≥80px). */
function useScrolledPastHero(): boolean {
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 80)
    }
    // Passive listener — no layout thrash
    window.addEventListener('scroll', handleScroll, { passive: true })
    // Set initial value in case page loads mid-scroll
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return scrolled
}

// Minimal cart shape — only need item_count for the badge
interface CartBadgeData {
  item_count: number
}

// Minimal notification shape — only need status to derive unread count
interface NotifBadgeItem {
  status: string
}

const CART_KEY = '/marketplace/cart/'
const NOTIF_KEY = '/notifications/'

interface NavProps {
  locale: string
}

const NAV_LINKS = [
  { id: 'home',         tKey: 'home',        href: '' },
  { id: 'yachts',       tKey: 'yachts',      href: '/yachts' },
  { id: 'marketplace',  tKey: 'marketplace', href: '/marketplace' },
  { id: 'competitions', tKey: 'tournaments', href: '/competitions' },
  { id: 'profile',      tKey: 'account',     href: '/profile' },
] as const

export function Nav({ locale }: NavProps): React.ReactElement {
  const t = useTranslations('nav')
  const tNotif = useTranslations('notifications')
  const pathname = usePathname()
  const scrolledPastHero = useScrolledPastHero()
  const { user } = useAuth()

  // Detect whether the user is authenticated (token present in memory)
  const isAuthenticated = getAccessToken() !== null

  // Avatar initial — use first letter of first name, or email, or fallback '?'
  const avatarInitial =
    user?.first_name?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    '?'

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

  // Notification unread badge — only fetch when authenticated
  const { data: notifData } = useSWR<PaginatedResponse<NotifBadgeItem>>(
    isAuthenticated ? NOTIF_KEY : null,
    (path: string) => get<PaginatedResponse<NotifBadgeItem>>(path),
    { shouldRetryOnError: false, refreshInterval: 60_000 },
  )
  const notifUnreadCount =
    notifData?.results.filter((n) => n.status !== 'read').length ?? 0

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
      <nav
        className="nav"
        role="navigation"
        aria-label={t('ariaLabel')}
        data-screen-label="nav"
        data-scrolled={scrolledPastHero ? 'true' : 'false'}
      >
        {/* Logo */}
        <Link href={`/${locale}`} className="nav-logo" aria-label={t('logoAriaLabel')}>
          <span className="mark" aria-hidden="true">س</span>
          سي كونكت / SeaConnect
        </Link>

        {/* Primary links */}
        <div className="nav-links">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.id}
              href={`/${locale}${link.href}`}
              className={`nav-link${isActive(link.href) ? ' active' : ''}`}
            >
              {t(link.tKey)}
            </Link>
          ))}
        </div>

        {/* Right side: bell, cart badge, lang toggle, list-your-boat ghost btn, avatar */}
        <div className="nav-right">
          {/* Notification bell — only shown when authenticated */}
          {isAuthenticated && (
            <Link
              href={`/${locale}/notifications`}
              aria-label={tNotif('navBellAriaLabel', { count: notifUnreadCount })}
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
              {/* Bell SVG icon */}
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
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {/* Unread count badge */}
              {notifUnreadCount > 0 && (
                <span
                  aria-hidden="true"
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
                  {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Cart icon with item count badge */}
          <Link
            href={`/${locale}/cart`}
            aria-label={t('cartAriaLabel')}
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
                aria-label={t('cartItems', { count: cartCount })}
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
            aria-label={t('langAriaLabel')}
          >
            {locale === 'ar' ? 'AR / EN' : 'EN / AR'}
          </Link>
          <Link
            href={`/${locale}/owner/new-listing`}
            className="btn btn-ghost"
            style={{ padding: '8px 14px', fontSize: 13 }}
          >
            {t('listYourBoat')}
          </Link>
          <Link
            href={`/${locale}/login`}
            className="avatar"
            aria-label={t('accountAriaLabel')}
          >
            {avatarInitial}
          </Link>
        </div>
      </nav>
    </>
  )
}
