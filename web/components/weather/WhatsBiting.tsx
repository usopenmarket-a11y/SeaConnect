'use client'

/**
 * WhatsBiting — Client Component (C-1)
 *
 * Fetches the current month's fishing species for a departure port
 * and renders a species grid with peak-season badges.
 *
 * ADR-014: logical CSS properties throughout.
 * ADR-015: all strings via useTranslations('fishing').
 */

import * as React from 'react'
import useSWR from 'swr'
import { useTranslations, useLocale } from 'next-intl'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Species {
  id: string
  name: string
  name_ar: string
  scientific_name: string
}

interface FishingEntry {
  species: Species
  month: number
  is_peak: boolean
}

interface WhatsBitingProps {
  portId: string
}

// ── SWR fetcher ───────────────────────────────────────────────────────────────

const API_BASE =
  (typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL
    : undefined) ?? 'http://localhost:8010'

async function fetcher(url: string): Promise<FishingEntry[]> {
  const res = await fetch(url)
  if (!res.ok) {
    const err = new Error('API error') as Error & { status: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<FishingEntry[]>
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--foam)',
        border: '1px solid var(--rule)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          width: '70%',
          height: 16,
          background: 'var(--sand-2)',
          animation: 'pulse 1.4s ease-in-out infinite',
        }}
      />
      <div
        style={{
          width: '50%',
          height: 11,
          background: 'var(--sand-2)',
          animation: 'pulse 1.4s ease-in-out infinite',
        }}
      />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WhatsBiting({ portId }: WhatsBitingProps) {
  const t = useTranslations('fishing')
  const locale = useLocale()

  // Current month name for the subtitle
  const currentMonthName = new Date().toLocaleString(
    locale === 'ar' ? 'ar-EG' : 'en-US',
    { month: 'long' },
  )

  const { data, error, isLoading } = useSWR<FishingEntry[]>(
    `${API_BASE}/api/v1/fishing/whats-biting/?port_id=${portId}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  )

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="avail-block" style={{ marginBlockStart: 0 }}>
        <div className="avail-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                width: 200,
                height: 18,
                background: 'var(--sand-2)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            />
            <div
              style={{
                width: 100,
                height: 11,
                background: 'var(--sand-2)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            />
          </div>
        </div>
        <div className="gear-grid">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  // ── Error / unavailable — render empty state rather than crashing ──────────
  const entries = error || !data ? [] : data

  return (
    <div className="avail-block" style={{ marginBlockStart: 0 }}>
      {/* Header */}
      <div className="avail-head">
        <div>
          <div
            className="subhead"
            style={{ margin: 0, paddingBottom: 0, border: 0 }}
          >
            {t('whatsBiting')}
          </div>
          <div
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--muted)',
              marginBlockStart: 4,
              textTransform: 'uppercase',
            }}
          >
            {currentMonthName}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div
          style={{
            padding: '32px 0',
            fontFamily: 'var(--ff-mono)',
            fontSize: 12,
            letterSpacing: '0.06em',
            color: 'var(--muted)',
            textAlign: 'center',
          }}
        >
          {t('noData')}
        </div>
      )}

      {/* Species grid */}
      {entries.length > 0 && (
        <div className="gear-grid">
          {entries.map((entry) => {
            const speciesName =
              locale === 'ar'
                ? entry.species.name_ar || entry.species.name
                : entry.species.name

            return (
              <div
                key={entry.species.id}
                style={{
                  background: 'var(--foam)',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  position: 'relative',
                }}
              >
                {/* Peak badge */}
                {entry.is_peak && (
                  <div
                    style={{
                      position: 'absolute',
                      insetBlockStart: 12,
                      insetInlineEnd: 12,
                      background: 'var(--clay)',
                      color: 'var(--foam)',
                      fontFamily: 'var(--ff-mono)',
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      padding: '3px 8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('peakSeason')}
                  </div>
                )}

                {/* Species name */}
                <div
                  style={{
                    fontFamily: 'var(--ff-display)',
                    fontSize: 17,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    paddingInlineEnd: entry.is_peak ? 70 : 0,
                  }}
                >
                  {speciesName}
                </div>

                {/* Scientific name */}
                <div
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 11,
                    color: 'var(--muted)',
                    fontStyle: 'italic',
                    direction: 'ltr',
                    textAlign: locale === 'ar' ? 'right' : 'left',
                  }}
                >
                  {entry.species.scientific_name}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
