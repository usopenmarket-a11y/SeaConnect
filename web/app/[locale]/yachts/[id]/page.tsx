/**
 * Yacht detail page — Server Component (ADR-003: SSR required for SEO).
 *
 * Fetches a single yacht by ID at request time (no-store). Arabic content
 * displayed first (ADR-015). Logical CSS only (ADR-014). Currency read from
 * the API response — never hardcoded (ADR-018). Numbers in AR locale use
 * Arabic-Indic numerals via toLocaleString('ar-EG').
 *
 * The "Book Now" CTA is intentionally a dead anchor (#) — booking UI is
 * Sprint 3 scope.
 */

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

// ---------------------------------------------------------------------------
// Types (matching API spec: GET /api/v1/yachts/{id}/)
// ---------------------------------------------------------------------------

interface YachtMedia {
  id: string
  url: string
  is_primary: boolean
  alt_text_ar: string
  alt_text_en: string
}

interface DeparturePort {
  id: string
  name_ar: string
  name_en: string
}

interface YachtDetail {
  id: string
  name_ar: string
  name_en: string
  description_ar: string
  description_en: string
  yacht_type: string
  capacity: number
  price_per_day: string
  currency: string
  media: YachtMedia[]
  departure_port: DeparturePort | null
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: { locale: string; id: string }
}

async function fetchYacht(id: string): Promise<YachtDetail | null> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

  try {
    const res = await fetch(`${apiUrl}/api/v1/yachts/${id}/`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })

    if (res.status === 404) return null
    if (!res.ok) return null

    return (await res.json()) as YachtDetail
  } catch {
    return null
  }
}

