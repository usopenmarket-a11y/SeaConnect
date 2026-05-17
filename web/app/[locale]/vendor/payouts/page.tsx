/**
 * Vendor Payouts page — Server Component shell.
 *
 * Sets the next-intl request locale and delegates to VendorPayoutsPageClient.
 *
 * ADR-003: dashboard pages are Client Components; server shell required.
 * ADR-014: logical CSS enforced in client component.
 * ADR-015: strings via t() enforced in client component.
 */

import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'

import { VendorPayoutsPageClient } from './PageClient'

interface Props {
  params: { locale: string }
}

export default function VendorPayoutsPage({
  params: { locale },
}: Props): React.ReactElement {
  setRequestLocale(locale)
  return <VendorPayoutsPageClient locale={locale} />
}
