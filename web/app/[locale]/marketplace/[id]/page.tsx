/**
 * Marketplace product detail page — Server Component (ADR-003: SSR for SEO).
 *
 * Fetches GET /api/v1/marketplace/products/{id}/.
 * Renders AddToCartButton as a nested Client Component island.
 *
 * ADR-014: logical CSS only.
 * ADR-015: all strings via next-intl t().
 * ADR-018: currency read from API.
 */

import * as React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { type Product } from '@/components/marketplace/ProductCard'
import { AddToCartButton } from '@/components/marketplace/AddToCartButton'

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchProduct(id: string): Promise<Product | null> {
  const apiUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8010'
  try {
    const res = await fetch(`${apiUrl}/api/v1/marketplace/products/${id}/`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return (await res.json()) as Product
  } catch {
    return null
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

interface PageProps {
  params: { locale: string; id: string }
}

export async function generateMetadata({
  params: { locale, id },
}: PageProps): Promise<Metadata> {
  const product = await fetchProduct(id)
  if (!product) {
    return {
      title: locale === 'ar' ? 'المنتج غير موجود | سي كونكت' : 'Product not found | SeaConnect',
    }
  }
  const isAr = locale === 'ar'
  const name = isAr ? (product.name_ar || product.name) : product.name
  return {
    title: `${name} | ${isAr ? 'سي كونكت' : 'SeaConnect'}`,
    alternates: {
      canonical: `/${locale}/marketplace/${id}`,
      languages: {
        ar: `/ar/marketplace/${id}`,
        en: `/en/marketplace/${id}`,
      },
    },
    openGraph: {
      title: `${name} | SeaConnect`,
      images: product.primary_image_url ? [{ url: product.primary_image_url }] : undefined,
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
  }
}

// ── Page component ─────────────────────────────────────────────────────────────

export default async function MarketplaceProductPage({
  params: { locale, id },
}: PageProps): Promise<React.ReactElement> {
  const product = await fetchProduct(id)
  if (!product) notFound()

  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'marketplace' })

  const isAr = locale === 'ar'
  const displayName = isAr ? (product.name_ar || product.name) : product.name
  const vendorName = isAr ? (product.vendor_name_ar || product.vendor_name) : product.vendor_name
  const categoryName = product.category
    ? (isAr ? (product.category.name_ar || product.category.name) : product.category.name)
    : null

  const priceNum = Number(product.price) || 0
  const currency = product.currency || 'EGP'
  const displayPrice = isAr
    ? priceNum.toLocaleString('ar-EG')
    : priceNum.toLocaleString('en')

  const isOutOfStock = product.stock === 0

  return (
    <>
      {/* ── Hero image ─────────────────────────────────────────────────────── */}
      {product.primary_image_url ? (
        <div
          style={{
            aspectRatio: '16/7',
            backgroundImage: `url(${product.primary_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderBottom: '2px solid var(--ink)',
          }}
          role="img"
          aria-label={displayName}
        />
      ) : (
        <div
          style={{
            aspectRatio: '16/7',
            background: 'var(--sand)',
            borderBottom: '2px solid var(--ink)',
          }}
        />
      )}

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div
        className="detail-body"
        data-screen-label="marketplace-detail-body"
      >
        {/* ── Left column ──────────────────────────────────────────────────── */}
        <div className="detail-left">
          {/* Breadcrumbs */}
          <div className="crumbs">
            <Link href={`/${locale}/marketplace`}>{t('title')}</Link>
            {categoryName && (
              <>
                <span>›</span>
                <span>{categoryName.toUpperCase()}</span>
              </>
            )}
            <span>›</span>
            <span>{displayName.toUpperCase()}</span>
          </div>

          {/* Product title */}
          <h1>
            {displayName}
            <br />
            {!isAr && product.name_ar && (
              <em style={{ fontSize: '0.55em' }}>{product.name_ar}</em>
            )}
            {isAr && product.name && (
              <em style={{ fontSize: '0.55em' }}>{product.name}</em>
            )}
          </h1>

          {/* Meta row */}
          <div className="detail-meta-row">
            <div className="item">
              <span className="l">VENDOR</span>
              <span className="v">{vendorName}</span>
            </div>
            {categoryName && (
              <div className="item">
                <span className="l">CATEGORY</span>
                <span className="v">{categoryName}</span>
              </div>
            )}
            <div className="item">
              <span className="l">STOCK</span>
              <span className="v num">
                {isAr ? product.stock.toLocaleString('ar-EG') : product.stock}
              </span>
            </div>
            <div className="item">
              <span className="l">STATUS</span>
              <span className="v">{product.status.toUpperCase()}</span>
            </div>
          </div>

          {/* Price display */}
          <div
            style={{
              marginTop: 32,
              paddingTop: 24,
              borderTop: '1px solid var(--rule)',
            }}
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
              {t('price').toUpperCase()}
            </div>
            <div
              className="price"
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              <span className="num">{displayPrice}</span>
              <span
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 16,
                  fontWeight: 400,
                  color: 'var(--muted)',
                  marginInlineStart: 8,
                }}
              >
                {currency}
              </span>
            </div>
          </div>

          {/* Add to cart — Client Component island */}
          <div style={{ marginTop: 24, maxWidth: 380 }}>
            <AddToCartButton
              productId={product.id}
              locale={locale}
              outOfStock={isOutOfStock}
            />
          </div>
        </div>

        {/* ── Right column: vendor / category info panel ────────────────────── */}
        <div className="booking-panel" data-screen-label="product-info-panel">
          <div className="price-row">
            <div className="price">
              <span className="num">{displayPrice}</span>
              <span className="unit"> {currency}</span>
            </div>
          </div>

          {/* Vendor */}
          <div style={{ marginTop: 20 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 4,
              }}
            >
              {t('vendor').toUpperCase()}
            </div>
            <div style={{ fontWeight: 600 }}>{vendorName}</div>
          </div>

          {/* Category */}
          {categoryName && (
            <div style={{ marginTop: 16 }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color: 'var(--muted)',
                  marginBottom: 4,
                }}
              >
                CATEGORY
              </div>
              <div>{categoryName}</div>
            </div>
          )}

          {/* Stock indicator */}
          <div style={{ marginTop: 16 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'var(--muted)',
                marginBottom: 4,
              }}
            >
              STOCK
            </div>
            <div
              className="num"
              style={{ color: isOutOfStock ? 'var(--clay)' : 'inherit' }}
            >
              {isAr ? product.stock.toLocaleString('ar-EG') : product.stock}
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 28 }}>
            <AddToCartButton
              productId={product.id}
              locale={locale}
              outOfStock={isOutOfStock}
            />
          </div>

          {/* Back to marketplace */}
          <Link
            href={`/${locale}/marketplace`}
            className="btn btn-ghost"
            style={{
              marginTop: 12,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            ← {t('title')}
          </Link>
        </div>
      </div>
    </>
  )
}
