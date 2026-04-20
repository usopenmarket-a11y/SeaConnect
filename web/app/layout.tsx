import type { Metadata } from 'next'
import { Cairo, Amiri } from 'next/font/google'
import '@/globals.css'

/**
 * Cairo — body and UI text (Arabic and Latin).
 * Variable font exposed as a CSS variable so Tailwind can reference it.
 */
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

/**
 * Amiri — decorative Arabic headings / display text.
 */
const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  variable: '--font-amiri',
  display: 'swap',
  weight: ['400', '700'],
})

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
 * Root layout — minimal shell.
 *
 * Direction and language are set inside [locale]/layout.tsx where the
 * locale value is available. This layout only injects font variables
 * and the global stylesheet so they are available to all routes.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <html className={`${cairo.variable} ${amiri.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
