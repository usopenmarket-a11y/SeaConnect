import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'

import { CompetitionResultsPage } from '@/components/competitions/CompetitionResultsPage'

export interface EntryResult {
  id: string
  rank: number | null
  participant_name: string
  catch_weight: string | null
  status: string
}

export interface ResultsResponse {
  status: 'upcoming' | 'completed'
  results: EntryResult[]
  competition_id: string
}

interface Props {
  params: { locale: string; id: string }
}

export default async function Page({ params }: Props): Promise<React.ReactElement> {
  setRequestLocale(params.locale)

  const apiBase = process.env.API_INTERNAL_URL ?? 'http://localhost:8010'
  let resultsData: ResultsResponse = {
    status: 'upcoming',
    results: [],
    competition_id: params.id,
  }

  try {
    const res = await fetch(`${apiBase}/api/v1/competitions/${params.id}/results/`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      resultsData = (await res.json()) as ResultsResponse
    }
  } catch {
    // fall through — empty state rendered
  }

  return (
    <CompetitionResultsPage
      resultsData={resultsData}
      locale={params.locale}
      competitionId={params.id}
    />
  )
}
