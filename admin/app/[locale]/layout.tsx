import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | SeaConnect Admin',
    default: 'SeaConnect Admin',
  },
}

export function generateStaticParams() {
  return [{ locale: 'ar' }, { locale: 'en' }]
}

interface LocaleLayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = params
  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
        {children}
      </div>
    </NextIntlClientProvider>
  )
}
