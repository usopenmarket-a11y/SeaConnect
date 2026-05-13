'use client'

/**
 * Yacht detail error boundary — rendered by Next.js when the page throws.
 *
 * Must be a Client Component to use the reset() callback.
 */

import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function YachtDetailError({
  reset,
}: ErrorProps): React.ReactElement {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <p className="font-display text-xl font-bold text-ink">
          تعذّر تحميل بيانات القارب
        </p>
        <p className="text-sm text-ink/60">
          Could not load yacht details
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" size="md" onClick={reset}>
            إعادة المحاولة / Retry
          </Button>
          <Link
            href="/ar/yachts"
            className="inline-flex items-center justify-center rounded-lg border border-ink/20 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2"
          >
            رجوع / Back
          </Link>
        </div>
      </div>
    </div>
  )
}
