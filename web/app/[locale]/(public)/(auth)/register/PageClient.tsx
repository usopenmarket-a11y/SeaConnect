'use client'

/**
 * Register page — Client Component (form interaction required).
 *
 * Uses useAuth().register() from AuthContext. Collects first_name, last_name,
 * email, password, and role (customer | owner). All strings via i18n keys
 * (ADR-015). Logical CSS padding for RTL support (ADR-014). JWT tokens stored
 * in memory only via AuthContext — never in localStorage (ADR-009).
 */

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth, type RegisterPayload } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface RegisterPageProps {
  params: { locale: string }
}

type UserRole = 'customer' | 'owner'

interface FieldErrors {
  first_name?: string
  last_name?: string
  email?: string
  password?: string
  role?: string
}

export function RegisterPage({
  params: { locale },
}: RegisterPageProps): React.ReactElement {
  const t = useTranslations('auth.register')
  const tCommon = useTranslations('common')
  const { register } = useAuth()
  const router = useRouter()

  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [role, setRole] = React.useState<UserRole>('customer')
  const [isLoading, setIsLoading] = React.useState(false)
  const [globalError, setGlobalError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  // ---------------------------------------------------------------------------
  // Client-side validation
  // ---------------------------------------------------------------------------

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!firstName.trim()) {
      errors.first_name = t('firstName')
    }
    if (!lastName.trim()) {
      errors.last_name = t('lastName')
    }
    if (!email.trim()) {
      errors.email = t('email')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('email')
    }
    if (!password) {
      errors.password = t('password')
    } else if (password.length < 8) {
      errors.password = t('password')
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
    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      password: true,
    })

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setGlobalError(null)
    setIsLoading(true)

    const payload: RegisterPayload = {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      role,
    }

    try {
      await register(payload)
      router.push(`/${locale}/bookings`)
    } catch (err) {
      if (err instanceof ApiError) {
        const knownFields: Array<keyof FieldErrors> = [
          'first_name',
          'last_name',
          'email',
          'password',
        ]
        if (err.field && knownFields.includes(err.field as keyof FieldErrors)) {
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

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="firstName" className="text-sm font-medium text-ink">
                  {t('firstName')}
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    if (touched.first_name) setFieldErrors(validate())
                  }}
                  onBlur={() => handleBlur('first_name')}
                  aria-invalid={!!(touched.first_name && fieldErrors.first_name)}
                  aria-describedby={
                    touched.first_name && fieldErrors.first_name
                      ? 'first-name-error'
                      : undefined
                  }
                  className={inputClass('first_name')}
                />
                {touched.first_name && fieldErrors.first_name && (
                  <p id="first-name-error" role="alert" className="text-xs text-red-600">
                    {fieldErrors.first_name}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="lastName" className="text-sm font-medium text-ink">
                  {t('lastName')}
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (touched.last_name) setFieldErrors(validate())
                  }}
                  onBlur={() => handleBlur('last_name')}
                  aria-invalid={!!(touched.last_name && fieldErrors.last_name)}
                  aria-describedby={
                    touched.last_name && fieldErrors.last_name
                      ? 'last-name-error'
                      : undefined
                  }
                  className={inputClass('last_name')}
                />
                {touched.last_name && fieldErrors.last_name && (
                  <p id="last-name-error" role="alert" className="text-xs text-red-600">
                    {fieldErrors.last_name}
                  </p>
                )}
              </div>
            </div>

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
                aria-invalid={!!(touched.email && fieldErrors.email)}
                aria-describedby={
                  touched.email && fieldErrors.email ? 'email-error' : undefined
                }
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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (touched.password) setFieldErrors(validate())
                }}
                onBlur={() => handleBlur('password')}
                aria-invalid={!!(touched.password && fieldErrors.password)}
                aria-describedby={
                  touched.password && fieldErrors.password
                    ? 'password-error'
                    : undefined
                }
                className={inputClass('password')}
              />
              {touched.password && fieldErrors.password && (
                <p id="password-error" role="alert" className="text-xs text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Role selector */}
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-ink">{t('role')}</p>
              <div className="flex gap-3">
                <label
                  className={cn(
                    'flex flex-1 cursor-pointer items-center justify-center gap-2',
                    'rounded-lg border p-3 text-sm font-medium transition-colors',
                    role === 'customer'
                      ? 'border-sea bg-sea/5 text-sea'
                      : 'border-ink/20 text-ink/60 hover:border-ink/40',
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value="customer"
                    checked={role === 'customer'}
                    onChange={() => setRole('customer')}
                    className="sr-only"
                  />
                  {t('roleCustomer')}
                </label>

                <label
                  className={cn(
                    'flex flex-1 cursor-pointer items-center justify-center gap-2',
                    'rounded-lg border p-3 text-sm font-medium transition-colors',
                    role === 'owner'
                      ? 'border-sea bg-sea/5 text-sea'
                      : 'border-ink/20 text-ink/60 hover:border-ink/40',
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value="owner"
                    checked={role === 'owner'}
                    onChange={() => setRole('owner')}
                    className="sr-only"
                  />
                  {t('roleOwner')}
                </label>
              </div>
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
            {t('hasAccount')}{' '}
            <Link
              href={`/${locale}/login`}
              className="font-semibold text-sea hover:underline"
            >
              {t('login')}
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </div>
  )
}
