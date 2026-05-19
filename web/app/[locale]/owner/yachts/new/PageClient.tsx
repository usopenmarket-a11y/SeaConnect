'use client'

/**
 * Owner — new yacht listing wizard.
 *
 * 5-step wizard matching Design/owner-flows.jsx OwnerListingWizard:
 *   1. Basics  — names, type, capacity, prices, port, descriptions
 *   2. Media   — photo upload slots (min 3, max 10)
 *   3. Amenities — checklist of included items
 *   4. Documents — vessel reg, insurance, captain's license, tourism license
 *   5. Calendar  — availability grid click to block/unblock days
 *
 * On final submit: POST /api/v1/yachts/ to create a draft listing.
 * Uses wizard CSS classes: .wiz-shell .wiz-head .wiz-steps .wiz-step
 *                          .wiz-body .wiz-card .wiz-side .flow-nav
 *                          .media-grid .media-tile .upload-tile
 *                          .amen-checklist .amen-check .doc-row .cal-wiz
 *
 * ADR-009 — JWT via post() from @/lib/api.
 * ADR-014 — logical CSS only.
 * ADR-015 — all strings via t() under owner.yachts.wizard.*.
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { ApiError, get, post } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Port {
  id: string
  name_en: string
  name_ar: string
  city_en: string
  city_ar: string
}

export type YachtType =
  | 'motorboat'
  | 'sailboat'
  | 'catamaran'
  | 'fishing'
  | 'speedboat'

// FieldErrors is exported so the yacht edit page can reuse the same type.
export interface FieldErrors {
  name?: string
  name_ar?: string
  capacity?: string
  price_per_day?: string
  yacht_type?: string
  departure_port?: string
}

export const YACHT_TYPES: YachtType[] = [
  'motorboat',
  'sailboat',
  'catamaran',
  'fishing',
  'speedboat',
]

const AMENITY_KEYS = [
  'am_crew',
  'am_fuel',
  'am_rods',
  'am_bait',
  'am_food',
  'am_safety',
  'am_nav',
  'am_grill',
  'am_chairs',
  'am_bath',
] as const

type AmenityKey = (typeof AMENITY_KEYS)[number]

interface DocStatus {
  vessel: boolean
  insurance: boolean
  captain: boolean
  tourism: boolean
}

interface Props {
  params: { locale: string }
}

// ── Step definitions ──────────────────────────────────────────────────────────

const STEP_COUNT = 5

// ── Sub-components ────────────────────────────────────────────────────────────

interface BasicsStepProps {
  locale: string
  nameAr: string
  setNameAr: (v: string) => void
  nameEn: string
  setNameEn: (v: string) => void
  yachtType: YachtType
  setYachtType: (v: YachtType) => void
  capacity: number
  setCapacity: (v: number) => void
  pricePerDay: string
  setPricePerDay: (v: string) => void
  priceHalfDay: string
  setPriceHalfDay: (v: string) => void
  pricePerHour: string
  setPricePerHour: (v: string) => void
  portId: string
  setPortId: (v: string) => void
  ports: Port[]
  descriptionAr: string
  setDescriptionAr: (v: string) => void
  descriptionEn: string
  setDescriptionEn: (v: string) => void
  fieldErrors: Record<string, string>
}

function BasicsStep({
  locale,
  nameAr, setNameAr,
  nameEn, setNameEn,
  yachtType, setYachtType,
  capacity, setCapacity,
  pricePerDay, setPricePerDay,
  priceHalfDay, setPriceHalfDay,
  pricePerHour, setPricePerHour,
  portId, setPortId,
  ports,
  descriptionAr, setDescriptionAr,
  descriptionEn, setDescriptionEn,
  fieldErrors,
}: BasicsStepProps): React.ReactElement {
  const t = useTranslations('owner.yachts.wizard')

  const inputClass =
    'w-full rounded border border-ink/20 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sea/30 focus:border-sea'

  return (
    <div>
      <div className="subhead subhead--first">{t('step1Title')}</div>
      <div className="form-grid-2" style={{ marginTop: 20 }}>
        <div className="form-field">
          <label>{t('boatNameAr')}</label>
          <input
            type="text"
            dir="rtl"
            placeholder={t('boatNameArPlaceholder')}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className={inputClass}
            aria-invalid={!!fieldErrors.name_ar}
          />
          {fieldErrors.name_ar && (
            <p role="alert" className="mt-1 text-xs text-red-600">{fieldErrors.name_ar}</p>
          )}
        </div>
        <div className="form-field">
          <label>{t('boatNameEn')}</label>
          <input
            type="text"
            dir="ltr"
            placeholder={t('boatNameEnPlaceholder')}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className={inputClass}
            aria-invalid={!!fieldErrors.name}
          />
          {fieldErrors.name && (
            <p role="alert" className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
          )}
        </div>
        <div className="form-field">
          <label>{t('boatType')}</label>
          <select
            value={yachtType}
            onChange={(e) => setYachtType(e.target.value as YachtType)}
            className={inputClass}
          >
            {YACHT_TYPES.map((typ) => (
              <option key={typ} value={typ}>
                {t(`typeOptions.${typ}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>{t('capacity')}</label>
          <select
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className={inputClass}
          >
            {[2, 4, 6, 8, 10, 12, 16, 20].map((n) => (
              <option key={n} value={n}>
                {n} {t('people')}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>{t('pricePerDay')}</label>
          <input
            type="number"
            dir="ltr"
            min="0"
            step="0.01"
            placeholder="3800"
            value={pricePerDay}
            onChange={(e) => setPricePerDay(e.target.value)}
            className={inputClass}
            aria-invalid={!!fieldErrors.price_per_day}
          />
          {fieldErrors.price_per_day && (
            <p role="alert" className="mt-1 text-xs text-red-600">{fieldErrors.price_per_day}</p>
          )}
        </div>
        <div className="form-field">
          <label>{t('priceHalfDay')}</label>
          <input
            type="number"
            dir="ltr"
            min="0"
            step="0.01"
            placeholder="2200"
            value={priceHalfDay}
            onChange={(e) => setPriceHalfDay(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="form-field">
          <label>{t('pricePerHour')}</label>
          <input
            type="number"
            dir="ltr"
            min="0"
            step="0.01"
            placeholder="450"
            value={pricePerHour}
            onChange={(e) => setPricePerHour(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="form-field">
          <label>{t('port')}</label>
          <select
            value={portId}
            onChange={(e) => setPortId(e.target.value)}
            className={inputClass}
            aria-invalid={!!fieldErrors.departure_port}
          >
            {ports.length === 0 && (
              <option value="">{t('loadingPorts')}</option>
            )}
            {ports.map((p) => (
              <option key={p.id} value={p.id}>
                {locale === 'ar' ? p.name_ar : p.name_en} —{' '}
                {locale === 'ar' ? p.city_ar : p.city_en}
              </option>
            ))}
          </select>
          {fieldErrors.departure_port && (
            <p role="alert" className="mt-1 text-xs text-red-600">{fieldErrors.departure_port}</p>
          )}
        </div>
        <div className="form-field form-field--full">
          <label>{t('descriptionAr')}</label>
          <textarea
            rows={3}
            dir="rtl"
            placeholder={t('descriptionArPlaceholder')}
            value={descriptionAr}
            onChange={(e) => setDescriptionAr(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="form-field form-field--full">
          <label>{t('descriptionEn')}</label>
          <textarea
            rows={3}
            dir="ltr"
            placeholder={t('descriptionEnPlaceholder')}
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}

interface MediaStepProps {
  locale: string
  photos: string[]  // object URLs for preview
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement>
}

function MediaStep({ locale, photos, onFileChange, fileInputRef }: MediaStepProps): React.ReactElement {
  const t = useTranslations('owner.yachts.wizard')

  return (
    <div>
      <div className="subhead subhead--first">{t('step2Title')}</div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>
        {t('step2Sub')}
      </p>
      <div className="media-grid">
        {photos.map((url, i) => (
          <div
            key={i}
            className="media-tile"
            style={{ backgroundImage: `url(${url})` }}
          >
            <div className="pos">#{String(i + 1).padStart(2, '0')}</div>
          </div>
        ))}
        {photos.length < 10 && (
          <div
            className="upload-tile"
            role="button"
            tabIndex={0}
            aria-label={t('uploadPhoto')}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                fileInputRef.current?.click()
              }
            }}
          >
            <span className="plus">+</span>
            <span className="lbl">{t('uploadPhoto')}</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={onFileChange}
          aria-hidden="true"
        />
      </div>
      {photos.length > 0 && (
        <p
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '0.06em',
            marginTop: 12,
          }}
        >
          {photos.length} / 10 {locale === 'ar' ? 'صور' : 'PHOTOS'}
          {photos.length < 3 && (
            <span style={{ color: 'var(--clay)', marginInlineStart: 8 }}>
              {t('minPhotosWarning')}
            </span>
          )}
        </p>
      )}
    </div>
  )
}

interface AmenitiesStepProps {
  amenities: Set<AmenityKey>
  toggleAmenity: (k: AmenityKey) => void
}

function AmenitiesStep({ amenities, toggleAmenity }: AmenitiesStepProps): React.ReactElement {
  const t = useTranslations('owner.yachts.wizard')

  return (
    <div>
      <div className="subhead subhead--first">{t('step3Title')}</div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>
        {t('step3Sub')}
      </p>
      <div className="amen-checklist">
        {AMENITY_KEYS.map((k, i) => {
          const on = amenities.has(k)
          return (
            <label
              key={k}
              className={`amen-check${on ? ' on' : ''}`}
              onClick={() => toggleAmenity(k)}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggleAmenity(k)}
                onClick={(e) => e.stopPropagation()}
              />
              <span>{t(k)}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

interface DocumentsStepProps {
  locale: string
  docStatus: DocStatus
  setDocStatus: React.Dispatch<React.SetStateAction<DocStatus>>
}

function DocumentsStep({ locale, docStatus, setDocStatus }: DocumentsStepProps): React.ReactElement {
  const t = useTranslations('owner.yachts.wizard')

  const docs: Array<{ key: keyof DocStatus; labelKey: string }> = [
    { key: 'vessel',    labelKey: 'docVessel' },
    { key: 'insurance', labelKey: 'docInsurance' },
    { key: 'captain',   labelKey: 'docCaptain' },
    { key: 'tourism',   labelKey: 'docTourism' },
  ]

  return (
    <div>
      <div className="subhead subhead--first">{t('step4Title')}</div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>
        {t('step4Sub')}
      </p>
      {docs.map(({ key, labelKey }) => (
        <div key={key} className="doc-row">
          <div className="doc-name">{t(labelKey)}</div>
          <div className={`doc-status${docStatus[key] ? ' uploaded' : ''}`}>
            {docStatus[key]
              ? (locale === 'ar' ? 'مرفوع' : 'Uploaded')
              : (locale === 'ar' ? 'مطلوب' : 'Required')}
          </div>
          <button
            type="button"
            className="doc-upload-btn"
            onClick={() => setDocStatus((prev) => ({ ...prev, [key]: true }))}
          >
            {t('uploadDoc')}
          </button>
        </div>
      ))}
    </div>
  )
}

interface CalendarStepProps {
  locale: string
  blockedDays: Set<number>
  toggleDay: (day: number) => void
}

function CalendarStep({ locale, blockedDays, toggleDay }: CalendarStepProps): React.ReactElement {
  const t = useTranslations('owner.yachts.wizard')

  // Build a 5×7 grid for May 2026 (starts Thursday, offset 4)
  const TOTAL_CELLS = 35
  const START_OFFSET = 4  // Thursday
  const DAYS_IN_MAY = 31

  const cells = Array.from({ length: TOTAL_CELLS }, (_, i) => {
    const day = i - START_OFFSET + 1
    const inMonth = day >= 1 && day <= DAYS_IN_MAY
    return { day, inMonth }
  })

  const openCount = DAYS_IN_MAY - blockedDays.size

  return (
    <div>
      <div className="subhead subhead--first">{t('step5Title')}</div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>
        {t('step5Sub')}
      </p>
      <div className="cal-wiz">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <span style={{ fontFamily: 'var(--ff-display)', fontSize: 22, fontWeight: 700 }}>
            {locale === 'ar' ? 'مايو ٢٠٢٦' : 'May 2026'}
          </span>
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--muted)' }}>
            {locale === 'ar'
              ? `${openCount} يوماً متاحاً`
              : `${openCount} days open`}
          </span>
        </div>
        <div className="cal-wiz-grid">
          {cells.map((c, i) => {
            if (!c.inMonth) return <div key={i} style={{ aspectRatio: '1' }} />
            const blocked = blockedDays.has(c.day)
            return (
              <button
                key={i}
                type="button"
                className={`cal-wiz-day${blocked ? ' blocked' : ' open'}`}
                onClick={() => toggleDay(c.day)}
                aria-pressed={blocked}
                aria-label={
                  locale === 'ar'
                    ? `${c.day} مايو — ${blocked ? 'محجوب' : 'متاح'}`
                    : `May ${c.day} — ${blocked ? 'blocked' : 'open'}`
                }
              >
                {c.day}
              </button>
            )
          })}
        </div>
        <p
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            color: 'var(--muted)',
            marginTop: 12,
            letterSpacing: '0.06em',
          }}
        >
          {locale === 'ar' ? 'انقر على اليوم لحجبه أو إتاحته' : 'CLICK A DAY TO BLOCK / UNBLOCK'}
        </p>
      </div>
    </div>
  )
}

// ── Wizard side tips ──────────────────────────────────────────────────────────

function WizardSide({ locale }: { locale: string }): React.ReactElement {
  const t = useTranslations('owner.yachts.wizard')
  return (
    <aside className="wiz-side">
      <h4>{t('sideTipsTitle')}</h4>
      <p>{t('sideTipsBody')}</p>
      <ul>
        <li>{t('sideTip1')}</li>
        <li>{t('sideTip2')}</li>
        <li>{t('sideTip3')}</li>
        <li>{t('sideTip4')}</li>
      </ul>
    </aside>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  locale,
  onDashboard,
}: {
  locale: string
  onDashboard: () => void
}): React.ReactElement {
  const t = useTranslations('owner.yachts.wizard')
  return (
    <div className="wiz-shell">
      <div
        style={{
          maxWidth: 720,
          margin: '40px auto',
          textAlign: 'center',
          padding: 48,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            color: 'var(--clay)',
            marginBottom: 16,
            textTransform: 'uppercase',
          }}
        >
          {t('submittedBadge')}
        </div>
        <h1
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 56,
            lineHeight: 0.95,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 20,
          }}
        >
          {t('submittedHeadline')}{' '}
          <em style={{ color: 'var(--clay)' }}>{t('submittedHeadlineEm')}</em>
        </h1>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: 'var(--ink-2)',
            maxWidth: '50ch',
            margin: '0 auto 32px',
          }}
        >
          {t('submittedBody')}
        </p>
        <button
          type="button"
          className="btn btn-clay btn-lg"
          onClick={onDashboard}
        >
          {locale === 'ar' ? 'عودة للوحة التحكم' : 'Back to dashboard'}{' '}
          <span aria-hidden className="arrow">→</span>
        </button>
      </div>
    </div>
  )
}

// ── Main wizard component ─────────────────────────────────────────────────────

export function NewYachtPage({ params: { locale } }: Props): React.ReactElement {
  const t = useTranslations('owner.yachts.wizard')
  const router = useRouter()

  // ── Step state ───────────────────────────────────────────────────────────────
  const [step, setStep] = React.useState(1)
  const [submitted, setSubmitted] = React.useState(false)

  // ── Step 1: Basics ───────────────────────────────────────────────────────────
  const [nameAr, setNameAr] = React.useState('')
  const [nameEn, setNameEn] = React.useState('')
  const [yachtType, setYachtType] = React.useState<YachtType>('motorboat')
  const [capacity, setCapacity] = React.useState(6)
  const [pricePerDay, setPricePerDay] = React.useState('3800')
  const [priceHalfDay, setPriceHalfDay] = React.useState('2200')
  const [pricePerHour, setPricePerHour] = React.useState('')
  const [portId, setPortId] = React.useState('')
  const [descriptionAr, setDescriptionAr] = React.useState('')
  const [descriptionEn, setDescriptionEn] = React.useState('')
  const [ports, setPorts] = React.useState<Port[]>([])
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})

  // ── Step 2: Media ────────────────────────────────────────────────────────────
  const [photos, setPhotos] = React.useState<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ── Step 3: Amenities ────────────────────────────────────────────────────────
  const [amenities, setAmenities] = React.useState<Set<AmenityKey>>(
    () => new Set(['am_crew', 'am_fuel', 'am_rods', 'am_bait', 'am_food', 'am_safety', 'am_nav'] as AmenityKey[]),
  )

  // ── Step 4: Documents ────────────────────────────────────────────────────────
  const [docStatus, setDocStatus] = React.useState<DocStatus>({
    vessel: false,
    insurance: false,
    captain: false,
    tourism: false,
  })

  // ── Step 5: Calendar ─────────────────────────────────────────────────────────
  const [blockedDays, setBlockedDays] = React.useState<Set<number>>(
    () => new Set([3, 4, 10, 16, 17, 23, 24, 30, 31]),
  )

  // ── Submit state ─────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  // ── Load ports ───────────────────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false
    get<Port[] | { results: Port[] }>('/ports/?region=EG')
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data.results ?? [])
        setPorts(list)
        if (list.length > 0) setPortId(list[0].id)
      })
      .catch(() => {
        // Non-fatal — submit will fail with a clearer message
      })
    return () => { cancelled = true }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(e.target.files ?? [])
    const remaining = 10 - photos.length
    const toAdd = files.slice(0, remaining)
    const urls = toAdd.map((f) => URL.createObjectURL(f))
    setPhotos((prev) => [...prev, ...urls])
    // Reset input so same file can be added again if user removes it
    e.target.value = ''
  }

  function toggleAmenity(k: AmenityKey): void {
    setAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(k)) { next.delete(k) } else { next.add(k) }
      return next
    })
  }

  function toggleDay(day: number): void {
    setBlockedDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) { next.delete(day) } else { next.add(day) }
      return next
    })
  }

  // ── Validation (step 1 only for now) ─────────────────────────────────────────

  function validateStep1(): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!nameAr.trim()) errors.name_ar = t('errorNameArRequired')
    if (!nameEn.trim()) errors.name = t('errorNameEnRequired')
    const price = Number(pricePerDay)
    if (!pricePerDay || !Number.isFinite(price) || price <= 0) {
      errors.price_per_day = t('errorPriceInvalid')
    }
    // Port is only required if ports loaded successfully
    if (ports.length > 0 && !portId) errors.departure_port = t('errorPortRequired')
    return errors
  }

  function handleNext(): void {
    if (step === 1) {
      const errors = validateStep1()
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
      setFieldErrors({})
    }
    if (step < STEP_COUNT) setStep((s) => s + 1)
  }

  function handleBack(): void {
    if (step === 1) {
      router.push(`/${locale}/owner/dashboard`)
    } else {
      setStep((s) => s - 1)
    }
  }

  // ── Final submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(): Promise<void> {
    setSubmitError(null)
    setSubmitting(true)
    try {
      await post<{ id: string }>('/yachts/', {
        name: nameEn.trim(),
        name_ar: nameAr.trim(),
        description: descriptionEn.trim(),
        description_ar: descriptionAr.trim(),
        capacity,
        price_per_day: pricePerDay,
        yacht_type: yachtType,
        departure_port_id: portId,
      })
      setSubmitted(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message)
      } else if (err instanceof Error) {
        setSubmitError(err.message)
      } else {
        setSubmitError(t('errorGeneric'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Step labels ───────────────────────────────────────────────────────────────

  const STEPS: Array<{ n: string; labelKey: string }> = [
    { n: '01', labelKey: 'step1Label' },
    { n: '02', labelKey: 'step2Label' },
    { n: '03', labelKey: 'step3Label' },
    { n: '04', labelKey: 'step4Label' },
    { n: '05', labelKey: 'step5Label' },
  ]

  // ── Submitted screen ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <SuccessScreen
        locale={locale}
        onDashboard={() => router.push(`/${locale}/owner/dashboard`)}
      />
    )
  }

  // ── Wizard ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="wiz-shell"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="wiz-head">
        <div className="kicker">{t('kicker')}</div>
        <h1>
          {t('heading')} <em>{t('headingEm')}</em>
        </h1>
        <p>{t('subheading')}</p>
      </div>

      {/* Step indicator */}
      <div className="wiz-steps" role="tablist" aria-label={t('stepsAriaLabel')}>
        {STEPS.map((s, i) => {
          const stepNum = i + 1
          const isCurrent = step === stepNum
          const isDone = step > stepNum
          return (
            <button
              key={s.n}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              className={`wiz-step${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}`}
              onClick={() => {
                // Only allow navigating to already-done steps
                if (isDone) setStep(stepNum)
              }}
            >
              <span className="n">{isDone ? '✓' : s.n}</span>
              <span className="lbl">{t(s.labelKey as Parameters<typeof t>[0])}</span>
            </button>
          )
        })}
      </div>

      {/* Body */}
      <div className="wiz-body">
        <div className="wiz-card">
          {step === 1 && (
            <BasicsStep
              locale={locale}
              nameAr={nameAr} setNameAr={setNameAr}
              nameEn={nameEn} setNameEn={setNameEn}
              yachtType={yachtType} setYachtType={setYachtType}
              capacity={capacity} setCapacity={setCapacity}
              pricePerDay={pricePerDay} setPricePerDay={setPricePerDay}
              priceHalfDay={priceHalfDay} setPriceHalfDay={setPriceHalfDay}
              pricePerHour={pricePerHour} setPricePerHour={setPricePerHour}
              portId={portId} setPortId={setPortId}
              ports={ports}
              descriptionAr={descriptionAr} setDescriptionAr={setDescriptionAr}
              descriptionEn={descriptionEn} setDescriptionEn={setDescriptionEn}
              fieldErrors={fieldErrors}
            />
          )}
          {step === 2 && (
            <MediaStep
              locale={locale}
              photos={photos}
              onFileChange={handleFileChange}
              fileInputRef={fileInputRef}
            />
          )}
          {step === 3 && (
            <AmenitiesStep amenities={amenities} toggleAmenity={toggleAmenity} />
          )}
          {step === 4 && (
            <DocumentsStep locale={locale} docStatus={docStatus} setDocStatus={setDocStatus} />
          )}
          {step === 5 && (
            <CalendarStep locale={locale} blockedDays={blockedDays} toggleDay={toggleDay} />
          )}

          {submitError && (
            <p
              role="alert"
              style={{
                color: 'var(--clay)',
                fontFamily: 'var(--ff-mono)',
                fontSize: 13,
                marginTop: 16,
              }}
            >
              {submitError}
            </p>
          )}

          {/* Navigation */}
          <div className="flow-nav">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleBack}
            >
              <span aria-hidden className="arrow-back">←</span>{' '}
              {step === 1 ? t('cancel') : t('back')}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost">
                {t('saveDraft')}
              </button>
              {step < STEP_COUNT ? (
                <button
                  type="button"
                  className="btn btn-clay btn-lg"
                  onClick={handleNext}
                >
                  {t('continue')}{' '}
                  <span aria-hidden className="arrow">→</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-clay btn-lg"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? t('submitting') : t('submit')}{' '}
                  {!submitting && <span aria-hidden className="arrow">→</span>}
                </button>
              )}
            </div>
          </div>
        </div>

        <WizardSide locale={locale} />
      </div>
    </div>
  )
}
