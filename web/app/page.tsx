import { redirect } from 'next/navigation'

/**
 * Root page — redirects to the default locale (Arabic, per ADR-014).
 * The next-intl middleware handles subsequent locale routing,
 * but this covers direct navigation to `/`.
 */
export default function RootPage(): never {
  redirect('/ar')
}
