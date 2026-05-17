import * as React from 'react'

/**
 * Skeleton shown while the edit-yacht form page fetches the existing yacht data.
 */
export default function Loading(): React.ReactElement {
  return (
    <section className="animate-pulse">
      <div className="rounded-xl bg-sand p-6">
        {/* Card header */}
        <div className="mb-6 h-7 w-44 rounded-md bg-ink/10" />

        {/* Name row */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-28 rounded bg-ink/10" />
            <div className="h-10 w-full rounded-lg bg-ink/10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-28 rounded bg-ink/10" />
            <div className="h-10 w-full rounded-lg bg-ink/10" />
          </div>
        </div>

        {/* Description row */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-36 rounded bg-ink/10" />
            <div className="h-20 w-full rounded-lg bg-ink/10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-36 rounded bg-ink/10" />
            <div className="h-20 w-full rounded-lg bg-ink/10" />
          </div>
        </div>

        {/* Capacity / Price / Type */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-4 w-24 rounded bg-ink/10" />
              <div className="h-10 w-full rounded-lg bg-ink/10" />
            </div>
          ))}
        </div>

        {/* Port selector */}
        <div className="mb-6 flex flex-col gap-1.5">
          <div className="h-4 w-32 rounded bg-ink/10" />
          <div className="h-10 w-full rounded-lg bg-ink/10" />
        </div>

        {/* Save button */}
        <div className="h-10 w-full rounded-lg bg-ink/10" />
      </div>
    </section>
  )
}
