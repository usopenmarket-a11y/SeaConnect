/**
 * Home page — Server Component (SSR for SEO per ADR-003).
 *
 * Visual design matches Design/home.jsx from the prototype exactly.
 * Featured boats are fetched server-side from the API at request time.
 * All other sections (hero, marquee, gear teaser, competitions, closing CTA)
 * use static/mock data matching Design/data.jsx.
 *
 * ADR-014: logical CSS properties throughout globals.css.
 * ADR-015: i18n keys added to ar.json + en.json for all user-visible strings.
 * ADR-003: Server Component — no 'use client' directive.
 */

import * as React from 'react'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BoatCard, type BoatCardData } from '@/components/boats/BoatCard'

interface HomePageProps {
  params: { locale: string }
}

// ── Static mock data (matches Design/data.jsx) ───────────────────────────────

const REGIONS = [
  { ar: 'كل السواحل', en: 'All coasts', count: 183 },
  { ar: 'الغردقة', en: 'Hurghada', count: 68 },
  { ar: 'الإسكندرية', en: 'Alexandria', count: 42 },
  { ar: 'شرم الشيخ', en: 'Sharm El Sheikh', count: 31 },
  { ar: 'دهب', en: 'Dahab', count: 14 },
  { ar: 'بورسعيد', en: 'Port Said', count: 12 },
  { ar: 'الأقصر — النيل', en: 'Luxor — Nile', count: 9 },
  { ar: 'أسوان — النيل', en: 'Aswan — Nile', count: 7 },
] as const

const MARQUEE_ITEMS = [
  ['183', 'قارب معتمد · VESSELS'],
  ['12', 'منطقة بحرية · REGIONS'],
  ['4.92', 'متوسط التقييم · RATING'],
  ['24H', 'حماية الضمان · ESCROW'],
  ['100K', 'EGP تأمين لكل مسافر'],
  ['12', 'بطولات هذا الموسم · TOURNAMENTS'],
  ['0%', 'عمولة · أول ٣ شهور'],
  ['8,400+', 'ساعة إبحار · LOGGED'],
] as const

