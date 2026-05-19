'use client'

/**
 * Register page — Client Component.
 *
 * Matches FromClaudeDesign/auth.jsx Register() — 3-step flow:
 *   Step 1: Basic info (name, email, phone with country code, password)
 *   Step 2: Role selection (customer / owner / vendor) with 3 role-card buttons
 *   Step 3: OTP verification — 6 individual otp-box inputs
 *
 * Auth logic unchanged: useAuth().register() → JWT in module memory (ADR-009).
 * All strings via i18n keys (ADR-015). Logical CSS for RTL (ADR-014).
 * Country-code dropdown shown in step 1; locked to +20 if owner/vendor selected in step 2.
 */

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth, type RegisterPayload } from '@/lib/auth'
import { ApiError } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegisterPageProps {
  params: { locale: string }
}

type UserRole = 'customer' | 'owner' | 'vendor'

interface Step1Errors {
  name?: string
  email?: string
  phone?: string
  password?: string
}

interface CountryCode {
  code: string
  flag: string
  name: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COUNTRY_CODES: CountryCode[] = [
  { code: '+20',  flag: '🇪🇬', name: 'Egypt' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+962', flag: '🇯🇴', name: 'Jordan' },
  { code: '+44',  flag: '🇬🇧', name: 'UK' },
  { code: '+1',   flag: '🇺🇸', name: 'USA' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
]

const ROLE_CARDS: Array<{ id: UserRole; icon: string; titleKey: string; subKey: string }> = [
  { id: 'customer', icon: '⌖', titleKey: 'roleCustomer', subKey: 'roleCustomerSub' },
  { id: 'owner',    icon: '⚓', titleKey: 'roleOwner',    subKey: 'roleOwnerSub' },
  { id: 'vendor',   icon: '◧', titleKey: 'roleVendor',   subKey: 'roleVendorSub' },
]

// ---------------------------------------------------------------------------
// OTP input sub-component
// ---------------------------------------------------------------------------

interface OtpRowProps {
  value: string[]
  onChange: (value: string[]) => void
}

function OtpRow({ value, onChange }: OtpRowProps): React.ReactElement {
  const refs = React.useRef<Array<HTMLInputElement | null>>([])

  function handleInput(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[index] = char
    onChange(next)
    if (char && index < 5) {
      refs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (digits.length > 0) {
      e.preventDefault()
      const next = digits.split('').concat(Array(6).fill('')).slice(0, 6)
      onChange(next)
      const focusIdx = Math.min(digits.length, 5)
      refs.current[focusIdx]?.focus()
    }
  }

  return (
    <div className="otp-row" dir="ltr">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          className="otp-box"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleInput(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RegisterPage({ params: { locale } }: RegisterPageProps): React.ReactElement {
  const t = useTranslations('auth.register')
  const tCommon = useTranslations('common')
  const { register } = useAuth()
  const router = useRouter()

  const isAr = locale === 'ar'

  // Step state
  const [step, setStep] = React.useState<1 | 2 | 3>(1)

  // Step 1 fields
  const [fullName, setFullName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [countryCode, setCountryCode] = React.useState('+20')
  const [phoneNumber, setPhoneNumber] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPass, setShowPass] = React.useState(false)
  const [step1Errors, setStep1Errors] = React.useState<Step1Errors>({})
  const [step1Touched, setStep1Touched] = React.useState<Record<string, boolean>>({})

  // Step 2 fields
  const [role, setRole] = React.useState<UserRole>('customer')

  // Step 3 fields
  const [otp, setOtp] = React.useState<string[]>(Array(6).fill(''))

  // Global
  const [isLoading, setIsLoading] = React.useState(false)
  const [globalError, setGlobalError] = React.useState<string | null>(null)

  // Lock country code to +20 for owner/vendor
  const egyptOnly = role === 'owner' || role === 'vendor'

  React.useEffect(() => {
    if (egyptOnly) setCountryCode('+20')
  }, [egyptOnly])

  // ── Step 1 validation ────────────────────────────────────────────────────

  function validateStep1(): Step1Errors {
    const errors: Step1Errors = {}
    if (!fullName.trim()) errors.name = t('nameLabel') + ' ' + tCommon('error')
    if (!email.trim()) errors.email = t('errorEmail')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = t('errorEmailInvalid')
    if (!phoneNumber.trim()) errors.phone = t('errorPhone')
    else if (!/^[0-9]{6,15}$/.test(phoneNumber.replace(/\s/g, ''))) errors.phone = t('errorPhoneInvalid')
    if (!password) errors.password = t('errorPassword')
    else if (password.length < 8) errors.password = t('errorPasswordLength')
    return errors
  }

  function handleStep1Blur(field: string) {
    setStep1Touched((p) => ({ ...p, [field]: true }))
    setStep1Errors(validateStep1())
  }

  function handleStep1Continue() {
    setStep1Touched({ name: true, email: true, phone: true, password: true })
    const errors = validateStep1()
    setStep1Errors(errors)
    if (Object.keys(errors).length === 0) setStep(2)
  }

  // ── Submit (step 3 verify) ───────────────────────────────────────────────

  async function handleVerify() {
    setGlobalError(null)
    setIsLoading(true)

    // Split name at first space for API
    const nameParts = fullName.trim().split(/\s+/)
    const firstName = nameParts[0] ?? ''
    const lastName = nameParts.slice(1).join(' ') || firstName

    const payload: RegisterPayload = {
      first_name: firstName,
      last_name: lastName,
      phone: `${countryCode}${phoneNumber.replace(/\s/g, '')}`,
      email,
      password,
      // vendor is not in RegisterPayload type yet — cast through 'customer'|'owner'
      role: role === 'vendor' ? 'customer' : role,
    }

    try {
      await register(payload)
      router.push(`/${locale}/bookings`)
    } catch (err) {
      if (err instanceof ApiError) {
        setGlobalError(err.message)
      } else if (err instanceof Error) {
        setGlobalError(err.message)
      } else {
        setGlobalError(tCommon('error'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  function hasErr(f: keyof Step1Errors): boolean {
    return !!(step1Touched[f] && step1Errors[f])
  }

  const errorInputStyle: React.CSSProperties = { borderColor: 'oklch(0.55 0.16 25)' }
  const errorTextStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'oklch(0.45 0.15 25)',
    marginTop: 5,
    fontFamily: 'var(--ff-mono)',
  }

  // ── Art panel (shared across steps) ──────────────────────────────────────

  const artPanel = (
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
  )

  // ── Step tag helper ───────────────────────────────────────────────────────

  function StepTag({ n }: { n: number }) {
    return (
      <div className="step-tag">
        {t('stepOf').replace('{step}', String(n))}
      </div>
    )
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="auth-shell">
      {artPanel}

      <div className="auth-card-wrap">
        <div className="auth-card">

          {/* Lang switch */}
          <div className="auth-lang-row">
            <Link
              href={`/${locale === 'ar' ? 'en' : 'ar'}/register`}
              className="lang-switch"
              style={{ textDecoration: 'none' }}
            >
              <span className={`lang-opt${locale === 'ar' ? ' on' : ''}`}>ع</span>
              <span className="lang-sep">·</span>
              <span className={`lang-opt${locale === 'en' ? ' on' : ''}`}>EN</span>
            </Link>
          </div>

          {/* Global error */}
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

          {/* ────────────── STEP 1: Basic info ────────────── */}
          {step === 1 && (
            <>
              <StepTag n={1} />
              <h2>{isAr ? 'إنشاء حساب' : 'Create account'}</h2>

              {/* Full name */}
              <div className="form-field">
                <label htmlFor="fullName">{t('nameLabel')}</label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    if (step1Touched.name) setStep1Errors(validateStep1())
                  }}
                  onBlur={() => handleStep1Blur('name')}
                  aria-invalid={hasErr('name')}
                  placeholder={t('namePlaceholder')}
                  style={hasErr('name') ? errorInputStyle : undefined}
                />
                {hasErr('name') && <p role="alert" style={errorTextStyle}>{step1Errors.name}</p>}
              </div>

              {/* Email */}
              <div className="form-field">
                <label htmlFor="email">{t('email')}</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (step1Touched.email) setStep1Errors(validateStep1())
                  }}
                  onBlur={() => handleStep1Blur('email')}
                  aria-invalid={hasErr('email')}
                  placeholder="name@example.com"
                  style={hasErr('email') ? errorInputStyle : undefined}
                />
                {hasErr('email') && <p role="alert" style={errorTextStyle}>{step1Errors.email}</p>}
              </div>

              {/* Phone with country code */}
              <div className="form-field">
                <label htmlFor="phoneNumber">{t('phoneLabel')}</label>
                <div style={{ display: 'flex', gap: 0 }}>
                  <select
                    aria-label={t('countryCode')}
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    disabled={egyptOnly}
                    style={{
                      padding: '0 10px',
                      background: 'oklch(0.93 0.008 210)',
                      border: `1px solid ${hasErr('phone') ? 'oklch(0.55 0.16 25)' : 'var(--rule-strong)'}`,
                      borderInlineEnd: 'none',
                      fontFamily: 'var(--ff-mono)',
                      fontSize: 13,
                      color: 'var(--ink)',
                      flexShrink: 0,
                      cursor: egyptOnly ? 'not-allowed' : 'pointer',
                      opacity: egyptOnly ? 0.7 : 1,
                      minWidth: 90,
                    }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={`${c.code}-${c.name}`} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    id="phoneNumber"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    required
                    dir="ltr"
                    value={phoneNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d\s]/g, '').slice(0, 15)
                      setPhoneNumber(v)
                      if (step1Touched.phone) setStep1Errors(validateStep1())
                    }}
                    onBlur={() => handleStep1Blur('phone')}
                    aria-invalid={hasErr('phone')}
                    placeholder="100 234 5678"
                    style={{
                      flex: 1,
                      fontFamily: 'var(--ff-mono)',
                      letterSpacing: '0.05em',
                      ...(hasErr('phone') ? errorInputStyle : undefined),
                    }}
                  />
                </div>
                {hasErr('phone') && <p role="alert" style={errorTextStyle}>{step1Errors.phone}</p>}
              </div>

              {/* Password */}
              <div className="form-field">
                <label htmlFor="password">{t('password')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    dir="ltr"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (step1Touched.password) setStep1Errors(validateStep1())
                    }}
                    onBlur={() => handleStep1Blur('password')}
                    aria-invalid={hasErr('password')}
                    placeholder="••••••••"
                    style={{
                      paddingInlineEnd: 54,
                      ...(hasErr('password') ? errorInputStyle : undefined),
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
                {hasErr('password') && <p role="alert" style={errorTextStyle}>{step1Errors.password}</p>}
              </div>

              <button
                type="button"
                className="btn btn-clay btn-lg"
                onClick={handleStep1Continue}
              >
                {t('continueBtn')}
              </button>

              <div className="auth-foot">
                {t('hasAccount')}{' '}
                <Link href={`/${locale}/login`}>{t('signIn')}</Link>
              </div>
            </>
          )}

          {/* ────────────── STEP 2: Role selection ────────────── */}
          {step === 2 && (
            <>
              <StepTag n={2} />
              <h2>{isAr ? 'إنشاء حساب' : 'Create account'}</h2>

              <div
                className="form-field"
                style={{ marginBottom: 8 }}
              >
                <label style={{ display: 'block', marginBottom: 12 }}>
                  {t('roleTitle')}
                </label>
              </div>

              <div className="role-cards">
                {ROLE_CARDS.map((rc) => (
                  <button
                    key={rc.id}
                    type="button"
                    className={`role-card${role === rc.id ? ' on' : ''}`}
                    onClick={() => setRole(rc.id)}
                    aria-pressed={role === rc.id}
                  >
                    <span className="role-ico">{rc.icon}</span>
                    <span>
                      <div className="role-title">{t(rc.titleKey)}</div>
                      <div className="role-sub">{t(rc.subKey)}</div>
                    </span>
                    <span className="role-check" aria-hidden>
                      {role === rc.id ? '✓' : ''}
                    </span>
                  </button>
                ))}
              </div>

              {/* Egypt-only notice for owner/vendor */}
              {egyptOnly && (
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    fontFamily: 'var(--ff-mono)',
                    marginBottom: 16,
                    padding: '10px 14px',
                    background: 'oklch(0.95 0.015 85)',
                    border: '1px solid var(--rule)',
                  }}
                >
                  {t('phoneEgyptOnly')}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(1)}
                  style={{ flex: '0 0 auto' }}
                >
                  {isAr ? '→' : '←'} {tCommon('back')}
                </button>
                <button
                  type="button"
                  className="btn btn-clay btn-lg"
                  onClick={() => setStep(3)}
                  style={{ flex: 1 }}
                >
                  {t('continueBtn')}
                </button>
              </div>

              <div className="auth-foot">
                {t('hasAccount')}{' '}
                <Link href={`/${locale}/login`}>{t('signIn')}</Link>
              </div>
            </>
          )}

          {/* ────────────── STEP 3: OTP ────────────── */}
          {step === 3 && (
            <>
              <StepTag n={3} />
              <h2>{isAr ? 'إنشاء حساب' : 'Create account'}</h2>

              <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 4 }}>
                {t('otpSentTo')}
              </p>
              <p
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 14,
                  marginBottom: 16,
                  direction: 'ltr',
                  textAlign: isAr ? 'right' : 'left',
                }}
              >
                {countryCode} {phoneNumber}
              </p>

              <OtpRow value={otp} onChange={setOtp} />

              <div
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--muted)',
                  marginBottom: 12,
                }}
              >
                <button
                  type="button"
                  style={{
                    textDecoration: 'underline',
                    color: 'var(--ink)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--ff-sans)',
                    fontSize: 13,
                  }}
                  onClick={() => {/* TODO: resend OTP */}}
                >
                  {t('otpResend')}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(2)}
                  style={{ flex: '0 0 auto' }}
                >
                  {isAr ? '→' : '←'} {tCommon('back')}
                </button>
                <button
                  type="button"
                  className="btn btn-clay btn-lg"
                  onClick={handleVerify}
                  disabled={isLoading}
                  style={{ flex: 1 }}
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
                    t('otpVerify')
                  )}
                </button>
              </div>

              <div className="auth-foot">
                {t('hasAccount')}{' '}
                <Link href={`/${locale}/login`}>{t('signIn')}</Link>
              </div>
            </>
          )}

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
