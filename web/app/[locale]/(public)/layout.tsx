import * as React from 'react'
import { TopStrip } from '@/components/layout/TopStrip'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

export default function PublicLayout({
  children,
  params: { locale },
}: Props): React.ReactElement {
  return (
    <>
      <TopStrip />
      <Nav locale={locale} />
      <main id="main-content" style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </>
  )
}