export async function generateMetadata({
  params: { locale, id },
}: PageProps): Promise<Metadata> {
  const yacht = await fetchYacht(id)

  if (!yacht) {
    return {
      title: locale === 'ar' ? 'القارب غير موجود | سي كونكت' : 'Yacht not found | SeaConnect',
    }
  }

  const name = locale === 'ar' ? yacht.name_ar : yacht.name_en
  const description =
    locale === 'ar' ? yacht.description_ar : yacht.description_en

  const primaryMedia = yacht.media.find((m) => m.is_primary) ?? yacht.media[0]

  return {
    title: `${name} | سي كونكت`,
    description: description?.slice(0, 160) ?? undefined,
    alternates: {
      canonical: `/${locale}/yachts/${id}`,
      languages: {
        ar: `/ar/yachts/${id}`,
        en: `/en/yachts/${id}`,
      },
    },
    openGraph: {
      title: `${name} | SeaConnect`,
      description: description?.slice(0, 160) ?? undefined,
      images: primaryMedia ? [{ url: primaryMedia.url }] : undefined,
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function primaryImage(yacht: YachtDetail): YachtMedia | undefined {
  return yacht.media.find((m) => m.is_primary) ?? yacht.media[0]
}

function otherImages(yacht: YachtDetail): YachtMedia[] {
  const primary = primaryImage(yacht)
  return primary
    ? yacht.media.filter((m) => m.id !== primary.id)
    : yacht.media.slice(1)
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function YachtDetailPage({
  params: { locale, id },
}: PageProps): Promise<React.ReactElement> {
  const yacht = await fetchYacht(id)

  if (!yacht) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: 'yachts' })

  const name = locale === 'ar' ? yacht.name_ar : yacht.name_en
  const description =
    locale === 'ar' ? yacht.description_ar : yacht.description_en

  const hero = primaryImage(yacht)
  const gallery = otherImages(yacht)

  const heroAlt =
    locale === 'ar'
      ? (hero?.alt_text_ar ?? yacht.name_ar)
      : (hero?.alt_text_en ?? yacht.name_en)

  const formattedPrice =
    locale === 'ar'
      ? Number(yacht.price_per_day).toLocaleString('ar-EG')
      : Number(yacht.price_per_day).toLocaleString('en-US')

  const formattedCapacity =
    locale === 'ar'
      ? yacht.capacity.toLocaleString('ar-EG')
      : String(yacht.capacity)

  const portName =
    yacht.departure_port
      ? locale === 'ar'
        ? yacht.departure_port.name_ar
        : yacht.departure_port.name_en
      : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Back link */}
      <Link
        href={`/${locale}/yachts`}
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-sea hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2"
      >
        <span aria-hidden="true">&larr;</span>
        {t('title')}
      </Link>

      {/* Hero image */}
      <div className="relative mb-6 h-72 w-full overflow-hidden rounded-2xl bg-sea/10 sm:h-96">
        {hero ? (
          <Image
            src={hero.url}
            alt={heroAlt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 896px"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-sea/30"
          >
            <svg
              viewBox="0 0 48 48"
              fill="currentColor"
              className="h-16 w-16"
              aria-hidden="true"
            >
              <path d="M4 28c4-4 8-4 12 0s8 4 12 0 8-4 12 0v4c-4 4-8 4-12 0s-8-4-12 0-8 4-12 0v-4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Thumbnail gallery */}
      {gallery.length > 0 && (
        <ul
          role="list"
          aria-label={locale === 'ar' ? 'صور القارب' : 'Yacht photos'}
          className="mb-8 flex gap-3 overflow-x-auto pb-2"
        >
          {gallery.map((img) => {
            const alt =
              locale === 'ar'
                ? (img.alt_text_ar ?? yacht.name_ar)
                : (img.alt_text_en ?? yacht.name_en)
            return (
              <li
                key={img.id}
                className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-sea/10"
              >
                <Image
                  src={img.url}
                  alt={alt}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </li>
            )
          })}
        </ul>
      )}

      {/* Content grid: main + sidebar */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          <h1 className="font-display text-3xl font-bold text-ink">{name}</h1>

          {/* Description */}
          {description && (
            <section aria-labelledby="description-heading">
              <h2
                id="description-heading"
                className="mb-3 font-sans text-lg font-semibold text-ink"
              >
                {t('detail.description')}
              </h2>
              <p className="leading-relaxed text-ink/70">{description}</p>
            </section>
          )}

          {/* Specs */}
          <section aria-labelledby="specs-heading">
            <h2
              id="specs-heading"
              className="mb-3 font-sans text-lg font-semibold text-ink"
            >
              {t('detail.specs')}
            </h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {/* Type */}
              <div className="flex flex-col gap-1 rounded-xl bg-sand p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink/50">
                  {t('detail.type')}
                </dt>
                <dd className="font-sans font-semibold text-ink">
                  {yacht.yacht_type}
                </dd>
              </div>

              {/* Capacity */}
              <div className="flex flex-col gap-1 rounded-xl bg-sand p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink/50">
                  {t('detail.capacity')}
                </dt>
                <dd className="font-mono font-semibold text-ink">
                  {formattedCapacity}{' '}
                  <span className="font-sans text-sm font-normal text-ink/60">
                    {t('card.capacity')}
                  </span>
                </dd>
              </div>

              {/* Location / departure port */}
              {portName && (
                <div className="flex flex-col gap-1 rounded-xl bg-sand p-4">
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink/50">
                    {t('detail.location')}
                  </dt>
                  <dd className="font-sans font-semibold text-ink">{portName}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        {/* Sidebar: pricing + CTA */}
        <aside
          aria-label={locale === 'ar' ? 'سعر الحجز' : 'Booking price'}
          className="flex flex-col gap-4 rounded-2xl bg-sand p-6 shadow-sm lg:sticky lg:top-24 lg:self-start"
        >
          <p className="font-display text-2xl font-bold text-ink">
            <span className="font-mono">{formattedPrice}</span>{' '}
            <span className="text-base font-normal text-ink/60">
              {yacht.currency} {t('card.perDay')}
            </span>
          </p>

          {portName && (
            <p className="text-sm text-ink/60">
              <span className="font-medium text-ink">{t('detail.location')}:</span>{' '}
              {portName}
            </p>
          )}

          {/*
           * Book Now — Sprint 3 scope.
           * Rendered as a visually-styled span so no navigation occurs.
           * Will be replaced with a real Link in Sprint 3.
           */}
          <span
            aria-disabled="true"
            role="button"
            tabIndex={-1}
            className="inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-sea/60 px-6 py-3 font-sans font-semibold text-white"
          >
            {t('detail.bookNow')}
          </span>

          <p className="text-center text-xs text-ink/40">
            {locale === 'ar'
              ? 'الحجز المباشر قريباً'
              : 'Direct booking coming soon'}
          </p>
        </aside>
      </div>
    </div>
  )
}
