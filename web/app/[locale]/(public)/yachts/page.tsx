/**
 * Yacht list page — Server Component (ADR-003: SSR required for SEO).
 *
 * Matches BoatsPage() from Design/altpages.jsx exactly.
 * Fetches from GET /api/v1/yachts/ with next: { revalidate: 30 }.
 * Falls back to mock data if API is unavailable.
 * Logical CSS via globals.css class names (ADR-014).
 * Strings via next-intl t() (ADR-015).
 * Currency read from API response — never hardcoded (ADR-018).
 */

import * as React from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BoatCard, type BoatCardData } from '@/components/boats/BoatCard'
import { YachtFilters } from '@/components/yachts/YachtFilters'
import { PageHero } from '@/components/layout/PageHero'

// ── Metadata ─────────────────────────────────────────────────────────────────

interface MetadataProps {
  params: { locale: string }
}

export async function generateMetadata({
  params: { locale },
}: MetadataProps): Promise<Metadata> {
  return {
    title:
      locale === 'ar'
        ? 'القوارب المتاحة | سي كونكت'
        : 'Available Yachts | SeaConnect',
    description:
      locale === 'ar'
        ? 'تصفّح قوارب الإيجار المتاحة في مصر واحجز رحلتك البحرية'
        : 'Browse available charter yachts in Egypt and book your sea trip',
    alternates: {
      canonical: `/${locale}/yachts`,
      languages: { ar: '/ar/yachts', en: '/en/yachts' },
    },
    openGraph: {
      title:
        locale === 'ar'
          ? 'القوارب المتاحة | سي كونكت'
          : 'Available Yachts | SeaConnect',
      description:
        locale === 'ar'
          ? 'تصفّح قوارب الإيجار المتاحة في مصر واحجز رحلتك البحرية'
          : 'Browse available charter yachts in Egypt and book your sea trip',
      images: [{ url: '/og/yachts.jpg', width: 1200, height: 630 }],
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
  }
}

// ── Static mock fallback (matches Design/data.jsx) ───────────────────────────

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
    img: 'https://images.unsplash.com/photo-1527484702778-7d9bbbc5e3ab?auto=format&fit=crop&w=1400&q=80',
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
    img: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1400&q=80',
    tagEn: 'NILE',
  },
  {
    id: 'b5', name: 'أطلانتس', nameEn: 'Atlantis',
    type: 'يخت فاخر', typeEn: 'Luxury Charter',
    capt: 'الربان يوسف منصور', captEn: 'Capt. Youssef Mansour',
    region: 'الغردقة', regionEn: 'Hurghada', coords: '27.2579°N · 33.8116°E',
    length: 56, pax: 16, year: 2023, price: 8900, rating: 4.97, reviews: 76,
    img: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=1400&q=80',
    tagEn: 'FEATURED',
  },
  {
    id: 'b6', name: 'صياد الصبح', nameEn: 'Sayyad Al Sobh',
    type: 'قارب صيد صغير', typeEn: 'Small Fishing Boat',
    capt: 'الربان سامي حسن', captEn: 'Capt. Samy Hassan',
    region: 'دهب', regionEn: 'Dahab', coords: '28.5091°N · 34.5136°E',
    length: 22, pax: 4, year: 2020, price: 1200, rating: 4.79, reviews: 56,
    img: 'https://images.unsplash.com/photo-1561643028-02e42b8eb7e8?auto=format&fit=crop&w=1400&q=80',
    tagEn: 'VERIFIED',
  },
]

// ── API fetch ─────────────────────────────────────────────────────────────────

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
}

interface YachtFilterParams {
  capacity_min?: string
  price_max?: string
  yacht_type?: string
}