const GEAR = [
  { brand: 'SHIMANO', title: 'سنارة ستيلا 8000', price: 12400, img: 'https://images.unsplash.com/photo-1545056453-f0359c3df6db?auto=format&fit=crop&w=600&q=80' },
  { brand: 'DAIWA', title: 'بكرة سالتيجا 14000', price: 8900, img: 'https://images.unsplash.com/photo-1559285988-b11d3ab6ccc0?auto=format&fit=crop&w=600&q=80' },
  { brand: 'PENN', title: 'طقم صنارة كاملة', price: 3200, img: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=600&q=80' },
  { brand: 'RAPALA', title: 'طعوم صناعية × 12', price: 780, img: 'https://images.unsplash.com/photo-1513039464697-c75e46a88020?auto=format&fit=crop&w=600&q=80' },
  { brand: 'GARMIN', title: 'جهاز كشف أسماك STRIKER', price: 6400, img: 'https://images.unsplash.com/photo-1568205612837-017257d2310a?auto=format&fit=crop&w=600&q=80' },
  { brand: 'PLANO', title: 'صندوق معدات مزدوج', price: 540, img: 'https://images.unsplash.com/photo-1564419320408-49c30c47a2e7?auto=format&fit=crop&w=600&q=80' },
  { brand: 'COLUMBIA', title: 'قميص صيد طويل الكم', price: 890, img: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=600&q=80' },
  { brand: 'MUSTAD', title: 'صناصيل بحرية × 50', price: 120, img: 'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?auto=format&fit=crop&w=600&q=80' },
] as const

const COMPETITIONS = [
  { d: 12, m: 'MAY', title: 'بطولة البحر الأحمر للصيد الكبير', sub: 'SAFAGA MARINA · 14 HRS · 3 ROUNDS', participants: 84, prize: '120K', fee: 500 },
  { d: 26, m: 'MAY', title: 'كأس الاسكندرية السنوي', sub: 'ABU QIR · 8 HRS · DEEP SEA', participants: 56, prize: '60K', fee: 300 },
  { d: 8, m: 'JUN', title: 'بطولة شرم للتونة', sub: 'SHARM MARINA · 12 HRS · PELAGIC', participants: 42, prize: '90K', fee: 450 },
  { d: 19, m: 'JUN', title: 'مهرجان النيل للصيد الرياضي', sub: 'LUXOR · 6 HRS · CATCH & RELEASE', participants: 120, prize: '40K', fee: 150 },
] as const

// Fallback boats when API is unavailable (matches Design/data.jsx)
const FALLBACK_BOATS: BoatCardData[] = [
  {
    id: 'b1', name: 'البحر الأحمر', nameEn: 'Al Bahr Al Ahmar',
    type: 'يخت صيد فاخر', typeEn: 'Premium Fishing Yacht',
    capt: 'الربان محمود سيف', captEn: 'Capt. Mahmoud Seif',
    region: 'الغردقة', regionEn: 'Hurghada', coords: '27.2579°N · 33.8116°E',
    length: 42, pax: 8, year: 2021, price: 3800, rating: 4.92, reviews: 148,
    img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80',
    tagEn: 'VERIFIED',
  },
  {
    id: 'b2', name: 'نور الشاطئ', nameEn: 'Nour Al Shati',
    type: 'قارب صيد متوسط', typeEn: 'Mid-size Fishing',
    capt: 'الربان إبراهيم الغرباوي', captEn: 'Capt. Ibrahim Gharbawi',
    region: 'الإسكندرية', regionEn: 'Alexandria', coords: '31.2001°N · 29.9187°E',
    length: 28, pax: 6, year: 2019, price: 1800, rating: 4.81, reviews: 92,
    img: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?auto=format&fit=crop&w=1400&q=80',
    tagEn: 'TOP BOOKED',
  },
  {
    id: 'b3', name: 'ريح البحر', nameEn: 'Reeh Al Bahr',
    type: 'يخت عائلي', typeEn: 'Family Yacht',
    capt: 'الربان كريم فتحي', captEn: 'Capt. Kareem Fathy',
    region: 'شرم الشيخ', regionEn: 'Sharm El Sheikh', coords: '27.9158°N · 34.3299°E',
    length: 38, pax: 12, year: 2022, price: 4400, rating: 4.95, reviews: 211,
    img: 'https://images.unsplash.com/photo-1566024287286-457247b70310?auto=format&fit=crop&w=1400&q=80',
    tagEn: 'NEW',
  },
  {
    id: 'b4', name: 'فلوكة النيل', nameEn: 'Felucca Al Nil',
    type: 'فلوكة تقليدية', typeEn: 'Traditional Felucca',
    capt: 'الربان أحمد العربي', captEn: 'Capt. Ahmed Al Araby',
    region: 'الأقصر', regionEn: 'Luxor', coords: '25.6872°N · 32.6396°E',
    length: 32, pax: 10, year: 2018, price: 950, rating: 4.88, reviews: 304,
    img: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1400&q=80',
    tagEn: 'NILE',
  },
  {
    id: 'b5', name: 'أطلانتس', nameEn: 'Atlantis',
    type: 'يخت فاخر', typeEn: 'Luxury Charter',
    capt: 'الربان يوسف منصور', captEn: 'Capt. Youssef Mansour',
    region: 'الغردقة', regionEn: 'Hurghada', coords: '27.2579°N · 33.8116°E',
    length: 56, pax: 16, year: 2023, price: 8900, rating: 4.97, reviews: 76,
    img: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=1400&q=80',
    tagEn: 'FEATURED',
  },
  {
    id: 'b6', name: 'صياد الصبح', nameEn: 'Sayyad Al Sobh',
    type: 'قارب صيد صغير', typeEn: 'Small Fishing Boat',
    capt: 'الربان سامي حسن', captEn: 'Capt. Samy Hassan',
    region: 'دهب', regionEn: 'Dahab', coords: '28.5091°N · 34.5136°E',
    length: 22, pax: 4, year: 2020, price: 1200, rating: 4.79, reviews: 56,
    img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1400&q=80',
    tagEn: 'VERIFIED',
  },
]

// ── API fetch ────────────────────────────────────────────────────────────────

interface ApiYacht {
  id: string
  name: string
  name_ar: string
  yacht_type?: string
  capacity?: number
  price_per_day?: string
  currency?: string
  primary_image_url?: string | null
}

async function fetchFeaturedBoats(locale: string): Promise<BoatCardData[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  try {
    const res = await fetch(`${apiUrl}/api/v1/yachts/?ordering=-created_at`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return FALLBACK_BOATS
    const data = (await res.json()) as { results: ApiYacht[] }
    const results = data.results ?? []
    if (results.length === 0) return FALLBACK_BOATS

    return results.slice(0, 6).map((y) => ({
      id: y.id,
      name: locale === 'ar' ? (y.name_ar || y.name) : y.name,
      nameEn: y.name,
      typeEn: y.yacht_type ?? '',
      pax: y.capacity,
      price_per_day: y.price_per_day,
      currency: y.currency ?? 'EGP',
      primary_image_url: y.primary_image_url,
    }))
  } catch {
    return FALLBACK_BOATS
  }
}

// ── Duplicate marquee items for seamless loop ────────────────────────────────

const ALL_MARQUEE = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

// ── Page component ───────────────────────────────────────────────────────────

export default async function HomePage({
  params: { locale },
}: HomePageProps): Promise<React.ReactElement> {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'home' })
  const boats = await fetchFeaturedBoats(locale)

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="hero" data-screen-label="hero">
        <div
          className="hero-img-parallax"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80)',
          }}
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-kicker">
            <span className="dot" />
            <span>ISSUE 01 · SPRING 2026</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{t('hero.kicker')}</span>
          </div>
          <h1 className="hero-title">
            {t('hero.line1')}<br />
            مما <em>{t('hero.line2em')}</em>.
          </h1>
          <p className="hero-sub">{t('hero.sub')}</p>

          {/* Search bar */}
          <div className="search-bar">
            <div className="field">
              <label>{t('search.destination')}</label>
              <select defaultValue="hurghada">
                <option value="hurghada">الغردقة · البحر الأحمر</option>
                <option value="alex">الإسكندرية · المتوسط</option>
                <option value="sharm">شرم الشيخ</option>
                <option value="luxor">الأقصر · النيل</option>
              </select>
            </div>
            <div className="field">
              <label>{t('search.date')}</label>
              <input defaultValue="12 مايو 2026" readOnly />
            </div>
            <div className="field">
              <label>{t('search.duration')}</label>
              <select defaultValue="full">
                <option value="half">نصف يوم · 6 س</option>
                <option value="full">يوم كامل · 10 س</option>
                <option value="multi">أيام متعددة</option>
              </select>
            </div>
            <div className="field">
              <label>{t('search.passengers')}</label>
              <select defaultValue="6">
                <option>2 أشخاص</option>
                <option>4 أشخاص</option>
                <option>6 أشخاص</option>
                <option>10 أشخاص</option>
              </select>
            </div>
            <Link href={`/${locale}/yachts`} className="search-btn">
              {t('search.btn')} ←
            </Link>
          </div>
        </div>
      </div>

      {/* ── Region chips strip ────────────────────────────────────────────── */}
      <div className="region-strip" data-screen-label="region-strip">
        {REGIONS.map((r, i) => (
          <button
            key={i}
            className={`region-chip${i === 0 ? ' active' : ''}`}
          >
            <span>{locale === 'ar' ? r.ar : r.en}</span>
            <span className="count">{r.count}</span>
          </button>
        ))}
      </div>

      {/* ── Marquee band ─────────────────────────────────────────────────── */}
      <div className="marquee-band" data-screen-label="marquee-band">
        <div className="marquee-viewport">
          <div className="marquee-track">
            {ALL_MARQUEE.map(([n, l], i) => (
              <span key={i} className="item">
                <span className="n num">{n}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: 'var(--ff-mono)',
                    letterSpacing: '0.1em',
                    color: 'oklch(0.78 0.02 220)',
                    textTransform: 'uppercase',
                  }}
                >
                  {l}
                </span>
                <span className="sep" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Featured boats ────────────────────────────────────────────────── */}
      <div className="section" data-screen-label="featured-boats">
        <div className="section-head">
          <div>
            <div className="num-tag">§ 01 · FEATURED VESSELS</div>
            <h2>
              {t('featured.heading1')} <em>{t('featured.heading2em')}</em> {t('featured.heading3')}
            </h2>
          </div>
          <Link href={`/${locale}/yachts`} className="right-link">
            {t('featured.viewAll')} (183) ←
          </Link>
        </div>
        <div className="boat-grid">
          {boats.map((boat) => (
            <BoatCard key={boat.id} boat={boat} locale={locale} />
          ))}
        </div>
      </div>

      {/* ── Trust / Sticky story (static, simplified for SSR) ─────────────── */}
      <div className="sticky-story" data-screen-label="trust-section">
        <div className="sticky-story-inner">
          <div
            className="sticky-story-img"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1600&q=80)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(115deg, oklch(0.14 0.04 240 / 0.55), oklch(0.14 0.04 240 / 0.15))',
              }}
            />
          </div>
          <div className="sticky-story-steps">
            <div className="sticky-story-step">
              <div className="num-tag">§ TRUST · STEP 01 — INSPECTION</div>
              <h3>
                {t('trust.step1.line1')},<br />
                <em>{t('trust.step1.line2em')}</em> {t('trust.step1.line3')}.
              </h3>
              <p>{t('trust.step1.body')}</p>
            </div>
            <div className="sticky-story-step">
              <div className="num-tag">§ TRUST · STEP 02 — ESCROW</div>
              <h3>
                {t('trust.step2.line1')} <em>{t('trust.step2.line2em')}</em>,<br />
                {t('trust.step2.line3')}.
              </h3>
              <p>{t('trust.step2.body')}</p>
            </div>
            <div className="sticky-story-step">
              <div className="num-tag">§ TRUST · STEP 03 — INSURANCE</div>
              <h3>
                {t('trust.step3.line1')}<br />
                <em>{t('trust.step3.line2em')}</em>.
              </h3>
              <p>{t('trust.step3.body')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Gear marketplace teaser ──────────────────────────────────────── */}
      <div className="section" data-screen-label="gear-teaser">
        <div className="section-head">
          <div>
            <div className="num-tag">§ 03 · GEAR MARKETPLACE</div>
            <h2>
              {t('gear.heading1')} — <em>{t('gear.heading2em')}</em> {t('gear.heading3')}
            </h2>
          </div>
          <Link href={`/${locale}/marketplace`} className="right-link">
            {t('gear.viewAll')} ←
          </Link>
        </div>
        <div className="gear-grid">
          {GEAR.slice(0, 8).map((g, i) => (
            <div key={i} className="gear-card">
              <div
                className="img"
                style={{ backgroundImage: `url(${g.img})` }}
                role="img"
                aria-label={g.title}
              />
              <div className="brand">{g.brand}</div>
              <div className="title">{g.title}</div>
              <div className="price">
                <span className="num">{g.price.toLocaleString('en')}</span>
                <span className="unit"> EGP</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Competitions teaser ───────────────────────────────────────────── */}
      <div
        className="section"
        style={{ background: 'var(--sand-2)' }}
        data-screen-label="competitions-teaser"
      >
        <div className="section-head">
          <div>
            <div className="num-tag">§ 04 · TOURNAMENTS & EVENTS</div>
            <h2>
              {t('comps.heading1')} <em>{t('comps.heading2em')}</em>
            </h2>
          </div>
          <Link href={`/${locale}/competitions`} className="right-link">
            {t('comps.viewAll')} ←
          </Link>
        </div>
        <div style={{ background: 'var(--foam)', border: '1px solid var(--rule)' }}>
          {COMPETITIONS.map((c, i) => (
            <div key={i} className="comp-row">
              <div className="date">
                <div className="d num">{c.d}</div>
                <div className="m">{c.m} 2026</div>
              </div>
              <div className="title">
                <div className="t">{c.title}</div>
                <div className="sub">{c.sub}</div>
              </div>
              <div className="meta">
                <span className="n num">{c.participants}</span>
                <span className="l">مشارك</span>
              </div>
              <div className="meta">
                <span className="n num">{c.prize}</span>
                <span className="l">جوائز EGP</span>
              </div>
              <button className="cta">سجّل · {c.fee} EGP</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Closing CTA ───────────────────────────────────────────────────── */}
      <div className="section" style={{ paddingTop: 20, paddingBottom: 60 }} data-screen-label="closing-cta">
        <div className="closing-cta">
          <div>
            <div className="cta-kicker">§ 05 · FOR BOAT OWNERS</div>
            <h3>
              {t('cta.line1')} <em>{t('cta.line2em')}</em> {t('cta.line3')}.
            </h3>
            <p>{t('cta.body')}</p>
          </div>
          <div className="btn-stack">
            <Link
              href={`/${locale}/owner/new-listing`}
              className="btn btn-lg"
              style={{ background: 'var(--ink)', color: 'var(--sand)' }}
            >
              {t('cta.primaryBtn')} ←
            </Link>
            <Link
              href={`/${locale}/about`}
              className="btn btn-lg"
              style={{
                background: 'transparent',
                color: 'var(--foam)',
                border: '1px solid var(--foam)',
              }}
            >
              {t('cta.secondaryBtn')}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
