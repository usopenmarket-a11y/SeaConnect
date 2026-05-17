/**
 * Map view page — Server Component wrapper (ADR-003).
 *
 * Full-viewport layout — deliberately does NOT use the page-glass card
 * because the Leaflet map needs to fill the remaining viewport height.
 * Strings via next-intl t() (ADR-015).
 * Leaflet loaded only on the client side via dynamic() with ssr: false.
 */

import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { MapClient } from './MapClient'

interface Props {
  params: { locale: string }
}

export async function generateMetadata({
  params: { locale },
}: Props): Promise<Metadata> {
  return {
    title:
      locale === 'ar'
        ? 'خريطة القوارب | سي كونكت'
        : 'Yacht Map | SeaConnect',
    description:
      locale === 'ar'
        ? 'استعرض مواقع القوارب المتاحة على الخريطة في مصر'
        : 'Browse available yacht locations on an interactive map of Egypt',
    alternates: {
      canonical: `/${locale}/map`,
      languages: { ar: '/ar/map', en: '/en/map' },
    },
    openGraph: {
      title:
        locale === 'ar'
          ? 'خريطة القوارب | سي كونكت'
          : 'Yacht Map | SeaConnect',
      description:
        locale === 'ar'
          ? 'استعرض مواقع القوارب المتاحة على الخريطة في مصر'
          : 'Find available yachts on an interactive map of Egypt',
      images: [{ url: '/og/map.jpg', width: 1200, height: 630 }],
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    },
  }
}

export default async function MapPage({ params: { locale } }: Props) {
  setRequestLocale(locale)
  const t = await getTranslations('map')

  return (
    <MapClient
      title={t('title')}
      filterAll={t('filterAll')}
      filterMotor={t('filterMotor')}
      filterSail={t('filterSail')}
      filterFishing={t('filterFishing')}
      filterNile={t('filterNile')}
      liveLabel={t('liveLabel')}
      liveMap={t('liveMap')}
      viewList={t('viewList')}
      viewDetails={t('viewDetails')}
      noYachts={t('noYachts')}
      popupYachtsCount={t('popupYachtsCount')}
      legendLabel={t('legendLabel')}
      regionRedSea={t('regionRedSea')}
      regionMediterranean={t('regionMediterranean')}
      regionNile={t('regionNile')}
      legendHint={t('legendHint')}
      browseAll={t('browseAll')}
      close={t('close')}
      showAll={t('showAll')}
    />
  )
}
