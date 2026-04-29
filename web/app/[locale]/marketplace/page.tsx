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
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ProductCard, type Product } from '@/components/marketplace/ProductCard'

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
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Category[] } | Category[]
    return Array.isArray(data) ? data : (data.results ?? [])
  } catch {
    return []
  }
}

async function fetchProducts(categorySlug?: string): Promise<Product[]> {
  const apiUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8010'
  try {
    const url = categorySlug
      ? `${apiUrl}/api/v1/marketplace/products/?category=${encodeURIComponent(categorySlug)}`
      : `${apiUrl}/api/v1/marketplace/products/`
    const res = await fetch(url, {
      cache: 'no-store',
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
  searchParams: { category?: string }
}

export default async function MarketplacePage({
  params: { locale },
  searchParams,
}: MarketplacePageProps): Promise<React.ReactElement> {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'marketplace' })

  const [categories, products] = await Promise.all([
    fetchCategories(),
    fetchProducts(searchParams.category),
  ])

  const isAr = locale === 'ar'
  const activeCategorySlug = searchParams.category ?? null

  return (
    <>
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
              عدّة الصيد{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--clay)' }}>كلها</em>{' '}
              في مكان واحد.
            </>
          ) : (
            <>
              All your{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--clay)' }}>fishing gear</em>
              , one place.
            </>
          )}
        </h1>
      </div>

      {/* ── Category pill tabs ─────────────────────────────────────────────── */}
      <div className="pill-tabs" data-screen-label="category-tabs">
        {/* "All products" tab */}
        <Link
          href={`/${locale}/marketplace`}
          className={`pill${!activeCategorySlug ? ' active' : ''}`}
        >
          {t('allCategories')}
        </Link>

        {/* Dynamic category tabs from API */}
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/${locale}/marketplace?category=${encodeURIComponent(cat.slug)}`}
            className={`pill${activeCategorySlug === cat.slug ? ' active' : ''}`}
          >
            {isAr ? (cat.name_ar || cat.name) : cat.name}
          </Link>
        ))}
      </div>

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
    </>
  )
}
