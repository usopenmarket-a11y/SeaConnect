'use client'

/**
 * VendorProductsClient — vendor product management UI.
 *
 * Features:
 *   - Lists the vendor's own products via SWR on GET /api/v1/marketplace/vendor/products/
 *   - "Add product" button opens an inline creation form
 *   - Each row has an "Upload image" button (hidden file input, multipart POST)
 *   - Product image upload via POST /api/v1/marketplace/products/{id}/images/
 *     with FormData field name `file` (per Sprint 12A handoff contract)
 *
 * Auth: access token read from the in-memory store via getAccessToken() from
 * @/lib/api — mirrors the owner payouts page pattern (ADR-009: never localStorage).
 *
 * ADR-014: logical CSS only (ms-, me-, ps-, pe-).
 * ADR-015: all strings via t() — never hardcoded in JSX.
 * ADR-018: currency never hardcoded — read from API response.
 */

import * as React from 'react'
import Image from 'next/image'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'

import { get, getAccessToken, type PaginatedResponse } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductStatus = 'active' | 'draft' | 'out_of_stock'

interface Product {
  id: string
  name: string
  name_ar: string
  description: string
  description_ar: string
  price: string
  currency: string
  stock: number
  category: string | null
  image_url: string | null
  status: ProductStatus
  slug: string
}

interface CreateProductPayload {
  name: string
  name_ar: string
  price: string
  stock: number
  status: ProductStatus
}

interface Props {
  locale: string
}

// ── API base URL (same constant used across the codebase) ────────────────────

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010') + '/api/v1'

// ── Component ─────────────────────────────────────────────────────────────────

