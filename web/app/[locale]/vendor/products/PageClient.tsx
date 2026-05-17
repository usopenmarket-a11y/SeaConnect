'use client'

/**
 * VendorProductsClient — vendor product list with full CRUD actions.
 *
 * Features:
 *   - Lists vendor's own products via SWR on GET /marketplace/vendor/products/
 *     with automatic fallback to GET /marketplace/products/ if that 404s.
 *   - Shows a table: name (AR + EN), category, price, stock qty,
 *     availability badge, and Edit / Delete action buttons.
 *   - "Add New Product" button links to /vendor/products/new.
 *   - Delete calls del('/marketplace/products/{id}/') with a confirm dialog.
 *   - Empty state and loading skeleton.
 *
 * ADR-009 — JWT attached by del()/get() from @/lib/api (never localStorage).
 * ADR-013 — cursor pagination; reads results[] not a count field.
 * ADR-014 — logical CSS only (ms-, me-, ps-, pe-).
 * ADR-015 — all strings via t() — never hardcoded in JSX.
 * ADR-018 — currency never hardcoded — read from API response.
 */

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'

import { get, del, type PaginatedResponse, ApiError } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

type ProductCategory =
  | 'rods-reels'
  | 'lures'
  | 'tackle-boxes'
  | 'clothing'
  | 'safety'
  | 'electronics'
  | null

interface Product {
  id: string
  name: string
  name_ar: string
  description: string
  description_ar: string
  price: string
  currency: string
  category: ProductCategory
  stock_quantity: number
  is_available: boolean
  average_rating: string | null
  vendor_id: string
  image_url: string | null
  created_at: string
}

interface Props {
  locale: string
}

// ── Fetcher with 404 fallback ──────────────────────────────────────────────────

async function fetchVendorProducts(): Promise<PaginatedResponse<Product>> {
  try {
    return await get<PaginatedResponse<Product>>('/marketplace/vendor/products/')
  } catch (err) {
    // If the vendor-specific endpoint doesn't exist yet, fall back to the
    // public products endpoint (results will include all vendor products when
    // the backend vendor filter is not yet applied).
    if (err instanceof ApiError && err.status === 404) {
      return get<PaginatedResponse<Product>>('/marketplace/products/')
    }
    throw err
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export function VendorProductsClient({ locale }: Props): React.ReactElement {
  const t = useTranslations('vendor.products')

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Product>>(
    '/marketplace/vendor/products/',
    fetchVendorProducts,
    { revalidateOnFocus: false },
  )

  const products: Product[] = data?.results ?? []

  // ── Delete ──────────────────────────────────────────────────────────────────

  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  async function handleDelete(product: Product): Promise<void> {
    const displayName = locale === 'ar' ? product.name_ar : product.name
    if (!window.confirm(t('confirmDelete', { name: displayName }))) return

    setDeletingId(product.id)
    setDeleteError(null)
    try {
      await del(`/marketplace/products/${product.id}/`)
      await mutate()
    } catch {
      setDeleteError(t('deleteError'))
    } finally {
      setDeletingId(null)
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function formatPrice(price: string, currency: string): string {
    const num = Number(price)
    const formatted =
      locale === 'ar'
        ? num.toLocaleString('ar-EG')
        : num.toLocaleString('en-US')
    return `${formatted} ${currency}`
  }

  function formatQty(n: number): string {
    return locale === 'ar'
      ? n.toLocaleString('ar-EG')
      : n.toLocaleString('en-US')
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <section dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Page heading + add button */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-[--ink]">
          {t('title')}
        </h1>
        <Link
          href={`/${locale}/vendor/products/new`}
          className="rounded-lg bg-[--sea] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t('addProduct')}
        </Link>
      </div>

      {/* Delete error banner */}
      {deleteError && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {deleteError}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="rounded-2xl bg-[--sand] p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-[--ink]/10"
              />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {t('loadError')}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && products.length === 0 && (
        <div className="rounded-2xl bg-[--sand] px-6 py-16 text-center">
          <p className="mb-4 text-[--ink]/50">{t('empty')}</p>
          <Link
            href={`/${locale}/vendor/products/new`}
            className="rounded-lg bg-[--sea] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t('addProduct')}
          </Link>
        </div>
      )}

      {/* Product table */}
      {!isLoading && !error && products.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-[--sand]">
          <table className="dash-table w-full min-w-[52rem]">
            <thead>
              <tr>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('image')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('name')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('category')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('price')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('stock')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('availability')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-t border-[--ink]/8 transition-colors hover:bg-[--ink]/3"
                >
                  {/* Thumbnail */}
                  <td className="px-4 py-3">
                    {product.image_url ? (
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                        <Image
                          src={product.image_url}
                          alt={locale === 'ar' ? product.name_ar : product.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[--ink]/10 text-xs text-[--ink]/30">
                        —
                      </div>
                    )}
                  </td>

                  {/* Name — primary locale + secondary beneath */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-[--ink]">
                      {locale === 'ar' ? product.name_ar : product.name}
                    </div>
                    <div className="text-xs text-[--ink]/50">
                      {locale === 'ar' ? product.name : product.name_ar}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 font-mono text-xs text-[--ink]/60">
                    {product.category
                      ? t(`categoryLabel.${product.category.replace(/-/g, '_')}`)
                      : '—'}
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 font-mono text-sm text-[--ink]">
                    {formatPrice(product.price, product.currency)}
                  </td>

                  {/* Stock quantity */}
                  <td className="px-4 py-3 font-mono text-sm text-[--ink]">
                    {formatQty(product.stock_quantity)}
                  </td>

                  {/* Availability badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        product.is_available
                          ? 'bg-green-100 text-green-800'
                          : 'bg-[--ink]/10 text-[--ink]/60'
                      }`}
                    >
                      {product.is_available ? t('available') : t('unavailable')}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${locale}/vendor/products/${product.id}`}
                        className="rounded-lg border border-[--sea]/30 px-3 py-1.5 text-xs font-medium text-[--sea] transition-colors hover:bg-[--sea]/5"
                      >
                        {t('edit')}
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === product.id}
                        onClick={() => handleDelete(product)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === product.id ? t('deleting') : t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
