/**
 * Yacht detail loading skeleton — rendered by Next.js while the page streams.
 */

import * as React from 'react'

export default function YachtDetailLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Back link skeleton */}
      <div className="mb-6 h-4 w-24 animate-pulse rounded bg-ink/10" />

      {/* Hero image skeleton */}
      <div className="mb-6 h-72 w-full animate-pulse rounded-2xl bg-ink/10 sm:h-96" />

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="h-9 w-3/4 animate-pulse rounded-lg bg-ink/10" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-full animate-pulse rounded bg-ink/10" />
            <div className="h-4 w-full animate-pulse rounded bg-ink/10" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-ink/10" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-ink/10"
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 rounded-2xl bg-sand p-6 shadow-sm">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-ink/10" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-ink/10" />
          <div className="h-12 w-full animate-pulse rounded-lg bg-ink/10" />
        </div>
      </div>
    </div>
  )
}
