import * as React from 'react'
import { getTranslations } from 'next-intl/server'
import { TopStrip } from '@/components/layout/TopStrip'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

export default async function PublicLayout({
  children,
  params: { locale },
}: Props): Promise<React.ReactElement> {
  const t = await getTranslations({ locale, namespace: 'common' })
  return (
    <>
      <a href="#main-content" className="skip-to-content">
        {t('skipToContent')}
      </a>
      <TopStrip />
      <Nav locale={locale} />
      <main id="main-content" style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </>
  )
}
