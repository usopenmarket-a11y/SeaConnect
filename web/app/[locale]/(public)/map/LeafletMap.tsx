'use client'

/**
 * LeafletMap — the actual Leaflet component.
 *
 * Rules:
 * - ssr: false is enforced by the parent (MapClient) — never import this directly in a Server Component.
 * - Leaflet default icon is broken in webpack; replaced with a divIcon anchor emoji.
 * - Port coordinates are hardcoded — no geocoding needed.
 * - Yachts fetched from GET /api/v1/yachts/ (NEXT_PUBLIC_API_URL env var).
 * - Port filter hides markers for deselected ports.
 * - Side panel shows legend when no port is selected; shows yacht popup when a port marker is clicked.
 */

import * as React from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Image from 'next/image'
import Link from 'next/link'
import styles from './map.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LeafletMapProps {
  title: string
  filterAll: string
  filterMotor: string
  filterSail: string
  filterFishing: string
  filterNile: string
  liveLabel: string
  viewList: string
  viewDetails: string
  noYachts: string
  popupYachtsCount: string
  legendLabel: string
  regionRedSea: string
  regionMediterranean: string
  regionNile: string
  legendHint: string
  browseAll: string
  close: string
  showAll: string
}

interface ApiYacht {
  id: string
  name_ar: string
  name_en: string
  type: string
  price_per_day: string
  currency: string
  capacity: number
  average_rating?: number
  departure_port?: {
    id: string
    name_ar: string
    name_en: string
  }
  primary_image?: string
}

// ── Port coordinate map ───────────────────────────────────────────────────────

const PORT_COORDS: Record<string, [number, number]> = {
  Hurghada: [27.2579, 33.8116],
  hurghada: [27.2579, 33.8116],
  Alexandria: [31.2001, 29.9187],
  alexandria: [31.2001, 29.9187],
  'Sharm El Sheikh': [27.9158, 34.3299],
  'sharm el sheikh': [27.9158, 34.3299],
  Sharm: [27.9158, 34.3299],
  Luxor: [25.6872, 32.6396],
  luxor: [25.6872, 32.6396],
  Dahab: [28.5091, 34.5136],
  dahab: [28.5091, 34.5136],
  'Port Said': [31.2653, 32.3019],
  'port said': [31.2653, 32.3019],
  Aswan: [24.0889, 32.8998],
  aswan: [24.0889, 32.8998],
}

// ── Port region grouping (for legend counts) ──────────────────────────────────

const RED_SEA_PORTS = ['Hurghada', 'Sharm El Sheikh', 'Dahab', 'Aswan']
const MEDITERRANEAN_PORTS = ['Alexandria', 'Port Said']
const NILE_PORTS = ['Luxor']

function portRegion(portName: string): 'redSea' | 'mediterranean' | 'nile' | 'other' {
  const n = portName.toLowerCase()
  if (RED_SEA_PORTS.some((p) => p.toLowerCase() === n)) return 'redSea'
  if (MEDITERRANEAN_PORTS.some((p) => p.toLowerCase() === n)) return 'mediterranean'
  if (NILE_PORTS.some((p) => p.toLowerCase() === n)) return 'nile'
  return 'other'
}

// ── Filter definitions ────────────────────────────────────────────────────────

type FilterId = 'all' | 'motorboat' | 'sailboat' | 'fishing' | 'nile'

// Map API type value to filter id (broad match)
function yachtFilterId(type: string): FilterId {
  const t = type.toLowerCase()
  if (t.includes('sail') || t.includes('catamaran')) return 'sailboat'
  if (t.includes('fish')) return 'fishing'
  if (t.includes('nile') || t.includes('felucca')) return 'nile'
  return 'motorboat'
}

// ── Leaflet icon (fixes webpack broken default icon) ─────────────────────────

function makeAnchorIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;
      border-radius:50%;
      background:${color};
      border:2.5px solid rgba(255,255,255,0.85);
      box-shadow:0 3px 10px oklch(0.20 0.045 235 / 0.28);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
      cursor:pointer;
    ">⚓</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  })
}

