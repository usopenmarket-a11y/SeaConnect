/**
 * Owner Onboarding/Verification page — Server Component shell.
 *
 * Renders the OnboardingPageClient inside the owner layout.
 * The 6-step verification wizard is fully client-driven (interactive
 * step switching) so only the shell is a Server Component.
 *
 * ADR-014 — logical CSS only in client component.
 * ADR-015 — strings via t() in client component.
 */

import * as React from 'react'
import { setRequestLocale } from 'next-intl/server'

import { OnboardingPageClient } from './PageClient'

interface Props {
  params: { locale: string }
}

export default async function OnboardingPage({
  params: { locale },
}: Props): Promise<React.ReactElement> {
  setRequestLocale(locale)

  return <OnboardingPageClient locale={locale} />
}
