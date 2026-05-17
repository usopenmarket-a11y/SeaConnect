/**
 * Settings page — Server Component shell.
 *
 * Route: /{locale}/settings
 * Converted from Design/system-pages.jsx SettingsPage().
 * All interactive state (sidebar tabs, toggles, logout) lives in PageClient.tsx.
 *
 * ADR-003: SSR shell for metadata.
 * ADR-015: i18n via getTranslations.
 */

import * as React from 'react'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { SettingsPageClient } from './PageClient'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({
  params: { locale },
}: PageProps): Promise<Metadata> {
  return {
    title: locale === 'ar' ? 'الإعدادات | سي كونكت' : 'Settings | SeaConnect',
    description:
      locale === 'ar'
        ? 'إدارة ملفك الشخصي، الإشعارات، وإعدادات حسابك'
        : 'Manage your profile, notifications, and account settings',
    robots: { index: false },
  }
}

export default function SettingsPage({
  params: { locale },
}: PageProps): React.ReactElement {
  setRequestLocale(locale)
  return <SettingsPageClient />
}
