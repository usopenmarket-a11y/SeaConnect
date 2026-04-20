import * as React from 'react'
import { useTranslations } from 'next-intl'

/**
 * Site-wide footer.
 *
 * Server Component. Uses logical margin/padding (ADR-014).
 * All text from i18n keys (ADR-015).
 */
export function Footer(): React.ReactElement {
  const t = useTranslations()
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className="border-t border-ink/10 bg-sand py-8"
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="font-display text-lg font-bold text-sea">
            {t('common.appName')}
          </p>
          <p className="text-sm text-ink/50">
            &copy; {currentYear} {t('common.appName')}
          </p>
        </div>
      </div>
    </footer>
  )
}
