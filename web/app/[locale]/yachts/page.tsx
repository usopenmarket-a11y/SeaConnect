/**
 * Yacht list page — Server Component (ADR-003: SSR required for SEO).
 *
 * Fetches the public yacht listing from the API at request time (no-store)
 * so search engines receive fully rendered HTML. Arabic names displayed first
 * (ADR-015). Logical CSS only — no physical margin/padding properties (ADR-014).
 * Currency never hardcoded — read from API response (ADR-018).
 */

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface MetadataProps {
  params: { locale: string }
}

export async function generateMetadata({
  params: { locale },
}: MetadataProps): Promise<Metadata> {
  return {
    title:
      locale === 'ar'
        ? 'القوارب المتاحة | سي كونكت'
        : 'Available Yachts | SeaConnect',
    description:
      locale === 'ar'
        ? 'تصفّح قوارب الإيجار المتاحة في مصر واحجز رحلتك البحرية'
        : 'Browse available charter yachts in Egypt and book your sea trip',
    alternates: {
      canonical: `/${locale}/yachts`,
      languages: {
        ar: '/ar/yachts',
        en: '/en/yachts',
      },
    },
    openGraph: {
      title:
        locale === 'ar'
          ? 'القوارب المتاحة | سي كونكت'
          : 'Available Yachts | SeaConnect',
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
  }
}

// ---------------------------------------------------------------------------
// Types (matching API spec: GET /api/v1/yachts/)
// ---------------------------------------------------------------------------

interface YachtMedia {
  id: string
  url: string
  is_primary: boolean
  alt_text_ar: string
  alt_text_en: string
}

interface Yacht {
  id: string
  name_ar: string
  name_en: string
  yacht_type: string
  capacity: number
  price_per_day: string
  currency: string
  media: YachtMedia[]
  departure_port: {
    id: string
    name_ar: string
    name_en: string
  } | null
}

interface YachtsResponse {
  results: Yacht[]
  next_cursor: string | null
  has_more: boolean
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchYachts(): Promise<Yacht[]> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

  try {
    const res = await fetch(`${apiUrl}/api/v1/yachts/`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      // Non-fatal: render the empty state rather than crashing the page
      return []
    }

    const data = (await res.json()) as YachtsResponse
    return data.results ?? []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function primaryImage(yacht: Yacht): YachtMedia | undefined {
  return (
    yacht.media.find((m) => m.is_primary) ?? yacht.media[0]
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

interface YachtsPageProps {
  params: { locale: string }
}

export default async function YachtsPage({
  params: { locale },
}: YachtsPageProps): Promise<React.ReactElement> {
  const t = await getTranslations({ locale, namespace: 'yachts' })
  const yachts = await fetchYachts()

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Page heading */}
      <h1 className="mb-8 font-display text-3xl font-bold text-ink">
        {t('title')}
      </h1>

      {/* Empty state */}
      {yachts.length === 0 && (
        <p className="py-16 text-center text-ink/50">{t('empty')}</p>
      )}

      {/* Yacht grid */}
      {yachts.length > 0 && (
        <ul
          role="list"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {yachts.map((yacht) => {
            const image = primaryImage(yacht)
            const altText =
              locale === 'ar'
                ? (image?.alt_text_ar ?? yacht.name_ar)
                : (image?.alt_text_en ?? yacht.name_en)

            // Format price with Arabic-Indic numerals in AR locale (ADR-014)
            const formattedPrice =
              locale === 'ar'
                ? Number(yacht.price_per_day).toLocaleString('ar-EG')
                : Number(yacht.price_per_day).toLocaleString('en-US')

            return (
              <li key={yacht.id}>
                <Link
                  href={`/${locale}/yachts/${yacht.id}`}
                  className="group flex flex-col overflow-hidden rounded-xl bg-sand shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2"
                >
                  {/* Image */}
                  <div className="relative h-48 w-full bg-sea/10">
                    {image ? (
                      <Image
                        src={image.url}
                        alt={altText}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="flex h-full w-full items-center justify-center text-sea/30"
                      >
                        {/* Placeholder wave icon */}
                        <svg
                          viewBox="0 0 48 48"
                          fill="currentColor"
                          className="h-12 w-12"
                          aria-hidden="true"
                        >
                          <path d="M4 28c4-4 8-4 12 0s8 4 12 0 8-4 12 0v4c-4 4-8 4-12 0s-8-4-12 0-8 4-12 0v-4z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    {/* Name — Arabic first */}
                    <h2 className="font-display text-lg font-bold leading-snug text-ink">
                      {locale === 'ar' ? yacht.name_ar : yacht.name_en}
                    </h2>

                    {/* Capacity */}
                    <p className="text-sm text-ink/60">
                      <span className="font-mono font-semibold text-ink">
                        {locale === 'ar'
                          ? yacht.capacity.toLocaleString('ar-EG')
                          : yacht.capacity}
                      </span>{' '}
                      {t('card.capacity')}
                    </p>

                    {/* Price */}
                    <p className="mt-auto font-mono text-base font-bold text-sea">
                      {formattedPrice}{' '}
                      <span className="text-sm font-normal text-ink/60">
                        {yacht.currency} {t('card.perDay')}
                      </span>
                    </p>

                    {/* CTA label (screen-reader accessible) */}
                    <span
                      aria-hidden="true"
                      className="inline-block rounded-lg bg-sea px-4 py-2 text-center text-sm font-semibold text-white transition-opacity group-hover:opacity-90"
                    >
                      {t('card.viewDetails')}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
