import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'always',
})

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
}
