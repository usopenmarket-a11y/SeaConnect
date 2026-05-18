/**
 * Yacht detail page — Server Component (ADR-003: SSR required for SEO).
 *
 * Matches BoatDetail() from Design/detail.jsx exactly.
 * - 5-image gallery grid (detail-gallery layout)
 * - Left column: breadcrumbs, name, meta-row, description, spec-grid, amenities
 * - Right column: sticky booking panel with price, line items, CTA
 * - Falls back to mock copy when API fields are empty
 *
 * ADR-014: logical CSS in globals.css.
 * ADR-015: strings from i18n keys via t().
 * ADR-018: currency read from API response.
 */

import * as React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AvailabilityCalendarWithBooking } from '@/components/weather/AvailabilityCalendarWithBooking'

// ── Types (matching API spec) ─────────────────────────────────────────────────

interface YachtMedia {
  id: string
  url: string
  is_primary: boolean
}

interface DeparturePort {
  id: string
  name_ar: string
  name_en: string
  region?: {
    id: string
    name_ar: string
    name_en: string
  }
}

interface YachtDetail {
  id: string
  name: string
  name_ar: string
  description: string
  description_ar: string
  yacht_type: string
  capacity: number
  price_per_day: string
  currency: string
  length_ft?: number
  year_built?: number
  media: YachtMedia[]
  departure_port: DeparturePort | null
  captain_name?: string
  captain_name_ar?: string
  coordinates?: string
  rating?: number
  review_count?: number
}

// ── Static fallback gallery images ───────────────────────────────────────────

const GALLERY_FALLBACK = [
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1561643028-02e42b8eb7e8?auto=format&fit=crop&w=1200&q=80',
]

const AMENITY_KEYS = [
  'crew',
  'fuel',
  'fishingGear',
  'bait',
  'lunch',
  'lifejackets',
  'sonar',
  'bbq',
  'shade',
  'bathroom',
] as const

interface YachtReview {
  id: string
  rating: number
  title: string
  body: string
  customer_name: string
  created_at: string
}

