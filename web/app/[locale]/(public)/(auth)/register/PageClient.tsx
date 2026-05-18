'use client'

/**
 * Register page — Client Component.
 *
 * Matches Design/system-pages.jsx auth card pattern.
 * Fields: first name, last name, phone (+20 Egypt prefix), email, password,
 * confirm password, role selector, terms checkbox.
 * ADR-009 — JWT in module memory, never localStorage.
 * ADR-014 — Logical CSS for RTL.
 * ADR-015 — All strings via i18n keys.
 */

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth, type RegisterPayload } from '@/lib/auth'
import { ApiError } from '@/lib/api'

interface RegisterPageProps {
  params: { locale: string }
}

type UserRole = 'customer' | 'owner'

interface FieldErrors {
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  password?: string
  confirm_password?: string
  terms?: string
}

function passwordStrengthScore(pw: string): number {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

function strengthColor(score: number): string {
  if (score === 0) return 'var(--rule-strong)'
  if (score <= 1) return 'oklch(0.55 0.18 25)'
  if (score <= 3) return 'oklch(0.65 0.15 60)'
  return 'oklch(0.50 0.14 150)'
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
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPass, setShowPass] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [role, setRole] = React.useState<UserRole>('customer')
  const [termsAccepted, setTermsAccepted] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [globalError, setGlobalError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  const pwScore = passwordStrengthScore(password)
  const pwColor = strengthColor(pwScore)
  const pwLabel = pwScore === 0 ? '' : pwScore <= 1 ? t('pwWeak') : pwScore <= 3 ? t('pwFair') : t('pwStrong')

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!firstName.trim()) errors.first_name = t('errorFirstName')
    if (!lastName.trim()) errors.last_name = t('errorLastName')
    if (!phone.trim()) errors.phone = t('errorPhone')
    else if (!/^[0-9]{10,11}$/.test(phone.replace(/\s/g, ''))) errors.phone = t('errorPhoneInvalid')
    if (!email.trim()) errors.email = t('errorEmail')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = t('errorEmailInvalid')
    if (!password) errors.password = t('errorPassword')
    else if (password.length < 8) errors.password = t('errorPasswordLength')
    if (!confirmPassword) errors.confirm_password = t('errorConfirmPassword')
    else if (password !== confirmPassword) errors.confirm_password = t('errorPasswordMismatch')
    if (!termsAccepted) errors.terms = t('errorTerms')
    return errors
  }

  function handleBlur(field: string): void {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setFieldErrors(validate())
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setTouched({
      first_name: true, last_name: true, phone: true,
      email: true, password: true, confirm_password: true, terms: true,
    })
    const errors = validate()
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setGlobalError(null)
    setIsLoading(true)
    const payload: RegisterPayload = {
      first_name: firstName,
      last_name: lastName,
      phone: `+20${phone.replace(/\s/g, '')}`,
      email,
      password,
      role,
    }
    try {
      await register(payload)
      router.push(`/${locale}/bookings`)
    } catch (err) {
      if (err instanceof ApiError) {
        const known: Array<keyof FieldErrors> = ['first_name', 'last_name', 'phone', 'email', 'password']
        if (err.field && known.includes(err.field as keyof FieldErrors)) {
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

  // ── Shared styles ────────────────────────────────────────────────────────────

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
  const fieldErrorStyle: React.CSSProperties = { ...fieldStyle, borderColor: 'oklch(0.55 0.16 25)' }
  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--ff-mono)',
    fontSize: 10,
    letterSpacing: '0.1em',
    color: 'var(--muted)',
    display: 'block',
    marginBottom: 8,
  }
  const errorTextStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'oklch(0.45 0.15 25)',
    marginTop: 5,
    fontFamily: 'var(--ff-mono)',
  }

  function hasErr(f: keyof FieldErrors): boolean {
    return !!(touched[f] && fieldErrors[f])
  }

  const isAr = locale === 'ar'

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
      <div className="auth-card" style={{ maxWidth: 500 }}>

        {/* ── Lang row ── */}
        <div className="auth-lang-row">
          <Link href={`/${locale === 'ar' ? 'en' : 'ar'}/register`} className="lang-switch" style={{ textDecoration: 'none' }}>
            <span className={`lang-opt${locale === 'ar' ? ' on' : ''}`}>ع</span>
            <span className="lang-sep">·</span>
            <span className={`lang-opt${locale === 'en' ? ' on' : ''}`}>EN</span>
          </Link>
        </div>

        {/* ── Eyebrow + Title ── */}
        <div className="auth-eyebrow">{t('eyebrow')}</div>
        <div className="auth-title">{t('title')}</div>
        <div className="auth-sub">{t('subtitle')}</div>

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

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Name row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label htmlFor="firstName" style={labelStyle}>
                {t('firstName')} · FIRST NAME
              </label>
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); if (touched.first_name) setFieldErrors(validate()) }}
                onBlur={() => handleBlur('first_name')}
                aria-invalid={hasErr('first_name')}
                style={hasErr('first_name') ? fieldErrorStyle : fieldStyle}
                placeholder={t('firstNamePlaceholder')}
              />
              {hasErr('first_name') && <p role="alert" style={errorTextStyle}>{fieldErrors.first_name}</p>}
            </div>
            <div>
              <label htmlFor="lastName" style={labelStyle}>
                {t('lastName')} · LAST NAME
              </label>
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); if (touched.last_name) setFieldErrors(validate()) }}
                onBlur={() => handleBlur('last_name')}
                aria-invalid={hasErr('last_name')}
                style={hasErr('last_name') ? fieldErrorStyle : fieldStyle}
                placeholder={t('lastNamePlaceholder')}
              />
              {hasErr('last_name') && <p role="alert" style={errorTextStyle}>{fieldErrors.last_name}</p>}
            </div>
          </div>

          {/* ── Phone ── */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="phone" style={labelStyle}>
              {t('phone')} · PHONE
            </label>
            <div style={{ display: 'flex', gap: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '13px 12px',
                  background: 'oklch(0.93 0.008 210)',
                  border: `1px solid ${hasErr('phone') ? 'oklch(0.55 0.16 25)' : 'var(--rule-strong)'}`,
                  borderInlineEnd: 'none',
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 13,
                  color: 'var(--ink)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                🇪🇬 +20
              </div>
              <input
                id="phone"
                type="tel"
                autoComplete="tel-national"
                required
                value={phone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                  setPhone(v)
                  if (touched.phone) setFieldErrors(validate())
                }}
                onBlur={() => handleBlur('phone')}
                aria-invalid={hasErr('phone')}
                style={{
                  ...( hasErr('phone') ? fieldErrorStyle : fieldStyle),
                  flex: 1,
                  fontFamily: 'var(--ff-mono)',
                  letterSpacing: '0.05em',
                  direction: 'ltr',
                }}
                placeholder="10xxxxxxxx"
                inputMode="numeric"
              />
            </div>
            {hasErr('phone') && <p role="alert" style={errorTextStyle}>{fieldErrors.phone}</p>}
          </div>

          {/* ── Email ── */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="email" style={labelStyle}>
              {t('email')} · EMAIL
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (touched.email) setFieldErrors(validate()) }}
              onBlur={() => handleBlur('email')}
              aria-invalid={hasErr('email')}
              style={hasErr('email') ? fieldErrorStyle : fieldStyle}
              placeholder="you@example.com"
            />
            {hasErr('email') && <p role="alert" style={errorTextStyle}>{fieldErrors.email}</p>}
          </div>

          {/* ── Password ── */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="password" style={labelStyle}>
              {t('password')} · PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (touched.password) setFieldErrors(validate()) }}
                onBlur={() => handleBlur('password')}
                aria-invalid={hasErr('password')}
                style={{ ...(hasErr('password') ? fieldErrorStyle : fieldStyle), paddingInlineEnd: 54 }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? t('hidePassword') : t('showPassword')}
                style={{
                  position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                  fontSize: 12, fontFamily: 'var(--ff-mono)', letterSpacing: '0.05em', padding: 0,
                }}
              >
                {showPass ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            {/* Password strength bar */}
            {password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 3,
                        background: i <= pwScore ? pwColor : 'var(--rule-strong)',
                        transition: 'background 0.2s',
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: pwColor, letterSpacing: '0.08em' }}>
                  {pwLabel}
                </span>
              </div>
            )}
            {hasErr('password') && <p role="alert" style={errorTextStyle}>{fieldErrors.password}</p>}
          </div>

          {/* ── Confirm password ── */}
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="confirmPassword" style={labelStyle}>
              {t('confirmPassword')} · CONFIRM
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (touched.confirm_password) setFieldErrors(validate()) }}
                onBlur={() => handleBlur('confirm_password')}
                aria-invalid={hasErr('confirm_password')}
                style={{ ...(hasErr('confirm_password') ? fieldErrorStyle : fieldStyle), paddingInlineEnd: 54 }}
                placeholder="••••••••"
              />
              {/* match indicator */}
              {confirmPassword && password && (
                <span
                  style={{
                    position: 'absolute', insetInlineEnd: 44, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 15, lineHeight: 1,
                  }}
                  aria-hidden="true"
                >
                  {confirmPassword === password ? '✓' : '✗'}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? t('hidePassword') : t('showPassword')}
                style={{
                  position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                  fontSize: 12, fontFamily: 'var(--ff-mono)', letterSpacing: '0.05em', padding: 0,
                }}
              >
                {showConfirm ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            {hasErr('confirm_password') && <p role="alert" style={errorTextStyle}>{fieldErrors.confirm_password}</p>}
          </div>

          {/* ── Role selector ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...labelStyle, marginBottom: 10 }}>
              {t('roleLabel')} · ACCOUNT TYPE
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['customer', 'owner'] as UserRole[]).map((r) => {
                const active = role === r
                return (
                  <label
                    key={r}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '11px 16px',
                      border: `1px solid ${active ? 'var(--ink)' : 'var(--rule-strong)'}`,
                      background: active ? 'var(--ink)' : 'var(--foam)',
                      color: active ? 'var(--sand)' : 'var(--ink)',
                      fontFamily: 'var(--ff-sans)',
                      fontSize: 14,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={active}
                      onChange={() => setRole(r)}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    <span aria-hidden="true">{r === 'customer' ? '⚓' : '🚢'}</span>
                    {r === 'customer' ? t('roleCustomer') : t('roleOwner')}
                  </label>
                )
              })}
            </div>
            <p style={{ ...errorTextStyle, marginTop: 8, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--ff-sans)' }}>
              {role === 'customer' ? t('roleCustomerHint') : t('roleOwnerHint')}
            </p>
          </div>

          {/* ── Terms checkbox ── */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked)
                  if (touched.terms) setFieldErrors(validate())
                }}
                onBlur={() => handleBlur('terms')}
                style={{
                  width: 18, height: 18, marginTop: 2, flexShrink: 0,
                  accentColor: 'var(--ink)', cursor: 'pointer',
                }}
                aria-invalid={hasErr('terms')}
              />
              <span style={{ fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.7 }}>
                {t('termsPrefix')}{' '}
                <Link
                  href={`/${locale}/terms`}
                  style={{ color: 'var(--clay)', borderBottom: '1px solid currentColor', paddingBottom: 1 }}
                  target="_blank"
                >
                  {t('termsLink')}
                </Link>
                {' '}{t('termsMid')}{' '}
                <Link
                  href={`/${locale}/privacy`}
                  style={{ color: 'var(--clay)', borderBottom: '1px solid currentColor', paddingBottom: 1 }}
                  target="_blank"
                >
                  {t('privacyLink')}
                </Link>
              </span>
            </label>
            {hasErr('terms') && <p role="alert" style={{ ...errorTextStyle, marginTop: 6 }}>{fieldErrors.terms}</p>}
          </div>

          {/* ── Submit ── */}
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
                {t('submitting')}
              </>
            ) : (
              <>
                {t('submit')}
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.06em', opacity: 0.7 }}>· JOIN</span>
              </>
            )}
          </button>
        </form>

        {/* ── Divider ── */}
        <div className="auth-divider" style={{ margin: '28px 0' }}>
          <span>{t('divider')}</span>
        </div>

        {/* ── Social buttons ── */}
        <div className="social-row">
          <button className="social-btn" type="button" disabled title={t('comingSoon')}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6-4.53z"/>
            </svg>
            Google
          </button>
          <button className="social-btn" type="button" disabled title={t('comingSoon')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Apple
          </button>
          <button
            className="social-btn" type="button" disabled title={t('comingSoon')}
            style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.06em' }}
          >
            FAWRY ID
          </button>
        </div>

        {/* ── Footer link ── */}
        <div className="auth-footer-link">
          {t('hasAccount')}{' '}
          <Link
            href={`/${locale}/login`}
            style={{ color: 'var(--clay)', fontWeight: 600, borderBottom: '1px solid currentColor', paddingBottom: 1 }}
          >
            {t('login')} · SIGN IN
          </Link>
        </div>

      </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
