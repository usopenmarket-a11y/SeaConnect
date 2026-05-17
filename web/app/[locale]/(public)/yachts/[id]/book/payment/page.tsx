import * as React from 'react'
import { Suspense } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { PaymentDisplayPageClient } from './PageClient'

interface Props {
  params: { locale: string; id: string }
}

export default function Page({ params }: Props): React.ReactElement {
  setRequestLocale(params.locale)
  return (
    <Suspense>
      <PaymentDisplayPageClient locale={params.locale} yachtId={params.id} />
    </Suspense>
  )
}
