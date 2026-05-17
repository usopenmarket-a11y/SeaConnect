'use client'

/**
 * Owner KYC / Onboarding page — Client Component.
 *
 * Fetches GET /api/v1/accounts/owner-profile/ via SWR with auth token.
 * Displays 6-step checklist cards; each card has a "Mark as complete"
 * button that shows a toast directing the owner to support (Sprint 11
 * will wire real file uploads).
 *
 * Submit button at bottom calls POST /api/v1/accounts/owner-profile/submit/.
 *
 * Status-aware rendering:
 *   not_started / in_progress  → checklist + submit button
 *   submitted                  → amber "Under Review" banner, submit disabled
 *   approved                   → green "KYC Approved" banner
 *   rejected                   → red rejection banner with reason
 *
 * ADR-009 — JWT in-memory only (via get/post from @/lib/api).
 * ADR-014 — logical CSS (ms-, me-, ps-, pe-) only.
 * ADR-015 — all strings via t() from owner.kyc namespace.
 */

import * as React from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { get, post, ApiError } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type KycStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected'

interface OwnerProfile {
  id: string
  kyc_status: KycStatus
  national_id_verified: boolean
  vessel_docs_verified: boolean
  captain_license_verified: boolean
  insurance_verified: boolean
  inspection_passed: boolean
  bank_account_configured: boolean
  completed_steps: number
  total_steps: number
  reviewed_at: string | null
  rejection_reason: string
}

interface StepDef {
  key: string
  field: keyof OwnerProfile
  labelKey: string
  descKey: string
  number: string
  enLabel: string
}

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  {
    key: 'identity',
    field: 'national_id_verified',
    labelKey: 'steps.identity',
    descKey: 'stepDesc.identity',
    number: '01',
    enLabel: 'IDENTITY',
  },
  {
    key: 'vesselDocs',
    field: 'vessel_docs_verified',
    labelKey: 'steps.vesselDocs',
    descKey: 'stepDesc.vesselDocs',
    number: '02',
    enLabel: 'VESSEL DOCS',
  },
  {
    key: 'captainLicense',
    field: 'captain_license_verified',
    labelKey: 'steps.captainLicense',
    descKey: 'stepDesc.captainLicense',
    number: '03',
    enLabel: 'CAPTAIN LICENSE',
  },
  {
    key: 'insurance',
    field: 'insurance_verified',
    labelKey: 'steps.insurance',
    descKey: 'stepDesc.insurance',
    number: '04',
    enLabel: 'INSURANCE',
  },
  {
    key: 'inspection',
    field: 'inspection_passed',
    labelKey: 'steps.inspection',
    descKey: 'stepDesc.inspection',
    number: '05',
    enLabel: 'PORT AUTHORITY',
  },
  {
    key: 'bankSetup',
    field: 'bank_account_configured',
    labelKey: 'steps.bankSetup',
    descKey: 'stepDesc.bankSetup',
    number: '06',
    enLabel: 'BANK DETAILS',
  },
]

// ── SWR fetcher ───────────────────────────────────────────────────────────────

const fetchProfile = (path: string) => get<OwnerProfile>(path)

// ── Status banner ─────────────────────────────────────────────────────────────

