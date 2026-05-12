'use client'

/**
 * VendorDashboardClient — vendor KPI overview + recent orders.
 *
 * Data sources (all authenticated via in-memory JWT — ADR-009):
 *   GET /marketplace/vendor/products/   → product count KPIs
 *   GET /marketplace/orders/            → recent orders table + pending count
 *   GET /marketplace/vendor-profile/    → store profile banner
 *
 * KPI cards:
 *   - Products listed  — results.length from the products endpoint
 *   - Active products  — filtered count where status === 'active'
 *   - Pending orders   — filtered count where status === 'pending'
 *
 * ADR-009 — JWT attached by get() from @/lib/api (never in localStorage).
 * ADR-013 — cursor pagination; we read results[] not a count field.
 * ADR-014 — logical CSS only (ms-, me-, ps-, pe-).
 * ADR-015 — all strings via t() — never hardcoded in JSX.
 * ADR-018 — currency never hardcoded — read from API response.
 */

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

import { StatCard } from '@/components/owner/StatCard'
import { Card } from '@/components/ui/Card'
import { get, type PaginatedResponse } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

type ProductStatus = 'active' | 'draft' | 'out_of_stock'

interface Product {
  id: string
  name: string
  name_ar: string
  price: string
  currency: string
  stock: number
  status: ProductStatus
  image_url: string | null
}

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

interface OrderItem {
  id: string
  product_name: string
  quantity: number
}

interface Order {
  id: string
  status: OrderStatus
  total_amount: string
  currency: string
  created_at: string
  items: OrderItem[]
}

interface VendorProfile {
  id: string
  store_name: string
  store_name_ar: string
  description: string
  description_ar: string
  logo_url: string | null
  is_verified: boolean
}

interface Props {
  locale: string
}

// ── Fetchers ───────────────────────────────────────────────────────────────────

const fetchProducts = (path: string) =>
  get<PaginatedResponse<Product>>(path)

const fetchOrders = (path: string) =>
  get<PaginatedResponse<Order>>(path)

const fetchProfile = (path: string) =>
  get<VendorProfile>(path)

// ── Component ──────────────────────────────────────────────────────────────────

export function VendorDashboardClient({ locale }: Props): React.ReactElement {
  const t = useTranslations('vendor.dashboard')
  const tCommon = useTranslations('common')

  const swrOpts = { revalidateOnFocus: false } as const

  // Products
  const {
    data: productsData,
    error: productsError,
    isLoading: productsLoading,
  } = useSWR<PaginatedResponse<Product>>(
    '/marketplace/vendor/products/',
    fetchProducts,
    swrOpts,
  )

  // Orders
  const {
    data: ordersData,
    error: ordersError,
    isLoading: ordersLoading,
  } = useSWR<PaginatedResponse<Order>>(
    '/marketplace/orders/',
    fetchOrders,
    swrOpts,
  )

  // Vendor profile
  const {
    data: profileData,
    isLoading: profileLoading,
  } = useSWR<VendorProfile>(
    '/marketplace/vendor-profile/',
    fetchProfile,
    swrOpts,
  )

  const isLoading = productsLoading || ordersLoading || profileLoading
  const hasError = !!(productsError || ordersError)

  // ── Derived KPIs ────────────────────────────────────────────────────────────

  const products = productsData?.results ?? []
  const orders = ordersData?.results ?? []

  const productsListed = products.length
  const activeProducts = products.filter((p) => p.status === 'active').length
  const pendingOrders = orders.filter((o) => o.status === 'pending').length

  // Show only the 5 most recent orders (API returns latest-first)
  const recentOrders = orders.slice(0, 5)

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function formatNumber(n: number): string {
    return locale === 'ar'
      ? n.toLocaleString('ar-EG')
      : n.toLocaleString('en-US')
  }

  function formatAmount(amount: string, currency: string): string {
    const num = Number(amount)
    const formatted =
      locale === 'ar'
        ? num.toLocaleString('ar-EG')
        : num.toLocaleString('en-US')
    return `${formatted} ${currency}`
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(
        locale === 'ar' ? 'ar-EG' : 'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' },
      )
    } catch {
      return iso
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <section dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="mb-6 font-display text-2xl font-bold text-[--ink]">
        {t('title')}
      </h1>

      {/* ── Profile banner ── */}
      {!profileLoading && (
        profileData ? (
          <div className="mb-6 flex items-center gap-4 rounded-2xl bg-[--sand] px-5 py-4">
            {profileData.logo_url ? (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={profileData.logo_url}
                  alt={
                    locale === 'ar'
                      ? profileData.store_name_ar
                      : profileData.store_name
                  }
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[--sea]/10 text-lg font-bold text-[--sea]">
                {(locale === 'ar'
                  ? profileData.store_name_ar
                  : profileData.store_name
                ).charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[--ink]/50">
                {t('profileBanner')}
              </p>
              <p className="truncate text-base font-bold text-[--ink]">
                {locale === 'ar'
                  ? profileData.store_name_ar
                  : profileData.store_name}
              </p>
            </div>
            {profileData.is_verified && (
              <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                {t('verified')}
              </span>
            )}
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-[--sea]/5 px-5 py-4">
            <p className="text-sm text-[--ink]/70">{t('completeProfile')}</p>
            <Link
              href={`/${locale}/vendor/products`}
              className="shrink-0 rounded-lg bg-[--sea] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('completeProfile')}
            </Link>
          </div>
        )
      )}

      {/* ── Loading state ── */}
      {isLoading && (
        <p className="py-8 text-center text-[--ink]/50">{tCommon('loading')}</p>
      )}

      {/* ── Error state ── */}
      {hasError && (
        <Card>
          <Card.Body>
            <p role="alert" className="py-6 text-center text-red-600">
              {t('loadError')}
            </p>
          </Card.Body>
        </Card>
      )}

      {/* ── KPI cards — visible once data has loaded ── */}
      {!isLoading && !hasError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label={t('productsListed')}
            value={formatNumber(productsListed)}
          />
          <StatCard
            label={t('activeProducts')}
            value={formatNumber(activeProducts)}
          />
          <StatCard
            label={t('pendingOrders')}
            value={formatNumber(pendingOrders)}
          />
        </div>
      )}

      {/* ── Recent orders table ── */}
      {!isLoading && !hasError && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-xl font-semibold text-[--ink]">
            {t('recentOrders')}
          </h2>

          {recentOrders.length === 0 ? (
            <Card>
              <Card.Body>
                <p className="py-6 text-center text-[--ink]/50">
                  {t('noOrders')}
                </p>
              </Card.Body>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-[--sand]">
              <table className="w-full min-w-[40rem]">
                <thead>
                  <tr>
                    {(
                      [
                        'orderId',
                        'items',
                        'total',
                        'status',
                        'date',
                      ] as const
                    ).map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[--ink]/50"
                      >
                        {t(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-[--ink]/8 transition-colors hover:bg-[--ink]/3"
                    >
                      {/* Order ID — first 8 chars */}
                      <td className="px-4 py-3 font-mono text-sm font-medium text-[--ink]">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>

                      {/* Items count */}
                      <td className="px-4 py-3 font-mono text-sm text-[--ink]">
                        {formatNumber(order.items?.length ?? 0)}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 font-mono text-sm text-[--ink]">
                        {formatAmount(order.total_amount, order.currency)}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            order.status === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-[--ink]/10 text-[--ink]/60'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-sm text-[--ink]/70">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
