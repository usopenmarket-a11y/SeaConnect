/**
 * Notifications page — Server Component shell.
 *
 * Route: /{locale}/notifications
 * Converted from Design/system-pages.jsx NotificationsPage().
 * Interactive state (tab switching, mark-as-read) lives in PageClient.tsx.
 *
 * ADR-003: Server Component for metadata; Client Component for interaction.
 * ADR-015: i18n via getTranslations.
 */

import * as React from 'react'
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { NotificationsPageClient } from './PageClient'

interface PageProps {
  params: { locale: string }
}

export async function generateMetadata({
  params: { locale },
}: PageProps): Promise<Metadata> {
  return {
    title: locale === 'ar' ? 'الإشعارات | سي كونكت' : 'Notifications | SeaConnect',
    description:
      locale === 'ar'
        ? 'مركز إشعاراتك — حجوزات، مدفوعات، تحذيرات الطقس'
        : 'Your notification centre — bookings, payments, weather alerts',
    robots: { index: false },
  }
}

export default function NotificationsPage({
  params: { locale },
}: PageProps): React.ReactElement {
  setRequestLocale(locale)
  return <NotificationsPageClient />
}
