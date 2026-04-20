import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
}

export default withNextIntl(nextConfig)
