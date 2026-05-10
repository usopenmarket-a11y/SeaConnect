/**
 * Vendor Products page — Server Component shell.
 *
 * Sets the locale for next-intl static generation and delegates all
 * interactive UI to the VendorProductsClient (Client Component).
 *
 * ADR-003: dashboard pages may use Client Components; SSR shell still
 *          needed to set locale for next-intl.
 * ADR-014: logical CSS only in client component.
 * ADR-015: strings via t() in client component.
 */

import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'

import { VendorProductsClient } from './PageClient'

interface Props {
  params: { locale: string }
}

export default async function VendorProductsPage({
  params: { locale },
}: Props): Promise<React.ReactElement> {
  setRequestLocale(locale)

  return <VendorProductsClient locale={locale} />
}
