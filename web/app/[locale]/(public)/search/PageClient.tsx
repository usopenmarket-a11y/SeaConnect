'use client'

/**
 * SearchPageClient — interactive search and filter UI.
 *
 * Converted from Design/system-pages.jsx SearchPage() exactly:
 * - Sidebar with filter chips (boat type, region, amenities)
 * - Price range display
 * - Date range inputs
 * - Capacity chips
 * - Sort selector
 * - Results grid (reuses BoatCard layout as inline cards matching design)
 * - Empty state with anchor icon
 *
 * Receives server-fetched initialResults and initialQuery as props.
 * Client-side filtering applies on top of those results.
 * The search input updates the URL via router.push for shareability.
 *
 * ADR-014: logical CSS properties.
 * ADR-015: labels passed as props (resolved server-side via getTranslations).
 */

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { BoatCardData } from '@/components/boats/BoatCard'

// ── Filter constants (Arabic, matching design) ────────────────────────────────

const BOAT_TYPES = ['قارب صيد', 'يخت فاخر', 'كاتاماران', 'زورق سرعة', 'قارب شراعي', 'قارب غطس']
const REGIONS    = ['الغردقة', 'شرم الشيخ', 'دهب', 'الإسكندرية', 'الأقصر', 'مرسى مطروح']
const AMENITIES  = ['صيد سمك', 'غطس', 'شنطة بحرية', 'طاهٍ على متن', 'مكيف هواء', 'ربان خبير']
const CAPACITIES = ['2–4', '5–8', '9–12', '13+']

type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'rating'

// ── Props ─────────────────────────────────────────────────────────────────────