const FILTER_COLORS: Record<FilterId, string> = {
  all: 'oklch(0.38 0.08 220)',
  motorboat: 'oklch(0.38 0.08 220)',
  sailboat: 'oklch(0.42 0.14 150)',
  fishing: 'oklch(0.62 0.18 60)',
  nile: 'oklch(0.55 0.12 270)',
}

// ── Map bounds fitter ─────────────────────────────────────────────────────────

function FitBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap()
  React.useEffect(() => {
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] })
    }
  }, [map, bounds])
  return null
}

// ── Port grouping helpers ─────────────────────────────────────────────────────

interface PortGroup {
  portName: string
  coords: [number, number]
  yachts: ApiYacht[]
  filterId: FilterId
}

function groupByPort(yachts: ApiYacht[]): PortGroup[] {
  const map = new Map<string, PortGroup>()
  for (const yacht of yachts) {
    const portName = yacht.departure_port?.name_en ?? ''
    const coords = PORT_COORDS[portName]
    if (!coords) continue
    const existing = map.get(portName)
    const fid = yachtFilterId(yacht.type ?? '')
    if (existing) {
      existing.yachts.push(yacht)
    } else {
      map.set(portName, { portName, coords, yachts: [yacht], filterId: fid })
    }
  }
  return Array.from(map.values())
}

// ── Main component ────────────────────────────────────────────────────────────

