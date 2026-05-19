import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

/**
 * Auth layout — fullscreen, no Nav/Footer.
 * Sits at [locale]/(auth)/ level, outside (public), so it does NOT
 * inherit the public layout with TopStrip/Nav/Footer.
 */
export default function AuthLayout({ children, params: { locale } }: Props): React.ReactElement {
  setRequestLocale(locale)
  return (
    <main style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {children}
    </main>
  )
}
