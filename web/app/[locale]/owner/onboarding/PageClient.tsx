'use client'

/**
 * Owner Onboarding/Verification page — Client Component.
 *
 * 6-step verification wizard:
 *   Step 1 — Personal identity (الهوية الشخصية)
 *   Step 2 — Vessel documents (مستندات القارب)
 *   Step 3 — Captain license (رخصة الربان)
 *   Step 4 — Boat insurance (تأمين القارب)
 *   Step 5 — Physical inspection (فحص الفريق)
 *   Step 6 — Bank / payout setup (الحساب البنكي)
 *
 * CSS classes from globals.css: .onb-progress, .onb-bar, .onb-fill,
 * .onb-pct, .onb-stepper, .onb-step, .dash-row, .dash-card,
 * .ins-options, .ins-card, .tick-circle, .action-bar, .btn-clay,
 * .num-tag
 *
 * ADR-014 — logical CSS only (ms-, me-, ps-, pe-).
 * ADR-015 — all strings via t() keys.
 */

import * as React from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { get, post } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type StepStatus = 'done' | 'active' | 'pending'

interface WizardStep {
  number: string
  labelAr: string
  labelEn: string
  status: StepStatus
}

interface ChecklistItem {
  labelAr: string
  done: boolean
}

interface OwnerProfile {
  id: string
  kyc_status: 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
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

// ── Static data ───────────────────────────────────────────────────────────────

const STEPS: WizardStep[] = [
  { number: '01', labelAr: 'الهوية الشخصية', labelEn: 'IDENTITY', status: 'done' },
  { number: '02', labelAr: 'مستندات القارب', labelEn: 'VESSEL DOCS', status: 'done' },
  { number: '03', labelAr: 'رخصة الربان', labelEn: 'CAPTAIN LICENSE', status: 'done' },
  { number: '04', labelAr: 'تأمين القارب', labelEn: 'INSURANCE', status: 'active' },
  { number: '05', labelAr: 'فحص الفريق', labelEn: 'PHYSICAL INSPECTION', status: 'pending' },
  { number: '06', labelAr: 'الحساب البنكي', labelEn: 'PAYOUT SETUP', status: 'pending' },
]

/** Maps STEPS index → OwnerProfile boolean field. */
const STEP_FIELDS: (keyof OwnerProfile)[] = [
  'national_id_verified',
  'vessel_docs_verified',
  'captain_license_verified',
  'insurance_verified',
  'inspection_passed',
  'bank_account_configured',
]

const CHECKLIST: ChecklistItem[] = [
  { labelAr: 'البطاقة الشخصية أو جواز سفر ساري', done: true },
  { labelAr: 'عقد ملكية القارب', done: true },
  { labelAr: 'شهادة تسجيل خفر السواحل', done: true },
  { labelAr: 'رخصة قيادة بحرية معتمدة', done: true },
  { labelAr: 'شهادة تأمين سارية', done: false },
  { labelAr: 'فحص فني للقارب (٣٠ دقيقة)', done: false },
]

/** Maps CHECKLIST index → OwnerProfile boolean field. */
const CHECKLIST_KEYS: (keyof OwnerProfile)[] = [
  'national_id_verified',
  'vessel_docs_verified',
  'captain_license_verified',
  'captain_license_verified',
  'insurance_verified',
  'inspection_passed',
]

// ── Step content panels ───────────────────────────────────────────────────────

/** Step 4 panel shown in design — insurance upload + SeaConnect Marine option. */
function InsuranceStepPanel(): React.ReactElement {
  return (
    <>
      <div className="num-tag">§ STEP 04 · INSURANCE</div>
      <h2 style={{ marginTop: 8 }}>
        تأمين القارب <em>والمسافرين</em>
      </h2>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)', marginTop: 12, maxWidth: '52ch' }}>
        كل قارب على المنصة يجب أن يكون مؤمّناً ضد الحوادث البحرية ومسؤولية الطرف الثالث.
        يمكنك رفع شهادة تأمين قائمة، أو شراء تغطية SeaConnect المعتمدة.
      </p>

      <div className="ins-options">
        <label className="ins-card">
          <div className="radio" aria-hidden="true" />
          <div className="body">
            <div className="t">SeaConnect Marine · موصى به</div>
            <div className="d">تغطية شاملة · ١,٥٠٠,٠٠٠ EGP حدّ أقصى · مسافرون + قارب + مسؤولية</div>
            <div className="price num">2,180 EGP / سنة</div>
          </div>
          <div className="badge mono">RECOMMENDED</div>
        </label>

        <label className="ins-card on">
          <div className="radio" aria-hidden="true" />
          <div className="body">
            <div className="t">رفع شهادة موجودة</div>
            <div className="d">إذا كان لديك تأمين بالفعل من شركة معتمدة (مصر للتأمين، GIG، أكسا)</div>
            <div
              className="upload-zone mono"
              role="button"
              tabIndex={0}
              aria-label="رفع شهادة التأمين"
            >
              <span>↑ اسحب الشهادة هنا · PDF / JPG · MAX 10MB</span>
            </div>
          </div>
        </label>
      </div>
    </>
  )
}

