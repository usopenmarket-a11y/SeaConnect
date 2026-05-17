/**
 * Sentry server-side initialisation for SeaConnect Web.
 * Loaded automatically by @sentry/nextjs in Node.js Server Components / Route Handlers.
 * Set NEXT_PUBLIC_SENTRY_DSN in .env.local (or Vercel env vars) to enable.
 */
import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
  })
}
