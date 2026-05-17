'use client'

/**
 * SearchPageClient — interactive search, tab, region, and sort UI.
 *
 * Converted from Design/system-pages.jsx SearchPage() exactly.
 * Fully SWR-driven so tabs and region chips trigger live API calls.
 *
 * Tabs:
 *   - Yachts: GET /api/v1/yachts/?search={q}&ordering={o}&departure_port_name={r}
 *   - Gear:   GET /api/v1/marketplace/products/?search={q}&ordering={o}
 *
 * ADR-013: cursor pagination — we display first page results only.
 * ADR-014: logical CSS properties.
 * ADR-015: all labels passed as props (resolved server-side).
 */

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import type { BoatCardData } from '@/components/boats/BoatCard'

// ── Region constants (Yachts tab only) ───────────────────────────────────────

const REGIONS: { ar: string; en: string; param: string }[] = [
  { ar: 'الغردقة',    en: 'Hurghada',   param: 'Hurghada'   },
  { ar: 'الإسكندرية', en: 'Alexandria', param: 'Alexandria' },
  { ar: 'شرم الشيخ', en: "Sharm",      param: 'Sharm'      },
  { ar: 'الأقصر',    en: 'Luxor',      param: 'Luxor'      },
  { ar: 'دهب',       en: 'Dahab',      param: 'Dahab'      },
]

type TabKey  = 'yachts' | 'gear'
type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'newest'

// ── API types ─────────────────────────────────────────────────────────────────

interface ApiYacht {
  id: string
  name: string
  name_ar: string
  yacht_type?: string
  capacity?: number
  price_per_day?: string
  currency?: string
  primary_image_url?: string | null
  departure_port?: { id: string; name_ar: string; name_en: string } | null
  region?: string
  rating?: number
}

interface ApiProduct {
  id: string
  name: string
  name_ar?: string
  category?: string
  price: string
  currency?: string
  primary_image_url?: string | null
  vendor_name?: string
  vendor_name_ar?: string
  average_rating?: number | null
  stock_quantity?: number
}