/** Generic placeholder panel for steps not yet designed in detail. */
function GenericStepPanel({ step }: { step: WizardStep }): React.ReactElement {
  return (
    <>
      <div className="num-tag">§ STEP {step.number} · {step.labelEn}</div>
      <h2 style={{ marginTop: 8 }}>{step.labelAr}</h2>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)', marginTop: 12, maxWidth: '52ch' }}>
        هذه الخطوة قيد الإعداد. ستظهر هنا النماذج والتعليمات الخاصة بـ{step.labelAr}.
      </p>
    </>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ProfileLoadingSkeleton(): React.ReactElement {
  return (
    <section dir="rtl" aria-busy="true" aria-label="جارٍ التحميل">
      <div
        style={{
          height: 32,
          width: '40%',
          background: 'var(--rule)',
          borderRadius: 6,
          marginBottom: 24,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: 12,
          width: '100%',
          background: 'var(--rule)',
          borderRadius: 6,
          marginBottom: 8,
        }}
      />
      <div
        style={{
          height: 12,
          width: '60%',
          background: 'var(--rule)',
          borderRadius: 6,
          marginBottom: 32,
        }}
      />
      <div style={{ display: 'flex', gap: 16 }}>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div
            key={n}
            style={{
              height: 64,
              flex: 1,
              background: 'var(--rule)',
              borderRadius: 8,
            }}
          />
        ))}
      </div>
    </section>
  )
}

// ── Status banners ────────────────────────────────────────────────────────────

