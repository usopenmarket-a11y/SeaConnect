'use client'

/**
 * Owner yacht management list.
 *
 * The current public `GET /api/v1/yachts/` filters to status=active +
 * is_deleted=false, so this page can only show the owner's *active*
 * yachts today. Sprint 6 will add an owner-scoped endpoint that returns
 * all statuses (drafts + inactive); until then, drafts are invisible
 * here. Documented as a known gap.
 */

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { get } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

type YachtStatus = 'active' | 'draft' | 'inactive'

interface YachtRow {
  id: string
  name: string
  name_ar: string
  yacht_type: string
  status: YachtStatus
  price_per_day: string
  currency: string
  owner?: { id: string }
}

interface YachtListResponse {
  results: YachtRow[]
  has_more: boolean
}

const fetcher = (path: string) => get<YachtListResponse>(path)

const statusBadgeMap: Record<YachtStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-amber-50 text-amber-700',
  inactive: 'bg-ink/10 text-ink/60',
}

interface Props {
  params: { locale: string }
}

export function OwnerYachtsPage({
  params: { locale },
}: Props): React.ReactElement {
  const t = useTranslations('owner.yachts')
  const tCommon = useTranslations('common')
  const { user } = useAuth()

  const { data, error, isLoading } = useSWR<YachtListResponse>(
    '/yachts/',
    fetcher,
  )

  // Client-side owner filter — fallback until Sprint 6 adds a server filter.
  const myYachts = React.useMemo(() => {
    if (!data || !user) return []
    return data.results.filter((y) => y.owner?.id === user.id)
  }, [data, user])

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">
          {t('title')}
        </h1>
        <Link
          href={`/${locale}/owner/yachts/new`}
          className="inline-flex items-center justify-center rounded-lg bg-sea px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2"
        >
          {t('newListing')}
        </Link>
      </div>

      {isLoading && (
        <p className="py-8 text-center text-ink/50">{tCommon('loading')}</p>
      )}

      {error && (
        <Card>
          <Card.Body>
            <p role="alert" className="py-6 text-center text-red-600">
              {t('loadError')}
            </p>
          </Card.Body>
        </Card>
      )}

      {!isLoading && !error && myYachts.length === 0 && (
        <Card>
          <Card.Body>
            <p className="py-8 text-center text-ink/50">{t('empty')}</p>
          </Card.Body>
        </Card>
      )}

      {!isLoading && !error && myYachts.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-sand p-2">
          <table className="min-w-full text-start">
            <thead>
              <tr className="text-xs font-medium uppercase tracking-wide text-ink/50">
                <th className="px-3 py-2 text-start">{t('name')}</th>
                <th className="px-3 py-2 text-start">{t('type')}</th>
                <th className="px-3 py-2 text-start">{t('status')}</th>
                <th className="px-3 py-2 text-start">{t('price')}</th>
                <th className="px-3 py-2 text-start">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {myYachts.map((y) => {
                const yachtName = locale === 'ar' ? y.name_ar : y.name
                const formattedPrice =
                  locale === 'ar'
                    ? Number(y.price_per_day).toLocaleString('ar-EG')
                    : Number(y.price_per_day).toLocaleString('en-US')
                return (
                  <tr
                    key={y.id}
                    className="border-b border-ink/10 last:border-b-0"
                  >
                    <td className="px-3 py-3 text-sm font-medium text-ink">
                      {yachtName}
                    </td>
                    <td className="px-3 py-3 text-sm text-ink/70">
                      {y.yacht_type}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                          statusBadgeMap[y.status] ?? 'bg-ink/10 text-ink/60',
                        )}
                      >
                        {t(`statusLabel.${y.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-sm text-ink">
                      {formattedPrice}{' '}
                      <span className="text-xs font-normal text-ink/50">
                        {y.currency}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/${locale}/yachts/${y.id}`}
                        className="text-sm font-medium text-sea hover:underline"
                      >
                        {t('edit')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
