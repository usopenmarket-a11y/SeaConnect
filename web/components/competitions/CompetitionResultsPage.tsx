'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import type { ResultsResponse, EntryResult } from '@/app/[locale]/(public)/competitions/[id]/results/page'

interface Props {
  resultsData: ResultsResponse
  locale: string
  competitionId: string
}

const TROPHY: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function CompetitionResultsPage({
  resultsData,
  locale,
  competitionId,
}: Props): React.ReactElement {
  const t = useTranslations('competitions')

  return (
    <div className="page-glass" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div style={{ padding: '40px 48px 24px', borderBottom: '2px solid var(--ink)' }}>
        <Link
          href={`/${locale}/competitions/${competitionId}`}
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
          ← {t('backToDetail')}
        </Link>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 8 }}>
          § TOURNAMENT RESULTS · LEADERBOARD
        </div>
        <h1
          className="display"
          style={{ fontSize: 64, lineHeight: 0.95, letterSpacing: '-0.02em', fontWeight: 700 }}
        >
          {t('results')} <em style={{ fontStyle: 'italic', color: 'var(--clay)' }}>{t('leaderboard')}</em>.
        </h1>
      </div>

      {/* Body */}
      <div className="section" style={{ background: 'var(--foam)', padding: '40px 48px' }}>
        {resultsData.status === 'upcoming' ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="display" style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
              {t('upcoming')}
            </div>
            <div className="mono" style={{ fontSize: 12, letterSpacing: '0.1em', color: 'var(--muted)' }}>
              {t('noResults')}
            </div>
            <Link
              href={`/${locale}/competitions/${competitionId}`}
              style={{
                display: 'inline-block',
                marginTop: 24,
                fontFamily: 'var(--ff-mono)',
                fontSize: 12,
                letterSpacing: '0.1em',
                padding: '10px 20px',
                border: '1px solid var(--sea)',
                color: 'var(--sea)',
                textDecoration: 'none',
              }}
            >
              {t('viewDetails')} →
            </Link>
          </div>
        ) : resultsData.results.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="display" style={{ fontSize: 28, marginBottom: 8 }}>
              {t('noResults')}
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--rule)' }}>
            {/* Table header */}
            <div
              className="mono"
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 180px 120px',
                gap: 16,
                padding: '12px 24px',
                borderBottom: '2px solid var(--ink)',
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'var(--muted)',
              }}
            >
              <span>{t('rank')}</span>
              <span>{t('participant')}</span>
              <span style={{ textAlign: 'end' }}>{t('catchWeight')}</span>
              <span style={{ textAlign: 'end' }}>{t('status')}</span>
            </div>

            {/* Table rows */}
            {resultsData.results.map((entry: EntryResult, idx: number) => {
              const rowRank = entry.rank ?? idx + 1
              const trophy = TROPHY[rowRank]
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 180px 120px',
                    gap: 16,
                    padding: '16px 24px',
                    borderBottom: idx < resultsData.results.length - 1 ? '1px solid var(--rule)' : 'none',
                    alignItems: 'center',
                    background: rowRank <= 3 ? 'rgba(0,0,0,0.02)' : undefined,
                  }}
                >
                  {/* Rank */}
                  <div
                    className="num"
                    style={{
                      fontFamily: 'var(--ff-display)',
                      fontSize: rowRank <= 3 ? 24 : 18,
                      fontWeight: 700,
                    }}
                  >
                    {trophy ?? rowRank}
                  </div>

                  {/* Participant name */}
                  <div style={{ fontSize: 15, fontWeight: 500 }}>
                    {entry.participant_name}
                  </div>

                  {/* Catch weight */}
                  <div
                    className="num"
                    style={{
                      fontFamily: 'var(--ff-display)',
                      fontSize: 20,
                      fontWeight: 700,
                      textAlign: 'end',
                    }}
                  >
                    {entry.catch_weight != null
                      ? `${Number(entry.catch_weight).toFixed(2)} kg`
                      : '—'}
                  </div>

                  {/* Status */}
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      color: 'var(--muted)',
                      textAlign: 'end',
                    }}
                  >
                    {entry.status.toUpperCase()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
