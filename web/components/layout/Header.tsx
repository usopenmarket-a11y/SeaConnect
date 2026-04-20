import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface HeaderProps {
  locale: string
}

/**
 * Site-wide header.
 *
 * Server Component — renders nav links using next-intl's server-side
 * useTranslations. All link text comes from translation keys (ADR-015).
 * Logical margin/padding utilities keep layout correct in RTL (ADR-014).
 */
export function Header({ locale }: HeaderProps): React.ReactElement {
  const t = useTranslations()

  return (
    <header
      className={cn(
        'sticky top-0 z-40',
        'border-b border-ink/10 bg-pearl/80 backdrop-blur-sm',
      )}
      role="banner"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Brand wordmark */}
        <Link
          href={`/${locale}`}
          className="font-display text-xl font-bold text-sea"
          aria-label={t('common.appName')}
        >
          {t('common.appName')}
        </Link>

        {/* Primary navigation */}
        <nav aria-label={t('nav.home')} className="flex items-center gap-6">
          <Link
            href={`/${locale}`}
            className="text-sm font-medium text-ink/70 transition-colors hover:text-sea"
          >
            {t('nav.home')}
          </Link>
          <Link
            href={`/${locale}/bookings`}
            className="text-sm font-medium text-ink/70 transition-colors hover:text-sea"
          >
            {t('nav.bookings')}
          </Link>
        </nav>

        {/* Auth actions */}
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/login`}
            className={cn(
              'inline-flex h-9 items-center justify-center',
              'rounded-lg border border-sea ps-4 pe-4',
              'text-sm font-semibold text-sea',
              'transition-colors hover:bg-sea/5',
            )}
          >
            {t('nav.login')}
          </Link>
        </div>
      </div>
    </header>
  )
}
