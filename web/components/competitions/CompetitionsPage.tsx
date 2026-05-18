'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { PageHero } from '@/components/layout/PageHero'
import { useAuth } from '@/lib/auth'
import { getAccessToken } from '@/lib/api'

import type { Competition } from '@/app/[locale]/(public)/competitions/page'

interface Props {
  competitions: Competition[]
  locale: string
}

function getMonthName(monthIndex: number, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' })
    .format(new Date(2026, monthIndex, 1))
}

function formatDate(dateStr: string, locale: string): { day: string; month: string } {
  const d = new Date(dateStr)
  return {
    day: String(d.getDate()),
    month: getMonthName(d.getMonth(), locale),
  }
}

function formatPrize(amount: string): string {
  const n = Number(amount)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return n.toLocaleString('en')
}

export function CompetitionsPage({ competitions, locale }: Props): React.ReactElement {
  const t = useTranslations('competitions')
  const router = useRouter()
  const { user } = useAuth()

  const [registeringId, setRegisteringId] = React.useState<string | null>(null)
  const [registeredIds, setRegisteredIds] = React.useState<Set<string>>(new Set())
  const [errorId, setErrorId] = React.useState<string | null>(null)

  async function handleRegister(competitionId: string): Promise<void> {
    if (!user) {
      router.push(`/${locale}/login`)
      return
    }

    setRegisteringId(competitionId)
    setErrorId(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
      const token = getAccessToken()
      const res = await fetch(
        `${apiUrl}/api/v1/competitions/${competitionId}/register/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      )

      if (res.status === 201) {
        setRegisteredIds((prev) => new Set(prev).add(competitionId))
        return
      }

      // 409 Conflict — already registered (canonical duplicate response)
      if (res.status === 409) {
        setRegisteredIds((prev) => new Set(prev).add(competitionId))
        return
      }

      if (res.status === 400) {
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
        // Support both nested shape {"error":{"code":"..."}} and flat {"code":"..."}
        const errorCode =
          (body?.error as Record<string, unknown> | undefined)?.code ??
          body?.code
        if (
          errorCode === 'ALREADY_REGISTERED' ||
          errorCode === 'ALREADY_ENTERED'
        ) {
          setRegisteredIds((prev) => new Set(prev).add(competitionId))
          return
        }
      }

      // Any other non-success status
      setErrorId(competitionId)
      setTimeout(() => setErrorId(null), 4000)
    } catch {
      setErrorId(competitionId)
      setTimeout(() => setErrorId(null), 4000)
    } finally {
      setRegisteringId(null)
    }
  }

  const isAr = locale === 'ar'

  return (
    <div className="page-glass" dir={isAr ? 'rtl' : 'ltr'}>
      <PageHero
        kicker={isAr ? 'البطولات · تقويم الصيد ٢٠٢٦' : 'TOURNAMENTS · FISHING CALENDAR 2026'}
        title={<>{t('title')} <em style={{ fontStyle: 'italic', color: 'oklch(0.92 0.07 60)' }}>{t('titleEm')}</em>.</>}
        subtitle={t('subtitle')}
        bar={[
          { label: isAr ? 'البطولات هذا العام' : 'Events this year', value: <span className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 44, fontWeight: 700, color: 'var(--clay)' }}>{competitions.length}</span>, mod: 'count' },
          { label: isAr ? 'السواحل المشمولة' : 'Coasts covered', value: isAr ? 'البحر الأحمر · المتوسط · النيل' : 'Red Sea · Mediterranean · Nile' },
          { label: isAr ? 'العدد · ربيع ٢٠٢٦' : 'ISSUE · SPRING 2026', value: isAr ? 'تقويم الصيد' : 'FISHING CALENDAR', mod: 'issue' },
        ]}
      />

      {/* Competition list */}
      <div className="section" style={{ background: 'var(--foam)' }}>
        {competitions.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted-2)' }}>
            <div className="display" style={{ fontSize: 28, marginBottom: 8 }}>{t('empty')}</div>
            <div className="mono" style={{ fontSize: 12, letterSpacing: '0.1em' }}>{t('emptyHint')}</div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--rule)' }}>
            {competitions.map((c) => {
              const { day, month } = formatDate(c.start_date, locale)
              return (
                <div key={c.id} className="comp-row">
                  <div className="date">
                    <div className="d num">{day}</div>
                    <div className="m">{month} 2026</div>
                  </div>
                  <div className="title">
                    <div className="t">{c.title}</div>
                    <div className="sub">{c.title_en} · {c.region_name.toUpperCase()}</div>
                  </div>
                  <div className="meta">
                    <span className="n num">{c.entry_count}</span>
                    <span className="l">{t('participants')}</span>
                  </div>
                  <div className="meta">
                    <span className="n num">{formatPrize(c.prize_pool)}</span>
                    <span className="l">{t('prizes')}</span>
                  </div>
                  {errorId === c.id && (
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: 'var(--clay)', alignSelf: 'center' }}
                    >
                      {t('registerError')}
                    </span>
                  )}
                  <button
                    className="cta"
                    onClick={() => { void handleRegister(c.id) }}
                    disabled={registeredIds.has(c.id) || registeringId === c.id}
                    aria-busy={registeringId === c.id}
                    style={
                      registeredIds.has(c.id)
                        ? { opacity: 0.7, cursor: 'default', color: 'var(--sea)' }
                        : undefined
                    }
                  >
                    {registeredIds.has(c.id)
                      ? t('registered')
                      : registeringId === c.id
                        ? t('registering')
                        : `${t('register')} · ${Number(c.entry_fee).toLocaleString('en')} EGP`}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
