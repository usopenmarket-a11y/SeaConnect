/**
 * Edit Product page — Server Component shell.
 *
 * Reads the [id] segment from params and passes it to EditProductClient.
 * The client component fetches the product and pre-fills the form.
 *
 * ADR-003: dashboard pages may use Client Components; this shell is still
 *          required to call setRequestLocale for next-intl.
 * ADR-014: logical CSS only — enforced in client component.
 * ADR-015: strings via t() — enforced in client component.
 */

import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

import { EditProductClient } from './PageClient'

interface Props {
  params: { locale: string; id: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  return {
    title: locale === 'ar' ? 'تعديل المنتج | سي كونكت' : 'Edit Product | SeaConnect',
    robots: { index: false },
  }
}

export default async function EditProductPage({
  params: { locale, id },
}: Props): Promise<React.ReactElement> {
  setRequestLocale(locale)

  return <EditProductClient locale={locale} productId={id} />
}
