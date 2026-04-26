'use client'

/**
 * AuthGuard — protected route wrapper.
 *
 * Checks authentication state via useAuth(). While the initial auth check is
 * in progress it renders a full-page loading spinner. If the user is not
 * authenticated it redirects to the locale-prefixed login page.
 *
 * Usage:
 *   export default function DashboardPage() {
 *     return (
 *       <AuthGuard locale="ar">
 *         <DashboardContent />
 *       </AuthGuard>
 *     )
 *   }
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

interface AuthGuardProps {
  children: React.ReactNode
  /** Current locale string — used to construct the redirect URL. */
  locale: string
}

export function AuthGuard({ children, locale }: AuthGuardProps): React.ReactElement | null {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/${locale}/login`)
    }
  }, [isLoading, user, locale, router])

  // While the auth state is being determined, show a centred spinner
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="جارٍ التحقق من الجلسة"
        className="flex min-h-[calc(100dvh-8rem)] items-center justify-center"
      >
        <span
          aria-hidden="true"
          className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-sea border-t-transparent"
        />
      </div>
    )
  }

  // Not logged in — redirect is in flight, render nothing to avoid flash
  if (!user) {
    return null
  }

  return <>{children}</>
}
