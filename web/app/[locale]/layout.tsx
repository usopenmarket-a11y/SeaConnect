import * as React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { TopStrip } from '@/components/layout/TopStrip'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { AuthProvider } from '@/lib/auth'

/** Supported locales — mirrors middleware.ts */
const SUPPORTED_LOCALES = ['ar', 'en'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

interface LocaleLayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}

export async function generateStaticParams(): Promise<{ locale: string }[]> {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'common' })
  return {
    title: t('appName'),
    // Next.js reads these to set lang/dir on the <html> element at the
    // root layout level via the streaming runtime.
    other: {
      'x-locale': locale,
    },
  }
}

/**
 * Locale layout.
 *
 * Sets `dir` and `lang` on the wrapping div for RTL/LTR support (ADR-014).
 * The root layout (app/layout.tsx) owns the <html>/<body> tags; this layout
 * provides locale context, TopStrip + Nav + Footer, and the app-shell class.
 *
 * ADR-014: dir is set here; all CSS uses logical properties (padding-inline,
 * margin-inline, inset-inline) so layout is correct in both RTL and LTR.
 */
export default async function LocaleLayout({
  children,
  params: { locale },
}: LocaleLayoutProps): Promise<React.ReactElement> {
  if (!isSupportedLocale(locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages({ locale })
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        {/*
          The data-locale attribute lets CSS target per-locale rules if needed.
          The dir attribute here propagates direction to all child elements.
          We set it on the wrapping div, not on <html>, because <html> is owned
          by app/layout.tsx. The div covers the full viewport.
        */}
        <div
          className="app-shell"
          dir={dir}
          lang={locale}
          style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
        >
          <TopStrip />
          <Nav locale={locale} />
          <main id="main-content" style={{ flex: 1 }}>
            {children}
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </NextIntlClientProvider>
  )
}
