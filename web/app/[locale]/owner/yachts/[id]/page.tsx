import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { EditYachtPage } from './PageClient'

interface Props {
  params: { locale: string; id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: params.locale === 'ar' ? 'تعديل القارب | SeaConnect' : 'Edit Yacht | SeaConnect',
    robots: { index: false },
  }
}

export default function Page({ params }: Props): React.ReactElement {
  setRequestLocale(params.locale)
  return <EditYachtPage params={params} />
}
