'use client'

/**
 * Marketplace error boundary — rendered by Next.js when the page throws.
 *
 * Must be a Client Component so it can use the reset() callback.
 * Strings are hardcoded AR + EN because this boundary may render before
 * next-intl messages are available.
 */

import * as React from 'react'
import { Button } from '@/components/ui/Button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MarketplaceError({ reset }: ErrorProps): React.ReactElement {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <p className="font-display text-xl font-bold text-ink">
          حدث خطأ أثناء تحميل المتجر
        </p>
        <p className="text-sm text-ink/60">An error occurred while loading the marketplace</p>
        <Button variant="secondary" size="md" onClick={reset}>
          إعادة المحاولة / Retry
        </Button>
      </div>
    </div>
  )
}
