import * as React from 'react'

/**
 * PageHero — full-bleed sea canvas hero matching the home Hero treatment.
 *
 * Matches the new design from Design/styles-v2.css .page-hero pattern:
 * - Transparent background so the SeaScene canvas shows through
 * - Magazine kicker (orange dot + issue tag)
 * - Big display title with optional italic em-word (clay accent)
 * - Subtitle line
 * - Bottom spec-bar (3 cells: count | context | issue) echoing home search bar
 *
 * ADR-014: logical CSS (padding-inline, inset-inline).
 * ADR-015: caller passes already-translated strings.
 */

interface PageHeroBarCell {
  label: string
  value: React.ReactNode
  mod?: 'count' | 'issue'
}

interface PageHeroProps {
  kicker: string
  title: React.ReactNode
  subtitle?: string
  bar?: [PageHeroBarCell, PageHeroBarCell, PageHeroBarCell]
}

export function PageHero({ kicker, title, subtitle, bar }: PageHeroProps): React.ReactElement {
  return (
    <div className="page-hero">
      <div className="page-hero-overlay" />
      <div className="page-hero-inner">
        <div className="page-hero-kicker">
          <span className="dot" />
          <span>{kicker}</span>
        </div>
        <h1 className="page-hero-h">{title}</h1>
        {subtitle && <p className="page-hero-sub">{subtitle}</p>}
        {bar && (
          <div className="page-hero-bar">
            {bar.map((cell, i) => (
              <div
                key={i}
                className={`page-hero-bar-cell${cell.mod === 'count' ? ' page-hero-bar-cell--count' : cell.mod === 'issue' ? ' page-hero-bar-cell--issue' : ''}`}
              >
                <div className="label">{cell.label}</div>
                <div className="val">{cell.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
