/**
 * Vendor Orders page — Server Component shell.
 *
 * Sets the next-intl request locale and delegates all interactive
 * UI to VendorOrdersPageClient.
 *
 * ADR-003: dashboard pages are Client Components; server shell required
 *          to call setRequestLocale.
 * ADR-014: logical CSS enforced in client component.
 * ADR-015: strings via t() enforced in client component.
 */

import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'

import { VendorOrdersPageClient } from './PageClient'

interface Props {
  params: { locale: string }
}

export default function VendorOrdersPage({
  params: { locale },
}: Props): React.ReactElement {
  setRequestLocale(locale)
  return <VendorOrdersPageClient locale={locale} />
}
