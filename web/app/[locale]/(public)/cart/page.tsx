'use client'

/**
 * Cart page — Client Component.
 *
 * Displays the customer's shopping cart with editable quantities and a
 * subtotal summary that links to checkout.
 *
 * ADR-009: auth token from in-memory store via getAccessToken().
 * ADR-014: logical CSS properties throughout (ms-/me-/ps-/pe-).
 * ADR-015: all strings via useTranslations('cart').
 * ADR-018: currency read from API response items — never hardcoded.
 */

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import useSWR, { mutate as globalMutate } from 'swr'

import { get, getAccessToken } from '@/lib/api'
import { AuthGuard } from '@/components/auth/AuthGuard'

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

// ── API helpers ───────────────────────────────────────────────────────────────

const CART_KEY = '/marketplace/cart/'

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'

async function patchCartItem(
  itemId: string,
  quantity: number,
): Promise<void> {
  const token = getAccessToken()
  const res = await fetch(
    `${apiUrl}/api/v1/marketplace/cart/items/${itemId}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ quantity }),
    },
  )
  if (!res.ok) throw new Error('patch_failed')
}

async function deleteCartItem(itemId: string): Promise<void> {
  const token = getAccessToken()
  const res = await fetch(
    `${apiUrl}/api/v1/marketplace/cart/items/${itemId}/`,
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  )
  if (!res.ok && res.status !== 204) throw new Error('delete_failed')
}

// ── Cart table row ─────────────────────────────────────────────────────────────

interface CartRowProps {
  item: CartItem
  locale: string
  onQuantityChange: (itemId: string, qty: number) => void
  onDelete: (itemId: string) => void
  updateError: string | null
}

function CartRow({
  item,
  locale,
  onQuantityChange,
  onDelete,
  updateError,
}: CartRowProps): React.ReactElement {
  const t = useTranslations('cart')
  const isAr = locale === 'ar'

  const displayName = isAr
    ? item.product.name_ar || item.product.name
    : item.product.name

  const currency = item.product.currency || 'EGP'
  const unitPrice = Number(item.product.price) || 0
  const lineTotal = Number(item.line_total) || 0

  const displayUnitPrice = isAr
    ? unitPrice.toLocaleString('ar-EG')
    : unitPrice.toLocaleString('en')
  const displayLineTotal = isAr
    ? lineTotal.toLocaleString('ar-EG')
    : lineTotal.toLocaleString('en')

  return (
    <tr
      style={{
        borderBottom: '1px solid var(--rule)',
      }}
    >
      {/* Thumbnail + name */}
      <td style={{ padding: '16px 12px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 4,
              background: 'var(--sand)',
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
                sizes="64px"
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'var(--sand)',
                }}
              />
            )}
          </div>
          <span
            style={{
              fontFamily: 'var(--ff-sans)',
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--ink)',
            }}
          >
            {displayName}
          </span>
        </div>
      </td>

      {/* Quantity */}
      <td style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
        <input
          type="number"
          min={1}
          max={99}
          value={item.quantity}
          aria-label={t('quantity')}
          onChange={(e) => {
            const qty = parseInt(e.target.value, 10)
            if (!isNaN(qty) && qty >= 1) {
              onQuantityChange(item.id, qty)
            }
          }}
          style={{
            width: 64,
            padding: '6px 8px',
            border: '1px solid var(--rule)',
            borderRadius: 4,
            fontFamily: 'var(--ff-mono)',
            fontSize: 15,
            textAlign: 'center',
            background: 'var(--pearl)',
            color: 'var(--ink)',
          }}
        />
        {updateError && (
          <p
            role="alert"
            style={{
              fontSize: 11,
              color: '#c0392b',
              marginTop: 4,
              fontFamily: 'var(--ff-sans)',
            }}
          >
            {updateError}
          </p>
        )}
      </td>

      {/* Unit price */}
      <td
        style={{
          padding: '16px 12px',
          verticalAlign: 'middle',
          textAlign: 'center',
          fontFamily: 'var(--ff-mono)',
          fontSize: 14,
          color: 'var(--ink)',
        }}
      >
        {displayUnitPrice} <span style={{ color: 'var(--muted)', fontSize: 12 }}>{currency}</span>
      </td>

      {/* Line total */}
      <td
        style={{
          padding: '16px 12px',
          verticalAlign: 'middle',
          textAlign: 'center',
          fontFamily: 'var(--ff-mono)',
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--ink)',
        }}
      >
        {displayLineTotal} <span style={{ color: 'var(--muted)', fontSize: 12 }}>{currency}</span>
      </td>

      {/* Delete */}
      <td style={{ padding: '16px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
        <button
          onClick={() => onDelete(item.id)}
          aria-label={t('remove')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#c0392b',
            fontFamily: 'var(--ff-sans)',
            fontSize: 13,
            padding: '4px 8px',
            borderRadius: 4,
          }}
        >
          {t('remove')}
        </button>
      </td>
    </tr>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function CartSkeleton(): React.ReactElement {
  return (
    <div style={{ padding: '48px 48px', maxWidth: 900, margin: '0 auto' }}>
      <div
        style={{
          height: 32,
          width: 240,
          background: 'var(--sand)',
          marginBottom: 32,
          animation: 'pulse 1.5s ease-in-out infinite',
          borderRadius: 4,
        }}
      />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 80,
            background: 'var(--sand)',
            marginBottom: 12,
            animation: 'pulse 1.5s ease-in-out infinite',
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  )
}

// ── Cart inner ────────────────────────────────────────────────────────────────

interface CartInnerProps {
  locale: string
}

function CartInner({ locale }: CartInnerProps): React.ReactElement {
  const t = useTranslations('cart')
  const isAr = locale === 'ar'

  // Debounce timers stored per item id
  const debounceTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Per-item update error state
  const [updateErrors, setUpdateErrors] = React.useState<Record<string, string | null>>({})

  const { data, error, isLoading } = useSWR<CartData>(
    CART_KEY,
    (path: string) => get<CartData>(path),
  )

  function handleQuantityChange(itemId: string, qty: number): void {
    // Clear previous debounce for this item
    if (debounceTimers.current[itemId]) {
      clearTimeout(debounceTimers.current[itemId])
    }
    // Clear any existing error for this item
    setUpdateErrors((prev) => ({ ...prev, [itemId]: null }))

    debounceTimers.current[itemId] = setTimeout(async () => {
      try {
        await patchCartItem(itemId, qty)
        void globalMutate(CART_KEY)
      } catch {
        setUpdateErrors((prev) => ({ ...prev, [itemId]: t('updateError') }))
      }
    }, 500)
  }

  async function handleDelete(itemId: string): Promise<void> {
    try {
      await deleteCartItem(itemId)
      void globalMutate(CART_KEY)
    } catch {
      // Non-fatal — cart will remain as-is
    }
  }

  if (isLoading) {
    return <CartSkeleton />
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

  const items = data?.items ?? []
  const currency = items[0]?.product.currency ?? 'EGP'

  // Compute subtotal from line_totals
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.line_total) || 0),
    0,
  )

  const displaySubtotal = isAr
    ? subtotal.toLocaleString('ar-EG')
    : subtotal.toLocaleString('en')

  // Empty cart state
  if (items.length === 0) {
    return (
      <div
        style={{
          padding: '80px 48px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--ink)',
          }}
        >
          {t('empty')}
        </p>
        <p
          style={{
            fontFamily: 'var(--ff-sans)',
            fontSize: 15,
            color: 'var(--muted)',
          }}
        >
          {t('emptyHint')}
        </p>
        <Link
          href={`/${locale}/marketplace`}
          className="btn btn-sea"
          style={{
            marginTop: 8,
            padding: '12px 28px',
            fontFamily: 'var(--ff-sans)',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          {t('browseShopping')}
        </Link>
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '40px 32px',
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: 32,
        alignItems: 'start',
      }}
    >
      {/* Cart table */}
      <div>
        <h1
          className="display"
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 24,
            color: 'var(--ink)',
          }}
        >
          {t('title')}
        </h1>

        <div
          style={{
            border: '1px solid var(--rule)',
            borderRadius: 6,
            overflow: 'hidden',
            background: 'var(--sand)',
          }}
        >
          <table
            style={{ width: '100%', borderCollapse: 'collapse' }}
            aria-label={t('title')}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--ink)',
                  background: 'var(--pearl)',
                }}
              >
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'start',
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  {t('product')}
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  {t('quantity')}
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  {t('unitPrice')}
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  {t('lineTotal')}
                </th>
                <th style={{ padding: '12px', width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <CartRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  onQuantityChange={handleQuantityChange}
                  onDelete={handleDelete}
                  updateError={updateErrors[item.id] ?? null}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary sidebar */}
      <div
        style={{
          background: 'var(--sand)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          padding: 24,
          position: 'sticky',
          top: 88,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--ff-sans)',
            fontWeight: 700,
            fontSize: 18,
            color: 'var(--ink)',
            marginBottom: 20,
            borderBottom: '1px solid var(--rule)',
            paddingBottom: 12,
          }}
        >
          {t('subtotal')}
        </h2>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 24,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--ff-sans)',
              fontSize: 15,
              color: 'var(--muted)',
            }}
          >
            {t('subtotal')}
          </span>
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--ink)',
            }}
          >
            {displaySubtotal}{' '}
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>
              {currency}
            </span>
          </span>
        </div>

        <Link
          href={`/${locale}/checkout`}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px 0',
            background: 'var(--sea)',
            color: '#fff',
            borderRadius: 4,
            textAlign: 'center',
            fontFamily: 'var(--ff-sans)',
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
        >
          {t('proceedCheckout')}
        </Link>
      </div>
    </div>
  )
}

// ── Page shell ─────────────────────────────────────────────────────────────────

interface PageProps {
  params: { locale: string }
}

function CartPageInner({ params: { locale } }: PageProps): React.ReactElement {
  return (
    <AuthGuard locale={locale}>
      <CartInner locale={locale} />
    </AuthGuard>
  )
}

export default function CartPage({ params }: PageProps): React.ReactElement {
  return <CartPageInner params={params} />
}
