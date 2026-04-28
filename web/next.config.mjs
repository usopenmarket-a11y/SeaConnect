import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      // Django via host port (browser-side)
      { protocol: 'http', hostname: 'localhost', port: '8010', pathname: '/**' },
      // Django via Docker internal network (server-side SSR fetches)
      { protocol: 'http', hostname: 'api', port: '8000', pathname: '/**' },
      // MinIO via host port
      { protocol: 'http', hostname: 'localhost', port: '9010', pathname: '/**' },
      // MinIO via Docker internal network
      { protocol: 'http', hostname: 'minio', port: '9000', pathname: '/**' },
      // Cloudflare R2 (UAT / production)
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com', pathname: '/**' },
      // Unsplash (design prototype fallback images)
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
}

export default withNextIntl(nextConfig)
