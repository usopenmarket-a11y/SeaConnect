import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8010', pathname: '/**' },
      { protocol: 'http', hostname: 'api', port: '8000', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '9010', pathname: '/**' },
      { protocol: 'http', hostname: 'minio', port: '9000', pathname: '/**' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
}

export default withNextIntl(nextConfig)
