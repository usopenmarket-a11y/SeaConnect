'use client'

import { useTranslations } from 'next-intl'

export default function BookingsPage(): React.ReactElement {
  const t = useTranslations('bookings')

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">
        {t('title')}
      </h1>
      <p className="text-ink/60">{t('empty')}</p>
    </div>
  )
}
