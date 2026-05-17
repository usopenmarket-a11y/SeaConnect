'use client'

/**
 * Vendor Orders page — Client Component.
 *
 * Displays incoming orders with status filter tabs and action buttons.
 * Based on SellerBookings() from Design/seller-pages.jsx.
 *
 * Columns: order ref, customer, product(s), quantity, amount, status, date.
 * Status tabs: All / Pending / Processing / Shipped / Delivered.
 * Actions: Confirm / Ship / Cancel per row.
 *
 * Mock data in use until Sprint 12 API wiring.
 *
 * ADR-009 — JWT via get() in lib/api.ts (never localStorage).
 * ADR-013 — cursor pagination, results[] only.
 * ADR-014 — logical CSS only (inset-inline, border-inline-start).
 * ADR-015 — all strings via t().
 * ADR-018 — currency from order object, never hardcoded.
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

interface OrderItem {
  name: string
  quantity: number
}

interface VendorOrder {
  id: string
  ref: string
  customerName: string
  customerAvatar: string
  items: OrderItem[]
  totalAmount: number
  currency: string
  status: OrderStatus
  createdAt: string
}

type FilterKey = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered'

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_ORDERS: VendorOrder[] = [
  {
    id: 'ord-001',
    ref: 'ORD-7421',
    customerName: 'نور حسن',
    customerAvatar: 'ن',
    items: [{ name: 'Shimano Spinning Rod Pro', quantity: 1 }, { name: 'Fishing Reel 4000', quantity: 2 }],
    totalAmount: 4250,
    currency: 'EGP',
    status: 'pending',
    createdAt: '2026-05-12T09:30:00Z',
  },
  {
    id: 'ord-002',
    ref: 'ORD-7418',
    customerName: 'Liam Carter',
    customerAvatar: 'L',
    items: [{ name: 'Underwater Camera Housing', quantity: 1 }],
    totalAmount: 6800,
    currency: 'EGP',
    status: 'processing',
    createdAt: '2026-05-11T14:15:00Z',
  },
  {
    id: 'ord-003',
    ref: 'ORD-7409',
    customerName: 'أحمد لطفي',
    customerAvatar: 'أ',
    items: [{ name: 'Deep Sea Lure Set', quantity: 3 }, { name: 'Fishing Line 100m', quantity: 5 }],
    totalAmount: 1890,
    currency: 'EGP',
    status: 'shipped',
    createdAt: '2026-05-10T08:00:00Z',
  },
  {
    id: 'ord-004',
    ref: 'ORD-7398',
    customerName: 'Sara Klein',
    customerAvatar: 'S',
    items: [{ name: 'Life Vest XL', quantity: 2 }],
    totalAmount: 3200,
    currency: 'EGP',
    status: 'delivered',
    createdAt: '2026-05-08T11:45:00Z',
  },
  {
    id: 'ord-005',
    ref: 'ORD-7385',
    customerName: 'منى صبري',
    customerAvatar: 'م',
    items: [{ name: 'Tackle Box Pro', quantity: 1 }],
    totalAmount: 980,
    currency: 'EGP',
    status: 'pending',
    createdAt: '2026-05-07T16:20:00Z',
  },
]

const STATUS_FILTERS: { key: FilterKey; statuses: OrderStatus[] | null }[] = [
  { key: 'all', statuses: null },
  { key: 'pending', statuses: ['pending'] },
  { key: 'processing', statuses: ['processing'] },
  { key: 'shipped', statuses: ['shipped'] },
  { key: 'delivered', statuses: ['delivered'] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string, locale: string): string {
  const formatted =
    locale === 'ar'
      ? amount.toLocaleString('ar-EG')
      : amount.toLocaleString('en-US')
  return `${formatted} ${currency}`
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(
      locale === 'ar' ? 'ar-EG' : 'en-GB',
      { day: 'numeric', month: 'short', year: 'numeric' },
    )
  } catch {
    return iso
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  locale: string
}

export function VendorOrdersPageClient({ locale }: Props): React.ReactElement {
  const t = useTranslations('vendor.orders')

  const [activeFilter, setActiveFilter] = React.useState<FilterKey>('all')

  const visible = React.useMemo(() => {
    const filter = STATUS_FILTERS.find((f) => f.key === activeFilter)
    if (!filter || filter.statuses === null) return MOCK_ORDERS
    return MOCK_ORDERS.filter((o) => filter.statuses!.includes(o.status))
  }, [activeFilter])

  function handleConfirm(id: string): void {
    // TODO Sprint 12: POST /marketplace/orders/{id}/confirm/
    void id
  }

  function handleShip(id: string): void {
    // TODO Sprint 12: POST /marketplace/orders/{id}/ship/
    void id
  }

  function handleCancel(id: string): void {
    // TODO Sprint 12: POST /marketplace/orders/{id}/cancel/
    void id
  }

  return (
    <section>
      <h1 className="mb-6 font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>
        {t('title')}
      </h1>

      {/* Status filter tabs */}
      <div className="bl-tabs mb-4">
        {STATUS_FILTERS.map((f) => {
          const count =
            f.statuses === null
              ? MOCK_ORDERS.length
              : MOCK_ORDERS.filter((o) => f.statuses!.includes(o.status)).length
          return (
            <button
              key={f.key}
              type="button"
              className={`bl-tab${activeFilter === f.key ? ' active' : ''}`}
              onClick={() => setActiveFilter(f.key)}
              aria-pressed={activeFilter === f.key}
            >
              {t(`filter.${f.key}`)}
              <span className="n mono">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Orders table */}
      {visible.length === 0 ? (
        <div className="dash-card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          {t('empty')}
        </div>
      ) : (
        <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="dash-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>{t('table.ref')}</th>
                <th>{t('table.customer')}</th>
                <th>{t('table.products')}</th>
                <th>{t('table.quantity')}</th>
                <th>{t('table.amount')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.date')}</th>
                <th>{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order.id}>
                  {/* Ref */}
                  <td className="mono" style={{ fontSize: 12, color: 'var(--muted)', direction: 'ltr' }}>
                    {order.ref}
                  </td>

                  {/* Customer */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        className="brq-avatar"
                        style={{ width: 32, height: 32, fontSize: 14, flexShrink: 0 }}
                        aria-hidden="true"
                      >
                        {order.customerAvatar}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{order.customerName}</span>
                    </div>
                  </td>

                  {/* Products */}
                  <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                    {order.items.map((item) => item.name).join('، ')}
                  </td>

                  {/* Quantity */}
                  <td className="mono" style={{ textAlign: 'center', fontSize: 13 }}>
                    {order.items.reduce((sum, i) => sum + i.quantity, 0)}
                  </td>

                  {/* Amount */}
                  <td className="num" style={{ fontWeight: 600, direction: 'ltr' }}>
                    {formatAmount(order.totalAmount, order.currency, locale)}
                  </td>

                  {/* Status badge */}
                  <td>
                    <StatusBadge status={order.status} t={t} />
                  </td>

                  {/* Date */}
                  <td style={{ fontSize: 12, color: 'var(--muted-2)' }}>
                    {formatDate(order.createdAt, locale)}
                  </td>

                  {/* Actions */}
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {order.status === 'pending' && (
                        <button
                          type="button"
                          className="btn-accept"
                          style={{ padding: '6px 14px', fontSize: 12 }}
                          onClick={() => handleConfirm(order.id)}
                        >
                          {t('action.confirm')}
                        </button>
                      )}
                      {order.status === 'processing' && (
                        <button
                          type="button"
                          className="btn-accept"
                          style={{ padding: '6px 14px', fontSize: 12 }}
                          onClick={() => handleShip(order.id)}
                        >
                          {t('action.ship')}
                        </button>
                      )}
                      {(order.status === 'pending' || order.status === 'processing') && (
                        <button
                          type="button"
                          className="btn-decline"
                          style={{ padding: '6px 14px', fontSize: 12 }}
                          onClick={() => handleCancel(order.id)}
                        >
                          {t('action.cancel')}
                        </button>
                      )}
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

// ── Status badge sub-component ────────────────────────────────────────────────

function StatusBadge({
  status,
  t,
}: {
  status: OrderStatus
  t: ReturnType<typeof useTranslations<'vendor.orders'>>
}): React.ReactElement {
  const colorMap: Record<OrderStatus, string> = {
    pending: 'pending',
    processing: 'warn',
    shipped: 'live',
    delivered: 'ok',
    cancelled: '',
  }
  const pillClass = colorMap[status] ? `pill-status ${colorMap[status]}` : 'pill-status'
  return <span className={pillClass}>{t(`status.${status}`)}</span>
}