function StatusBanner({ kyc_status, rejection_reason }: {
  kyc_status: OwnerProfile['kyc_status']
  rejection_reason: string
}): React.ReactElement | null {
  const t = useTranslations('owner.onboarding')

  if (kyc_status === 'submitted') {
    return (
      <div
        role="status"
        style={{
          background: 'oklch(0.97 0.05 85)',
          border: '1px solid oklch(0.75 0.12 85)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          color: 'oklch(0.40 0.12 60)',
          fontFamily: 'var(--ff-sans)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {t('statusBanner.submitted')}
      </div>
    )
  }

  if (kyc_status === 'approved') {
    return (
      <div
        role="status"
        style={{
          background: 'oklch(0.97 0.05 145)',
          border: '1px solid oklch(0.75 0.12 145)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          color: 'oklch(0.35 0.12 145)',
          fontFamily: 'var(--ff-sans)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {t('statusBanner.approved')}
      </div>
    )
  }

  if (kyc_status === 'rejected') {
    return (
      <div
        role="alert"
        style={{
          background: 'oklch(0.97 0.05 20)',
          border: '1px solid oklch(0.75 0.12 20)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          color: 'oklch(0.40 0.15 20)',
          fontFamily: 'var(--ff-sans)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <div>{t('statusBanner.rejected')}</div>
        {rejection_reason && (
          <div style={{ marginTop: 4, fontWeight: 400, fontSize: 13 }}>
            {rejection_reason}
          </div>
        )}
      </div>
    )
  }

  return null
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  locale: string
}

export function OnboardingPageClient({ locale: _locale }: Props): React.ReactElement {
  const t = useTranslations('owner.onboarding')

  // ── API state ──────────────────────────────────────────────────────────────
  const { data: profile, mutate } = useSWR<OwnerProfile>(
    '/accounts/owner-profile/',
    (path: string) => get<OwnerProfile>(path),
    { revalidateOnFocus: false },
  )

  const [submitting, setSubmitting] = React.useState<boolean>(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  // ── Derive steps from API ──────────────────────────────────────────────────
  const derivedSteps: WizardStep[] = STEPS.map((s, i) => {
    const field = STEP_FIELDS[i]
    const isDone = profile ? Boolean(profile[field]) : s.status === 'done'
    const firstIncomplete = profile
      ? STEP_FIELDS.findIndex((f) => !profile[f])
      : STEPS.findIndex((step) => step.status === 'active')
    return {
      ...s,
      status: isDone
        ? ('done' as const)
        : i === firstIncomplete
          ? ('active' as const)
          : ('pending' as const),
    }
  })

  // ── Progress numbers from API when available ───────────────────────────────
  const doneCount = profile?.completed_steps ?? derivedSteps.filter((s) => s.status === 'done').length
  const pct = profile
    ? Math.round((profile.completed_steps / profile.total_steps) * 100)
    : Math.round((doneCount / STEPS.length) * 100)

  // ── Active step navigation ─────────────────────────────────────────────────
  const initialActiveIdx = Math.max(
    derivedSteps.findIndex((s) => s.status === 'active'),
    0,
  )
  const [activeIdx, setActiveIdx] = React.useState<number>(initialActiveIdx)

  // Keep activeIdx in sync when profile loads and changes the first active step
  const firstActiveFromProfile = derivedSteps.findIndex((s) => s.status === 'active')
  React.useEffect(() => {
    if (profile && firstActiveFromProfile >= 0) {
      setActiveIdx(firstActiveFromProfile)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.kyc_status, profile?.completed_steps])

  const activeStep = derivedSteps[activeIdx] ?? derivedSteps[0]

  // ── Checklist done flags from API ──────────────────────────────────────────
  const checklistItems: ChecklistItem[] = CHECKLIST.map((item, i) => ({
    ...item,
    done: profile ? Boolean(profile[CHECKLIST_KEYS[i]]) : item.done,
  }))

  // ── Submit handler ─────────────────────────────────────────────────────────
  async function handleSubmit(): Promise<void> {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await post('/accounts/owner-profile/submit/', {})
      await mutate()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setSubmitting(false)
    }
  }

  function handlePrev(): void {
    setActiveIdx((prev) => Math.max(prev - 1, 0))
  }

  function handleNext(): void {
    setActiveIdx((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!profile) {
    return <ProfileLoadingSkeleton />
  }

  const canSubmit =
    profile.kyc_status === 'not_started' || profile.kyc_status === 'in_progress'
  const isReadOnly =
    profile.kyc_status === 'submitted' || profile.kyc_status === 'approved'

  return (
    <section dir="rtl">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">
        {t('title')}
      </h1>

      {/* ── Status banner (submitted / approved / rejected) ── */}
      <StatusBanner
        kyc_status={profile.kyc_status}
        rejection_reason={profile.rejection_reason}
      />

      {/* ── Progress bar ── */}
      <div className="onb-progress">
        <div
          className="onb-bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="onb-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="onb-pct mono">
          {doneCount} / {STEPS.length} {t('progressLabel')} · {pct}%
        </div>
      </div>

      {/* ── Step indicators ── */}
      <div className="onb-stepper" role="list" aria-label="خطوات التحقق">
        {derivedSteps.map((step, idx) => (
          <div
            key={step.number}
            className={`onb-step ${step.status}`}
            role="listitem"
            aria-current={step.status === 'active' ? 'step' : undefined}
          >
            <button
              className="circle"
              onClick={() => setActiveIdx(idx)}
              aria-label={`الخطوة ${step.number}: ${step.labelAr}`}
              disabled={step.status === 'pending' || isReadOnly}
              style={{
                cursor: step.status === 'pending' || isReadOnly ? 'not-allowed' : 'pointer',
                border: 'none',
                background: 'inherit',
              }}
            >
              {step.status === 'done' ? '✓' : step.number}
            </button>
            <div className="lbl">
              <div className="ar">{step.labelAr}</div>
              <div className="en mono">{step.labelEn}</div>
            </div>
            {idx < derivedSteps.length - 1 && (
              <div className="line" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      {/* ── Step content + checklist ── */}
      <div className="dash-row" style={{ gridTemplateColumns: '1.5fr 1fr', marginTop: 32 }}>
        <div className="dash-card">
          {activeStep.number === '04' ? (
            <InsuranceStepPanel />
          ) : (
            <GenericStepPanel step={activeStep} />
          )}
        </div>

        {/* Verification checklist */}
        <div className="dash-card">
          <h3>{t('checklistTitle')}</h3>
          <div className="sub">VERIFICATION CHECKLIST</div>

          {checklistItems.map((item) => (
            <div
              key={item.labelAr}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid var(--rule)',
                opacity: item.done ? 1 : 0.55,
              }}
            >
              <span
                className={`tick-circle${item.done ? ' on' : ''}`}
                aria-hidden="true"
              >
                {item.done ? '✓' : ''}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  textDecoration: item.done ? 'line-through' : 'none',
                }}
              >
                {item.labelAr}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Submit error ── */}
      {submitError && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: '10px 14px',
            background: 'oklch(0.97 0.05 20)',
            border: '1px solid oklch(0.75 0.12 20)',
            borderRadius: 6,
            color: 'oklch(0.40 0.15 20)',
            fontSize: 13,
          }}
        >
          {submitError}
        </div>
      )}

      {/* ── Navigation action bar ── */}
      <div className="action-bar">
        {canSubmit && (
          <button
            className="btn btn-ghost"
            onClick={handlePrev}
            disabled={activeIdx === 0}
            aria-label={t('prevStep')}
          >
            {t('prevStep')}
          </button>
        )}

        {canSubmit && activeIdx < STEPS.length - 1 && (
          <button
            className="btn btn-clay cta-shimmer"
            onClick={handleNext}
            aria-label={t('nextStep')}
          >
            {t('nextStep')}
          </button>
        )}

        {canSubmit && activeIdx === STEPS.length - 1 && (
          <button
            className="btn btn-clay cta-shimmer"
            onClick={handleSubmit}
            disabled={submitting}
            aria-label={t('submitReview')}
          >
            {submitting ? t('submitting') : t('submitReview')}
          </button>
        )}
      </div>
    </section>
  )
}
