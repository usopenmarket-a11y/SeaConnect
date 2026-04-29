'use client'

/**
 * RegionStrip — horizontal scrollable region chips.
 *
 * Converted from Design/home.jsx Home() region-strip section.
 * Maintains active chip state client-side.
 * Client Component required for useState.
 */

import * as React from 'react'

interface Region {
  ar: string
  en: string
  count: number
}

interface RegionStripProps {
  regions: Region[]
  locale: string
}

export function RegionStrip({ regions, locale }: RegionStripProps): React.ReactElement {
  const [activeRegion, setActiveRegion] = React.useState(0)

  return (
    <div className="region-strip" data-screen-label="region-strip">
      {regions.map((r, i) => (
        <button
          key={i}
          className={`region-chip${activeRegion === i ? ' active' : ''}`}
          onClick={() => setActiveRegion(i)}
        >
          <span>{locale === 'ar' ? r.ar : r.en}</span>
          <span className="count">{r.count}</span>
        </button>
      ))}
    </div>
  )
}
