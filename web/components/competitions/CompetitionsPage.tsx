'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { getAccessToken } from '@/lib/api'

import type { Competition } from '@/app/[locale]/competitions/page'

interface Props {
  competitions: Competition[]
  locale: string
}

function formatDate(dateStr: string): { day: string; month: string } {
  const d = new Date(dateStr)
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  return {
    day: String(d.getDate()),
    month: months[d.getMonth()] ?? '',
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
        `${apiUrl}/api/v1/competitions/${competitionId}/enter/`,
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

      if (res.status === 400) {
        const body = await res.json().catch(() => ({}))
        if (body?.error?.code === 'ALREADY_ENTERED') {
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

  return (
    <div dir="rtl">
      {/* Header */}
      <div style={{ padding: '40px 48px 24px', borderBottom: '2px solid var(--ink)' }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8 }}>
          § TOURNAMENTS · FISHING CALENDAR 2026
        </div>
        <h1 className="display" style={{ fontSize: 72, lineHeight: 0.95, letterSpacing: '-0.02em', fontWeight: 700 }}>
          {t('title')} <em style={{ fontStyle: 'italic', color: 'var(--clay)' }}>والأحداث</em>.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', maxWidth: '52ch', marginTop: 14 }}>
          {t('subtitle')}
        </p>
      </div>

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
              const { day, month } = formatDate(c.start_date)
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
