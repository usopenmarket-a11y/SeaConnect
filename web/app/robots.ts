import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://seaconnect.eg'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/owner/',
          '/vendor/',
          '/ar/owner/',
          '/en/owner/',
          '/ar/vendor/',
          '/en/vendor/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
