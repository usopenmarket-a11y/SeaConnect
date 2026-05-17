'use client'

/**
 * Error boundary for the new-yacht form page.
 * Displayed when an unhandled exception propagates out of the page component.
 */

import * as React from 'react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props): React.ReactElement {
  return (
    <section>
      <div className="rounded-xl bg-red-50 p-6">
        <h2 className="mb-2 font-display text-lg font-bold text-red-700">
          حدث خطأ غير متوقع
        </h2>
        <p className="mb-4 text-sm text-red-600">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          إعادة المحاولة
        </button>
      </div>
    </section>
  )
}
