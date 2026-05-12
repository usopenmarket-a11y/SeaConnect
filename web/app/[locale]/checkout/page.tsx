'use client'

/**
 * Checkout page — two-step: shipping address → order confirmation.
 *
 * Step 1: collect shipping_address, POST /marketplace/orders/
 * Step 2: show confirmed order ID, items, and total.
 *
 * ADR-009: auth token from in-memory store via getAccessToken().
 * ADR-014: logical CSS properties throughout.
 * ADR-015: all strings via useTranslations('checkout').
 * ADR-018: currency read from API response — never hardcoded.
 */

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

import { get, getAccessToken } from '@/lib/api'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Button } from '@/components/ui/Button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartProduct {
  id: string
  name: string
  name_ar: string
  image_url: string | null
  price: string
  currency: string
}

interface CartItem {
  id: string
  product: CartProduct
  product_id: string
  quantity: number
  line_total: string
}

interface CartData {
  id: string
  items: CartItem[]
  item_count: number
}

interface OrderItem {
  id: string
  product: CartProduct
  quantity: number
  line_total: string
}

interface OrderResponse {
  id: string
  status: string
  total_amount: string
  currency: string
  items: OrderItem[]
}

// ── API helpers ───────────────────────────────────────────────────────────────

const CART_KEY = '/marketplace/cart/'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'

