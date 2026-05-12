'use client'

/**
 * Cart error boundary — rendered by Next.js when the cart page throws.
 *
 * Must be a Client Component so it can receive the reset() callback.
 * Strings are bilingual (AR + EN) because this boundary may render before
 * next-intl messages are available.
 */

import * as React from 'react'
import { Button } from '@/components/ui/Button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function CartError({ reset }: ErrorProps): React.ReactElement {
  return (
    <div style={{ maxWidth: 640, margin: '80px auto', padding: '0 32px', textAlign: 'center' }}>
      <p
        style={{
          fontFamily: 'var(--ff-display)',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: 8,
        }}
      >
        تعذّر تحميل السلة
      </p>
      <p
        style={{
          fontFamily: 'var(--ff-sans)',
          fontSize: 14,
          color: 'var(--muted)',
          marginBottom: 24,
        }}
      >
        Could not load your shopping cart
      </p>
      <Button variant="secondary" size="md" onClick={reset}>
        إعادة المحاولة / Retry
      </Button>
    </div>
  )
}
