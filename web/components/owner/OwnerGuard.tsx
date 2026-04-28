'use client'

/**
 * OwnerGuard — protected route wrapper for /owner/* pages.
 *
 * Three-state behaviour:
 *   - Auth check pending   → spinner.
 *   - Not authenticated     → redirect to /[locale]/login.
 *   - Authenticated but role !== 'owner' → redirect to /[locale]/.
 *   - Authenticated owner    → render children.
 *
 * Mirrors the AuthGuard pattern but adds the role check.
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { useAuth } from '@/lib/auth'

interface Props {
  children: React.ReactNode
  locale: string
}

export function OwnerGuard({ children, locale }: Props): React.ReactElement | null {
  const { user, isLoading } = useAuth()
  const t = useTranslations('owner.guard')
  const router = useRouter()

  React.useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace(`/${locale}/login`)
      return
    }
    if (user.role !== 'owner') {
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
          className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-sea border-t-transparent"
        />
      </div>
    )
  }

  if (!user || user.role !== 'owner') {
    return null
  }

  return <>{children}</>
}
