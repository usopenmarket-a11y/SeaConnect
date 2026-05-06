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
 * TODO: Replace static step state with API calls to
 *       /api/v1/accounts/owner-profile/verification/ once implemented.
 * TODO: All hardcoded Arabic strings are labelled with i18n TODO.
 *       Wire to t() keys under owner.onboarding.* once translations exist.
 *
 * ADR-014 — logical CSS only (ms-, me-, ps-, pe-).
 * ADR-015 — hardcoded strings marked as TODO for i18n.
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'

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

// ── Static data ───────────────────────────────────────────────────────────────

const STEPS: WizardStep[] = [
  // TODO: i18n — owner.onboarding.steps.*
  { number: '01', labelAr: 'الهوية الشخصية', labelEn: 'IDENTITY', status: 'done' },
  { number: '02', labelAr: 'مستندات القارب', labelEn: 'VESSEL DOCS', status: 'done' },
  { number: '03', labelAr: 'رخصة الربان', labelEn: 'CAPTAIN LICENSE', status: 'done' },
  { number: '04', labelAr: 'تأمين القارب', labelEn: 'INSURANCE', status: 'active' },
  { number: '05', labelAr: 'فحص الفريق', labelEn: 'PHYSICAL INSPECTION', status: 'pending' },
  { number: '06', labelAr: 'الحساب البنكي', labelEn: 'PAYOUT SETUP', status: 'pending' },
]

const CHECKLIST: ChecklistItem[] = [
  // TODO: i18n — owner.onboarding.checklist.*
  { labelAr: 'البطاقة الشخصية أو جواز سفر ساري', done: true },
  { labelAr: 'عقد ملكية القارب', done: true },
  { labelAr: 'شهادة تسجيل خفر السواحل', done: true },
  { labelAr: 'رخصة قيادة بحرية معتمدة', done: true },
  { labelAr: 'شهادة تأمين سارية', done: false },
  { labelAr: 'فحص فني للقارب (٣٠ دقيقة)', done: false },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeProgress(steps: WizardStep[]): { doneCount: number; pct: number } {
  const doneCount = steps.filter((s) => s.status === 'done').length
  const pct = Math.round((doneCount / steps.length) * 100)
  return { doneCount, pct }
}

// ── Step content panels ───────────────────────────────────────────────────────

/** Step 4 panel shown in design — insurance upload + SeaConnect Marine option. */
function InsuranceStepPanel(): React.ReactElement {
  return (
    <>
      <div className="num-tag">§ STEP 04 · INSURANCE</div>
      {/* TODO: i18n — owner.onboarding.insurance.title */}
      <h2 style={{ marginTop: 8 }}>
        تأمين القارب <em>والمسافرين</em>
      </h2>
      {/* TODO: i18n — owner.onboarding.insurance.body */}
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)', marginTop: 12, maxWidth: '52ch' }}>
        كل قارب على المنصة يجب أن يكون مؤمّناً ضد الحوادث البحرية ومسؤولية الطرف الثالث.
        يمكنك رفع شهادة تأمين قائمة، أو شراء تغطية SeaConnect المعتمدة.
      </p>

      <div className="ins-options">
        <label className="ins-card">
          <div className="radio" aria-hidden="true" />
          <div className="body">
            {/* TODO: i18n — owner.onboarding.insurance.seaConnectOption */}
            <div className="t">SeaConnect Marine · موصى به</div>
            <div className="d">تغطية شاملة · ١,٥٠٠,٠٠٠ EGP حدّ أقصى · مسافرون + قارب + مسؤولية</div>
            <div className="price num">2,180 EGP / سنة</div>
          </div>
          <div className="badge mono">RECOMMENDED</div>
        </label>

        <label className="ins-card on">
          <div className="radio" aria-hidden="true" />
          <div className="body">
            {/* TODO: i18n — owner.onboarding.insurance.uploadOption */}
            <div className="t">رفع شهادة موجودة</div>
            <div className="d">إذا كان لديك تأمين بالفعل من شركة معتمدة (مصر للتأمين، GIG، أكسا)</div>
            <div
              className="upload-zone mono"
              role="button"
              tabIndex={0}
              aria-label="رفع شهادة التأمين"
            >
              {/* TODO: i18n — owner.onboarding.insurance.uploadZone */}
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
        {/* TODO: i18n — placeholder content for step {step.number} */}
        هذه الخطوة قيد الإعداد. ستظهر هنا النماذج والتعليمات الخاصة بـ{step.labelAr}.
      </p>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  locale: string
}

export function OnboardingPageClient({ locale: _locale }: Props): React.ReactElement {
  const t = useTranslations('owner.onboarding')
  // Index of the currently active step (0-based). Initialise at the first
  // 'active' step found in the static config.
  const initialActiveIdx = Math.max(
    STEPS.findIndex((s) => s.status === 'active'),
    0,
  )
  const [activeIdx, setActiveIdx] = React.useState<number>(initialActiveIdx)

  // Derive local step statuses from activeIdx so navigation updates visuals.
  const derivedSteps: WizardStep[] = STEPS.map((s, i) => ({
    ...s,
    status: i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'pending',
  }))

  const { doneCount, pct } = computeProgress(derivedSteps)

  const activeStep = derivedSteps[activeIdx]

  function handlePrev(): void {
    setActiveIdx((prev) => Math.max(prev - 1, 0))
  }

  function handleNext(): void {
    setActiveIdx((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  return (
    <section dir="rtl">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">
        {t('title')}
      </h1>

      {/* ── Progress bar ── */}
      <div className="onb-progress">
        <div className="onb-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
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
              disabled={step.status === 'pending'}
              style={{ cursor: step.status === 'pending' ? 'not-allowed' : 'pointer', border: 'none', background: 'inherit' }}
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

          {CHECKLIST.map((item) => (
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
                {/* TODO: i18n — owner.onboarding.checklist.{key} */}
                {item.labelAr}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Navigation action bar ── */}
      <div className="action-bar">
        <button
          className="btn btn-ghost"
          onClick={handlePrev}
          disabled={activeIdx === 0}
          aria-label={t('prevStep')}
        >
          {t('prevStep')}
        </button>

        {activeIdx < STEPS.length - 1 ? (
          <button
            className="btn btn-clay cta-shimmer"
            onClick={handleNext}
            aria-label={t('nextStep')}
          >
            {t('nextStep')}
          </button>
        ) : (
          <button
            className="btn btn-clay cta-shimmer"
            aria-label={t('submitReview')}
          >
            {t('submitReview')}
          </button>
        )}
      </div>
    </section>
  )
}