interface PaginatedResponse<T> {
  results: T[]
  next_cursor: string | null
  has_more: boolean
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SearchPageClientProps {
  initialQuery: string
  locale: string
  // Labels resolved server-side via getTranslations
  tabYachtsLabel: string
  tabGearLabel: string
  noResultsLabel: string
  noResultsSubLabel: string
  resultsCountLabel: string    // "{count} نتيجة لـ"
  resultsForLabel: string      // preposition / conjunction (unused in template)
  filtersLabel: string
  activeLabel: string
  searchPlaceholder: string
  sortRelevanceLabel: string
  sortPriceAscLabel: string
  sortPriceDescLabel: string
  sortNewestLabel: string
  allRegionsLabel: string
  regionFacetLabel: string
  gearPriceLabel: string
  gearVendorLabel: string
  applyFiltersLabel: string
  clearAllLabel: string
}

// ── SWR fetcher ───────────────────────────────────────────────────────────────

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010') + '/api/v1'

async function swrFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function buildYachtUrl(q: string, sort: SortKey, region: string | null): string {
  const params = new URLSearchParams()
  if (q.trim()) params.set('search', q.trim())
  if (region)   params.set('departure_port_name', region)
  const ordering =
    sort === 'price-asc'  ? 'price_per_day'
    : sort === 'price-desc' ? '-price_per_day'
    : sort === 'newest'     ? '-created_at'
    : ''  // relevance — let backend decide
  if (ordering) params.set('ordering', ordering)
  return `${API_BASE}/yachts/?${params.toString()}`
}

function buildGearUrl(q: string, sort: SortKey): string {
  const params = new URLSearchParams()
  if (q.trim()) params.set('search', q.trim())
  const ordering =
    sort === 'price-asc'  ? 'price'
    : sort === 'price-desc' ? '-price'
    : sort === 'newest'     ? '-created_at'
    : ''
  if (ordering) params.set('ordering', ordering)
  return `${API_BASE}/marketplace/products/?${params.toString()}`
}

// ── Yacht card renderer ───────────────────────────────────────────────────────

function yachtToCard(y: ApiYacht, locale: string): BoatCardData {
  return {
    id: y.id,
    name: locale === 'ar' ? (y.name_ar || y.name) : y.name,
    nameEn: y.name,
    type: y.yacht_type ?? '',
    typeEn: y.yacht_type ?? '',
    region: y.departure_port?.name_ar ?? y.region ?? '',
    regionEn: y.departure_port?.name_en ?? y.region ?? '',
    pax: y.capacity ?? 0,
    price: parseFloat(y.price_per_day ?? '0'),
    currency: y.currency ?? 'EGP',
    rating: y.rating ?? 0,
    img: y.primary_image_url ?? '',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SearchPageClient({
  initialQuery,
  locale,
  tabYachtsLabel,
  tabGearLabel,
  noResultsLabel,
  noResultsSubLabel,
  resultsCountLabel,
  filtersLabel,
  activeLabel,
  searchPlaceholder,
  sortRelevanceLabel,
  sortPriceAscLabel,
  sortPriceDescLabel,
  sortNewestLabel,
  allRegionsLabel,
  regionFacetLabel,
  gearPriceLabel,
  gearVendorLabel,
  applyFiltersLabel,
  clearAllLabel,
}: SearchPageClientProps): React.ReactElement {
  const router = useRouter()

  const [query,       setQuery]       = React.useState(initialQuery)
  const [tab,         setTab]         = React.useState<TabKey>('yachts')
  const [activeRegion, setActiveRegion] = React.useState<string | null>(null)
  const [sort,        setSort]        = React.useState<SortKey>('relevance')

  // Debounce URL sync (for shareability)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleQueryChange(value: string): void {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams({ q: value })
      router.push(`/${locale}/search?${params.toString()}`)
    }, 450)
  }

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // SWR keys — null when query is empty prevents initial empty fetch
  const yachtUrl = tab === 'yachts' ? buildYachtUrl(query, sort, activeRegion) : null
  const gearUrl  = tab === 'gear'   ? buildGearUrl(query, sort) : null

  const { data: yachtData, isLoading: yachtsLoading } =
    useSWR<PaginatedResponse<ApiYacht>>(yachtUrl, swrFetcher, { keepPreviousData: true })

  const { data: gearData, isLoading: gearLoading } =
    useSWR<PaginatedResponse<ApiProduct>>(gearUrl, swrFetcher, { keepPreviousData: true })

  const isLoading = tab === 'yachts' ? yachtsLoading : gearLoading

  const yachtCards: BoatCardData[] =
    (yachtData?.results ?? []).map((y) => yachtToCard(y, locale))

  const gearProducts: ApiProduct[] = gearData?.results ?? []

  const resultCount = tab === 'yachts' ? yachtCards.length : gearProducts.length

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh' }} data-screen-label="search">

