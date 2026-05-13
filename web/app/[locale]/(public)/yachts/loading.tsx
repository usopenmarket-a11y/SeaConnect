/**
 * Yachts list loading skeleton — shown by Next.js while the page is streaming.
 *
 * Mirrors the grid layout of yachts/page.tsx so the shift when content
 * loads is minimal. No strings needed — purely decorative.
 */

import * as React from 'react'

export default function YachtsLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Heading skeleton */}
      <div className="mb-8 h-9 w-56 animate-pulse rounded-lg bg-ink/10" />

      {/* Card grid skeleton */}
      <ul
        role="list"
        aria-busy="true"
        aria-label="جارٍ تحميل القوارب"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex flex-col overflow-hidden rounded-xl bg-sand shadow-sm"
          >
            {/* Image placeholder */}
            <div className="h-48 w-full animate-pulse bg-ink/10" />

            {/* Text placeholders */}
            <div className="flex flex-col gap-3 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded bg-ink/10" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-ink/10" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-ink/10" />
              <div className="h-9 w-full animate-pulse rounded-lg bg-ink/10" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
