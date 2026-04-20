'use client'

import { useTranslations } from 'next-intl'

export default function RegisterPage(): React.ReactElement {
  const t = useTranslations('auth.register')

  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-sand p-8 shadow-sm">
        <h1 className="mb-6 font-display text-2xl font-bold text-ink">
          {t('title')}
        </h1>
      </div>
    </div>
  )
}
