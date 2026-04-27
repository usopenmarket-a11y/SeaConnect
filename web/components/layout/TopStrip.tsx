import * as React from 'react'

/**
 * TopStrip — dark monospace bar above the nav.
 *
 * Matches TopStrip() from Design/shared.jsx exactly.
 * Server Component — static data, no client interactivity needed.
 * The inner content is direction:ltr (numbers, coords) per the design.
 */
export function TopStrip(): React.ReactElement {
  return (
    <div className="top-strip" data-screen-label="top-strip">
      <div className="strip-group">
        <span>EST. 2026</span>
        <span>CAIRO · EGYPT</span>
        <span>RED SEA · MEDITERRANEAN · NILE</span>
      </div>
      <div className="strip-group">
        <span>WIND 12 KTS NE</span>
        <span>SWELL 0.8 M</span>
        <span>AIR 27°C</span>
        <span>BOATS LIVE · 183</span>
      </div>
    </div>
  )
}