      {/* Page heading */}
      <div
        style={{
          padding: '28px 48px 0',
          display: 'flex',
          alignItems: 'baseline',
          gap: 16,
          borderBottom: '2px solid var(--ink)',
          marginBottom: 0,
        }}
      >
        <h1
          className="display"
          style={{ fontFamily: 'var(--ff-display)', fontSize: 36, fontWeight: 700 }}
        >
          {filtersLabel}
        </h1>
        <span
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'var(--muted)',
          }}
        >
          · SEARCH &amp; FILTERS
        </span>
      </div>

      <div className="search-layout">

        {/* ── Sidebar ── */}
        <aside className="search-sidebar">
          <div className="search-sidebar-title">
            {filtersLabel}
            <span>FILTERS</span>
          </div>

          {/* Tab switcher — pill style */}
          <div style={{ marginBottom: 28 }}>
            <div
              className="filter-group-label"
              style={{ marginBottom: 10 }}
            >
              {activeLabel} · CATEGORY
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(
                [
                  { key: 'yachts', label: tabYachtsLabel },
                  { key: 'gear',   label: tabGearLabel   },
                ] as { key: TabKey; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  className={`filter-chip${tab === key ? ' active' : ''}`}
                  onClick={() => setTab(key)}
                  aria-pressed={tab === key}
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Region facet — Yachts tab only */}
          {tab === 'yachts' && (
            <div className="filter-group">
              <div className="filter-group-label">
                {regionFacetLabel} · REGION
              </div>
              <div className="filter-chips">
                {/* All regions chip */}
                <button
                  className={`filter-chip${activeRegion === null ? ' active' : ''}`}
                  onClick={() => setActiveRegion(null)}
                  aria-pressed={activeRegion === null}
                >
                  {allRegionsLabel}
                </button>
                {REGIONS.map(({ ar, en, param }) => (
                  <button
                    key={param}
                    className={`filter-chip${activeRegion === param ? ' active' : ''}`}
                    onClick={() =>
                      setActiveRegion((prev) => (prev === param ? null : param))
                    }
                    aria-pressed={activeRegion === param}
                  >
                    {locale === 'ar' ? ar : en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sort */}
          <div className="filter-group">
            <div className="filter-group-label">الترتيب · SORT</div>
            <div className="filter-chips" style={{ flexDirection: 'column', gap: 6 }}>
              {(
                [
                  { key: 'relevance',  label: sortRelevanceLabel  },
                  { key: 'price-asc',  label: sortPriceAscLabel   },
                  { key: 'price-desc', label: sortPriceDescLabel  },
                  { key: 'newest',     label: sortNewestLabel      },
                ] as { key: SortKey; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  className={`filter-chip${sort === key ? ' active' : ''}`}
                  onClick={() => setSort(key)}
                  aria-pressed={sort === key}
                  style={{ textAlign: 'start' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear all */}
          <div style={{ marginTop: 28 }}>
            <button
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => {
                setActiveRegion(null)
                setSort('relevance')
              }}
            >
              {clearAllLabel}
            </button>
          </div>
        </aside>

        {/* ── Main results ── */}
        <main className="search-main">

          {/* Search bar */}
          <div className="search-bar-row">
            <div className="search-input-wrap" style={{ flex: 1 }}>
              <span className="search-input-icon" aria-hidden="true">&#128269;</span>
              <input
                className="search-input"
                type="search"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                dir="auto"
                aria-label={searchPlaceholder}
              />
            </div>
          </div>

          {/* Results count */}
          <div className="search-results-meta" aria-live="polite">
            {isLoading ? (
              <span style={{ color: 'var(--muted)' }}>…</span>
            ) : (
              <>
                <span style={{ fontFamily: 'var(--ff-mono)' }}>
                  {locale === 'ar'
                    ? resultCount.toLocaleString('ar-EG')
                    : resultCount.toLocaleString('en')}
                </span>
                {' '}{resultsCountLabel}
                {query.trim() ? (
                  <>
                    {' '}
                    <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--sea)' }}>
                      &ldquo;{query}&rdquo;
                    </span>
                  </>
                ) : null}
              </>
            )}
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="search-results-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--sand)',
                    borderRadius: 2,
                    height: 280,
                    opacity: 0.5,
                    animation: 'pulse 1.4s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          )}

          {/* ── Yachts results ── */}
          {!isLoading && tab === 'yachts' && (
            yachtCards.length > 0 ? (
              <div className="search-results-grid">
                {yachtCards.map((b) => (
                  <Link
                    key={b.id}
                    href={`/${locale}/yachts/${b.id}`}
                    style={{
                      background: 'oklch(1 0 0 / 0.72)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid var(--rule)',
                      borderRadius: 2,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textDecoration: 'none',
                      color: 'var(--ink)',
                      display: 'block',
                      transition: 'border-color 0.18s, transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget
                      el.style.borderColor = 'var(--rule-strong)'
                      el.style.transform = 'translateY(-2px)'
                      el.style.boxShadow = '0 6px 24px oklch(0.20 0.045 235 / 0.10)'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget
                      el.style.borderColor = 'var(--rule)'
                      el.style.transform = ''
                      el.style.boxShadow = ''
                    }}
                  >
                    {/* Card image */}
                    <div
                      style={{
                        aspectRatio: '16/9',
                        position: 'relative',
                        background: 'var(--sand-2)',
                      }}
                    >
                      {b.img ? (
                        <Image
                          src={b.img}
                          alt={b.nameEn ?? b.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : null}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'linear-gradient(to top, oklch(0.14 0.04 240 / 0.55) 0%, transparent 55%)',
                        }}
                      />
                      {b.rating ? (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 10,
                            insetInlineEnd: 12,
                            fontFamily: 'var(--ff-mono)',
                            fontSize: 10,
                            color: 'var(--sand)',
                            letterSpacing: '0.1em',
                            direction: 'ltr',
                          }}
                        >
                          &#9733; {b.rating.toFixed(1)}
                        </div>
                      ) : null}
                      {b.typeEn && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 10,
                            insetInlineStart: 10,
                            fontFamily: 'var(--ff-mono)',
                            fontSize: 9,
                            letterSpacing: '0.1em',
                            background: 'var(--clay)',
                            color: 'var(--foam)',
                            padding: '3px 8px',
                            borderRadius: 1,
                          }}
                        >
                          {b.typeEn}
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '14px 16px' }}>
                      <div
                        style={{
                          fontFamily: 'var(--ff-display)',
                          fontSize: 17,
                          fontWeight: 700,
                          marginBottom: 3,
                        }}
                      >
                        {b.name}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--ff-mono)',
                          fontSize: 10,
                          color: 'var(--muted)',
                          letterSpacing: '0.08em',
                          marginBottom: 10,
                          direction: 'ltr',
                        }}
                      >
                        {(b.regionEn ?? b.region ?? '').toUpperCase()}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontFamily: 'var(--ff-display)',
                              fontSize: 22,
                              fontWeight: 700,
                            }}
                          >
                            {locale === 'ar'
                              ? (b.price ?? 0).toLocaleString('ar-EG')
                              : (b.price ?? 0).toLocaleString('en')}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--ff-mono)',
                              fontSize: 10,
                              color: 'var(--muted)',
                              marginInlineStart: 4,
                            }}
                          >
                            {b.currency ?? 'EGP'} / {locale === 'ar' ? 'يوم' : 'day'}
                          </span>
                        </div>
                        {b.pax ? (
                          <div
                            style={{
                              fontFamily: 'var(--ff-mono)',
                              fontSize: 10,
                              color: 'var(--muted-2)',
                              direction: 'ltr',
                            }}
                          >
                            {b.pax} PAX
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState label={noResultsLabel} subLabel={noResultsSubLabel} query={query} />
            )
          )}

          {/* ── Gear results ── */}
          {!isLoading && tab === 'gear' && (
            gearProducts.length > 0 ? (
              <div className="search-results-grid">
                {gearProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/${locale}/marketplace/${p.id}`}
                    style={{
                      background: 'oklch(1 0 0 / 0.72)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid var(--rule)',
                      borderRadius: 2,
                      overflow: 'hidden',
                      textDecoration: 'none',
                      color: 'var(--ink)',
                      display: 'block',
                      transition: 'border-color 0.18s, transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget
                      el.style.borderColor = 'var(--rule-strong)'
                      el.style.transform = 'translateY(-2px)'
                      el.style.boxShadow = '0 6px 24px oklch(0.20 0.045 235 / 0.10)'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget
                      el.style.borderColor = 'var(--rule)'
                      el.style.transform = ''
                      el.style.boxShadow = ''
                    }}
                  >
                    {/* Product image */}
                    <div
                      style={{
                        aspectRatio: '16/9',
                        position: 'relative',
                        background: 'var(--sand-2)',
                      }}
                    >
                      {p.primary_image_url ? (
                        <Image
                          src={p.primary_image_url}
                          alt={locale === 'ar' ? (p.name_ar ?? p.name) : p.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : null}
                      {p.category && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 10,
                            insetInlineStart: 10,
                            fontFamily: 'var(--ff-mono)',
                            fontSize: 9,
                            letterSpacing: '0.1em',
                            background: 'var(--sea)',
                            color: 'var(--foam)',
                            padding: '3px 8px',
                            borderRadius: 1,
                            textTransform: 'uppercase',
                          }}
                        >
                          {p.category}
                        </div>
                      )}
                      {p.average_rating ? (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 10,
                            insetInlineEnd: 12,
                            fontFamily: 'var(--ff-mono)',
                            fontSize: 10,
                            color: 'var(--sand)',
                            letterSpacing: '0.1em',
                            direction: 'ltr',
                          }}
                        >
                          &#9733; {p.average_rating.toFixed(1)}
                        </div>
                      ) : null}
                    </div>

                    {/* Product body */}
                    <div style={{ padding: '14px 16px' }}>
                      <div
                        style={{
                          fontFamily: 'var(--ff-display)',
                          fontSize: 17,
                          fontWeight: 700,
                          marginBottom: 3,
                        }}
                      >
                        {locale === 'ar' ? (p.name_ar ?? p.name) : p.name}
                      </div>
                      {(p.vendor_name_ar || p.vendor_name) && (
                        <div
                          style={{
                            fontFamily: 'var(--ff-mono)',
                            fontSize: 10,
                            color: 'var(--muted)',
                            letterSpacing: '0.08em',
                            marginBottom: 10,
                          }}
                        >
                          {gearVendorLabel}: {locale === 'ar'
                            ? (p.vendor_name_ar ?? p.vendor_name ?? '')
                            : (p.vendor_name ?? '')}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <div>
                          <span
                            style={{
                              fontFamily: 'var(--ff-display)',
                              fontSize: 22,
                              fontWeight: 700,
                            }}
                          >
                            {locale === 'ar'
                              ? parseFloat(p.price).toLocaleString('ar-EG')
                              : parseFloat(p.price).toLocaleString('en')}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--ff-mono)',
                              fontSize: 10,
                              color: 'var(--muted)',
                              marginInlineStart: 4,
                            }}
                          >
                            {p.currency ?? 'EGP'}
                          </span>
                        </div>
                        {p.stock_quantity !== undefined && p.stock_quantity === 0 && (
                          <div
                            style={{
                              fontFamily: 'var(--ff-mono)',
                              fontSize: 10,
                              color: 'var(--clay)',
                            }}
                          >
                            {gearPriceLabel}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState label={noResultsLabel} subLabel={noResultsSubLabel} query={query} />
            )
          )}
        </main>
      </div>
    </div>
  )
}

// ── Empty state sub-component ─────────────────────────────────────────────────

function EmptyState({
  label,
  subLabel,
  query,
}: {
  label: string
  subLabel: string
  query: string
}): React.ReactElement {
  return (
    <div className="search-no-results">
      <div style={{ fontSize: 48, marginBottom: 16 }} aria-hidden="true">&#9875;</div>
      <div
        style={{
          fontFamily: 'var(--ff-display)',
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {label}
        {query.trim() ? (
          <>
            {' '}
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 18, color: 'var(--sea)' }}>
              &ldquo;{query}&rdquo;
            </span>
          </>
        ) : null}
      </div>
      <div style={{ fontSize: 14, color: 'var(--muted)' }}>
        {subLabel}
      </div>
    </div>
  )
}
