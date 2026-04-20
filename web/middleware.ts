import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'always',
})

export const config = {
  matcher: [
    // Match all pathnames except for internal Next.js paths and static files
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
}
