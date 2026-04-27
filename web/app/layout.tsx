import type { Metadata } from 'next'
import '@/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'SeaConnect | سي كونكت',
    template: '%s | SeaConnect',
  },
  description:
    'Maritime marketplace — book boats, find gear, join fishing tournaments.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  ),
}

/**
 * Root layout — owns the <html> and <body> shell (required by Next.js).
 *
 * The [locale]/layout.tsx sets `lang` and `dir` through Next.js's
 * generateMetadata so search engines get the right values, and the
 * locale layout adds them to the html element via `suppressHydrationWarning`.
 *
 * Fonts are loaded via Google Fonts @import in globals.css (Cairo, Amiri,
 * Instrument Serif, Geist Mono) since next/font/google would conflict with
 * the custom font variables defined in globals.css.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
