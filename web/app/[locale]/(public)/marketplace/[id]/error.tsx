'use client'

/**
 * Marketplace product detail error boundary.
 *
 * Client Component — must use reset() callback.
 * Strings hardcoded AR + EN (may render before next-intl messages load).
 */

import * as React from 'react'
import { Button } from '@/components/ui/Button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MarketplaceProductError({ reset }: ErrorProps): React.ReactElement {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <p className="font-display text-xl font-bold text-ink">
          حدث خطأ أثناء تحميل المنتج
        </p>
        <p className="text-sm text-ink/60">An error occurred while loading this product</p>
        <Button variant="secondary" size="md" onClick={reset}>
          إعادة المحاولة / Retry
        </Button>
      </div>
    </div>
  )
}
