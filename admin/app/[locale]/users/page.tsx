import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import UsersPageClient from './PageClient'

export const metadata: Metadata = {
  title: 'إدارة المستخدمين | User Management',
}

interface Props {
  params: { locale: string }
}

/**
 * Admin user management page — Server Component shell.
 * The actual data-fetching and interactivity lives in UsersPageClient.
 */
export default function UsersPage({ params }: Props) {
  setRequestLocale(params.locale)

  return <UsersPageClient locale={params.locale} />
}
