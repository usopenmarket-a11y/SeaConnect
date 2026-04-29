'use client'

/**
 * WeatherWidget — Client Component (C-1)
 *
 * Fetches live weather data for a departure port and renders
 * the temperature, advisory badge, and four sea-condition metrics.
 *
 * ADR-014: logical CSS properties throughout.
 * ADR-015: all strings via useTranslations('weather').
 */

import * as React from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'

// ── Types ─────────────────────────────────────────────────────────────────────

type Advisory = 'safe' | 'caution' | 'danger'

interface WeatherData {
  port_id: string
  temperature_c: number
  wave_height_m: number
  wind_speed_kmh: number
  wave_period_s: number
  wind_direction_deg: number
  advisory: Advisory
  fetched_at: string
}

interface WeatherWidgetProps {
  portId: string
}

// ── Advisory badge styles ─────────────────────────────────────────────────────

const ADVISORY_STYLES: Record<Advisory, React.CSSProperties> = {
  safe: {
    background: 'oklch(0.55 0.13 155)',
    color: 'var(--foam)',
  },
  caution: {
    background: 'var(--brass)',
    color: 'var(--ink)',
  },
  danger: {
    background: 'var(--clay)',
    color: 'var(--foam)',
  },
}

// ── SWR fetcher ───────────────────────────────────────────────────────────────

const API_BASE =
  (typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL
    : undefined) ?? 'http://localhost:8010'

async function fetcher(url: string): Promise<WeatherData> {
  const res = await fetch(url)
  if (!res.ok) {
    const err = new Error('API error') as Error & { status: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<WeatherData>
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeatherWidget({ portId }: WeatherWidgetProps) {
  const t = useTranslations('weather')

  const { data, error, isLoading } = useSWR<WeatherData>(
    `${API_BASE}/api/v1/weather/?port_id=${portId}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  )

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="avail-block">
        <div className="avail-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                width: 160,
                height: 18,
                background: 'var(--sand-2)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            />
            <div
              style={{
                width: 220,
                height: 11,
                background: 'var(--sand-2)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            />
          </div>
        </div>
        <div
          className="weather-panel"
          style={{
            background: 'var(--sand-2)',
            height: 180,
            animation: 'pulse 1.4s ease-in-out infinite',
          }}
        />
      </div>
    )
  }

  // ── Error / unavailable ────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="avail-block">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 0',
            fontFamily: 'var(--ff-mono)',
            fontSize: 12,
            letterSpacing: '0.06em',
            color: 'var(--muted)',
          }}
        >
          {t('unavailable')}
        </div>
      </div>
    )
  }

  // ── Advisory label ─────────────────────────────────────────────────────────
  const advisory = (data.advisory ?? 'safe') as Advisory
  const advisoryStyle = ADVISORY_STYLES[advisory] ?? ADVISORY_STYLES.safe

  // ── Timestamp ──────────────────────────────────────────────────────────────
  const fetchedLabel = data.fetched_at
    ? new Date(data.fetched_at).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="avail-block">
      {/* Header */}
      <div className="avail-head">
        <div>
          <div
            className="subhead"
            style={{ margin: 0, paddingBottom: 0, border: 0 }}
          >
            {t('title')}
          </div>
          {fetchedLabel && (
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                color: 'var(--muted)',
                marginBlockStart: 4,
                direction: 'ltr',
              }}
            >
              {fetchedLabel}
            </div>
          )}
        </div>
        {/* Advisory pill in header */}
        <div
          style={{
            ...advisoryStyle,
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
            padding: '6px 12px',
          }}
        >
          {t(`advisory.${advisory}`)}
        </div>
      </div>

      {/* Weather panel */}
      <div className="weather-panel">
        {/* Hero: temperature + advisory badge */}
        <div className="weather-hero">
          <div>
            <div className="big-temp">
              <span className="num">{Math.round(data.temperature_c)}</span>
              <span className="deg">{t('celsius')}</span>
            </div>
          </div>
          <div
            style={{
              ...advisoryStyle,
              fontFamily: 'var(--ff-mono)',
              fontSize: 12,
              letterSpacing: '0.05em',
              padding: '10px 16px',
              alignSelf: 'flex-start',
              marginBlockStart: 8,
            }}
          >
            {t(`advisory.${advisory}`)}
          </div>
        </div>

        {/* Four metrics grid */}
        <div className="weather-metrics">
          <div className="wm">
            <div className="l">{t('waveHeight')}</div>
            <div className="v num">
              {data.wave_height_m.toFixed(1)}
              <span>{t('meters')}</span>
            </div>
          </div>
          <div className="wm">
            <div className="l">{t('windSpeed')}</div>
            <div className="v num">
              {Math.round(data.wind_speed_kmh)}
              <span>{t('kmh')}</span>
            </div>
          </div>
          <div className="wm">
            <div className="l">{t('wavePeriod')}</div>
            <div className="v num">
              {Math.round(data.wave_period_s)}
              <span>{t('seconds')}</span>
            </div>
          </div>
          <div className="wm">
            <div className="l">{t('windDirection')}</div>
            <div className="v num">
              {Math.round(data.wind_direction_deg)}
              <span>{t('degrees')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
