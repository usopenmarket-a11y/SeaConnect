'use client'

/**
 * AddToCartButton — Client Component for marketplace product detail.
 *
 * Uses useAuth() to check login state.
 * - Not logged in → renders a Link to /{locale}/login.
 * - Logged in → calls POST /api/v1/marketplace/cart/items/ with Bearer token.
 *
 * States: idle → loading (adding) → success (addedToCart) → idle (after 3s)
 *
 * ADR-009: token read from in-memory store via getAccessToken().
 * ADR-015: all strings via useTranslations('marketplace.detail').
 */

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth'
import { getAccessToken } from '@/lib/api'

interface AddToCartButtonProps {
  productId: string
  locale: string
  outOfStock?: boolean
}

type CartState = 'idle' | 'loading' | 'success' | 'error'

export function AddToCartButton({
  productId,
  locale,
  outOfStock = false,
}: AddToCartButtonProps): React.ReactElement {
  const t = useTranslations('marketplace.detail')
  const { user } = useAuth()
  const [state, setState] = React.useState<CartState>('idle')

  // If user is not logged in, show a login prompt link styled as a button
  if (!user) {
    return (
      <Link
        href={`/${locale}/login`}
        className="btn btn-clay btn-lg"
        style={{ display: 'inline-block', textAlign: 'center' }}
      >
        {t('loginToAdd')}
      </Link>
    )
  }

  // Out of stock state
  if (outOfStock) {
    return (
      <button className="btn btn-ghost btn-lg" disabled>
        {t('outOfStock')}
      </button>
    )
  }

  async function handleAddToCart(): Promise<void> {
    if (state === 'loading' || state === 'success') return
    setState('loading')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
      const token = getAccessToken()
      const res = await fetch(`${apiUrl}/api/v1/marketplace/cart/items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      })

      if (!res.ok) {
        setState('error')
        setTimeout(() => setState('idle'), 3000)
        return
      }

      setState('success')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const label =
    state === 'loading'
      ? t('adding')
      : state === 'success'
        ? t('addedToCart')
        : t('addToCart')

  return (
    <button
      className="btn btn-clay btn-lg"
      onClick={handleAddToCart}
      disabled={state === 'loading'}
      aria-busy={state === 'loading'}
      style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
    >
      {label}
    </button>
  )
}
