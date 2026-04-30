import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import KycPageClient from './PageClient'

export const metadata: Metadata = {
  title: 'تحقق KYC | KYC Review',
}

interface Props {
  params: { locale: string }
}

/**
 * KYC review queue page — Server Component shell.
 */
export default function KycPage({ params }: Props) {
  setRequestLocale(params.locale)

  return <KycPageClient locale={params.locale} />
}
