import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SeaConnect Admin',
  description: 'SeaConnect internal operations portal',
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
