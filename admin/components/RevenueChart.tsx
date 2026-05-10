'use client'

import { REVENUE_PATH, REVENUE_MONTHS } from '@/lib/mockData'

export interface RevenueDataPoint {
  month: string
  value: number
}

/**
 * Compute SVG line + area paths from an array of data points.
 * Renders into a 600×180 viewBox with 10px top/bottom padding.
 */
function buildSvgPaths(data: RevenueDataPoint[]): {
  line: string
  area: string
  dots: [number, number][]
} {
  if (data.length < 2) {
    return { line: '', area: '', dots: [] }
  }

  const maxVal = Math.max(...data.map((d) => d.value))
  // Guard against all-zero data
  const scale = maxVal > 0 ? maxVal : 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 600
    const y = 180 - (d.value / scale) * 160 + 10
    return [x, y] as [number, number]
  })

  const lineParts = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
  const linePath = lineParts.join(' ')
  const lastX = points[points.length - 1][0]
  const areaPath = `${linePath} L${lastX.toFixed(1)} 180 L0 180 Z`

  return { line: linePath, area: areaPath, dots: points }
}

interface RevenueChartProps {
  /** Live data from the payouts API grouped by month. When omitted, static mock data is shown. */
  data?: RevenueDataPoint[]
}

/**
 * SVG area line chart for 12-month revenue — mirrors Design/dashboards.jsx.
 * Accepts optional live `data` prop; falls back to static mock paths when not provided.
 * Uses CSS variables for color to stay in sync with the design system.
 */
export default function RevenueChart({ data }: RevenueChartProps) {
  const isLive = data !== undefined && data.length >= 2

  const paths = isLive ? buildSvgPaths(data) : REVENUE_PATH
  const months = isLive ? data.map((d) => d.month) : REVENUE_MONTHS

  if (!isLive && data !== undefined) {
    // data was provided but has fewer than 2 points — show placeholder
    return (
      <div
        className="revenue-chart"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 180,
          fontFamily: 'var(--ff-mono)',
          fontSize: 12,
          color: 'var(--muted)',
          letterSpacing: '0.1em',
        }}
      >
        LOADING...
      </div>
    )
  }

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
        <path d={paths.area} fill="url(#rev-area-grad)" />

        {/* Line */}
        <path
          d={paths.line}
          fill="none"
          stroke="oklch(0.20 0.045 235)"
          strokeWidth="2"
        />

        {/* Data points */}
        {paths.dots.map(([x, y], i) => (
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
        {months.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  )
}
