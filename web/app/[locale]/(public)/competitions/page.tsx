import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'

import { CompetitionsPage } from '@/components/competitions/CompetitionsPage'

export interface Competition {
  id: string
  title: string
  title_en: string
  start_date: string
  end_date: string
  entry_fee: string
  prize_pool: string
  status: string
  region_name: string
  entry_count: number
}

interface Props {
  params: { locale: string }
}

export default async function Page({ params }: Props): Promise<React.ReactElement> {
  setRequestLocale(params.locale)

  const apiBase = process.env.API_INTERNAL_URL ?? 'http://localhost:8010'
  let competitions: Competition[] = []
  try {
    const res = await fetch(`${apiBase}/api/v1/competitions/?status=open`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const data = await res.json()
      competitions = data.results ?? []
    }
  } catch {
    // fall through — empty state rendered below
  }

  return <CompetitionsPage competitions={competitions} locale={params.locale} />
}
