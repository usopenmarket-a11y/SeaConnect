import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import DisputesPageClient from './PageClient'

export const metadata: Metadata = {
  title: 'البلاغات | Disputes',
}

interface Props {
  params: { locale: string }
}

/**
 * Disputes management page — Server Component shell.
 * All data fetching and interaction is handled in DisputesPageClient.
 */
export default function DisputesPage({ params }: Props) {
  setRequestLocale(params.locale)

  return <DisputesPageClient locale={params.locale} />
}