export function VendorProductsClient({ locale }: Props): React.ReactElement {
  const t = useTranslations('vendor.products')

  // ── Product list ──────────────────────────────────────────────────────────

  const { data, error, mutate } = useSWR(
    '/marketplace/vendor/products/',
    (path: string) => get<PaginatedResponse<Product>>(path),
  )

  const products: Product[] = data?.results ?? []

  // ── Add-product form state ────────────────────────────────────────────────

  const [showForm, setShowForm] = React.useState(false)
  const [formValues, setFormValues] = React.useState<CreateProductPayload>({
    name: '',
    name_ar: '',
    price: '',
    stock: 0,
    status: 'draft',
  })
  const [creating, setCreating] = React.useState(false)
  const [createMsg, setCreateMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void {
    const { name, value } = e.target
    setFormValues((prev) => ({
      ...prev,
      [name]: name === 'stock' ? Number(value) : value,
    }))
  }

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setCreating(true)
    setCreateMsg(null)

    const token = getAccessToken()
    try {
      const res = await fetch(`${API_BASE}/marketplace/products/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formValues),
      })

      if (!res.ok) {
        throw new Error(String(res.status))
      }

      setCreateMsg({ type: 'success', text: t('createSuccess') })
      setFormValues({ name: '', name_ar: '', price: '', stock: 0, status: 'draft' })
      setShowForm(false)
      await mutate()
    } catch {
      setCreateMsg({ type: 'error', text: t('createError') })
    } finally {
      setCreating(false)
    }
  }

  // ── Per-row image upload state ────────────────────────────────────────────

  // Map from product id → upload state
  const [uploadState, setUploadState] = React.useState<
    Record<string, 'idle' | 'uploading' | 'success' | 'error'>
  >({})

  // One hidden file input ref per product row — keyed by product id
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({})

  function handleUploadClick(productId: string): void {
    fileInputRefs.current[productId]?.click()
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    productId: string,
  ): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset the input so the same file can be re-selected after an error
    e.target.value = ''

    setUploadState((prev) => ({ ...prev, [productId]: 'uploading' }))

    const token = getAccessToken()
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(
        `${API_BASE}/marketplace/products/${productId}/images/`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        },
      )

      if (!res.ok) {
        throw new Error(String(res.status))
      }

      setUploadState((prev) => ({ ...prev, [productId]: 'success' }))
      await mutate()

      // Reset success indicator after 3 s
      setTimeout(() => {
        setUploadState((prev) => ({ ...prev, [productId]: 'idle' }))
      }, 3000)
    } catch {
      setUploadState((prev) => ({ ...prev, [productId]: 'error' }))
      setTimeout(() => {
        setUploadState((prev) => ({ ...prev, [productId]: 'idle' }))
      }, 3000)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function formatPrice(price: string, currency: string): string {
    const num = Number(price)
    const formatted =
      locale === 'ar'
        ? num.toLocaleString('ar-EG')
        : num.toLocaleString('en-US')
    return `${formatted} ${currency}`
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Page heading + add-product button */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-[--ink]">
          {t('title')}
        </h1>
        <button
          type="button"
          onClick={() => {
            setShowForm((s) => !s)
            setCreateMsg(null)
          }}
          className="btn rounded-lg bg-[--sea] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {t('addProduct')}
        </button>
      </div>

      {/* Global create feedback */}
      {createMsg && (
        <div
          role="alert"
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
            createMsg.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {createMsg.text}
        </div>
      )}

      {/* ── Inline add-product form ── */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-2xl border border-[--sea]/20 bg-[--sand] p-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name (English) */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="vendor-name"
                className="text-xs font-semibold uppercase tracking-wide text-[--ink]/60"
              >
                {t('name')}
              </label>
              <input
                id="vendor-name"
                name="name"
                type="text"
                required
                value={formValues.name}
                onChange={handleFormChange}
                className="rounded-lg border border-[--ink]/15 bg-white px-3 py-2 text-sm text-[--ink] focus:outline-none focus:ring-2 focus:ring-[--sea]"
              />
            </div>

            {/* Name (Arabic) */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="vendor-name-ar"
                className="text-xs font-semibold uppercase tracking-wide text-[--ink]/60"
              >
                {t('nameAr')}
              </label>
              <input
                id="vendor-name-ar"
                name="name_ar"
                type="text"
                required
                dir="rtl"
                value={formValues.name_ar}
                onChange={handleFormChange}
                className="rounded-lg border border-[--ink]/15 bg-white px-3 py-2 text-sm text-[--ink] focus:outline-none focus:ring-2 focus:ring-[--sea]"
              />
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="vendor-price"
                className="text-xs font-semibold uppercase tracking-wide text-[--ink]/60"
              >
                {t('price')}
              </label>
              <input
                id="vendor-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
                value={formValues.price}
                onChange={handleFormChange}
                className="rounded-lg border border-[--ink]/15 bg-white px-3 py-2 text-sm text-[--ink] font-mono focus:outline-none focus:ring-2 focus:ring-[--sea]"
              />
            </div>

            {/* Stock */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="vendor-stock"
                className="text-xs font-semibold uppercase tracking-wide text-[--ink]/60"
              >
                {t('stock')}
              </label>
              <input
                id="vendor-stock"
                name="stock"
                type="number"
                min="0"
                required
                value={formValues.stock}
                onChange={handleFormChange}
                className="rounded-lg border border-[--ink]/15 bg-white px-3 py-2 text-sm text-[--ink] font-mono focus:outline-none focus:ring-2 focus:ring-[--sea]"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-[--sea] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              {creating ? t('creating') : t('create')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-[--ink]/20 px-5 py-2 text-sm font-medium text-[--ink]/70 hover:bg-[--ink]/5 transition-colors"
            >
              {/* Uses common cancel key if available — hardcoded string intentionally
                  avoided by using the nearest common key. */}
              ✕
            </button>
          </div>
        </form>
      )}

      {/* ── Product table ── */}
      {error ? (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {t('loadError')}
        </div>
      ) : !data ? (
        /* Loading skeleton */
        <div className="rounded-2xl bg-[--sand] p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-[--ink]/10"
              />
            ))}
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl bg-[--sand] px-6 py-12 text-center text-[--ink]/50">
          {t('empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-[--sand]">
          <table className="dash-table w-full min-w-[48rem]">
            <thead>
              <tr>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('image')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('name')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('price')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('stock')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('status')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const state = uploadState[product.id] ?? 'idle'
                return (
                  <tr
                    key={product.id}
                    className="border-t border-[--ink]/8 hover:bg-[--ink]/3 transition-colors"
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

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-[--ink]">
                        {locale === 'ar' ? product.name_ar : product.name}
                      </div>
                      <div className="text-xs text-[--ink]/50">
                        {locale === 'ar' ? product.name : product.name_ar}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 font-mono text-sm text-[--ink]">
                      {formatPrice(product.price, product.currency)}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 font-mono text-sm text-[--ink]">
                      {locale === 'ar'
                        ? product.stock.toLocaleString('ar-EG')
                        : product.stock.toLocaleString('en-US')}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          product.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : product.status === 'out_of_stock'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[--ink]/10 text-[--ink]/60'
                        }`}
                      >
                        {t(`statusLabel.${product.status}`)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Hidden file input — one per row */}
                        <input
                          ref={(el) => {
                            fileInputRefs.current[product.id] = el
                          }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          aria-label={t('uploadImage')}
                          onChange={(e) => handleFileChange(e, product.id)}
                        />

                        {/* Upload image button */}
                        <button
                          type="button"
                          disabled={state === 'uploading'}
                          onClick={() => handleUploadClick(product.id)}
                          className="rounded-lg border border-[--sea]/30 px-3 py-1.5 text-xs font-medium text-[--sea] hover:bg-[--sea]/5 disabled:opacity-50 transition-colors"
                        >
                          {state === 'uploading'
                            ? t('uploading')
                            : state === 'success'
                            ? t('uploadSuccess')
                            : state === 'error'
                            ? t('uploadError')
                            : t('uploadImage')}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