async function placeOrder(shippingAddress: string): Promise<OrderResponse> {
  const token = getAccessToken()
  const res = await fetch(`${API_URL}/api/v1/marketplace/orders/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ shipping_address: shippingAddress }),
  })
  if (!res.ok) {
    throw new Error('order_failed')
  }
  return res.json() as Promise<OrderResponse>
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function CheckoutSkeleton(): React.ReactElement {
  return (
    <div style={{ maxWidth: 620, margin: '64px auto', padding: '0 32px' }}>
      <div
        style={{
          height: 32,
          width: 200,
          background: 'var(--sand)',
          marginBottom: 32,
          animation: 'pulse 1.5s ease-in-out infinite',
          borderRadius: 4,
        }}
      />
      <div
        style={{
          height: 120,
          background: 'var(--sand)',
          marginBottom: 16,
          animation: 'pulse 1.5s ease-in-out infinite',
          borderRadius: 4,
        }}
      />
      <div
        style={{
          height: 48,
          width: '50%',
          background: 'var(--sand)',
          animation: 'pulse 1.5s ease-in-out infinite',
          borderRadius: 4,
        }}
      />
    </div>
  )
}

// ── Order summary (confirmation screen) ──────────────────────────────────────

interface OrderSummaryProps {
  order: OrderResponse
  locale: string
}

function OrderSummary({ order, locale }: OrderSummaryProps): React.ReactElement {
  const t = useTranslations('checkout')
  const isAr = locale === 'ar'

  const displayTotal = isAr
    ? Number(order.total_amount).toLocaleString('ar-EG')
    : Number(order.total_amount).toLocaleString('en')

  return (
    <div
      style={{
        maxWidth: 620,
        margin: '64px auto',
        padding: '0 32px',
      }}
    >
      {/* Success banner */}
      <div
        style={{
          background: 'oklch(0.93 0.06 145)',
          border: '1px solid oklch(0.60 0.12 145)',
          borderRadius: 6,
          padding: '20px 24px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span
          style={{ fontSize: 24, lineHeight: 1 }}
          aria-hidden="true"
        >
          ✓
        </span>
        <div>
          <p
            style={{
              fontFamily: 'var(--ff-display)',
              fontSize: 20,
              fontWeight: 700,
              color: 'oklch(0.30 0.10 145)',
              marginBottom: 4,
            }}
          >
            {t('successTitle')}
          </p>
          <p
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 12,
              color: 'oklch(0.40 0.08 145)',
              letterSpacing: '0.05em',
            }}
          >
            {t('orderRef')}: {order.id}
          </p>
        </div>
      </div>

      {/* Items list */}
      <div
        style={{
          background: 'var(--sand)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 24,
        }}
      >
        {order.items.map((item, idx) => {
          const displayName = isAr
            ? item.product.name_ar || item.product.name
            : item.product.name
          const lineTotal = isAr
            ? Number(item.line_total).toLocaleString('ar-EG')
            : Number(item.line_total).toLocaleString('en')
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderBottom:
                  idx < order.items.length - 1 ? '1px solid var(--rule)' : 'none',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 4,
                  background: 'var(--pearl)',
                  flexShrink: 0,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {item.product.image_url ? (
                  <Image
                    src={item.product.image_url}
                    alt={displayName}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="48px"
                  />
                ) : null}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontFamily: 'var(--ff-sans)',
                    fontWeight: 600,
                    fontSize: 14,
                    color: 'var(--ink)',
                    marginBottom: 2,
                  }}
                >
                  {displayName}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 11,
                    color: 'var(--muted)',
                  }}
                >
                  × {item.quantity}
                </p>
              </div>
              <span
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--ink)',
                }}
              >
                {lineTotal}{' '}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>
                  {item.product.currency}
                </span>
              </span>
            </div>
          )
        })}

        {/* Total row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            background: 'var(--pearl)',
            borderTop: '2px solid var(--ink)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            TOTAL
          </span>
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--ink)',
            }}
          >
            {displayTotal}{' '}
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>
              {order.currency}
            </span>
          </span>
        </div>
      </div>

      <Link
        href={`/${locale}/marketplace`}
        style={{
          display: 'inline-block',
          padding: '12px 28px',
          background: 'var(--sea)',
          color: '#fff',
          borderRadius: 4,
          fontFamily: 'var(--ff-sans)',
          fontWeight: 600,
          fontSize: 15,
          textDecoration: 'none',
        }}
      >
        {t('continueShopping')}
      </Link>
    </div>
  )
}

// ── Checkout form (step 1) ────────────────────────────────────────────────────

interface CheckoutFormProps {
  locale: string
  cart: CartData
  onSuccess: (order: OrderResponse) => void
}

function CheckoutForm({
  locale,
  cart,
  onSuccess,
}: CheckoutFormProps): React.ReactElement {
  const t = useTranslations('checkout')
  const isAr = locale === 'ar'

  const [shippingAddress, setShippingAddress] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const currency = cart.items[0]?.product.currency ?? 'EGP'
  const subtotal = cart.items.reduce(
    (sum, item) => sum + (Number(item.line_total) || 0),
    0,
  )
  const displaySubtotal = isAr
    ? subtotal.toLocaleString('ar-EG')
    : subtotal.toLocaleString('en')

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!shippingAddress.trim()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const order = await placeOrder(shippingAddress.trim())
      onSuccess(order)
    } catch {
      setSubmitError(t('orderError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (cart.items.length === 0) {
    return (
      <div style={{ maxWidth: 620, margin: '64px auto', padding: '0 32px', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--ff-sans)',
            color: 'var(--muted)',
            fontSize: 16,
            marginBottom: 24,
          }}
        >
          {t('cartEmpty')}
        </p>
        <Link
          href={`/${locale}/marketplace`}
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: 'var(--sea)',
            color: '#fff',
            borderRadius: 4,
            fontFamily: 'var(--ff-sans)',
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
          }}
        >
          {t('continueShopping')}
        </Link>
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 840,
        margin: '40px auto',
        padding: '0 32px',
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: 32,
        alignItems: 'start',
      }}
    >
      {/* Form column */}
      <div>
        <h1
          className="display"
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 32,
            color: 'var(--ink)',
          }}
        >
          {t('title')}
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="shipping_address"
              style={{
                display: 'block',
                fontFamily: 'var(--ff-sans)',
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--ink)',
                marginBottom: 8,
              }}
            >
              {t('shippingAddress')}
            </label>
            <textarea
              id="shipping_address"
              name="shipping_address"
              rows={4}
              required
              placeholder={t('shippingPlaceholder')}
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid var(--rule)',
                borderRadius: 4,
                fontFamily: 'var(--ff-sans)',
                fontSize: 15,
                color: 'var(--ink)',
                background: 'var(--pearl)',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {submitError && (
            <p
              role="alert"
              style={{
                fontFamily: 'var(--ff-sans)',
                fontSize: 13,
                color: '#c0392b',
                marginBottom: 16,
                padding: '10px 14px',
                background: 'oklch(0.96 0.04 20)',
                border: '1px solid oklch(0.80 0.08 20)',
                borderRadius: 4,
              }}
            >
              {submitError}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            disabled={!shippingAddress.trim()}
            fullWidth
          >
            {isSubmitting ? t('placing') : t('placeOrder')}
          </Button>
        </form>
      </div>

      {/* Order summary sidebar */}
      <div
        style={{
          background: 'var(--sand)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          padding: 20,
          position: 'sticky',
          top: 88,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: 16,
          }}
        >
          ORDER SUMMARY
        </h2>

        {cart.items.map((item) => {
          const displayName = isAr
            ? item.product.name_ar || item.product.name
            : item.product.name
          const lineTotal = isAr
            ? Number(item.line_total).toLocaleString('ar-EG')
            : Number(item.line_total).toLocaleString('en')
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--ff-sans)',
                  fontSize: 13,
                  color: 'var(--ink)',
                  flex: 1,
                  lineHeight: 1.4,
                }}
              >
                {displayName}
                {' '}
                <span
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 11,
                    color: 'var(--muted)',
                  }}
                >
                  × {item.quantity}
                </span>
              </span>
              <span
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 13,
                  color: 'var(--ink)',
                  whiteSpace: 'nowrap',
                }}
              >
                {lineTotal}
              </span>
            </div>
          )
        })}

        <div
          style={{
            borderTop: '2px solid var(--ink)',
            marginTop: 16,
            paddingTop: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--ff-sans)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--ink)',
            }}
          >
            TOTAL
          </span>
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--ink)',
            }}
          >
            {displaySubtotal}{' '}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>
              {currency}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Checkout inner ────────────────────────────────────────────────────────────

interface CheckoutInnerProps {
  locale: string
}

function CheckoutInner({ locale }: CheckoutInnerProps): React.ReactElement {
  const t = useTranslations('checkout')
  const [confirmedOrder, setConfirmedOrder] = React.useState<OrderResponse | null>(null)

  const { data, error, isLoading } = useSWR<CartData>(
    CART_KEY,
    (path: string) => get<CartData>(path),
  )

  if (isLoading) {
    return <CheckoutSkeleton />
  }

  if (error) {
    return (
      <div style={{ padding: '64px 48px', textAlign: 'center' }}>
        <p
          role="alert"
          style={{
            fontFamily: 'var(--ff-sans)',
            color: '#c0392b',
            fontSize: 16,
          }}
        >
          {t('loadError')}
        </p>
      </div>
    )
  }

  if (confirmedOrder) {
    return <OrderSummary order={confirmedOrder} locale={locale} />
  }

  return (
    <CheckoutForm
      locale={locale}
      cart={data ?? { id: '', items: [], item_count: 0 }}
      onSuccess={(order) => setConfirmedOrder(order)}
    />
  )
}

// ── Page shell ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: { locale: string }
}

function CheckoutPageInner({ params: { locale } }: PageProps): React.ReactElement {
  return (
    <AuthGuard locale={locale}>
      <CheckoutInner locale={locale} />
    </AuthGuard>
  )
}

export default function CheckoutPage({ params }: PageProps): React.ReactElement {
  return <CheckoutPageInner params={params} />
}
