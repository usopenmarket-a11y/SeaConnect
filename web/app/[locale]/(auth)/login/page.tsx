'use client'

/**
 * Login page — Client Component (form interaction required).
 *
 * Uses useAuth().login() from AuthContext. All strings via i18n keys
 * (ADR-015). Logical CSS padding for RTL support (ADR-014). JWT tokens
 * are stored in memory only via AuthContext — never in localStorage (ADR-009).
 */

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface LoginPageProps {
  params: { locale: string }
}

interface FieldErrors {
  email?: string
  password?: string
}

export default function LoginPage({
  params: { locale },
}: LoginPageProps): React.ReactElement {
  const t = useTranslations('auth.login')
  const tCommon = useTranslations('common')
  const { login } = useAuth()
  const router = useRouter()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [globalError, setGlobalError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  // ---------------------------------------------------------------------------
  // Client-side validation
  // ---------------------------------------------------------------------------

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!email.trim()) {
      errors.email = t('email') + ' ' + tCommon('error')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('email')
    }
    if (!password) {
      errors.password = t('password') + ' ' + tCommon('error')
    }
    return errors
  }

  function handleBlur(field: string): void {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setFieldErrors(validate())
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setTouched({ email: true, password: true })

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setGlobalError(null)
    setIsLoading(true)

    try {
      await login(email, password)
      router.push(`/${locale}/bookings`)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.field === 'email' || err.field === 'password') {
          setFieldErrors({ [err.field]: err.message })
        } else {
          setGlobalError(err.message)
        }
      } else if (err instanceof Error) {
        setGlobalError(err.message)
      } else {
        setGlobalError(tCommon('error'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const inputBase = cn(
    'h-10 w-full rounded-lg border bg-white',
    'ps-3 pe-3 text-ink',
    'placeholder:text-ink/40',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea/30',
  )

  function inputClass(field: keyof FieldErrors): string {
    const hasError = touched[field] && fieldErrors[field]
    return cn(
      inputBase,
      hasError
        ? 'border-red-400 focus-visible:border-red-400'
        : 'border-ink/20 focus-visible:border-sea',
    )
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <Card.Header>
          <h1 className="font-display text-2xl font-bold text-ink">
            {t('title')}
          </h1>
        </Card.Header>

        <Card.Body>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* Global error banner */}
            {globalError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {globalError}
              </div>
            )}

            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-ink">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (touched.email) setFieldErrors(validate())
                }}
                onBlur={() => handleBlur('email')}
                aria-describedby={touched.email && fieldErrors.email ? 'email-error' : undefined}
                aria-invalid={!!(touched.email && fieldErrors.email)}
                className={inputClass('email')}
              />
              {touched.email && fieldErrors.email && (
                <p id="email-error" role="alert" className="text-xs text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (touched.password) setFieldErrors(validate())
                }}
                onBlur={() => handleBlur('password')}
                aria-describedby={touched.password && fieldErrors.password ? 'password-error' : undefined}
                aria-invalid={!!(touched.password && fieldErrors.password)}
                className={inputClass('password')}
              />
              {touched.password && fieldErrors.password && (
                <p id="password-error" role="alert" className="text-xs text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={isLoading}
            >
              {t('submit')}
            </Button>
          </form>
        </Card.Body>

        <Card.Footer>
          <p className="text-center text-sm text-ink/60">
            {t('noAccount')}{' '}
            <Link
              href={`/${locale}/register`}
              className="font-semibold text-sea hover:underline"
            >
              {t('register')}
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </div>
  )
}
