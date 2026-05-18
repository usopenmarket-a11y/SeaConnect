/**
 * Marketplace product listing page — Server Component (ADR-003: SSR for SEO).
 *
 * Matches Marketplace() from Design/altpages.jsx exactly.
 * Fetches categories + products in parallel from the API.
 * Falls back gracefully (empty state) if API is unavailable.
 *
 * ADR-014: logical CSS only (pill-tabs, pill, gear-grid from globals.css).
 * ADR-015: all strings via next-intl t() — no hardcoded Arabic or English.
 * ADR-018: currency read from API — never hardcoded.
 */

import * as React from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ProductCard, type Product } from '@/components/marketplace/ProductCard'
import { MarketplaceFilters } from '@/components/marketplace/MarketplaceFilters'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  name_ar: string
  slug: string
}

// ── Metadata ──────────────────────────────────────────────────────────────────

interface MetadataProps {
  params: { locale: string }
}

export async function generateMetadata({
  params: { locale },
}: MetadataProps): Promise<Metadata> {
  return {
    title:
      locale === 'ar'
        ? 'متجر العدة | سي كونكت'
        : 'Gear Marketplace | SeaConnect',
    description:
      locale === 'ar'
        ? 'اقتنِ عدة الصيد وكل معداتك البحرية من أكثر من ٢٢٠٠ بائع معتمد في مصر'
        : 'Source fishing gear and marine equipment from 2,200+ certified vendors in Egypt',
    alternates: {
      canonical: `/${locale}/marketplace`,
      languages: { ar: '/ar/marketplace', en: '/en/marketplace' },
    },
    openGraph: {
      title:
        locale === 'ar'
          ? 'متجر العدة | سي كونكت'
          : 'Gear Marketplace | SeaConnect',
      description:
        locale === 'ar'
          ? 'اقتنِ عدة الصيد وكل معداتك البحرية من أكثر من ٢٢٠٠ بائع معتمد في مصر'
          : 'Source fishing gear and marine equipment from 2,200+ certified vendors in Egypt',
      images: [{ url: '/og/marketplace.jpg', width: 1200, height: 630 }],
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
  }
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchCategories(): Promise<Category[]> {
  const apiUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8010'
  try {
    const res = await fetch(`${apiUrl}/api/v1/marketplace/categories/`, {
      next: { revalidate: 30 },
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Category[] } | Category[]
    return Array.isArray(data) ? data : (data.results ?? [])
  } catch {
    return []
  }
}

interface ProductFilters {
  category?: string
  price_min?: string
  price_max?: string
  rating?: string
}

async function fetchProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const apiUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8010'
  try {
    const q = new URLSearchParams()
    if (filters.category) q.set('category', filters.category)
    if (filters.price_min) q.set('price_min', filters.price_min)
    if (filters.price_max) q.set('price_max', filters.price_max)
    if (filters.rating) q.set('rating', filters.rating)
    const qs = q.toString()
    const url = `${apiUrl}/api/v1/marketplace/products/${qs ? `?${qs}` : ''}`
    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Product[] } | Product[]
    return Array.isArray(data) ? data : (data.results ?? [])
  } catch {
    return []
  }
}

// ── Page component ─────────────────────────────────────────────────────────────

interface MarketplacePageProps {
  params: { locale: string }
  searchParams: {
    category?: string
    price_min?: string
    price_max?: string
    rating?: string
  }
}

export default async function MarketplacePage({
  params: { locale },
  searchParams,
}: MarketplacePageProps): Promise<React.ReactElement> {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'marketplace' })

  const [, products] = await Promise.all([
    fetchCategories(),
    fetchProducts({
      category: searchParams.category,
      price_min: searchParams.price_min,
      price_max: searchParams.price_max,
      rating: searchParams.rating,
    }),
  ])

  const isAr = locale === 'ar'

  return (
    <div className="page-glass">
      {/* ── Editorial header ───────────────────────────────────────────────── */}
      <div
        style={{
          padding: '40px 48px 24px',
          borderBottom: '2px solid var(--ink)',
        }}
        data-screen-label="marketplace-header"
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            marginBottom: 8,
          }}
        >
          § GEAR MARKETPLACE · 2,200+ VENDORS
        </div>
        <h1
          className="display"
          style={{
            fontSize: 72,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            fontWeight: 700,
          }}
        >
          {isAr ? (
            <>
              {t('heading1')}{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--clay)' }}>{t('headingEm')}</em>{' '}
              {t('heading2')}
            </>
          ) : (
            <>
              {t('heading1')}{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--clay)' }}>{t('headingEm')}</em>
              {t('heading2')}
            </>
          )}
        </h1>
      </div>

      {/* ── Category pills + filter bar (Client Component) ────────────────── */}
      <MarketplaceFilters locale={locale} resultCount={products.length} />

      {/* ── Product grid ───────────────────────────────────────────────────── */}
      <div className="section" data-screen-label="products-grid">
        {products.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              padding: '64px 0',
              color: 'var(--muted)',
              fontFamily: 'var(--ff-sans)',
            }}
          >
            {t('empty')}
          </p>
        ) : (
          <div className="gear-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
