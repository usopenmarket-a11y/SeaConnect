'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { getAccessToken } from '@/lib/api'

import type { CompetitionDetail } from '@/app/[locale]/(public)/competitions/[id]/page'

interface Props {
  competition: CompetitionDetail | null
  locale: string
  competitionId: string
}

interface MyEntryResponse {
  id: string
  status: string
}

function formatDateRange(startStr: string, endStr: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const start = new Date(startStr)
  const end = new Date(endStr)
  return `${fmt.format(start)} — ${fmt.format(end)}`
}

function formatAmount(amount: string): string {
  const n = Number(amount)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return n.toLocaleString('en')
}

export function CompetitionDetailPage({
  competition,
  locale,
  competitionId,
}: Props): React.ReactElement {
  const t = useTranslations('competitions')
  const router = useRouter()
  const { user } = useAuth()

  const [registering, setRegistering] = React.useState(false)
  const [myEntry, setMyEntry] = React.useState<MyEntryResponse | null>(null)
  const [entryLoaded, setEntryLoaded] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch user's existing entry on mount when authenticated
  React.useEffect(() => {
    if (!user) {
      setEntryLoaded(true)
      return
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
    const token = getAccessToken()
    fetch(`${apiUrl}/api/v1/competitions/${competitionId}/my-entry/`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (res) => {
        if (res.status === 200) {
          const data = (await res.json()) as MyEntryResponse
          setMyEntry(data)
        }
        // 404 means not registered — that is normal
      })
      .catch(() => undefined)
      .finally(() => setEntryLoaded(true))
  }, [user, competitionId])

  async function handleRegister(): Promise<void> {
    if (!user) {
      router.push(`/${locale}/login`)
      return
    }

    setRegistering(true)
    setError(null)

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
        const data = (await res.json()) as MyEntryResponse
        setMyEntry(data)
        return
      }

      if (res.status === 409) {
        // Already registered — fetch entry and treat as success
        const body = (await res.json().catch(() => ({}))) as { code?: string }
        if (body.code === 'ALREADY_REGISTERED') {
          router.refresh()
          return
        }
      }

      const body = (await res.json().catch(() => ({}))) as {
        code?: string
        error?: string
      }
      if (body.code === 'REGISTRATION_CLOSED') {
        setError(t('registrationClosed'))
      } else if (body.code === 'COMPETITION_FULL') {
        setError(t('competitionFull'))
      } else {
        setError(t('registerError'))
      }
    } catch {
      setError(t('registerError'))
    } finally {
      setRegistering(false)
    }
  }

  if (!competition) {
    return (
      <div className="page-glass" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div style={{ padding: '80px 48px', textAlign: 'center' }}>
          <div className="display" style={{ fontSize: 28 }}>404</div>
          <Link
            href={`/${locale}/competitions`}
            className="mono"
            style={{ fontSize: 12, letterSpacing: '0.1em', color: 'var(--sea)' }}
          >
            {t('backToList')}
          </Link>
        </div>
      </div>
    )
  }

  const now = new Date()
  const deadline = new Date(competition.registration_deadline)
  const isDeadlinePassed = deadline < now
  const isFull =
    competition.entry_count >= competition.max_participants
  const isOpen = competition.status === 'open'
  const isRegistered = myEntry !== null

  const canRegister = isOpen && !isDeadlinePassed && !isFull && !isRegistered

  const participantPct = Math.min(
    100,
    Math.round((competition.entry_count / competition.max_participants) * 100),
  )

  const hasEnded = new Date(competition.end_date) < now

  return (
    <div className="page-glass" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div style={{ padding: '40px 48px 24px', borderBottom: '2px solid var(--ink)' }}>
        <Link
          href={`/${locale}/competitions`}
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: 16,
          }}
        >
          ← {t('backToList')}
        </Link>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8 }}>
          § TOURNAMENT · {competition.region_name.toUpperCase()} · {competition.status.toUpperCase()}
        </div>
        <h1
          className="display"
          style={{ fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.02em', fontWeight: 700, marginBottom: 8 }}
        >
          {locale === 'ar' ? competition.title : competition.title_en}
        </h1>
        <div className="mono" style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          {formatDateRange(competition.start_date, competition.end_date, locale)}
          {competition.departure_port_name ? ` · ${competition.departure_port_name}` : ''}
        </div>

        {/* Prize pool + entry fee kpi row */}
        <div style={{ display: 'flex', gap: 40, marginTop: 16 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>
              {t('prizePool')}
            </div>
            <div className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 28, fontWeight: 700 }}>
              {formatAmount(competition.prize_pool)}
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}> EGP</span>
            </div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>
              {t('entryFee')}
            </div>
            <div className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 28, fontWeight: 700 }}>
              {Number(competition.entry_fee).toLocaleString('en')}
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}> EGP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="section" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40, alignItems: 'start', padding: '40px 48px' }}>
        {/* Left column */}
        <div>
          {/* Description */}
          {competition.description && (
            <div style={{ marginBottom: 32 }}>
              <h2
                className="display"
                style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '1px solid var(--rule)', paddingBottom: 8 }}
              >
                {t('description')}
              </h2>
              <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                {competition.description}
              </p>
            </div>
          )}

          {/* Rules */}
          {competition.rules && (
            <div style={{ marginBottom: 32 }}>
              <h2
                className="display"
                style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '1px solid var(--rule)', paddingBottom: 8 }}
              >
                {t('rules')}
              </h2>
              <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {competition.rules}
              </p>
            </div>
          )}

          {/* Participants progress */}
          <div style={{ marginBottom: 32 }}>
            <h2
              className="display"
              style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, borderBottom: '1px solid var(--rule)', paddingBottom: 8 }}
            >
              {t('participants')}
            </h2>
            <div
              className="mono"
              style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, letterSpacing: '0.05em' }}
            >
              {competition.entry_count} / {competition.max_participants} {t('participants')}
            </div>
            <div
              style={{
                height: 6,
                background: 'var(--rule)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${participantPct}%`,
                  background: participantPct >= 90 ? 'var(--clay)' : 'var(--sea)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Results link (when ended) */}
          {hasEnded && (
            <Link
              href={`/${locale}/competitions/${competitionId}/results`}
              style={{
                display: 'inline-block',
                fontFamily: 'var(--ff-mono)',
                fontSize: 12,
                letterSpacing: '0.1em',
                padding: '10px 20px',
                border: '1px solid var(--sea)',
                color: 'var(--sea)',
                textDecoration: 'none',
                marginBottom: 32,
              }}
            >
              {t('viewResults')} →
            </Link>
          )}
        </div>

        {/* Right column — registration card */}
        <div
          style={{
            border: '1px solid var(--rule)',
            padding: 28,
            background: 'var(--foam)',
            position: 'sticky',
            top: 24,
          }}
        >
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 16 }}>
            {t('registrationDeadline')}
          </div>
          <div className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
            {new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(deadline)}
          </div>

          {error && (
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--clay)',
                padding: '8px 12px',
                border: '1px solid var(--clay)',
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {isRegistered ? (
            <div
              className="mono"
              style={{
                fontSize: 12,
                letterSpacing: '0.1em',
                color: 'var(--sea)',
                padding: '12px 20px',
                border: '1px solid var(--sea)',
                textAlign: 'center',
              }}
            >
              {t('registered')}
            </div>
          ) : !entryLoaded ? null : !isOpen ? (
            <div
              className="mono"
              style={{
                fontSize: 12,
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                padding: '12px 20px',
                border: '1px solid var(--rule)',
                textAlign: 'center',
                opacity: 0.6,
              }}
            >
              {t('registrationClosed')}
            </div>
          ) : isFull ? (
            <div
              className="mono"
              style={{
                fontSize: 12,
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                padding: '12px 20px',
                border: '1px solid var(--rule)',
                textAlign: 'center',
                opacity: 0.6,
              }}
            >
              {t('competitionFull')}
            </div>
          ) : isDeadlinePassed ? (
            <div
              className="mono"
              style={{
                fontSize: 12,
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                padding: '12px 20px',
                border: '1px solid var(--rule)',
                textAlign: 'center',
                opacity: 0.6,
              }}
            >
              {t('registrationClosed')}
            </div>
          ) : (
            <button
              className="cta"
              style={{ width: '100%' }}
              disabled={registering || !canRegister}
              aria-busy={registering}
              onClick={() => { void handleRegister() }}
            >
              {registering
                ? t('registering')
                : !user
                  ? t('registerLoginRequired')
                  : `${t('register')} · ${Number(competition.entry_fee).toLocaleString('en')} EGP`}
            </button>
          )}

          {!user && canRegister && (
            <div
              className="mono"
              style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}
            >
              {t('registerLoginRequired')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
