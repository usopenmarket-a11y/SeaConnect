/**
 * MarqueeBand — animated stats/numbers horizontal scrolling band.
 *
 * Converted from Design/home.jsx MarqueeBand().
 * Uses CSS animation @keyframes marquee-x (already in globals.css).
 * Items are doubled to create seamless infinite loop.
 * Server Component — pure CSS animation, no client state needed.
 *
 * ADR-015: all strings via i18n keys. Receives locale to resolve the
 * correct label from the marquee namespace.
 */

import * as React from 'react'
import { getTranslations } from 'next-intl/server'

const MARQUEE_NUMS = ['183', '12', '4.92', '24H', '100K', '12', '0%', '8,400+'] as const
const MARQUEE_KEYS = [
  'vessels', 'regions', 'rating', 'escrow',
  'insurance', 'tournaments', 'commission', 'hours',
] as const

interface MarqueeBandProps {
  locale: string
}

export async function MarqueeBand({ locale }: MarqueeBandProps): Promise<React.ReactElement> {
  const t = await getTranslations({ locale, namespace: 'marquee' })

  const items = MARQUEE_NUMS.map((num, i) => ({ num, label: t(MARQUEE_KEYS[i]) }))
  const allItems = [...items, ...items]

  return (
    <div className="marquee-band" data-screen-label="marquee-band">
      <div className="marquee-viewport">
        <div className="marquee-track">
          {allItems.map(({ num, label }, i) => (
            <span key={i} className="item">
              <span className="n num">{num}</span>
              <span
                style={{
                  fontSize: 13,
                  fontFamily: 'var(--ff-mono)',
                  letterSpacing: '0.1em',
                  color: 'oklch(0.78 0.02 220)',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </span>
              <span className="sep" />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
