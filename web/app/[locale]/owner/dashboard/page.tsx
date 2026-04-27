import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'
import { OwnerDashboardPage } from './PageClient'

interface Props { params: { locale: string; id?: string } }

export default function Page({ params }: Props): React.ReactElement {
  setRequestLocale(params.locale)
  return <OwnerDashboardPage params={params} />
}
