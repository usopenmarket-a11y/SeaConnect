'use client'

import { REVENUE_PATH, REVENUE_MONTHS } from '@/lib/mockData'

/**
 * SVG area line chart for 12-month revenue — mirrors Design/dashboards.jsx.
 * Uses CSS variables for color to stay in sync with the design system.
 */
export default function RevenueChart() {
  return (
    <div className="revenue-chart" role="img" aria-label="Revenue trend last 12 months">
      <svg viewBox="0 0 600 180" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rev-area-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.46 0.09 215)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(0.46 0.09 215)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 45, 90, 135].map((y) => (
          <line
            key={y}
            x1="0"
            x2="600"
            y1={y}
            y2={y}
            stroke="oklch(0.84 0.015 215)"
            strokeDasharray="2 4"
          />
        ))}

        {/* Area fill */}
        <path d={REVENUE_PATH.area} fill="url(#rev-area-grad)" />

        {/* Line */}
        <path
          d={REVENUE_PATH.line}
          fill="none"
          stroke="oklch(0.20 0.045 235)"
          strokeWidth="2"
        />

        {/* Data points */}
        {REVENUE_PATH.dots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="var(--clay)" />
        ))}
      </svg>

      {/* Month labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontFamily: 'var(--ff-mono)',
          fontSize: 10,
          color: 'var(--muted)',
          letterSpacing: '0.1em',
          direction: 'ltr',
        }}
        aria-hidden="true"
      >
        {REVENUE_MONTHS.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  )
}
