/**
 * Vendor Products list page — Server Component shell.
 *
 * Sets the next-intl locale and delegates all interactive UI to
 * VendorProductsClient (Client Component).
 *
 * ADR-003: dashboard pages may use Client Components; this server shell
 *          is still required to call setRequestLocale for next-intl.
 * ADR-014: logical CSS only — enforced in the client component.
 * ADR-015: strings via t() — enforced in the client component.
 */

import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

import { VendorProductsClient } from './PageClient'

interface Props {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  return {
    title: locale === 'ar' ? 'منتجاتي | سي كونكت' : 'My Products | SeaConnect',
    robots: { index: false },
    alternates: {
      canonical: `/${locale}/vendor/products`,
      languages: { ar: '/ar/vendor/products', en: '/en/vendor/products' },
    },
  }
}

export default async function VendorProductsPage({
  params: { locale },
}: Props): Promise<React.ReactElement> {
  setRequestLocale(locale)

  return <VendorProductsClient locale={locale} />
}
