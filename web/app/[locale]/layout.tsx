import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

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
  }
}

/**
 * Locale layout.
 *
 * - Sets `dir` and `lang` on the `<html>` element for RTL/LTR support (ADR-014).
 * - Wraps the subtree with NextIntlClientProvider for client component access.
 * - Applies --pearl page background via Tailwind's bg-pearl.
 * - Composes Header + main content + Footer.
 */
export default async function LocaleLayout({
  children,
  params: { locale },
}: LocaleLayoutProps): Promise<React.ReactElement> {
  if (!isSupportedLocale(locale)) {
    notFound()
  }

  // Load messages for NextIntlClientProvider (client components need this)
  const messages = await getMessages({ locale })

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir}>
      <body className="flex min-h-dvh flex-col bg-pearl font-sans text-ink">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header locale={locale} />
          <main className="flex-1" id="main-content">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
