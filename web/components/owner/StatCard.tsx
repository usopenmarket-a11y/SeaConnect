'use client'

/**
 * StatCard — generic KPI card used on the owner dashboard.
 *
 * Renders a label, a large monospace-formatted value, and an optional
 * supporting subtitle. Logical CSS only (ADR-014).
 */

import * as React from 'react'

import { Card } from '@/components/ui/Card'

interface Props {
  label: string
  value: React.ReactNode
  subtitle?: React.ReactNode
}

export function StatCard({ label, value, subtitle }: Props): React.ReactElement {
  return (
    <Card>
      <Card.Body>
        <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
          {label}
        </p>
        <p className="mt-2 font-mono text-3xl font-bold text-ink">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-ink/50">{subtitle}</p>
        )}
      </Card.Body>
    </Card>
  )
}
