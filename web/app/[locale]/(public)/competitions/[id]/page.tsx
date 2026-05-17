import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'

import { CompetitionDetailPage } from '@/components/competitions/CompetitionDetailPage'

export interface CompetitionDetail {
  id: string
  title: string
  title_en: string
  description: string
  rules: string
  start_date: string
  end_date: string
  registration_deadline: string
  entry_fee: string
  prize_pool: string
  status: string
  region_name: string
  entry_count: number
  max_participants: number
  departure_port_name: string | null
}

interface Props {
  params: { locale: string; id: string }
}

export async function generateMetadata({
  params,
}: Props): Promise<{ title: string }> {
  const apiBase = process.env.API_INTERNAL_URL ?? 'http://localhost:8010'
  try {
    const res = await fetch(`${apiBase}/api/v1/competitions/${params.id}/`, {
      next: { revalidate: 120 },
    })
    if (res.ok) {
      const data = (await res.json()) as CompetitionDetail
      return { title: `${data.title} · SeaConnect` }
    }
  } catch {
    // fall through
  }
  return { title: 'Competition · SeaConnect' }
}

export default async function Page({ params }: Props): Promise<React.ReactElement> {
  setRequestLocale(params.locale)

  const apiBase = process.env.API_INTERNAL_URL ?? 'http://localhost:8010'
  let competition: CompetitionDetail | null = null

  try {
    const res = await fetch(`${apiBase}/api/v1/competitions/${params.id}/`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      competition = (await res.json()) as CompetitionDetail
    }
  } catch {
    // fall through — null state handled by client component
  }

  return (
    <CompetitionDetailPage
      competition={competition}
      locale={params.locale}
      competitionId={params.id}
    />
  )
}
