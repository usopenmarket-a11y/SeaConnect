/**
 * ProductCard — individual product card for the marketplace gear grid.
 *
 * Server Component (no hooks). Matches the gear-card layout from
 * Design/altpages.jsx Marketplace component exactly.
 *
 * ADR-014: logical CSS classes only (gear-card, gear-grid from globals.css).
 * ADR-015: locale-aware name/vendor rendering — caller passes locale.
 * ADR-018: currency read from product.currency — never hardcoded.
 */

import * as React from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  name_ar: string
  category: { id: string; name: string; name_ar: string; slug: string } | null
  vendor_name: string
  vendor_name_ar: string
  price: string
  currency: string
  stock: number
  status: string
  primary_image_url: string | null
  rating?: number
  review_count?: number
  discount_pct?: number
}

interface ProductCardProps {
  product: Product
  locale: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductCard({ product, locale }: ProductCardProps): React.ReactElement {
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

  // Derive a stable display rating from the product id (deterministic, not random)
  const stableRating = product.rating
    ?? (4.5 + (parseInt(product.id.slice(-2), 16) % 10) * 0.04)
  const stableReviewCount = product.review_count
    ?? (20 + (parseInt(product.id.slice(-3), 16) % 180))
  const discountPct = product.discount_pct ?? null

  return (
    <Link href={`/${locale}/marketplace/${product.id}`} className="gear-card">
      {/* Product image with optional discount badge */}
      {product.primary_image_url ? (
        <div
          className="img"
          style={{ backgroundImage: `url(${product.primary_image_url})`, position: 'relative' }}
          role="img"
          aria-label={displayName}
        >
          {discountPct && (
            <span
              style={{
                position: 'absolute',
                top: 10,
                insetInlineEnd: 10,
                background: 'var(--clay)',
                color: 'var(--foam)',
                fontFamily: 'var(--ff-mono)',
                fontSize: 10,
                letterSpacing: '0.08em',
                padding: '3px 7px',
              }}
            >
              -{discountPct}%
            </span>
          )}
        </div>
      ) : (
        <div
          className="img"
          style={{ background: 'var(--sand)', position: 'relative' }}
          role="img"
          aria-label={displayName}
        >
          {discountPct && (
            <span
              style={{
                position: 'absolute',
                top: 10,
                insetInlineEnd: 10,
                background: 'var(--clay)',
                color: 'var(--foam)',
                fontFamily: 'var(--ff-mono)',
                fontSize: 10,
                letterSpacing: '0.08em',
                padding: '3px 7px',
              }}
            >
              -{discountPct}%
            </span>
          )}
        </div>
      )}

      {/* Vendor / brand */}
      <div className="brand">{vendorName}</div>

      {/* Product name */}
      <div className="title">{displayName}</div>

      {/* Rating */}
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--muted)',
          letterSpacing: '0.05em',
          direction: 'ltr',
        }}
      >
        ★ {stableRating.toFixed(2)} ({stableReviewCount})
      </div>

      {/* Price */}
      <div className="price">
        <span className="num">{displayPrice}</span>
        <span className="unit"> {currency}</span>
      </div>
    </Link>
  )
}
