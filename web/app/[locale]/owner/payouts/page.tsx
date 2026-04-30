/**
 * Owner Payouts page — Server Component shell.
 *
 * Renders the PayoutsPageClient inside the owner layout.
 * SSR is intentional here — the payout summary benefits from
 * server-side rendering. Full API wiring deferred until
 * /api/v1/payments/payouts/ endpoint exists.
 *
 * ADR-014 — logical CSS only in client component.
 * ADR-015 — strings via t() in client component.
 */

import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'

import { PayoutsPageClient } from './PageClient'

interface Props {
  params: { locale: string }
}

export default async function PayoutsPage({
  params: { locale },
}: Props): Promise<React.ReactElement> {
  setRequestLocale(locale)

  return <PayoutsPageClient locale={locale} />
}