const MOCK_REVIEWS = [
  {
    nameAr: 'عمرو عبد الحليم',
    nameEn: 'Amr Abd Al-Halim',
    date: '2026-03-14',
    stars: 5,
    excerptKey: 'review1Excerpt' as const,
    bodyKey: 'review1Body' as const,
  },
  {
    nameAr: 'Liam Carter',
    nameEn: 'Liam Carter',
    date: '2026-02-28',
    stars: 5,
    excerptKey: 'review2Excerpt' as const,
    bodyKey: 'review2Body' as const,
  },
]

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchYacht(id: string): Promise<YachtDetail | null> {
  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
  try {
    const res = await fetch(`${apiUrl}/api/v1/yachts/${id}/`, {
      next: { revalidate: 30 },
      headers: { Accept: 'application/json' },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return (await res.json()) as YachtDetail
  } catch {
    return null
  }
}

async function fetchReviews(yachtId: string, pageSize = 3): Promise<YachtReview[]> {
  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
  try {
    const res = await fetch(
      `${apiUrl}/api/v1/yachts/${yachtId}/reviews/?page_size=${pageSize}`,
      { next: { revalidate: 30 }, headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []) as YachtReview[]
  } catch {
    return []
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: { locale: string; id: string }
}

export async function generateMetadata({
  params: { locale, id },
}: PageProps): Promise<Metadata> {
  const yacht = await fetchYacht(id)
  if (!yacht) {
    return {
      title: locale === 'ar' ? 'القارب غير موجود | سي كونكت' : 'Yacht not found | SeaConnect',
    }
  }
  const name = locale === 'ar' ? (yacht.name_ar || yacht.name) : yacht.name
  const description = locale === 'ar' ? yacht.description_ar : yacht.description
  const primaryMedia = yacht.media?.find((m) => m.is_primary) ?? yacht.media?.[0]
  const ogImage = primaryMedia
    ? [{ url: primaryMedia.url, width: 1200, height: 630 }]
    : [{ url: '/og/yachts.jpg', width: 1200, height: 630 }]
  return {
    title: `${name} | سي كونكت`,
    description: description?.slice(0, 160) ?? undefined,
    alternates: {
      canonical: `/${locale}/yachts/${id}`,
      languages: { ar: `/ar/yachts/${id}`, en: `/en/yachts/${id}` },
    },
    openGraph: {
      title: `${name} | SeaConnect`,
      description: description?.slice(0, 160) ?? undefined,
      images: ogImage,
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function primaryImageUrl(yacht: YachtDetail): string {
  const primary = yacht.media?.find((m) => m.is_primary) ?? yacht.media?.[0]
  return primary?.url ?? 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80'
}

function galleryImages(yacht: YachtDetail): string[] {
  const primary = yacht.media?.find((m) => m.is_primary) ?? yacht.media?.[0]
  const rest = yacht.media
    ? yacht.media.filter((m) => m.id !== primary?.id).map((m) => m.url)
    : []
  // Fill up to 4 remaining slots with fallback images
  const filled = [...rest, ...GALLERY_FALLBACK].slice(0, 4)
  return filled
}

// ── Page component ────────────────────────────────────────────────────────────

export default async function YachtDetailPage({
  params: { locale, id },
}: PageProps): Promise<React.ReactElement> {
  const [yacht, liveReviews] = await Promise.all([fetchYacht(id), fetchReviews(id, 3)])
  if (!yacht) notFound()

  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'yachts' })
  const tDetail = await getTranslations({ locale, namespace: 'yachts.detail' })

  const name = locale === 'ar' ? (yacht.name_ar || yacht.name) : yacht.name
  const nameEn = yacht.name
  const description =
    (locale === 'ar' ? yacht.description_ar : yacht.description) ||
    tDetail('defaultDescription', { name })

  const heroImg = primaryImageUrl(yacht)
  const gallery = galleryImages(yacht)

  const priceNum = Number(yacht.price_per_day) || 0
  const currency = yacht.currency ?? 'EGP'
  const serviceFee = Math.round(priceNum * 0.12)
  const insuranceFee = 180
  const total = priceNum + serviceFee + insuranceFee

  const portEnName = yacht.departure_port?.name_en ?? 'HURGHADA MARINA'
  const regionEnName = yacht.departure_port?.region?.name_en ?? 'RED SEA'

  const captainName = locale === 'ar'
    ? (yacht.captain_name_ar ?? yacht.captain_name ?? tDetail('defaultCaptain'))
    : (yacht.captain_name ?? tDetail('defaultCaptainEn'))

  const displayRating = yacht.rating ?? 4.92
  const displayReviewCount = yacht.review_count ?? 148
  const coordsDisplay = yacht.coordinates ?? '27.2579°N · 33.8116°E'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: yacht.name,
    description: yacht.description,
    offers: {
      '@type': 'Offer',
      price: yacht.price_per_day,
      priceCurrency: yacht.currency ?? 'EGP',
    },
  }

  return (
    <div className="page-glass">
      {/* ── JSON-LD structured data ────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Gallery ───────────────────────────────────────────────────────── */}
      <div className="detail-gallery" data-screen-label="detail-gallery">
        <div className="main" style={{ backgroundImage: `url(${heroImg})` }} />
        {gallery.slice(0, 4).map((img, i) => (
          <div
            key={i}
            style={{
              backgroundImage: `url(${img})`,
              position: i === 3 ? 'relative' : undefined,
            }}
          >
            {i === 3 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'oklch(0.22 0.04 240 / 0.55)',
                  color: 'var(--sand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 12,
                  letterSpacing: '0.1em',
                }}
              >
                {tDetail('morePhotos')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="detail-body" data-screen-label="detail-body">
        {/* Left column */}
        <div className="detail-left">
          {/* Breadcrumbs */}
          <div className="crumbs">
            <span>{regionEnName.toUpperCase()}</span>
            <span>›</span>
            <span>{portEnName.toUpperCase()}</span>
            <span>›</span>
            <span>{nameEn.toUpperCase()}</span>
          </div>

          {/* Title */}
          <h1>
            {name}
            <br />
            <em style={{ fontSize: '0.55em' }}>{nameEn}</em>
          </h1>

          {/* Meta row */}
          <div className="detail-meta-row">
            <div className="item">
              <span className="l">TYPE</span>
              <span className="v">{yacht.yacht_type}</span>
            </div>
            {yacht.length_ft && (
              <div className="item">
                <span className="l">LENGTH</span>
                <span className="v">{yacht.length_ft} FT</span>
              </div>
            )}
            <div className="item">
              <span className="l">PAX</span>
              <span className="v">UP TO {yacht.capacity}</span>
            </div>
            {yacht.year_built && (
              <div className="item">
                <span className="l">YEAR</span>
                <span className="v">{yacht.year_built}</span>
              </div>
            )}
            <div className="item">
              <span className="l">CAPT</span>
              <span className="v">{captainName}</span>
            </div>
            <div className="item">
              <span className="l">COORDS</span>
              <span className="v">{coordsDisplay}</span>
            </div>
          </div>

          {/* Description prose */}
          <div className="prose">
            {description.split('\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* Technical specs */}
          <div className="subhead">{t('detail.specs')}</div>
          <div className="spec-grid">
            {yacht.length_ft && (
              <div className="cell">
                <div className="l">LENGTH OVERALL</div>
                <div className="v num">
                  {yacht.length_ft}<span className="unit"> FT</span>
                </div>
              </div>
            )}
            <div className="cell">
              <div className="l">ENGINE</div>
              <div className="v num">2 × 425<span className="unit"> HP</span></div>
            </div>
            <div className="cell">
              <div className="l">CRUISE SPEED</div>
              <div className="v num">22<span className="unit"> KNOTS</span></div>
            </div>
            <div className="cell">
              <div className="l">FUEL RANGE</div>
              <div className="v num">280<span className="unit"> NM</span></div>
            </div>
            <div className="cell">
              <div className="l">PAX</div>
              <div className="v num">UP TO {yacht.capacity}</div>
            </div>
            {yacht.year_built && (
              <div className="cell">
                <div className="l">BUILT</div>
                <div className="v num">{yacht.year_built}</div>
              </div>
            )}
          </div>

          {/* Amenities */}
          <div className="subhead">{tDetail('amenitiesTitle')}</div>
          <div className="amen-grid">
            {AMENITY_KEYS.map((key) => (
              <div key={key} className="amen-item">
                <span className="tick">✓</span>
                <span>{tDetail(`amenities.${key}` as Parameters<typeof tDetail>[0])}</span>
              </div>
            ))}
          </div>

          {/* Availability calendar + Weather forecast (Client Component island) */}
          <AvailabilityCalendarWithBooking
            boat={{
              id: yacht.id,
              price: priceNum,
              regionEn: yacht.departure_port?.region?.name_en ?? 'Hurghada',
              coords: '27.2579°N · 33.8116°E',
              name: name,
            }}
            region={(yacht.departure_port?.region?.name_en ?? 'hurghada').toLowerCase()}
            yachtId={yacht.id}
            locale={locale}
          />

          {/* Reviews */}
          <div className="subhead" id="reviews">
            {tDetail('reviewsHeading', { rating: displayRating.toFixed(2), count: displayReviewCount })}
          </div>
          {liveReviews.length > 0 ? (
            <>
              {liveReviews.map((r) => (
                <div key={r.id} className="review">
                  <div className="author">
                    <div className="name">{r.customer_name}</div>
                    <div className="date">{r.created_at.slice(0, 10)}</div>
                    <div className="stars">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </div>
                  </div>
                  <div className="body">
                    {r.title && <div className="excerpt">«{r.title}»</div>}
                    <p>{r.body}</p>
                  </div>
                </div>
              ))}
            </>
          ) : (
            MOCK_REVIEWS.map((r, i) => (
              <div key={i} className="review">
                <div className="author">
                  <div className="name">{locale === 'ar' ? r.nameAr : r.nameEn}</div>
                  <div className="date">{r.date}</div>
                  <div className="stars">
                    {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                  </div>
                </div>
                <div className="body">
                  <div className="excerpt">«{tDetail(r.excerptKey)}»</div>
                  <p>{tDetail(r.bodyKey)}</p>
                </div>
              </div>
            ))
          )}
          <Link
            href={`/${locale}/yachts/${yacht.id}/reviews`}
            className="btn btn-ghost"
            style={{ marginTop: 20, display: 'inline-block' }}
          >
            {tDetail('viewAllReviews', { count: displayReviewCount })}
          </Link>

          {/* Location map placeholder */}
          <div className="subhead">{t('detail.location')}</div>
          <div
            style={{
              aspectRatio: '16/7',
              background: 'var(--sand-2)',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid var(--rule)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1529963183134-61a90db47eaf?auto=format&fit=crop&w=1800&q=60)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'saturate(0.5) contrast(1.1)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '40%',
                insetInlineStart: '45%',
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'var(--clay)',
                border: '3px solid var(--foam)',
                boxShadow: '0 0 0 6px oklch(0.60 0.13 45 / 0.25)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                insetInlineStart: 16,
                background: 'var(--foam)',
                padding: '10px 14px',
                fontFamily: 'var(--ff-mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                direction: 'ltr',
              }}
            >
              {portEnName} · {coordsDisplay}
            </div>
          </div>
        </div>

        {/* ── Right column: Booking panel ─────────────────────────────────── */}
        <div className="booking-panel" data-screen-label="booking-panel">
          <div className="price-row">
            <div className="price">
              <span className="num">{priceNum.toLocaleString('en')}</span>
              <span className="unit"> {currency} / {tDetail('perDay')}</span>
            </div>
            <div className="rating">
              <div className="v">★ {displayRating.toFixed(2)}</div>
              <div>{displayReviewCount} {tDetail('reviews')}</div>
            </div>
          </div>

          <div className="form-field">
            <label>{tDetail('tripDate')}</label>
            <input defaultValue={tDetail('tripDatePlaceholder')} readOnly />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label>{tDetail('departure')}</label>
              <select defaultValue="6:00">
                <option>{tDetail('time0600am')}</option>
              </select>
            </div>
            <div className="form-field">
              <label>{tDetail('return')}</label>
              <select defaultValue="16:00">
                <option>{tDetail('time0400pm')}</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label>{tDetail('duration')}</label>
              <select>
                <option>{tDetail('durationFullDay')}</option>
              </select>
            </div>
            <div className="form-field">
              <label>{tDetail('passengers')}</label>
              <select>
                <option>{tDetail('passengersDefault', { count: yacht.capacity })}</option>
              </select>
            </div>
          </div>

          <div className="line-items">
            <div className="row">
              <span className="l">{priceNum.toLocaleString('en')} {currency} × {tDetail('oneDay')}</span>
              <span className="v">{priceNum.toLocaleString('en')}</span>
            </div>
            <div className="row">
              <span className="l">{tDetail('serviceFee')}</span>
              <span className="v">{serviceFee.toLocaleString('en')}</span>
            </div>
            <div className="row">
              <span className="l">{tDetail('tripInsurance')}</span>
              <span className="v">{insuranceFee}</span>
            </div>
            <div className="row total">
              <span className="l">{tDetail('total')}</span>
              <span className="v">{total.toLocaleString('en')} {currency}</span>
            </div>
          </div>

          <Link
            href={`/${locale}/yachts/${yacht.id}/book`}
            className="btn btn-clay btn-lg cta-shimmer"
            style={{ width: '100%', marginTop: 18, display: 'flex', justifyContent: 'center' }}
          >
            {t('detail.bookNow')} ←
          </Link>

          <div className="guarantee">
            ✓ {tDetail('guarantee1')}<br />
            ✓ {tDetail('guarantee2')}<br />
            ✓ {tDetail('guarantee3')}
          </div>
        </div>
      </div>
    </div>
  )
}
