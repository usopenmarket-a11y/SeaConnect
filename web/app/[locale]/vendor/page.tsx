/**
 * Vendor dashboard root — Server Component shell.
 *
 * Sets the next-intl request locale and delegates all interactive
 * UI to VendorDashboardClient (Client Component).
 *
 * ADR-003: dashboard pages may be Client Components; a server shell
 *          is still required to call setRequestLocale.
 * ADR-014: logical CSS only — enforced in the client component.
 * ADR-015: strings via t() — enforced in the client component.
 */

import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'

import { VendorDashboardClient } from './DashboardClient'

interface Props {
  params: { locale: string }
}

export default async function VendorPage({
  params: { locale },
}: Props): Promise<React.ReactElement> {
  setRequestLocale(locale)

  return <VendorDashboardClient locale={locale} />
}
