'use client'

/**
 * MapClient — thin client shell that lazy-loads LeafletMap via dynamic import.
 * Leaflet reads window/document at import time, so ssr: false is mandatory.
 * All translated strings are passed down as props from the Server Component.
 */

import dynamic from 'next/dynamic'
import type { LeafletMapProps } from './LeafletMap'

const LeafletMap = dynamic(
  () => import('./LeafletMap').then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'oklch(0.68 0.06 215)',
          color: 'oklch(0.97 0.008 210)',
          fontFamily: 'var(--ff-mono)',
          fontSize: 13,
          letterSpacing: '0.08em',
        }}
      >
        LOADING MAP…
      </div>
    ),
  }
)

export function MapClient(props: LeafletMapProps) {
  return <LeafletMap {...props} />
}