function StatusBanner({
  kycStatus,
  rejectionReason,
  t,
}: {
  kycStatus: KycStatus
  rejectionReason: string
  t: ReturnType<typeof useTranslations<'owner.kyc'>>
}): React.ReactElement | null {
  if (kycStatus === 'submitted') {
    return (
      <div
        role="status"
        data-screen-label="kyc-banner-submitted"
        style={{
          background: 'oklch(0.97 0.05 85)',
          border: '1px solid oklch(0.75 0.12 85)',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 24,
          color: 'oklch(0.38 0.12 60)',
          fontFamily: 'var(--ff-sans)',
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 18 }}>⏳</span>
        {t('statusBanner.submitted')}
      </div>
    )
  }

  if (kycStatus === 'approved') {
    return (
      <div
        role="status"
        data-screen-label="kyc-banner-approved"
        style={{
          background: 'oklch(0.97 0.05 145)',
          border: '1px solid oklch(0.75 0.12 145)',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 24,
          color: 'oklch(0.35 0.12 145)',
          fontFamily: 'var(--ff-sans)',
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 18 }}>✓</span>
        {t('statusBanner.approved')}
      </div>
    )
  }

  if (kycStatus === 'rejected') {
    return (
      <div
        role="alert"
        data-screen-label="kyc-banner-rejected"
        style={{
          background: 'oklch(0.97 0.05 20)',
          border: '1px solid oklch(0.75 0.12 20)',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 24,
          color: 'oklch(0.40 0.15 20)',
          fontFamily: 'var(--ff-sans)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 18 }}>✕</span>
          {t('statusBanner.rejected')}
        </div>
        {rejectionReason && (
          <div style={{ marginTop: 6, fontWeight: 400, fontSize: 13 }}>
            {rejectionReason}
          </div>
        )}
      </div>
    )
  }

  return null
}

// ── Toast notification ────────────────────────────────────────────────────────

interface ToastProps {
  message: string
  type: 'info' | 'success' | 'error'
  onDismiss: () => void
}

function Toast({ message, type, onDismiss }: ToastProps): React.ReactElement {
  React.useEffect(() => {
    const id = setTimeout(onDismiss, 4000)
    return () => clearTimeout(id)
  }, [onDismiss])

  const colors: Record<ToastProps['type'], { bg: string; border: string; text: string }> = {
    info: { bg: 'oklch(0.97 0.02 220)', border: 'oklch(0.75 0.06 220)', text: 'oklch(0.30 0.07 225)' },
    success: { bg: 'oklch(0.97 0.05 145)', border: 'oklch(0.75 0.12 145)', text: 'oklch(0.35 0.12 145)' },
    error: { bg: 'oklch(0.97 0.05 20)', border: 'oklch(0.75 0.12 20)', text: 'oklch(0.40 0.15 20)' },
  }
  const c = colors[type]

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 80,
        insetInlineEnd: 24,
        zIndex: 9999,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        padding: '12px 18px',
        color: c.text,
        fontFamily: 'var(--ff-sans)',
        fontSize: 14,
        fontWeight: 600,
        maxWidth: 360,
        boxShadow: '0 8px 24px oklch(0.14 0.04 240 / 0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="dismiss"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
          opacity: 0.7,
        }}
      >
        ×
      </button>
    </div>
  )
}

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({
  step,
  isDone,
  isReadOnly,
  onMarkComplete,
  t,
}: {
  step: StepDef
  isDone: boolean
  isReadOnly: boolean
  onMarkComplete: (stepKey: string) => void
  t: ReturnType<typeof useTranslations<'owner.kyc'>>
}): React.ReactElement {
  return (
    <div
      className="dash-card"
      data-screen-label={`kyc-step-${step.key}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 20,
        padding: '22px 26px',
        borderInlineStart: `4px solid ${isDone ? 'oklch(0.55 0.13 155)' : 'var(--rule)'}`,
        opacity: isDone ? 1 : 0.85,
      }}
    >
      {/* Step number + tick */}
      <div
        className={`tick-circle${isDone ? ' on' : ''}`}
        aria-hidden="true"
        style={{ width: 40, height: 40, fontSize: 16, flexShrink: 0, marginTop: 2 }}
      >
        {isDone ? '✓' : step.number}
      </div>

      {/* Step body */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 9,
            letterSpacing: '0.12em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 4,
            direction: 'ltr',
          }}
        >
          STEP {step.number} · {step.enLabel}
        </div>
        <div
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          {t(step.labelKey as Parameters<typeof t>[0])}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--muted-2)',
            lineHeight: 1.6,
          }}
        >
          {t(step.descKey as Parameters<typeof t>[0])}
        </div>
      </div>

      {/* Status pill + action */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 10,
          flexShrink: 0,
        }}
      >
        {isDone ? (
          <span
            className="pill-status ok"
            style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em' }}
          >
            {t('stepDone')}
          </span>
        ) : (
          <span
            className="pill-status pending"
            style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em' }}
          >
            {t('stepPending')}
          </span>
        )}

        {!isDone && !isReadOnly && (
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 14px', fontSize: 12, whiteSpace: 'nowrap' }}
            onClick={() => onMarkComplete(step.key)}
          >
            {t('markComplete')}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton(): React.ReactElement {
  return (
    <section aria-busy="true" aria-label="جارٍ التحميل" style={{ direction: 'rtl' }}>
      <div
        style={{
          height: 28,
          width: '45%',
          background: 'var(--rule)',
          borderRadius: 6,
          marginBottom: 10,
        }}
      />
      <div
        style={{
          height: 14,
          width: '65%',
          background: 'var(--rule)',
          borderRadius: 6,
          marginBottom: 32,
        }}
      />
      <div
        style={{
          height: 8,
          background: 'var(--rule)',
          borderRadius: 4,
          marginBottom: 32,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div
            key={n}
            style={{
              height: 90,
              background: 'var(--rule)',
              borderRadius: 4,
            }}
          />
        ))}
      </div>
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  locale: string
}

export function OnboardingPageClient({ locale: _locale }: Props): React.ReactElement {
  const t = useTranslations('owner.kyc')

  // ── API: profile fetch ─────────────────────────────────────────────────────
  const {
    data: profile,
    error: profileError,
    mutate,
    isLoading,
  } = useSWR<OwnerProfile>('/accounts/owner-profile/', fetchProfile, {
    revalidateOnFocus: false,
  })

  // ── Submit state ───────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = React.useState<boolean>(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  // ── Toast state ────────────────────────────────────────────────────────────
  interface ToastEntry {
    id: number
    message: string
    type: 'info' | 'success' | 'error'
  }
  const [toasts, setToasts] = React.useState<ToastEntry[]>([])
  const toastIdRef = React.useRef<number>(0)

  function showToast(message: string, type: ToastEntry['type'] = 'info'): void {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { id, message, type }])
  }

  function dismissToast(id: number): void {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // ── "Mark as Complete" handler — Sprint 11 will wire real uploads ──────────
  function handleMarkComplete(_stepKey: string): void {
    showToast(t('contactSupport'), 'info')
  }

  // ── Submit handler ─────────────────────────────────────────────────────────
  async function handleSubmit(): Promise<void> {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await post('/accounts/owner-profile/submit/', {})
      await mutate()
      showToast(t('submitSuccess'), 'success')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSubmitError(t('statusBanner.submitted'))
      } else {
        setSubmitError(err instanceof Error ? err.message : t('errorGeneric'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return <LoadingSkeleton />
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (profileError || !profile) {
    return (
      <div
        role="alert"
        style={{
          padding: '24px 28px',
          background: 'oklch(0.97 0.05 20)',
          border: '1px solid oklch(0.75 0.12 20)',
          borderRadius: 8,
          color: 'oklch(0.40 0.15 20)',
          fontFamily: 'var(--ff-sans)',
          fontSize: 14,
        }}
      >
        {t('loadError')}
      </div>
    )
  }

  const kycStatus = profile.kyc_status
  const isReadOnly = kycStatus === 'submitted' || kycStatus === 'approved'
  const canSubmit = kycStatus === 'not_started' || kycStatus === 'in_progress'

  const doneCount = profile.completed_steps
  const totalSteps = profile.total_steps
  const pct = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0

  return (
    <section data-screen-label="owner-kyc-page">
      {/* Toast layer */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="dash-head" style={{ marginBottom: 32 }}>
        <div>
          <div className="num-tag">{t('eyebrow')}</div>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 700, margin: '8px 0 4px' }}>
            {t('title')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted-2)', maxWidth: '52ch' }}>
            {t('subtitle')}
          </p>
        </div>

        {/* KYC status badge */}
        <div
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            letterSpacing: '0.10em',
            color: 'var(--muted)',
            paddingTop: 4,
          }}
        >
          {t(`status.${kycStatus}` as Parameters<typeof t>[0])}
        </div>
      </header>

      {/* ── Status banner ─────────────────────────────────────────────────── */}
      <StatusBanner
        kycStatus={kycStatus}
        rejectionReason={profile.rejection_reason}
        t={t}
      />

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      <div
        className="onb-progress"
        style={{ marginBottom: 28 }}
        data-screen-label="kyc-progress"
      >
        <div
          className="onb-bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${doneCount} / ${totalSteps} ${t('progressLabel')}`}
        >
          <div className="onb-fill" style={{ width: `${pct}%` }} />
        </div>
        <div
          className="onb-pct"
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            letterSpacing: '0.07em',
            color: 'var(--muted)',
            marginTop: 8,
            direction: 'ltr',
          }}
        >
          {doneCount} / {totalSteps} {t('progressLabel')} · {pct}%
        </div>
      </div>

      {/* ── Step stepper indicator ────────────────────────────────────────── */}
      <div
        className="onb-stepper"
        role="list"
        aria-label={t('stepperLabel')}
        style={{ marginBottom: 32 }}
      >
        {STEPS.map((step, idx) => {
          const isDone = Boolean(profile[step.field])
          const firstPending = STEPS.findIndex((s) => !profile[s.field])
          const isActive = !isDone && idx === firstPending
          const stepClass = isDone ? 'done' : isActive ? 'active' : 'pending'
          return (
            <div
              key={step.key}
              className={`onb-step ${stepClass}`}
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
            >
              <div
                className="circle"
                aria-hidden="true"
              >
                {isDone ? '✓' : step.number}
              </div>
              <div className="lbl">
                <div className="ar">{t(step.labelKey as Parameters<typeof t>[0])}</div>
                <div className="en">{step.enLabel}</div>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="line" aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step cards ────────────────────────────────────────────────────── */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        data-screen-label="kyc-step-cards"
      >
        {STEPS.map((step) => (
          <StepCard
            key={step.key}
            step={step}
            isDone={Boolean(profile[step.field])}
            isReadOnly={isReadOnly}
            onMarkComplete={handleMarkComplete}
            t={t}
          />
        ))}
      </div>

      {/* ── Submit error ──────────────────────────────────────────────────── */}
      {submitError && (
        <div
          role="alert"
          style={{
            marginTop: 16,
            padding: '12px 16px',
            background: 'oklch(0.97 0.05 20)',
            border: '1px solid oklch(0.75 0.12 20)',
            borderRadius: 6,
            color: 'oklch(0.40 0.15 20)',
            fontFamily: 'var(--ff-sans)',
            fontSize: 13,
          }}
        >
          {submitError}
        </div>
      )}

      {/* ── Action bar ────────────────────────────────────────────────────── */}
      <div className="action-bar" style={{ marginTop: 32 }}>
        {doneCount === totalSteps ? (
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 12,
              letterSpacing: '0.08em',
              color: 'oklch(0.85 0.09 155)',
            }}
          >
            ✓ {t('allStepsDone')}
          </span>
        ) : (
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 12,
              letterSpacing: '0.08em',
              color: 'var(--foam)',
              opacity: 0.6,
            }}
          >
            {doneCount} / {totalSteps} {t('progressLabel')}
          </span>
        )}

        <button
          className="btn btn-clay cta-shimmer"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{
            opacity: !canSubmit || submitting ? 0.5 : 1,
            cursor: !canSubmit || submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? t('submitting') : t('submitReview')}
        </button>
      </div>
    </section>
  )
}
