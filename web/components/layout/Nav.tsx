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
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // Close drawer on route change
  React.useEffect(() => { setDrawerOpen(false) }, [pathname])

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
      {/* Mobile nav overlay */}
      <div
        className={`nav-drawer-overlay${drawerOpen ? ' open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      {/* Mobile nav drawer */}
      <div
        className={`nav-drawer${drawerOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('ariaLabel')}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.id}
            href={`/${locale}${link.href}`}
            className="nav-drawer-link"
            onClick={() => setDrawerOpen(false)}
          >
            {t(link.tKey)}
          </Link>
        ))}
        <Link
          href={`/${locale}/owner/new-listing`}
          className="nav-drawer-link"
          onClick={() => setDrawerOpen(false)}
        >
          {t('listYourBoat')}
        </Link>
      </div>
      <nav
        className="nav"
        role="navigation"
        aria-label={t('ariaLabel')}
        data-screen-label="nav"
        data-scrolled={scrolledPastHero ? 'true' : 'false'}
      >
        {/* Logo — brand name in locale language only */}
        <Link href={`/${locale}`} className="nav-logo" aria-label={t('logoAriaLabel')}>
          <span className="mark" aria-hidden="true">{locale === 'ar' ? 'س' : 'S'}</span>
          {locale === 'ar' ? 'سي كونكت' : 'SeaConnect'}
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

        {/* Hamburger — visible only on mobile via CSS */}
        <button
          className="nav-hamburger"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? t('closeMenu') : t('openMenu')}
          style={{ display: 'none' }}  /* CSS overrides to flex on mobile */
        >
          <span />
          <span />
          <span />
        </button>

        {/* Right side — matches Design/shared.jsx Nav() nav-right */}
        <div className="nav-right">
          {/* Notification bell — always visible, badge only when unread */}
          <Link
            href={`/${locale}/notifications`}
            className="nav-cart"
            aria-label={tNotif('navBellAriaLabel', { count: notifUnreadCount })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {notifUnreadCount > 0 && (
              <span className="badge num" aria-label={t('cartItems', { count: notifUnreadCount })}>
                {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
              </span>
            )}
          </Link>

          {/* Cart icon — always visible, badge shows item count */}
          <Link
            href={`/${locale}/cart`}
            className="nav-cart"
            aria-label={t('cartAriaLabel')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6 H6 L8 16 H18 L20 8 H7" />
              <circle cx="9" cy="20" r="1.2" />
              <circle cx="17" cy="20" r="1.2" />
            </svg>
            {cartCount > 0 && (
              <span className="badge num" aria-label={t('cartItems', { count: cartCount })}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          <Link
            href={otherLocalePath}
            className="lang-switch"
            aria-label={t('langAriaLabel')}
            style={{ textDecoration: 'none' }}
          >
            <span className={`lang-opt${locale === 'ar' ? ' on' : ''}`}>ع</span>
            <span className="lang-sep" aria-hidden="true">·</span>
            <span className={`lang-opt${locale === 'en' ? ' on' : ''}`}>EN</span>
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