interface SearchPageClientProps {
  initialQuery: string
  initialResults: BoatCardData[]
  locale: string
  // Labels resolved server-side (avoid useTranslations on client for SSR strings)
  noResultsLabel: string
  noResultsSubLabel: string
  resultsMetaLabel: string
  filtersLabel: string
  activeLabel: string
  searchPlaceholder: string
  sortRecommended: string
  sortPriceAsc: string
  sortPriceDesc: string
  sortRating: string
  applyFiltersLabel: string
  clearAllLabel: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SearchPageClient({
  initialQuery,
  initialResults,
  locale,
  noResultsLabel,
  noResultsSubLabel,
  resultsMetaLabel,
  filtersLabel,
  activeLabel,
  searchPlaceholder,
  sortRecommended,
  sortPriceAsc,
  sortPriceDesc,
  sortRating,
  applyFiltersLabel,
  clearAllLabel,
}: SearchPageClientProps): React.ReactElement {
  const router = useRouter()

  const [query, setQuery]                   = React.useState(initialQuery)
  const [activeTypes, setActiveTypes]       = React.useState<string[]>([])
  const [activeRegions, setActiveRegions]   = React.useState<string[]>([])
  const [activeAmenities, setActiveAmenities] = React.useState<string[]>([])
  const [sort, setSort]                     = React.useState<SortKey>('recommended')

  // Debounce the URL update to avoid hammering the router on every keystroke
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleQueryChange(value: string): void {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.push(`/${locale}/search?q=${encodeURIComponent(value)}`, {})
    }, 400)
  }

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Toggle helpers
  function toggle(
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    val: string,
  ): void {
    setArr((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
    )
  }

  // Active tag chips (combined)
  const activeTags: { label: string; clear: () => void }[] = [
    ...activeTypes.map((t) => ({
      label: t,
      clear: () => toggle(activeTypes, setActiveTypes, t),
    })),
    ...activeRegions.map((r) => ({
      label: r,
      clear: () => toggle(activeRegions, setActiveRegions, r),
    })),
    ...activeAmenities.map((a) => ({
      label: a,
      clear: () => toggle(activeAmenities, setActiveAmenities, a),
    })),
  ]

  // Client-side filtering on top of server results
  const filtered = initialResults.filter((b) => {
    const matchQ =
      !query.trim() ||
      b.name.includes(query) ||
      (b.nameEn ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (b.region ?? '').includes(query) ||
      (b.regionEn ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (b.type ?? '').includes(query)
    const matchR =
      activeRegions.length === 0 ||
      activeRegions.some(
        (r) => (b.region ?? '').includes(r) || (b.regionEn ?? '').includes(r),
      )
    return matchQ && matchR
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price-asc')  return (a.price ?? 0) - (b.price ?? 0)
    if (sort === 'price-desc') return (b.price ?? 0) - (a.price ?? 0)
    if (sort === 'rating')     return (b.rating ?? 0) - (a.rating ?? 0)
    return 0
  })

  function clearAll(): void {
    setActiveTypes([])
    setActiveRegions([])
    setActiveAmenities([])
  }

  const filterGroups = [
    { labelAr: 'نوع القارب · BOAT TYPE', items: BOAT_TYPES,   arr: activeTypes,     setArr: setActiveTypes     },
    { labelAr: 'المنطقة · REGION',        items: REGIONS,      arr: activeRegions,   setArr: setActiveRegions   },
    { labelAr: 'الميزات · AMENITIES',     items: AMENITIES,    arr: activeAmenities, setArr: setActiveAmenities },
  ]

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

          {/* Active tags */}
          {activeTags.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div className="filter-group-label">{activeLabel} · ACTIVE</div>
              <div className="search-active-tags">
                {activeTags.map((tag, i) => (
                  <div key={i} className="search-tag">
                    {tag.label}
                    <span
                      className="search-tag-x"
                      onClick={tag.clear}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') tag.clear() }}
                      aria-label={`إزالة ${tag.label}`}
                    >
                      ×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter chip groups */}
          {filterGroups.map(({ labelAr, items, arr, setArr }) => (
            <div className="filter-group" key={labelAr}>
              <div className="filter-group-label">{labelAr}</div>
              <div className="filter-chips">
                {items.map((item) => (
                  <button
                    key={item}
                    className={`filter-chip${arr.includes(item) ? ' active' : ''}`}
                    onClick={() => toggle(arr, setArr, item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Price range (static display, matching design) */}
          <div className="filter-group">
            <div className="filter-group-label">نطاق السعر · PRICE / DAY</div>
            <div className="range-slider-row">
              <span className="range-label">500</span>
              <div className="range-track">
                <div className="range-fill" />
                <div className="range-handle" style={{ insetInlineStart: '20%' }} />
                <div className="range-handle" style={{ insetInlineStart: '85%' }} />
              </div>
              <span className="range-label">25k</span>
            </div>
            <div
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 10,
                color: 'var(--muted-2)',
                marginTop: 6,
                direction: 'ltr',
                textAlign: 'center',
              }}
            >
              1,000 — 20,000 EGP
            </div>
          </div>

          {/* Date availability */}
          <div className="filter-group">
            <div className="filter-group-label">تاريخ الإتاحة · DATE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['من · FROM', 'إلى · TO'].map((p) => (
                <div
                  key={p}
                  style={{
                    padding: '9px 12px',
                    border: '1px solid var(--rule-strong)',
                    borderRadius: 2,
                    fontSize: 12,
                    color: 'var(--muted-2)',
                    background: 'oklch(1 0 0 / 0.6)',
                    textAlign: 'center',
                  }}
                >
                  {p}
                </div>
              ))}
            </div>
          </div>

          {/* Capacity chips */}
          <div className="filter-group">
            <div className="filter-group-label">عدد الركاب · CAPACITY</div>
            <div className="filter-chips">
              {CAPACITIES.map((c) => (
                <button
                  key={c}
                  className="filter-chip"
                  style={{ fontFamily: 'var(--ff-mono)', direction: 'ltr' }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Apply / Clear */}
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-primary" style={{ width: '100%' }}>
              {applyFiltersLabel}
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={clearAll}
            >
              {clearAllLabel}
            </button>
          </div>
        </aside>

        {/* ── Main results ── */}
        <main className="search-main">
          {/* Search bar + sort */}
          <div className="search-bar-row">
            <div className="search-input-wrap">
              <span className="search-input-icon" aria-hidden="true">🔍</span>
              <input
                className="search-input"
                type="search"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                dir="auto"
              />
            </div>
            <select
              className="search-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="ترتيب النتائج"
            >
              <option value="recommended">{sortRecommended}</option>
              <option value="price-asc">{sortPriceAsc}</option>
              <option value="price-desc">{sortPriceDesc}</option>
              <option value="rating">{sortRating}</option>
            </select>
          </div>

          {/* Results meta */}
          <div className="search-results-meta" aria-live="polite">
            {sorted.length} {resultsMetaLabel}
            {query ? ` — "${query.toUpperCase()}"` : ''}
          </div>

          {/* Results grid */}
          {sorted.length > 0 ? (
            <div className="search-results-grid">
              {sorted.map((b) => (
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
                      backgroundImage: b.img ? `url(${b.img})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      background: b.img ? undefined : 'var(--sand-2)',
                      position: 'relative',
                    }}
                  >
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
                        ★ {b.rating.toFixed(1)}
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
                          {(b.price ?? 0).toLocaleString('en')}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--ff-mono)',
                            fontSize: 10,
                            color: 'var(--muted)',
                            marginInlineEnd: 4,
                          }}
                        >
                          {' '}{b.currency ?? 'EGP'} / يوم
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
                          👥 {b.pax} PAX
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="search-no-results">
              <div style={{ fontSize: 48, marginBottom: 16 }} aria-hidden="true">⚓</div>
              <div
                style={{
                  fontFamily: 'var(--ff-display)',
                  fontSize: 24,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {noResultsLabel}
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                {noResultsSubLabel}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
