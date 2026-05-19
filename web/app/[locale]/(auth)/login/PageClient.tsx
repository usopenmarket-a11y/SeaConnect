'use client'

/**
 * Login page — Client Component.
 *
 * Visual matches FromClaudeDesign/auth.jsx Login() exactly:
 * auth-shell (grid 1fr 1.2fr) → auth-art (ocean photo + overlay + brand/quote/stamp)
 * + auth-card-wrap → auth-card (lang switch, h2, phone/email field, password field,
 * forgot link, btn-clay, divider, OAuth buttons, create account link).
 *
 * Auth logic unchanged: useAuth().login() → JWT in module memory (ADR-009).
 * All strings via i18n keys (ADR-015). Logical CSS for RTL (ADR-014).
 */

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'

interface LoginPageProps {
  params: { locale: string }
}

export function LoginPage({ params: { locale } }: LoginPageProps): React.ReactElement {
  const t = useTranslations('auth.login')
  const tReg = useTranslations('auth.register')
  const tCommon = useTranslations('common')
  const { login } = useAuth()
  const router = useRouter()

  const [identifier, setIdentifier] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPass, setShowPass] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [globalError, setGlobalError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<{ identifier?: string; password?: string }>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  const isAr = locale === 'ar'

  function validate() {
    const errors: { identifier?: string; password?: string } = {}
    if (!identifier.trim()) errors.identifier = t('email') + ' ' + tCommon('error')
    if (!password) errors.password = t('password') + ' ' + tCommon('error')
    return errors
  }

  function handleBlur(field: string) {
    setTouched((p) => ({ ...p, [field]: true }))
    setFieldErrors(validate())
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched({ identifier: true, password: true })
    const errors = validate()
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setGlobalError(null)
    setIsLoading(true)
    try {
      // Pass identifier as-is — backend accepts both email and phone
      await login(identifier.trim(), password)
      router.push(`/${locale}/bookings`)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.field === 'email' || err.field === 'password') {
          setFieldErrors({ [err.field === 'email' ? 'identifier' : 'password']: err.message })
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

  return (
    <div className="auth-shell">

      {/* ── Art panel ── */}
      <div className="auth-art">
        <div className="auth-art-content">
          <div className="auth-art-brand">{isAr ? 'سي كونكت' : 'SeaConnect'}</div>
          <div className="auth-art-quote">
            {isAr
              ? '«البحر لا يكذب — ولا يكذب من يبحر فيه».'
              : '"The sea never lies — and neither do those who sail it."'}
          </div>
          <div className="auth-art-stamp">
            {isAr ? 'البحر الأحمر · ٢٠٢٦' : 'RED SEA · 2026'}
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="auth-card-wrap">
        <div className="auth-card">

          {/* ── Lang switch ── */}
          <div className="auth-lang-row">
            <Link
              href={`/${locale === 'ar' ? 'en' : 'ar'}/login`}
              className="lang-switch"
              style={{ textDecoration: 'none' }}
            >
              <span className={`lang-opt${locale === 'ar' ? ' on' : ''}`}>ع</span>
              <span className="lang-sep">·</span>
              <span className={`lang-opt${locale === 'en' ? ' on' : ''}`}>EN</span>
            </Link>
          </div>

          {/* ── Title ── */}
          <h2>{isAr ? t('signInTitle') : t('signInTitle')}</h2>

          {/* ── Global error ── */}
          {globalError && (
            <div
              role="alert"
              style={{
                background: 'oklch(0.95 0.04 25)',
                border: '1px solid oklch(0.80 0.10 25)',
                color: 'oklch(0.40 0.15 25)',
                padding: '12px 16px',
                fontSize: 13,
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              {globalError}
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} noValidate>

            {/* Phone / Email field */}
            <div className="form-field">
              <label htmlFor="identifier">
                {t('phoneEmailLabel')}
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                required
                dir="ltr"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value)
                  if (touched.identifier) setFieldErrors(validate())
                }}
                onBlur={() => handleBlur('identifier')}
                aria-invalid={!!(touched.identifier && fieldErrors.identifier)}
                placeholder={t('phoneEmailPlaceholder')}
                style={
                  touched.identifier && fieldErrors.identifier
                    ? { borderColor: 'oklch(0.55 0.16 25)' }
                    : undefined
                }
              />
              {touched.identifier && fieldErrors.identifier && (
                <p
                  role="alert"
                  style={{
                    fontSize: 11,
                    color: 'oklch(0.45 0.15 25)',
                    marginTop: 5,
                    fontFamily: 'var(--ff-mono)',
                  }}
                >
                  {fieldErrors.identifier}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="form-field">
              <label htmlFor="password">{t('passwordLabel')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (touched.password) setFieldErrors(validate())
                  }}
                  onBlur={() => handleBlur('password')}
                  aria-invalid={!!(touched.password && fieldErrors.password)}
                  placeholder="••••••••"
                  style={{
                    paddingInlineEnd: 54,
                    ...(touched.password && fieldErrors.password
                      ? { borderColor: 'oklch(0.55 0.16 25)' }
                      : undefined),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? t('hidePassword') : t('showPassword')}
                  style={{
                    position: 'absolute',
                    insetInlineEnd: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    fontSize: 12,
                    fontFamily: 'var(--ff-mono)',
                    letterSpacing: '0.05em',
                    padding: 0,
                  }}
                >
                  {showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              {touched.password && fieldErrors.password && (
                <p
                  role="alert"
                  style={{
                    fontSize: 11,
                    color: 'oklch(0.45 0.15 25)',
                    marginTop: 5,
                    fontFamily: 'var(--ff-mono)',
                  }}
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Forgot password */}
            <div className="auth-forgot">
              <a href="#" onClick={(e) => e.preventDefault()}>
                {t('forgotPassword')}
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-clay btn-lg"
            >
              {isLoading ? (
                <>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: '2px solid oklch(1 0 0 / 0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                  {t('submitting')}
                </>
              ) : (
                <>
                  {t('signInTitle')} <span aria-hidden className="arrow">→</span>
                </>
              )}
            </button>
          </form>

          {/* ── Divider ── */}
          <div className="auth-divider">{t('or')}</div>

          {/* ── OAuth buttons ── */}
          <div className="auth-oauth">
            <button
              className="btn-oauth"
              type="button"
              disabled
              title={t('comingSoon')}
            >
              <GoogleIcon />
              {t('googleBtn')}
            </button>
            <button
              className="btn-oauth"
              type="button"
              disabled
              title={t('comingSoon')}
            >
              <AppleIcon />
              {t('appleBtn')}
            </button>
          </div>

          {/* ── Footer link ── */}
          <div className="auth-foot">
            {tReg('noAccount')}{' '}
            <Link href={`/${locale}/register`}>
              {tReg('createAccount')}
            </Link>
          </div>

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.68 9c0-.593.102-1.17.284-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}
