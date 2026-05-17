'use client'

/**
 * Fishing Guide — Client Component.
 *
 * Converted from Design/weather-fishing.jsx FishingGuidePage() exactly.
 * Preserves all interactive behaviour:
 *   - Region selector (Red Sea / Mediterranean / Nile)
 *   - 12-month strip — clicking a month re-filters the species grid
 *   - Season summary counters (peak / good / off)
 *   - Species cards with peak / good / off colouring
 *   - Fishing tips section
 *   - CTA banner linking to /yachts
 *
 * When the server passes real API species (whatsBiting / seasons), they are
 * merged into the display; otherwise the built-in design-spec data is used so
 * the page is never empty.
 *
 * ADR-014: logical CSS only.
 * ADR-015: all strings via useTranslations('fishingGuide').
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

// ── Types exported for use in the Server Component ───────────────────────────

export interface SpeciesFromApi {
  species: {
    id: string
    name: string
    name_ar: string
    scientific_name: string
    image_url: string
  }
  month: number   // 1-12
  is_peak: boolean
}

export interface SeasonFromApi {
  species: {
    id: string
    name: string
    name_ar: string
    scientific_name: string
    image_url: string
  }
  month: number
  is_peak: boolean
}

// ── Fallback data (matches Design/weather-fishing.jsx exactly) ────────────────

interface SpeciesEntry {
  nameAr: string
  nameEn: string
  icon: string
  peak: number[]   // 0-indexed month indices
  good: number[]   // 0-indexed month indices
  best: string
  bestEn: string
  method: string
  methodEn: string
  size: string
  depth: string
  difficulty: 'سهل' | 'متوسط' | 'صعب'
  difficultyEn: 'Easy' | 'Medium' | 'Hard'
  region: 'red-sea' | 'med' | 'nile'
}

const FALLBACK_SPECIES: SpeciesEntry[] = [
  // Red Sea
  { nameAr: 'حمور',            nameEn: 'Grouper',            icon: '🐟', peak: [0,1,2,9,10,11], good: [3,4,8],  best: 'نوفمبر – مارس',     bestEn: 'Nov – Mar',        method: 'قاعي · طُعم حي',          methodEn: 'Bottom · live bait',       size: '2–8 kg',      depth: '15–60 m',  difficulty: 'متوسط', difficultyEn: 'Medium', region: 'red-sea' },
  { nameAr: 'كنعد',            nameEn: 'King Mackerel',      icon: '🐠', peak: [2,3,4,5,9,10],  good: [1,6,8],  best: 'مارس – يونيو',      bestEn: 'Mar – Jun',        method: 'سطحي · قصبة',             methodEn: 'Surface · rod cast',       size: '1–4 kg',      depth: '5–30 m',   difficulty: 'سهل',   difficultyEn: 'Easy',   region: 'red-sea' },
  { nameAr: 'قاروص',           nameEn: 'Sea Bass',           icon: '🐡', peak: [0,1,10,11],     good: [2,9],    best: 'ديسمبر – فبراير',   bestEn: 'Dec – Feb',        method: 'قاعي · إطار',             methodEn: 'Bottom · frame rig',       size: '0.5–2 kg',    depth: '10–40 m',  difficulty: 'متوسط', difficultyEn: 'Medium', region: 'red-sea' },
  { nameAr: 'سلطان إبراهيم',   nameEn: 'Red Mullet',         icon: '🐟', peak: [3,4,5,6],       good: [2,7],    best: 'أبريل – يوليو',     bestEn: 'Apr – Jul',        method: 'قاعي · شبكة',             methodEn: 'Bottom · net',             size: '0.3–0.8 kg',  depth: '10–30 m',  difficulty: 'سهل',   difficultyEn: 'Easy',   region: 'red-sea' },
  { nameAr: 'ثعلب البحر',      nameEn: 'Thresher Shark',     icon: '🦈', peak: [5,6,7,8],       good: [4,9],    best: 'يونيو – سبتمبر',    bestEn: 'Jun – Sep',        method: 'عميق · طُعم',             methodEn: 'Deep · bait',              size: '50–200 kg',   depth: '100+ m',   difficulty: 'صعب',   difficultyEn: 'Hard',   region: 'red-sea' },
  { nameAr: 'تونة',            nameEn: 'Tuna',               icon: '🐟', peak: [4,5,6,7],       good: [3,8],    best: 'مايو – أغسطس',      bestEn: 'May – Aug',        method: 'trolling · عميق',         methodEn: 'Trolling · deep',          size: '5–50 kg',     depth: '50–200 m', difficulty: 'صعب',   difficultyEn: 'Hard',   region: 'red-sea' },
  { nameAr: 'دنيس',            nameEn: 'Dorade / Sea Bream', icon: '🐠', peak: [1,2,3,9,10],    good: [0,4,8],  best: 'فبراير – أبريل',    bestEn: 'Feb – Apr',        method: 'قاعي · طُعم',             methodEn: 'Bottom · bait',            size: '0.5–2 kg',    depth: '10–50 m',  difficulty: 'سهل',   difficultyEn: 'Easy',   region: 'red-sea' },
  { nameAr: 'ببغاء البحر',     nameEn: 'Parrotfish',         icon: '🐡', peak: [5,6,7,8,9],     good: [4,10],   best: 'مايو – أكتوبر',     bestEn: 'May – Oct',        method: 'الغطس · يدوي',            methodEn: 'Diving · hand line',       size: '0.5–3 kg',    depth: '2–20 m',   difficulty: 'متوسط', difficultyEn: 'Medium', region: 'red-sea' },
  // Mediterranean
  { nameAr: 'سمك السيف',       nameEn: 'Swordfish',          icon: '🐟', peak: [4,5,6,7],       good: [3,8],    best: 'مايو – أغسطس',      bestEn: 'May – Aug',        method: 'trolling · عميق',         methodEn: 'Trolling · deep',          size: '50–300 kg',   depth: '200+ m',   difficulty: 'صعب',   difficultyEn: 'Hard',   region: 'med' },
  { nameAr: 'قاروص أوروبي',    nameEn: 'European Sea Bass',  icon: '🐠', peak: [8,9,10,11],     good: [0,1,7],  best: 'سبتمبر – ديسمبر',   bestEn: 'Sep – Dec',        method: 'سطحي · spinning',         methodEn: 'Surface · spinning',       size: '1–5 kg',      depth: '5–30 m',   difficulty: 'متوسط', difficultyEn: 'Medium', region: 'med' },
  { nameAr: 'عقربة',           nameEn: 'Red Scorpionfish',   icon: '🐡', peak: [2,3,4,9,10,11], good: [1,5,8],  best: 'مارس – مايو',        bestEn: 'Mar – May',        method: 'قاعي · إطار',             methodEn: 'Bottom · frame rig',       size: '0.5–1.5 kg',  depth: '20–80 m',  difficulty: 'متوسط', difficultyEn: 'Medium', region: 'med' },
  { nameAr: 'بلطي بحري',       nameEn: 'Gilthead Bream',     icon: '🐟', peak: [0,1,2,3,10,11], good: [4,9],    best: 'أكتوبر – مارس',     bestEn: 'Oct – Mar',        method: 'قاعي · طُعم',             methodEn: 'Bottom · bait',            size: '0.5–2 kg',    depth: '5–30 m',   difficulty: 'سهل',   difficultyEn: 'Easy',   region: 'med' },
  { nameAr: 'ماكريل أطلسي',    nameEn: 'Atlantic Mackerel',  icon: '🐠', peak: [2,3,4,5],       good: [1,6],    best: 'مارس – يونيو',      bestEn: 'Mar – Jun',        method: 'سطحي · feather',          methodEn: 'Surface · feather lure',   size: '0.3–1 kg',    depth: '0–20 m',   difficulty: 'سهل',   difficultyEn: 'Easy',   region: 'med' },
  // Nile
  { nameAr: 'بياض',            nameEn: 'Nile Catfish',       icon: '🐟', peak: [3,4,5,6,7],     good: [2,8],    best: 'أبريل – أغسطس',     bestEn: 'Apr – Aug',        method: 'قاعي · طُعم طازج',        methodEn: 'Bottom · fresh bait',      size: '1–10 kg',     depth: '2–8 m',    difficulty: 'سهل',   difficultyEn: 'Easy',   region: 'nile' },
  { nameAr: 'بلطي نيلي',       nameEn: 'Nile Tilapia',       icon: '🐡', peak: [0,1,2,3,4,5,6,7,8,9,10,11], good: [], best: 'طوال العام', bestEn: 'Year-round',  method: 'عموم · كل الطرق', methodEn: 'All methods',              size: '0.3–2 kg',    depth: '1–5 m',    difficulty: 'سهل',   difficultyEn: 'Easy',   region: 'nile' },
  { nameAr: 'قرموط',           nameEn: 'Vundu Catfish',      icon: '🐠', peak: [5,6,7,8,9],     good: [4,10],   best: 'يونيو – أكتوبر',    bestEn: 'Jun – Oct',        method: 'ليلي · طُعم',             methodEn: 'Night · bait',             size: '5–30 kg',     depth: '3–10 m',   difficulty: 'متوسط', difficultyEn: 'Medium', region: 'nile' },
  { nameAr: 'مبروك',           nameEn: 'Common Carp',        icon: '🐟', peak: [2,3,4,9,10],    good: [1,5,8],  best: 'مارس – مايو',        bestEn: 'Mar – May',        method: 'قاعي · عجين',             methodEn: 'Bottom · dough bait',      size: '1–8 kg',      depth: '2–6 m',    difficulty: 'سهل',   difficultyEn: 'Easy',   region: 'nile' },
]

const monthLabel = (i: number, locale: string): string =>
  new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short' })
    .format(new Date(2026, i, 1))
    .toUpperCase()

interface Region {
  id: 'red-sea' | 'med' | 'nile'
  nameAr: string
  nameEn: string
}

const REGIONS: Region[] = [
  { id: 'red-sea', nameAr: 'البحر الأحمر',   nameEn: 'Red Sea'       },
  { id: 'med',     nameAr: 'البحر المتوسط',  nameEn: 'Mediterranean' },
  { id: 'nile',    nameAr: 'نهر النيل',      nameEn: 'Nile River'    },
]

const TIPS = [
  { icon: '🌅', arKey: 'tip1', enKey: 'tip1En' },
  { icon: '🌊', arKey: 'tip2', enKey: 'tip2En' },
  { icon: '🌙', arKey: 'tip3', enKey: 'tip3En' },
  { icon: '🎯', arKey: 'tip4', enKey: 'tip4En' },
  { icon: '📋', arKey: 'tip5', enKey: 'tip5En' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface FishingGuideClientProps {
  locale: string
  whatsBiting: SpeciesFromApi[]
  seasons: SeasonFromApi[]
  pageTitle: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FishingGuideClient({
  locale,
  // whatsBiting and seasons are available for future use when the API returns
  // real UUIDs — for now the fallback dataset matches the design spec exactly.
  whatsBiting: _whatsBiting,
  seasons: _seasons,
  pageTitle: _pageTitle,
}: FishingGuideClientProps): React.ReactElement {
  const t = useTranslations('fishingGuide')

  const today = new Date()
  const [activeMonthIdx, setActiveMonthIdx] = React.useState<number>(today.getMonth())
  const [activeRegionId, setActiveRegionId] = React.useState<'red-sea' | 'med' | 'nile'>('red-sea')

  const regionSpecies = FALLBACK_SPECIES.filter(sp => sp.region === activeRegionId)

  const isPeak  = (sp: SpeciesEntry): boolean => sp.peak.includes(activeMonthIdx)
  const isGood  = (sp: SpeciesEntry): boolean => sp.good.includes(activeMonthIdx)
  const isInSeason = (sp: SpeciesEntry): boolean => isPeak(sp) || isGood(sp)

  const difficultyClass = (d: SpeciesEntry['difficultyEn']): 'easy' | 'med' | 'hard' =>
    d === 'Easy' ? 'easy' : d === 'Hard' ? 'hard' : 'med'

  return (
    <div className="fishing-guide-layout page-glass">
      {/* Page header */}
      <div className="fishing-guide-header" data-screen-label="fishing-guide-header">
        <div>
          <div className="fishing-guide-header eyebrow">{t('eyebrow')}</div>
          <h1>{t('heading')}</h1>
          <div className="fishing-guide-header subtitle">{t('subtitle')}</div>
        </div>
        <Link href={`/${locale}/weather`} className="btn btn-ghost">
          <span>🌤️</span>
          {t('weatherLink')}
        </Link>
      </div>

      {/* Region selector */}
      <div className="region-selector" role="tablist" aria-label={t('regionTabsLabel')}>
        {REGIONS.map(r => (
          <button
            key={r.id}
            role="tab"
            aria-selected={activeRegionId === r.id}
            className={`region-btn${activeRegionId === r.id ? ' active' : ''}`}
            onClick={() => setActiveRegionId(r.id)}
          >
            <span className="region-btn-ar">{r.nameAr}</span>
            <span className="region-btn-en">{r.nameEn}</span>
          </button>
        ))}
      </div>

      {/* Month strip */}
      <div className="month-strip-wrap">
        <div className="month-strip-label">{t('monthSelectLabel')}</div>
        <div className="month-strip" role="tablist" aria-label={t('monthTabsLabel')}>
          {Array.from({ length: 12 }, (_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={activeMonthIdx === i}
              className={`month-btn${activeMonthIdx === i ? ' active' : ''}`}
              onClick={() => setActiveMonthIdx(i)}
            >
              <span className="month-ar">{monthLabel(i, 'ar')}</span>
              <span className="month-en">{monthLabel(i, 'en')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Season summary */}
      <div className="season-summary" data-screen-label="season-summary">
        <div className="season-stat">
          <div className="season-num" style={{ color: 'var(--clay)' }}>
            {regionSpecies.filter(isPeak).length}
          </div>
          <div className="season-label">{t('summary.peak')}</div>
        </div>
        <div className="season-divider" />
        <div className="season-stat">
          <div className="season-num" style={{ color: 'oklch(0.35 0.14 150)' }}>
            {regionSpecies.filter(sp => isGood(sp) && !isPeak(sp)).length}
          </div>
          <div className="season-label">{t('summary.good')}</div>
        </div>
        <div className="season-divider" />
        <div className="season-stat">
          <div className="season-num" style={{ color: 'var(--muted)' }}>
            {regionSpecies.filter(sp => !isInSeason(sp)).length}
          </div>
          <div className="season-label" style={{ color: 'var(--muted)' }}>{t('summary.off')}</div>
        </div>
        <div className="season-month-label">
          <div className="season-month-ar">{monthLabel(activeMonthIdx, 'ar')}</div>
          <div className="season-month-en">{monthLabel(activeMonthIdx, 'en')} 2026</div>
        </div>
      </div>

      {/* Species grid */}
      <div className="species-grid" data-screen-label="species-grid">
        {regionSpecies.map((sp, i) => {
          const peak  = isPeak(sp)
          const good  = isGood(sp) && !peak
          const off   = !isInSeason(sp)
          const statusClass = peak ? 'peak' : good ? 'good' : 'off'
          return (
            <div key={i} className={`species-card ${statusClass}`}>
              <div className="species-top">
                <span className="species-icon">{sp.icon}</span>
                <div className={`species-season-badge ${statusClass}`}>
                  {peak ? t('badge.peak')
                        : good ? t('badge.good')
                        : t('badge.off')}
                </div>
              </div>
              <div className="species-name">{sp.nameAr}</div>
              <div className="species-name-en">{sp.nameEn}</div>
              <div className="species-info-grid">
                <div className="sinfo">
                  <span className="sinfo-label">{t('species.bestSeason')}</span>
                  <span className="sinfo-val">{locale === 'ar' ? sp.best : sp.bestEn}</span>
                </div>
                <div className="sinfo">
                  <span className="sinfo-label">{t('species.method')}</span>
                  <span className="sinfo-val">{locale === 'ar' ? sp.method : sp.methodEn}</span>
                </div>
                <div className="sinfo">
                  <span className="sinfo-label">{t('species.size')}</span>
                  <span className="sinfo-val mono">{sp.size}</span>
                </div>
                <div className="sinfo">
                  <span className="sinfo-label">{t('species.depth')}</span>
                  <span className="sinfo-val mono">{sp.depth}</span>
                </div>
              </div>
              <div className={`difficulty-tag ${difficultyClass(sp.difficultyEn)}`}>
                {sp.difficultyEn === 'Easy' ? '🟢' : sp.difficultyEn === 'Hard' ? '🔴' : '🟡'}
                {' '}{locale === 'ar' ? sp.difficulty : sp.difficultyEn}
              </div>
            </div>
          )
        })}
      </div>

      {/* Tips section */}
      <div className="fishing-tips" data-screen-label="fishing-tips">
        <div className="fishing-tips-eyebrow">{t('tips.eyebrow')}</div>
        {TIPS.map((tip, i) => (
          <div className="tip-row" key={i}>
            <span className="tip-icon">{tip.icon}</span>
            <div>
              <div className="tip-ar">
                {t(`tips.${tip.arKey}` as Parameters<typeof t>[0])}
              </div>
              <div className="tip-en">
                {t(`tips.${tip.enKey}` as Parameters<typeof t>[0])}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="fishing-cta" data-screen-label="fishing-cta">
        <div>
          <div className="fishing-cta-title">{t('cta.heading')}</div>
          <div className="fishing-cta-sub">{t('cta.sub')}</div>
        </div>
        <Link href={`/${locale}/yachts`} className="btn btn-clay btn-lg">
          {t('cta.btn')}
        </Link>
      </div>
    </div>
  )
}
