'use client'

/**
 * Login page — Client Component.
 *
 * Visual matches Design/system-pages.jsx LoginPage() exactly:
 * auth-outer → auth-card → logo, eyebrow, title, email/password form,
 * divider, social row, footer link.
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
  const tCommon = useTranslations('common')
  const { login } = useAuth()
  const router = useRouter()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPass, setShowPass] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [globalError, setGlobalError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<{ email?: string; password?: string }>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  function validate() {
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) errors.email = t('email') + ' ' + tCommon('error')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = t('email')
    if (!password) errors.password = t('password') + ' ' + tCommon('error')
    return errors
  }

  function handleBlur(field: string) {
    setTouched((p) => ({ ...p, [field]: true }))
    setFieldErrors(validate())
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched({ email: true, password: true })
    const errors = validate()
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setGlobalError(null)
    setIsLoading(true)
    try {
      await login(email, password)
      router.push(`/${locale}/bookings`)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.field === 'email' || err.field === 'password') setFieldErrors({ [err.field]: err.message })
        else setGlobalError(err.message)
      } else if (err instanceof Error) {
        setGlobalError(err.message)
      } else {
        setGlobalError(tCommon('error'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--rule-strong)',
    background: 'var(--foam)',
    fontFamily: 'var(--ff-sans)',
    fontSize: 14,
    color: 'var(--ink)',
    padding: '13px 14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    display: 'block',
  }

  const fieldErrorStyle: React.CSSProperties = {
    ...fieldStyle,
    borderColor: 'oklch(0.55 0.16 25)',
  }

  return (
    <div className="auth-outer">
      <div className="auth-card">

        {/* ── Logo ── */}
        <div className="auth-logo">
          <span className="mark" aria-hidden="true">س</span>
          سي كونكت
          <span className="en-tag">/ SeaConnect</span>
        </div>

        {/* ── Eyebrow + Title ── */}
        <div className="auth-eyebrow">SIGN IN · تسجيل الدخول</div>
        <div className="auth-title">مرحباً بك.</div>
        <div className="auth-sub">ادخل بريدك الإلكتروني وكلمة المرور للمتابعة.</div>

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

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="email"
              style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}
            >
              البريد الإلكتروني · EMAIL
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (touched.email) setFieldErrors(validate()) }}
              onBlur={() => handleBlur('email')}
              aria-invalid={!!(touched.email && fieldErrors.email)}
              style={touched.email && fieldErrors.email ? fieldErrorStyle : fieldStyle}
              placeholder="you@example.com"
            />
            {touched.email && fieldErrors.email && (
              <p role="alert" style={{ fontSize: 11, color: 'oklch(0.45 0.15 25)', marginTop: 5, fontFamily: 'var(--ff-mono)' }}>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="password"
              style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: 8 }}
            >
              كلمة المرور · PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (touched.password) setFieldErrors(validate()) }}
                onBlur={() => handleBlur('password')}
                aria-invalid={!!(touched.password && fieldErrors.password)}
                style={{ ...(touched.password && fieldErrors.password ? fieldErrorStyle : fieldStyle), paddingInlineEnd: 44 }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
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
                aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPass ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            {touched.password && fieldErrors.password && (
              <p role="alert" style={{ fontSize: 11, color: 'oklch(0.45 0.15 25)', marginTop: 5, fontFamily: 'var(--ff-mono)' }}>
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              background: isLoading ? 'var(--ink-2)' : 'var(--ink)',
              color: 'var(--sand)',
              fontFamily: 'var(--ff-sans)',
              fontSize: 15,
              fontWeight: 600,
              padding: '15px 24px',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'background 0.15s',
              letterSpacing: '-0.01em',
            }}
          >
            {isLoading ? (
              <>
                <span
                  style={{
                    width: 16, height: 16,
                    border: '2px solid oklch(1 0 0 / 0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                جارٍ تسجيل الدخول…
              </>
            ) : (
              <>
                تسجيل الدخول
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.06em', opacity: 0.7 }}>· SIGN IN</span>
              </>
            )}
          </button>
        </form>

        {/* ── Divider ── */}
        <div className="auth-divider" style={{ margin: '28px 0' }}>
          <span>أو · OR</span>
        </div>

        {/* ── Social buttons ── */}
        <div className="social-row">
          <button className="social-btn" type="button" disabled title="قريباً">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <button className="social-btn" type="button" disabled title="قريباً">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Apple
          </button>
          <button
            className="social-btn"
            type="button"
            disabled
            title="قريباً"
            style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.06em' }}
          >
            FAWRY ID
          </button>
        </div>

        {/* ── Footer link ── */}
        <div className="auth-footer-link">
          ليس لديك حساب؟{' '}
          <Link href={`/${locale}/register`} style={{ color: 'var(--clay)', fontWeight: 600, borderBottom: '1px solid currentColor', paddingBottom: 1 }}>
            اشترك الآن · JOIN
          </Link>
        </div>

      </div>

      {/* spinner keyframe — injected inline to avoid global CSS dependency */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
