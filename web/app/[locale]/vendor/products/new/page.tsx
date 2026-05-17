/**
 * New Product page — Server Component shell.
 *
 * Sets the next-intl locale and delegates interactive UI to NewProductClient.
 *
 * ADR-003: dashboard pages may use Client Components; this shell is still
 *          required to call setRequestLocale for next-intl.
 * ADR-014: logical CSS only — enforced in client component.
 * ADR-015: strings via t() — enforced in client component.
 */

import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

import { NewProductClient } from './PageClient'

interface Props {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  return {
    title: locale === 'ar' ? 'منتج جديد | سي كونكت' : 'New Product | SeaConnect',
    robots: { index: false },
    alternates: {
      canonical: `/${locale}/vendor/products/new`,
      languages: {
        ar: '/ar/vendor/products/new',
        en: '/en/vendor/products/new',
      },
    },
  }
}

export default async function NewProductPage({
  params: { locale },
}: Props): Promise<React.ReactElement> {
  setRequestLocale(locale)

  return <NewProductClient locale={locale} />
}
