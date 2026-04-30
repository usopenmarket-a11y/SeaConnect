import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import AdminDashboardClient from './PageClient'

export const metadata: Metadata = {
  title: 'لوحة الإدارة | Dashboard',
}

interface Props {
  params: { locale: string }
}

/**
 * Admin dashboard page — Server Component shell.
 * Passes locale to the client component for sidebar active-state resolution.
 */
export default function AdminDashboardPage({ params }: Props) {
  setRequestLocale(params.locale)

  return <AdminDashboardClient locale={params.locale} />
}
