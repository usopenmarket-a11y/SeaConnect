import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import PayoutsPageClient from './PageClient'

export const metadata: Metadata = {
  title: 'المدفوعات | Payout Approvals',
}

interface Props {
  params: { locale: string }
}

/**
 * Admin payout approvals page — Server Component shell.
 * The actual data-fetching and interactivity lives in PayoutsPageClient.
 */
export default function PayoutsPage({ params }: Props) {
  setRequestLocale(params.locale)

  return <PayoutsPageClient locale={params.locale} />
}
