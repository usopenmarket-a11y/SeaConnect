import type { MetadataRoute } from 'next'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiYacht {
  id: string
}

interface ApiCompetition {
  id: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchYachtIds(): Promise<string[]> {
  const apiUrl =
    process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
  try {
    const res = await fetch(`${apiUrl}/api/v1/yachts/?page_size=500`, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { results?: ApiYacht[] }
    return (data.results ?? []).map((y) => y.id)
  } catch {
    return []
  }
}

async function fetchCompetitionIds(): Promise<string[]> {
  const apiUrl =
    process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
  try {
    const res = await fetch(`${apiUrl}/api/v1/competitions/?page_size=500`, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { results?: ApiCompetition[] }
    return (data.results ?? []).map((c) => c.id)
  } catch {
    return []
  }
}

// ── Sitemap ───────────────────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://seaconnect.eg'
  const locales = ['ar', 'en'] as const

  // Static routes exposed to all locales
  const staticPaths = [
    '',
    '/yachts',
    '/marketplace',
    '/competitions',
    '/weather',
    '/fishing-guide',
    '/map',
    '/search',
  ]

  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path === '' ? ('daily' as const) : ('weekly' as const),
      priority: path === '' ? 1.0 : path === '/yachts' ? 0.9 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${baseUrl}/${l}${path}`]),
        ),
      },
    })),
  )

  // Dynamic yacht detail pages
  const [yachtIds, competitionIds] = await Promise.all([
    fetchYachtIds(),
    fetchCompetitionIds(),
  ])

  const yachtEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    yachtIds.map((id) => ({
      url: `${baseUrl}/${locale}/yachts/${id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${baseUrl}/${l}/yachts/${id}`]),
        ),
      },
    })),
  )

  const competitionEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    competitionIds.map((id) => ({
      url: `${baseUrl}/${locale}/competitions/${id}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${baseUrl}/${l}/competitions/${id}`]),
        ),
      },
    })),
  )

  return [...staticEntries, ...yachtEntries, ...competitionEntries]
}
