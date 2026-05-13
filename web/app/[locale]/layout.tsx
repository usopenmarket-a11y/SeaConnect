import * as React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
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
    other: { 'x-locale': locale },
  }
}

/**
 * Locale layout — provides i18n + auth context only.
 *
 * Nav/Footer live in (public)/layout.tsx (public pages).
 * Owner/vendor dashboards use their own layout with .dash-layout,
 * bypassing the public shell entirely (ADR-014).
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
        <div
          className="app-shell"
          dir={dir}
          lang={locale}
          style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
        >
          {children}
        </div>
      </AuthProvider>
    </NextIntlClientProvider>
  )
}