export function LeafletMap(props: LeafletMapProps) {
  const {
    title,
    filterAll,
    filterMotor,
    filterSail,
    filterFishing,
    filterNile,
    liveLabel,
    viewList,
    viewDetails,
    noYachts,
    popupYachtsCount,
    legendLabel,
    regionRedSea,
    regionMediterranean,
    regionNile,
    legendHint,
    browseAll,
    close,
    showAll,
  } = props

  const [yachts, setYachts] = React.useState<ApiYacht[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeFilter, setActiveFilter] = React.useState<FilterId>('all')
  const [activePort, setActivePort] = React.useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  // Fetch yachts
  React.useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    fetch(`${apiUrl}/api/v1/yachts/?limit=200`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: { results?: ApiYacht[] } | ApiYacht[]) => {
        const list = Array.isArray(data) ? data : (data.results ?? [])
        setYachts(list)
      })
      .catch(() => setYachts([]))
      .finally(() => setLoading(false))
  }, [])

  const portGroups = React.useMemo(() => groupByPort(yachts), [yachts])

  const filteredGroups = React.useMemo(() => {
    if (activeFilter === 'all') return portGroups
    return portGroups.map((pg) => ({
      ...pg,
      yachts: pg.yachts.filter((y) => yachtFilterId(y.type ?? '') === activeFilter),
    })).filter((pg) => pg.yachts.length > 0)
  }, [portGroups, activeFilter])

  const totalVisible = filteredGroups.reduce((acc, pg) => acc + pg.yachts.length, 0)

  const activePortGroup = activePort
    ? filteredGroups.find((pg) => pg.portName === activePort) ?? null
    : null

  const filters: { id: FilterId; label: string; color: string }[] = [
    { id: 'all', label: filterAll, color: 'oklch(0.38 0.08 220)' },
    { id: 'motorboat', label: filterMotor, color: 'oklch(0.38 0.08 220)' },
    { id: 'sailboat', label: filterSail, color: 'oklch(0.42 0.14 150)' },
    { id: 'fishing', label: filterFishing, color: 'oklch(0.62 0.18 60)' },
    { id: 'nile', label: filterNile, color: 'oklch(0.55 0.12 270)' },
  ]

  // Egypt center
  const center: [number, number] = [26.8, 30.8]

  // Counts for legend
  const countByRegion = React.useMemo(() => {
    const byName = new Map(portGroups.map((pg) => [pg.portName, pg.yachts.length]))
    return {
      redSea: RED_SEA_PORTS.reduce((a, p) => a + (byName.get(p) ?? 0), 0),
      mediterranean: MEDITERRANEAN_PORTS.reduce((a, p) => a + (byName.get(p) ?? 0), 0),
      nile: NILE_PORTS.reduce((a, p) => a + (byName.get(p) ?? 0), 0),
    }
  }, [portGroups])

  return (
    <div className={styles.mapLayout}>
      {/* ── Header ─────────────────────────────────── */}
      <div className={styles.mapHeader}>
        <div>
          <div className={`${styles.mapHeaderEyebrow} mono`}>
            LIVE MAP · الخريطة الحية
          </div>
          <h2 className={styles.mapHeaderTitle}>{title}</h2>
        </div>
        <div className={styles.mapBoatCount}>
          <span className={styles.liveDot} />
          <span className="mono" style={{ fontSize: 13 }}>
            {loading ? '…' : totalVisible} {liveLabel}
          </span>
        </div>
        <Link href="/yachts" className="btn btn-ghost" style={{ fontSize: 13 }}>
          {viewList}
        </Link>
      </div>

      {/* ── Filter strip ───────────────────────────── */}
      <div className={styles.mapFilters}>
        {filters.map((f) => (
          <button
            key={f.id}
            className={`${styles.mapFilterBtn} ${activeFilter === f.id ? styles.mapFilterBtnActive : ''}`}
            style={
              activeFilter === f.id
                ? {
                    borderColor: f.color,
                    color: f.color,
                    background: f.color.replace('oklch(', 'oklch(').replace(')', ' / 0.08)'),
                  }
                : undefined
            }
            onClick={() => {
              setActiveFilter(f.id)
              setActivePort(null)
            }}
          >
            <span
              className={styles.mapFilterDot}
              style={{ background: f.color }}
            />
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Body: map + sidebar ────────────────────── */}
      <div className={styles.mapBody}>
        {/* Map fills remaining space */}
        <div className={styles.mapCanvas}>
          <MapContainer
            center={center}
            zoom={6}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filteredGroups.length > 0 && (
              <FitBounds bounds={filteredGroups.map((pg) => pg.coords)} />
            )}

            {filteredGroups.map((pg) => {
              const color =
                activeFilter !== 'all'
                  ? FILTER_COLORS[activeFilter]
                  : FILTER_COLORS[yachtFilterId(pg.yachts[0]?.type ?? '')]
              const icon = makeAnchorIcon(color)
              return (
                <Marker
                  key={pg.portName}
                  position={pg.coords}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      setActivePort(pg.portName)
                      setSidebarOpen(true)
                    },
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'var(--ff-sans)', minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        {pg.portName}
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}
                      >
                        {pg.yachts.length} {popupYachtsCount}
                      </div>
                      {pg.yachts.slice(0, 1).map((y) => (
                        <div key={y.id}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              marginBottom: 2,
                            }}
                          >
                            {y.name_ar || y.name_en}
                          </div>
                          <div
                            className="mono"
                            style={{ fontSize: 11, color: 'var(--sea)', marginBottom: 6 }}
                          >
                            {Number(y.price_per_day).toLocaleString()} {y.currency}/
                            {/* day */}
                          </div>
                          <Link
                            href={`/yachts/${y.id}`}
                            style={{
                              fontSize: 12,
                              color: 'var(--sea)',
                              textDecoration: 'underline',
                            }}
                          >
                            {viewDetails} ←
                          </Link>
                        </div>
                      ))}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>

        {/* ── Side panel ─────────────────────────────── */}
        <div className={styles.mapSide}>
          {activePortGroup ? (
            /* Port popup panel */
            <div className={styles.mapPopupPanel}>
              <div className={styles.mapPopupHeader}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {activePortGroup.portName}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 11, color: 'var(--muted)' }}
                  >
                    {activePortGroup.yachts.length} {popupYachtsCount}
                  </div>
                </div>
                <span className={styles.mapTypeBadge}>
                  {activePortGroup.yachts.length}
                </span>
              </div>

              {activePortGroup.yachts.length === 0 ? (
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--muted)',
                    textAlign: 'center',
                    padding: '24px 0',
                  }}
                >
                  {noYachts}
                </p>
              ) : (
                activePortGroup.yachts.slice(0, 3).map((yacht) => (
                  <Link
                    key={yacht.id}
                    href={`/yachts/${yacht.id}`}
                    className={styles.mapBoatCard}
                  >
                    {yacht.primary_image && (
                      <div className={styles.mapBoatImgWrap}>
                        <Image
                          src={yacht.primary_image}
                          alt={yacht.name_ar || yacht.name_en}
                          fill
                          sizes="240px"
                          className={styles.mapBoatImg}
                          style={{ objectFit: 'cover' }}
                          unoptimized={
                            !yacht.primary_image.startsWith('https://images.unsplash.com') &&
                            !yacht.primary_image.startsWith('http://localhost') &&
                            !yacht.primary_image.includes('.r2.cloudflarestorage.com')
                          }
                        />
                      </div>
                    )}
                    <div className={styles.mapBoatBody}>
                      <div className={styles.mapBoatName}>
                        {yacht.name_ar || yacht.name_en}
                      </div>
                      <div
                        style={{ fontSize: 12, color: 'var(--muted)' }}
                      >
                        {yacht.type} · {yacht.capacity} pax
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: 6,
                          alignItems: 'center',
                        }}
                      >
                        <div
                          className="mono"
                          style={{ fontWeight: 700, fontSize: 13 }}
                        >
                          {Number(yacht.price_per_day).toLocaleString()}{' '}
                          <span style={{ fontSize: 10, fontWeight: 400 }}>
                            {yacht.currency}/DAY
                          </span>
                        </div>
                        {yacht.average_rating != null && (
                          <div style={{ fontSize: 12 }}>
                            ⭐ {yacht.average_rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}

              {activePortGroup.yachts.length > 3 && (
                <Link
                  href={`/yachts?port=${encodeURIComponent(activePortGroup.portName)}`}
                  className="btn btn-primary"
                  style={{ width: '100%', textAlign: 'center', display: 'block' }}
                >
                  {showAll} {activePortGroup.portName}
                </Link>
              )}

              <button
                className="btn btn-ghost"
                style={{ width: '100%' }}
                onClick={() => setActivePort(null)}
              >
                {close}
              </button>
            </div>
          ) : (
            /* Legend panel */
            <div className={styles.mapLegendPanel}>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: 'var(--muted)',
                  marginBottom: 12,
                }}
              >
                {legendLabel}
              </div>

              {filters
                .filter((f) => f.id !== 'all')
                .map((f) => {
                  const count = portGroups
                    .flatMap((pg) => pg.yachts)
                    .filter((y) => yachtFilterId(y.type ?? '') === f.id).length
                  return (
                    <div className={styles.legendItem} key={f.id}>
                      <span
                        className={styles.legendDot}
                        style={{ background: f.color }}
                      />
                      <span>{f.label}</span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          color: 'var(--muted)',
                          marginInlineEnd: 'auto',
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  )
                })}

              <div className={styles.mapLegendDivider} />

              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.05em',
                  color: 'var(--muted)',
                  marginBottom: 8,
                }}
              >
                REGIONS
              </div>

              {(
                [
                  { label: regionRedSea, count: countByRegion.redSea },
                  { label: regionMediterranean, count: countByRegion.mediterranean },
                  { label: regionNile, count: countByRegion.nile },
                ] as { label: string; count: number }[]
              ).map((r) => (
                <div className={styles.legendRegion} key={r.label}>
                  <span style={{ fontSize: 13 }}>{r.label}</span>
                  <span
                    className="mono"
                    style={{ fontSize: 12, fontWeight: 700, color: 'var(--sea)' }}
                  >
                    {r.count}
                  </span>
                </div>
              ))}

              <div className={styles.mapLegendDivider} />

              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                }}
              >
                {legendHint}
              </div>

              <Link
                href="/yachts"
                className="btn btn-primary"
                style={{ width: '100%', textAlign: 'center', display: 'block', marginTop: 12 }}
              >
                {browseAll}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
