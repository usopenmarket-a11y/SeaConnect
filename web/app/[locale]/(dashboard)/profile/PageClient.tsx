'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

/**
 * Profile dashboard page — Client Component.
 *
 * Allows the authenticated user to view and edit their profile details.
 * Data fetched via SWR once the /api/v1/accounts/me/ endpoint is live.
 * All strings from i18n keys (ADR-015). Logical padding for RTL (ADR-014).
 */
export function ProfilePage(): React.ReactElement {
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')

  /**
   * Placeholder — replace with:
   *   const { data: profile } = useSWR('/api/v1/accounts/me/', fetcher)
   */
  const profile = null
  const isLoading = false

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-ink/60">{tCommon('loading')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">
        {t('profile')}
      </h1>

      <Card>
        <Card.Body>
          {profile === null ? (
            <div className="flex flex-col gap-6 py-4">
              {/* Avatar placeholder */}
              <div className="flex items-center gap-4">
                <div
                  aria-hidden="true"
                  className="h-16 w-16 rounded-full bg-sea/20"
                />
                <div className="flex flex-col gap-1">
                  <div className="h-4 w-32 rounded bg-ink/10" />
                  <div className="h-3 w-48 rounded bg-ink/10" />
                </div>
              </div>

              {/* Field skeletons */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="h-3 w-24 rounded bg-ink/10" />
                  <div className="h-10 w-full rounded-lg bg-ink/5" />
                </div>
              ))}

              <Button variant="primary" size="md" disabled>
                {tCommon('save')}
              </Button>
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </div>
  )
}
