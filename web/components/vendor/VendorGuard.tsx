'use client'

/**
 * VendorGuard — protected route wrapper for /vendor/* pages.
 *
 * Three-state behaviour:
 *   - Auth check pending    → spinner.
 *   - Not authenticated     → redirect to /[locale]/login.
 *   - Authenticated but role !== 'vendor' → redirect to /[locale]/.
 *   - Authenticated vendor  → render children.
 *
 * Mirrors the OwnerGuard pattern with a vendor role check.
 * ADR-014: logical CSS only.
 * ADR-015: strings via t().
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { useAuth } from '@/lib/auth'

interface Props {
  children: React.ReactNode
  locale: string
}

export function VendorGuard({ children, locale }: Props): React.ReactElement | null {
  const { user, isLoading } = useAuth()
  const t = useTranslations('vendor.guard')
  const router = useRouter()

  React.useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace(`/${locale}/login`)
      return
    }
    if (user.role !== 'vendor') {
      router.replace(`/${locale}/`)
    }
  }, [user, isLoading, locale, router])

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label={t('checking')}
        className="flex min-h-[calc(100dvh-8rem)] items-center justify-center"
      >
        <span
          aria-hidden="true"
          className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[--sea] border-t-transparent"
        />
      </div>
    )
  }

  if (!user || user.role !== 'vendor') {
    return null
  }

  return <>{children}</>
}
