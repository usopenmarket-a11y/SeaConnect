/**
 * MarqueeBand — animated stats/numbers horizontal scrolling band.
 *
 * Converted from Design/home.jsx MarqueeBand().
 * Uses CSS animation @keyframes marquee-x (already in globals.css).
 * Items are doubled to create seamless infinite loop.
 * Server Component — pure CSS animation, no client state needed.
 */

import * as React from 'react'

const MARQUEE_ITEMS = [
  ['183', 'قارب معتمد · VESSELS'],
  ['12', 'منطقة بحرية · REGIONS'],
  ['4.92', 'متوسط التقييم · RATING'],
  ['24H', 'حماية الضمان · ESCROW'],
  ['100K', 'EGP تأمين لكل مسافر'],
  ['12', 'بطولات هذا الموسم · TOURNAMENTS'],
  ['0%', 'عمولة · أول ٣ شهور'],
  ['8,400+', 'ساعة إبحار · LOGGED'],
] as const

// Double items for seamless loop
const ALL_ITEMS = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]

export function MarqueeBand(): React.ReactElement {
  return (
    <div className="marquee-band" data-screen-label="marquee-band">
      <div className="marquee-viewport">
        <div className="marquee-track">
          {ALL_ITEMS.map(([n, l], i) => (
            <span key={i} className="item">
              <span className="n num">{n}</span>
              <span
                style={{
                  fontSize: 13,
                  fontFamily: 'var(--ff-mono)',
                  letterSpacing: '0.1em',
                  color: 'oklch(0.78 0.02 220)',
                  textTransform: 'uppercase',
                }}
              >
                {l}
              </span>
              <span className="sep" />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
