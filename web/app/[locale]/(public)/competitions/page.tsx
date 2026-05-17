import * as React from 'react'
import type { Metadata } from 'next'
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

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params: { locale },
}: Props): Promise<Metadata> {
  return {
    title:
      locale === 'ar'
        ? 'بطولات الصيد | سي كونكت'
        : 'Fishing Tournaments | SeaConnect',
    description:
      locale === 'ar'
        ? 'شارك في بطولات الصيد الكبرى في مصر — البحر الأحمر، المتوسط، والنيل'
        : 'Join major fishing tournaments across Egypt — Red Sea, Mediterranean and Nile',
    alternates: {
      canonical: `/${locale}/competitions`,
      languages: { ar: '/ar/competitions', en: '/en/competitions' },
    },
    openGraph: {
      title:
        locale === 'ar'
          ? 'بطولات الصيد | سي كونكت'
          : 'Fishing Tournaments | SeaConnect',
      description:
        locale === 'ar'
          ? 'شارك في بطولات الصيد الكبرى في مصر — البحر الأحمر، المتوسط، والنيل'
          : 'Join major fishing tournaments across Egypt — Red Sea, Mediterranean and Nile',
      images: [{ url: '/og/competitions.jpg', width: 1200, height: 630 }],
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
