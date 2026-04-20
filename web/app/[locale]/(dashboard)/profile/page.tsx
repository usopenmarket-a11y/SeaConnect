'use client'

import { useTranslations } from 'next-intl'

export default function ProfilePage(): React.ReactElement {
  const t = useTranslations('nav')

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">
        {t('profile')}
      </h1>
    </div>
  )
}
