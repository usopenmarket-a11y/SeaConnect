import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'

import { OwnerCalendarPage } from './PageClient'

interface Props {
  params: { locale: string }
}

export default function Page({ params }: Props): React.ReactElement {
  setRequestLocale(params.locale)
  return <OwnerCalendarPage />
}
