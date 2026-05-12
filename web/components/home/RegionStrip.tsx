'use client'

/**
 * RegionStrip — horizontal scrollable region chips.
 *
 * Converted from Design/home.jsx Home() region-strip section.
 * Maintains active chip state client-side.
 * Client Component required for useState.
 *
 * ADR-015: region labels are passed pre-translated from the Server Component
 * parent via the `label` field — no hardcoded strings here.
 */

import * as React from 'react'

interface Region {
  label: string
  count: number
}

interface RegionStripProps {
  regions: Region[]
}

export function RegionStrip({ regions }: RegionStripProps): React.ReactElement {
  const [activeRegion, setActiveRegion] = React.useState(0)

  return (
    <div className="region-strip" data-screen-label="region-strip">
      {regions.map((r, i) => (
        <button
          key={i}
          className={`region-chip${activeRegion === i ? ' active' : ''}`}
          onClick={() => setActiveRegion(i)}
        >
          <span>{r.label}</span>
          <span className="count">{r.count}</span>
        </button>
      ))}
    </div>
  )
}