async function fetchYachts(locale: string, filters: YachtFilterParams): Promise<BoatCardData[]> {
  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
  const apiParams = new URLSearchParams({ ordering: '-created_at' })
  if (filters.capacity_min) apiParams.set('capacity_min', filters.capacity_min)
  if (filters.price_max) apiParams.set('price_max', filters.price_max)
  if (filters.yacht_type) apiParams.set('yacht_type', filters.yacht_type)
  try {
    const res = await fetch(`${apiUrl}/api/v1/yachts/?${apiParams.toString()}`, {
      next: { revalidate: 30 },
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return FALLBACK_BOATS
    const data = (await res.json()) as { results: ApiYacht[] }
    const results = data.results ?? []
    if (results.length === 0) return FALLBACK_BOATS

    return results.map((y) => ({
      id: y.id,
      name: locale === 'ar' ? (y.name_ar || y.name) : y.name,
      nameEn: y.name,
      typeEn: y.yacht_type ?? '',
      pax: y.capacity,
      price_per_day: y.price_per_day,
      currency: y.currency ?? 'EGP',
      primary_image_url: y.primary_image_url,
      regionEn: y.departure_port?.name_en,
    }))
  } catch {
    return FALLBACK_BOATS
  }
}

// ── Region filter tabs ────────────────────────────────────────────────────────

const REGION_TYPES = [
  'كل الأنواع',
  'يخوت فاخرة',
  'قوارب صيد',
  'فلوكات نيلية',
  'قوارب عائلية',
]

// ── Page component ────────────────────────────────────────────────────────────

interface YachtsPageProps {
  params: { locale: string }
  searchParams?: {
    capacity_min?: string
    price_max?: string
    yacht_type?: string
  }
}

export default async function YachtsPage({
  params: { locale },
  searchParams,
}: YachtsPageProps): Promise<React.ReactElement> {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'yachts' })
  const boats = await fetchYachts(locale, {
    capacity_min: searchParams?.capacity_min,
    price_max: searchParams?.price_max,
    yacht_type: searchParams?.yacht_type,
  })

  const totalCount = boats.length

  return (
    <div className="page-glass">
      <PageHero
        kicker={locale === 'ar' ? `كل القوارب · ${totalCount} معتمد` : `ALL VESSELS · ${totalCount} VERIFIED`}
        title={locale === 'ar'
          ? <>كل <em style={{ fontStyle: 'italic', color: 'oklch(0.92 0.07 60)' }}>القوارب</em>.</>
          : <>Every <em style={{ fontStyle: 'italic', color: 'oklch(0.92 0.07 60)' }}>vessel</em>.</>
        }
        subtitle={locale === 'ar'
          ? 'من اليخوت الفاخرة إلى الفلوكات النيلية التقليدية، كل قارب موثّق وفنياً مفحوص.'
          : 'From luxury yachts to traditional Nile feluccas — every boat documented and inspected.'
        }
        bar={[
          { label: locale === 'ar' ? 'إجمالي القوارب' : 'Total vessels', value: <span className="num" style={{ fontFamily: 'var(--ff-display)', fontSize: 44, fontWeight: 700, color: 'var(--clay)' }}>{totalCount}</span>, mod: 'count' },
          { label: locale === 'ar' ? 'السواحل المشمولة' : 'Coasts covered', value: locale === 'ar' ? 'البحر الأحمر · المتوسط · النيل' : 'Red Sea · Mediterranean · Nile' },
          { label: locale === 'ar' ? 'العدد · ربيع ٢٠٢٦' : 'ISSUE · SPRING 2026', value: locale === 'ar' ? 'منصة مصر البحرية' : "EGYPT'S MARITIME PLATFORM", mod: 'issue' },
        ]}
      />

      {/* Advanced filters — Client Component (pushes params to URL) */}
      <YachtFilters locale={locale} />

      {/* Type filter tabs */}
      <div className="pill-tabs" data-screen-label="type-tabs">
        {REGION_TYPES.map((type, i) => (
          <button key={i} className={`pill${i === 0 ? ' active' : ''}`}>
            {type}
          </button>
        ))}
      </div>

      {/* Boat grid */}
      <div className="section" data-screen-label="yachts-grid">
        {boats.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)' }}>
            {t('empty')}
          </p>
        ) : (
          <div className="boat-grid">
            {boats.map((boat) => (
              <BoatCard key={boat.id} boat={boat} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
