'use client'

/**
 * Weather Advisory Page — Client Component.
 *
 * Converted from Design/weather-fishing.jsx WeatherPage() exactly.
 * Port selector drives SWR fetch to GET /api/v1/weather/?port_id={id}.
 * Advisory banner is colour-coded by wind/wave severity from the backend
 * advisory_level field (safe / caution / danger).
 * Forecast and hourly tabs are illustrative — built from mock data until a
 * 7-day forecast endpoint is added (see HANDOFFS.md).
 *
 * ADR-014: logical CSS only (ms-, me-, ps-, pe-).
 * ADR-015: all strings via useTranslations('weather').
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeatherResponse {
  port_name_en: string
  port_name_ar: string
  wind_speed_kmh: string | null
  wind_direction_deg: number | null
  wave_height_m: string | null
  wave_period_s: string | null
  temperature_c: string | null
  weather_code: number | null
  advisory_level: 'safe' | 'caution' | 'danger'
  fetched_at: string
}

interface Port {
  id: string
  nameAr: string
  nameEn: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PORTS: Port[] = [
  { id: '28e27115-939c-4a59-af8f-990719a7402b', nameAr: 'الغردقة',     nameEn: 'Hurghada'        },
  { id: '3d76a35f-a443-4630-8b8b-c985cabe0c01', nameAr: 'شرم الشيخ',   nameEn: 'Sharm El-Sheikh' },
  { id: '8d952add-4d12-4527-b8a1-44c66adce1d0', nameAr: 'الإسكندرية',  nameEn: 'Alexandria'      },
  { id: '0209ddee-8ad9-45b0-b345-831bb13608a9', nameAr: 'بورسعيد',     nameEn: 'Port Said'       },
  { id: '6d59dfd5-2cc3-4a74-bfbf-df1c3a258ea0', nameAr: 'ميناء السويس', nameEn: 'Suez Port'      },
  { id: '77d7abf5-927c-43b9-bcb2-ef63cbd4a01e', nameAr: 'رأس سدر',     nameEn: 'Ras Sidr'        },
]

// WMO code → emoji icon (subset covering common codes)
function wmoToIcon(code: number | null): string {
  if (code === null) return '🌡️'
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code <= 3) return '🌥️'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '🌨️'
  if (code <= 82) return '🌦️'
  if (code <= 86) return '🌨️'
  if (code <= 99) return '⛈️'
  return '🌡️'
}

// Wind degrees → cardinal direction abbreviation
function degToCardinal(deg: number | null): string {
  if (deg === null) return '—'
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

// Mock hourly data (until a hourly forecast endpoint exists)
const MOCK_HOURLY = [
  { h: '06:00', icon: '🌅', temp: 24, wind: 8  },
  { h: '09:00', icon: '☀️',  temp: 27, wind: 10 },
  { h: '12:00', icon: '☀️',  temp: 31, wind: 14 },
  { h: '15:00', icon: '☀️',  temp: 33, wind: 16 },
  { h: '18:00', icon: '🌅', temp: 30, wind: 12 },
  { h: '21:00', icon: '🌙', temp: 27, wind: 9  },
  { h: '00:00', icon: '🌙', temp: 25, wind: 7  },
]

// Mock 7-day forecast data (until a 7-day forecast endpoint exists)
const MOCK_FORECAST = [
  { dayAr: 'الجمعة',   dayEn: 'FRI', icon: '☀️',  high: 32, low: 24, wind: 12, wave: 0.7, safe: true  },
  { dayAr: 'السبت',    dayEn: 'SAT', icon: '☀️',  high: 33, low: 25, wind: 10, wave: 0.6, safe: true  },
  { dayAr: 'الأحد',    dayEn: 'SUN', icon: '🌤️', high: 30, low: 23, wind: 16, wave: 1.0, safe: true  },
  { dayAr: 'الاثنين',  dayEn: 'MON', icon: '🌥️', high: 28, low: 22, wind: 20, wave: 1.4, safe: true  },
  { dayAr: 'الثلاثاء', dayEn: 'TUE', icon: '💨', high: 27, low: 21, wind: 28, wave: 2.1, safe: false },
  { dayAr: 'الأربعاء', dayEn: 'WED', icon: '⛈️', high: 25, low: 20, wind: 32, wave: 2.8, safe: false },
  { dayAr: 'الخميس',   dayEn: 'THU', icon: '🌤️', high: 29, low: 22, wind: 15, wave: 1.1, safe: true  },
]

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchWeather(portId: string): Promise<WeatherResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
  const res = await fetch(`${apiUrl}/api/v1/weather/?port_id=${portId}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('WEATHER_FETCH_FAILED')
  return res.json() as Promise<WeatherResponse>
}

// ── Component ─────────────────────────────────────────────────────────────────

interface WeatherPageClientProps {
  locale: string
}

export function WeatherPageClient({ locale }: WeatherPageClientProps): React.ReactElement {
  const t = useTranslations('weather')
  const [activePortId, setActivePortId] = React.useState<string>(PORTS[0].id)
  const [activeTab, setActiveTab] = React.useState<'today' | '7day'>('today')

  const { data, error, isLoading } = useSWR<WeatherResponse>(
    activePortId,
    fetchWeather,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  )

  const activePort = PORTS.find(p => p.id === activePortId) ?? PORTS[0]
  const advisory = data?.advisory_level ?? 'safe'

  const windKmh = data?.wind_speed_kmh ? parseFloat(data.wind_speed_kmh) : null
  const waveM   = data?.wave_height_m  ? parseFloat(data.wave_height_m)  : null
  const tempC   = data?.temperature_c  ? parseFloat(data.temperature_c)  : null

  const icon    = wmoToIcon(data?.weather_code ?? null)
  const windDir = degToCardinal(data?.wind_direction_deg ?? null)

  return (
    <div className="weather-layout page-glass">
      {/* Page header */}
      <div className="weather-page-header" data-screen-label="weather-header">
        <div>
          <div className="weather-page-header eyebrow">{t('page.eyebrow')}</div>
          <h1>{t('page.heading')}</h1>
          <div className="weather-page-header subtitle">{t('page.dataSource')}</div>
        </div>
        <Link href={`/${locale}/fishing-guide`} className="btn btn-primary">
          <span>🎣</span>
          {t('page.fishingGuideLink')}
        </Link>
      </div>

      {/* Location tabs */}
      <div className="location-tabs" role="tablist" aria-label={t('page.locationTabsLabel')}>
        {PORTS.map(port => (
          <button
            key={port.id}
            role="tab"
            aria-selected={activePortId === port.id}
            className={`loc-tab${activePortId === port.id ? ' active' : ''}`}
            onClick={() => setActivePortId(port.id)}
          >
            <span className="loc-tab-ar">{port.nameAr}</span>
            <span className="loc-tab-en">{port.nameEn}</span>
          </button>
        ))}
      </div>

      {/* Main weather card */}
      <div className={`weather-main-card ${advisory}`} data-screen-label="weather-main-card">
        {/* Left: temperature + status */}
        <div className="weather-main-left">
          <div className="weather-icon-large">{isLoading ? '—' : icon}</div>
          <div className="weather-temp-big">
            {isLoading ? '—' : tempC !== null ? `${Math.round(tempC)}°` : '—'}
            <span style={{ fontSize: 24, fontWeight: 400 }}>C</span>
          </div>
          <div className={`weather-status-badge ${advisory}`}>
            {advisory === 'safe'    && <>{t('advisoryIcon.safe')} {t('advisory.safe')}</>}
            {advisory === 'caution' && <>{t('advisoryIcon.caution')} {t('advisory.caution')}</>}
            {advisory === 'danger'  && <>{t('advisoryIcon.danger')} {t('advisory.danger')}</>}
            {isLoading              && t('page.loading')}
          </div>
          <div className="weather-location-label">
            {activePort.nameAr} · {activePort.nameEn}
          </div>
        </div>

        {/* Right: 8-stat grid */}
        {isLoading ? (
          <div className="weather-main-grid" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="wstat" style={{ opacity: 0.35 }}>
                <div className="wstat-icon">·</div>
                <div className="wstat-val">—</div>
                <div className="wstat-label">···</div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            className="weather-main-grid"
            style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center',
                     justifyContent: 'center', padding: 32, color: 'var(--muted)' }}
          >
            {t('unavailable')}
          </div>
        ) : (
          <div className="weather-main-grid">
            <div className="wstat">
              <div className="wstat-icon">💨</div>
              <div className="wstat-val">
                {windKmh !== null ? Math.round(windKmh) : '—'}
                <span className="wstat-unit">KM/H</span>
              </div>
              <div className="wstat-label">{t('windSpeed')} · {windDir}</div>
            </div>
            <div className="wstat">
              <div className="wstat-icon">🌊</div>
              <div className="wstat-val">
                {waveM !== null ? waveM.toFixed(1) : '—'}
                <span className="wstat-unit">M</span>
              </div>
              <div className="wstat-label">{t('waveHeight')}</div>
            </div>
            <div className="wstat">
              <div className="wstat-icon">🔄</div>
              <div className="wstat-val">
                {data?.wave_period_s ? parseFloat(data.wave_period_s).toFixed(0) : '—'}
                <span className="wstat-unit">S</span>
              </div>
              <div className="wstat-label">{t('wavePeriod')}</div>
            </div>
            <div className="wstat">
              <div className="wstat-icon">🧭</div>
              <div className="wstat-val">{windDir}</div>
              <div className="wstat-label">{t('windDirection')}</div>
            </div>
            <div className="wstat">
              <div className="wstat-icon">🌡️</div>
              <div className="wstat-val">
                {tempC !== null ? `${Math.round(tempC)}` : '—'}
                <span className="wstat-unit">°C</span>
              </div>
              <div className="wstat-label">{t('temperature')}</div>
            </div>
            <div className="wstat">
              <div className="wstat-icon">📡</div>
              <div className="wstat-val">
                {data?.weather_code ?? '—'}
              </div>
              <div className="wstat-label">{t('page.wmoCode')}</div>
            </div>
            <div className="wstat">
              <div className="wstat-icon">🌊</div>
              <div className="wstat-val">
                {waveM !== null ? (waveM >= 2.0 ? t('page.roughSea') : waveM >= 1.0 ? t('page.moderateSea') : t('page.calmSea')) : '—'}
              </div>
              <div className="wstat-label">{t('page.seaState')}</div>
            </div>
            <div className="wstat">
              <div className="wstat-icon">⏱️</div>
              <div className="wstat-val mono" style={{ fontSize: 12, direction: 'ltr' }}>
                {data?.fetched_at
                  ? new Date(data.fetched_at).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </div>
              <div className="wstat-label">{t('page.lastUpdated')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Forecast tabs */}
      <div className="forecast-tabs" role="tablist" aria-label={t('page.forecastTabsLabel')}>
        {[
          { id: 'today' as const, label: t('page.tab.hourly') },
          { id: '7day'  as const, label: t('page.tab.sevenDay') },
        ].map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`forecast-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hourly forecast */}
      {activeTab === 'today' && (
        <div className="hourly-strip" data-screen-label="hourly-strip">
          {MOCK_HOURLY.map((h, i) => (
            <div className="hourly-item" key={i}>
              <div className="hourly-time">{h.h}</div>
              <div className="hourly-icon">{h.icon}</div>
              <div className="hourly-temp">{h.temp}°</div>
              <div className="hourly-wind">{h.wind} KM/H</div>
            </div>
          ))}
        </div>
      )}

      {/* 7-day forecast */}
      {activeTab === '7day' && (
        <div className="forecast-list" data-screen-label="forecast-list">
          {MOCK_FORECAST.map((f, i) => (
            <div key={i} className={`forecast-list-row${!f.safe ? ' unsafe-row' : ''}`}>
              <div className="forecast-day-col">
                <span className="forecast-day-ar">{f.dayAr}</span>
                <span className="forecast-day-en">{f.dayEn}</span>
              </div>
              <div className="forecast-list-icon">{f.icon}</div>
              <div className="forecast-temps-col">
                <span className="forecast-high">{f.high}°</span>
                <span className="forecast-low">{f.low}°</span>
              </div>
              <div className="forecast-wind-col">
                <span className="forecast-wind-val">{f.wind} KM/H</span>
                <span className="forecast-wind-label">{t('windSpeed')}</span>
              </div>
              <div className="forecast-wave-col">
                <span className="forecast-wave-val">{f.wave}M</span>
                <span className="forecast-wave-label">{t('waveHeight')}</span>
              </div>
              <div className={`forecast-safe-pill ${f.safe ? 'safe' : 'unsafe'}`}>
                {f.safe ? t('page.forecast.safe') : t('page.forecast.avoid')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Marine advisory */}
      <div className="marine-advisory" data-screen-label="marine-advisory">
        <div className="advisory-header">
          <span style={{ fontSize: 20 }}>⚓</span>
          <div>
            <div className="advisory-title">{t('page.advisory.title')}</div>
            <div className="advisory-meta">{t('page.advisory.meta')}</div>
          </div>
        </div>
        <div className="advisory-body">
          {t('page.advisory.body')}
          <div className="advisory-body-en">{t('page.advisory.bodyEn')}</div>
        </div>
      </div>
    </div>
  )
}
