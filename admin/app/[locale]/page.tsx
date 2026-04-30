import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

interface Props {
  params: { locale: string }
}

/**
 * Locale root — redirect to dashboard.
 */
export default function LocaleRoot({ params }: Props) {
  setRequestLocale(params.locale)
  redirect(`/${params.locale}/dashboard`)
}
