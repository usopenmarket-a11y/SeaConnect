'use client'

/**
 * Booking checkout wizard — Client Component.
 *
 * 4-step flow:
 *   1. Trip Details  — date, passengers, departure/return times, trip type
 *   2. Your Info     — name, phone, email, ID, emergency contact
 *   3. Payment       — Fawry / Visa-MC / InstaPay selection
 *   4. Confirmation  — booking reference + ticket view
 *
 * ADR-009 — JWT attached via in-memory api client (never localStorage).
 * ADR-014 — Logical CSS only: ms-/me-/ps-/pe-, dir="rtl" on root.
 * ADR-015 — Arabic strings hardcoded (TODO: migrate to next-intl keys).
 * ADR-018 — Currency read from yacht.currency, never hardcoded.
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuth } from '@/lib/auth'
import { ApiError, get, post } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeparturePort {
  id: string
  name_ar: string
  name_en: string
}

interface YachtDetail {
  id: string
  name: string
  name_ar: string
  capacity: number
  price_per_day: string
  currency: string
  departure_port: DeparturePort | null
  image_url?: string | null
  type_en?: string
  type_ar?: string
  region_en?: string
  region_ar?: string
  captain_name?: string
}

interface BookingResponse {
  id: string
  reference?: string
}

type PaymentMethod = 'FAWRY' | 'CARD' | 'INSTAPAY'

// ---------------------------------------------------------------------------
// Step-level form state types
// ---------------------------------------------------------------------------

interface TripDetails {
  date: string
  numPassengers: number
  departureTime: string
  returnTime: string
  tripType: string
  specialRequests: string
}

interface PersonalInfo {
  fullName: string
  phone: string
  email: string
  idType: string
  idNumber: string
  emergencyName: string
  emergencyPhone: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDateAr(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US')
}

const SERVICE_FEE_RATE = 0.12
const INSURANCE_AMOUNT = 180

function calcFees(pricePerDay: string): {
  base: number
  serviceFee: number
  insurance: number
  total: number
} {
  const base = Number(pricePerDay) || 0
  const serviceFee = Math.round(base * SERVICE_FEE_RATE)
  const insurance = INSURANCE_AMOUNT
  return { base, serviceFee, insurance, total: base + serviceFee + insurance }
}

// ---------------------------------------------------------------------------
// Flow step progress bar
// ---------------------------------------------------------------------------

const STEP_NUMS = ['01', '02', '03', '04'] as const

interface StepBarProps {
  current: number
  stepLabels: string[]
}

function StepBar({ current, stepLabels }: StepBarProps): React.ReactElement {
  return (
    <div className="flow-steps">
      {STEP_NUMS.map((n, i) => {
        const stepNum = i + 1
        const isCurrent = current === stepNum
        const isDone = current > stepNum
        return (
          <div
            key={n}
            className={`flow-step${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}`}
          >
            <div className="n">{n}</div>
            <div className="txt">
              <div className="t">{stepLabels[i] ?? ''}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sticky order summary sidebar
// ---------------------------------------------------------------------------

interface SummaryPanelProps {
  yacht: YachtDetail
  trip: TripDetails
  t: ReturnType<typeof useTranslations<'booking.checkout'>>
}

function SummaryPanel({ yacht, trip, t }: SummaryPanelProps): React.ReactElement {
  const { base, serviceFee, insurance, total } = calcFees(yacht.price_per_day)

  return (
    <div
      style={{
        position: 'sticky',
        top: 100,
        background: 'var(--foam)',
        border: '1px solid var(--ink)',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          aspectRatio: '4/3',
          backgroundImage: yacht.image_url ? `url(${yacht.image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          background: yacht.image_url ? undefined : 'var(--sand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!yacht.image_url && (
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
            }}
          >
            NO IMAGE
          </span>
        )}
      </div>

      <div style={{ padding: 24 }}>
        {(yacht.type_en || yacht.region_en) && (
          <div
            className="mono"
            style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}
          >
            {yacht.type_en?.toUpperCase()}
            {yacht.type_en && yacht.region_en ? ' · ' : ''}
            {yacht.region_en?.toUpperCase()}
          </div>
        )}
        <div
          className="display"
          style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}
        >
          {yacht.name_ar || yacht.name}
        </div>
        {yacht.captain_name && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            مع {yacht.captain_name}
          </div>
        )}

        <hr className="hairline" style={{ margin: '18px 0' }} />

        {/* Trip meta */}
        {trip.date && (
          <div style={{ fontSize: 13, color: 'var(--muted-2)', marginBottom: 4 }}>
            {formatDateAr(trip.date)}
          </div>
        )}
        {trip.numPassengers > 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted-2)', marginBottom: 12 }}>
            {trip.numPassengers} {trip.numPassengers === 1 ? 'مسافر' : 'مسافرون'}
          </div>
        )}

        <hr className="hairline" style={{ margin: '0 0 18px' }} />

        {/* Line items */}
        <div className="line-items" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
          <div className="row">
            <span className="l">{t('summary.basePrice')}</span>
            <span className="v">{fmtNum(base)}</span>
          </div>
          <div className="row">
            <span className="l">{t('summary.serviceFee')}</span>
            <span className="v">{fmtNum(serviceFee)}</span>
          </div>
          <div className="row">
            <span className="l">{t('summary.insurance')}</span>
            <span className="v">{fmtNum(insurance)}</span>
          </div>
          <div className="row total">
            <span className="l">{t('summary.total')}</span>
            <span className="v">
              {fmtNum(total)}{' '}
              <span
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 12,
                  fontWeight: 400,
                  color: 'var(--muted)',
                }}
              >
                {yacht.currency}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Trip Details
// ---------------------------------------------------------------------------

interface Step1Props {
  trip: TripDetails
  capacity: number
  onChange: (update: Partial<TripDetails>) => void
}

function Step1TripDetails({ trip, capacity, onChange }: Step1Props): React.ReactElement {
  const passengerOptions = Array.from({ length: capacity }, (_, i) => i + 1)

  return (
    <>
      <div className="subhead" style={{ marginTop: 0 }}>
        تفاصيل الرحلة
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="trip-date">تاريخ الرحلة</label>
          <input
            id="trip-date"
            type="date"
            min={todayIso()}
            value={trip.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label htmlFor="trip-passengers">عدد المسافرين</label>
          <select
            id="trip-passengers"
            value={trip.numPassengers}
            onChange={(e) => onChange({ numPassengers: Number(e.target.value) })}
          >
            {passengerOptions.map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'شخص' : 'أشخاص'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="trip-departure">وقت الانطلاق</label>
          <select
            id="trip-departure"
            value={trip.departureTime}
            onChange={(e) => onChange({ departureTime: e.target.value })}
          >
            <option value="06:00">06:00 صباحاً</option>
            <option value="07:00">07:00 صباحاً</option>
            <option value="08:00">08:00 صباحاً</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="trip-return">وقت العودة</label>
          <select
            id="trip-return"
            value={trip.returnTime}
            onChange={(e) => onChange({ returnTime: e.target.value })}
          >
            <option value="14:00">02:00 مساءً</option>
            <option value="16:00">04:00 مساءً</option>
            <option value="18:00">06:00 مساءً</option>
          </select>
        </div>

        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="trip-type">نوع الرحلة</label>
          <select
            id="trip-type"
            value={trip.tripType}
            onChange={(e) => onChange({ tripType: e.target.value })}
          >
            <option value="deep_fishing">صيد عميق</option>
            <option value="coastal_fishing">صيد ساحلي</option>
            <option value="snorkeling">سباحة وسنوركل</option>
          </select>
        </div>

        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="trip-requests">طلبات خاصة (اختياري)</label>
          <textarea
            id="trip-requests"
            rows={3}
            placeholder="وجبة نباتية، طفل رضيع، احتياجات معدات..."
            value={trip.specialRequests}
            onChange={(e) => onChange({ specialRequests: e.target.value })}
            style={{
              fontFamily: 'var(--ff-sans)',
              fontSize: 15,
              padding: '12px 14px',
              background: 'var(--sand)',
              border: '1px solid var(--rule-strong)',
              borderRadius: 2,
              color: 'var(--ink)',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Personal Info
// ---------------------------------------------------------------------------

interface Step2Props {
  info: PersonalInfo
  onChange: (update: Partial<PersonalInfo>) => void
}

function Step2PersonalInfo({ info, onChange }: Step2Props): React.ReactElement {
  return (
    <>
      <div className="subhead" style={{ marginTop: 0 }}>
        بياناتك
      </div>

      <div className="form-grid">
        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="info-fullname">الاسم الكامل</label>
          <input
            id="info-fullname"
            type="text"
            value={info.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            placeholder="الاسم كما في بطاقة الهوية"
          />
        </div>

        <div className="form-field">
          <label htmlFor="info-phone">رقم الهاتف</label>
          <input
            id="info-phone"
            type="tel"
            dir="ltr"
            value={info.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+20 100 000 0000"
          />
        </div>

        <div className="form-field">
          <label htmlFor="info-email">البريد الإلكتروني</label>
          <input
            id="info-email"
            type="email"
            dir="ltr"
            value={info.email}
            readOnly
            style={{ opacity: 0.6, cursor: 'not-allowed' }}
          />
        </div>

        <div className="form-field">
          <label htmlFor="info-idtype">نوع الهوية</label>
          <select
            id="info-idtype"
            value={info.idType}
            onChange={(e) => onChange({ idType: e.target.value })}
          >
            <option value="national_id">بطاقة قومية</option>
            <option value="passport">جواز سفر</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="info-idnumber">رقم الهوية</label>
          <input
            id="info-idnumber"
            type="text"
            dir="ltr"
            value={info.idNumber}
            onChange={(e) => onChange({ idNumber: e.target.value })}
            placeholder="رقم البطاقة أو جواز السفر"
          />
        </div>

        <div className="subhead-mini" style={{ gridColumn: '1 / -1', margin: '20px 0 8px' }}>
          جهة الاتصال في حالات الطوارئ
        </div>

        <div className="form-field">
          <label htmlFor="info-emergency-name">اسم جهة الاتصال</label>
          <input
            id="info-emergency-name"
            type="text"
            value={info.emergencyName}
            onChange={(e) => onChange({ emergencyName: e.target.value })}
            placeholder="اسم الشخص المسؤول"
          />
        </div>

        <div className="form-field">
          <label htmlFor="info-emergency-phone">هاتف الطوارئ</label>
          <input
            id="info-emergency-phone"
            type="tel"
            dir="ltr"
            value={info.emergencyPhone}
            onChange={(e) => onChange({ emergencyPhone: e.target.value })}
            placeholder="+20 100 000 0000"
          />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Payment
// ---------------------------------------------------------------------------

interface PaymentOption {
  code: PaymentMethod
  title: string
  subtitle: string
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { code: 'FAWRY', title: 'Fawry', subtitle: 'الدفع عند أي منفذ فوري' },
  { code: 'CARD', title: 'بطاقة ائتمان', subtitle: 'Visa · Mastercard' },
  { code: 'INSTAPAY', title: 'InstaPay', subtitle: 'تحويل بنكي فوري' },
]

interface Step3Props {
  paymentMethod: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

function Step3Payment({ paymentMethod, onChange }: Step3Props): React.ReactElement {
  return (
    <>
      <div className="subhead" style={{ marginTop: 0 }}>
        طريقة الدفع
      </div>

      {PAYMENT_OPTIONS.map((opt) => {
        const isActive = paymentMethod === opt.code
        return (
          <label
            key={opt.code}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              alignItems: 'center',
              gap: 16,
              padding: '18px 20px',
              border: `1px solid ${isActive ? 'var(--ink)' : 'var(--rule)'}`,
              marginBottom: 10,
              cursor: 'pointer',
              background: isActive ? 'var(--sand)' : 'var(--foam)',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <input
              type="radio"
              name="payment_method"
              value={opt.code}
              checked={isActive}
              onChange={() => onChange(opt.code)}
              style={{ width: 18, height: 18, accentColor: 'var(--ink)', cursor: 'pointer' }}
            />
            <div>
              <div className="display" style={{ fontSize: 20, fontWeight: 700 }}>
                {opt.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                {opt.subtitle}
              </div>
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.12em',
                padding: '4px 8px',
                border: '1px solid var(--rule)',
                color: 'var(--muted)',
              }}
            >
              {opt.code}
            </div>
          </label>
        )
      })}

      {paymentMethod === 'FAWRY' && (
        <div
          style={{
            background: 'var(--sand)',
            padding: 20,
            marginTop: 20,
            border: '1px dashed var(--rule-strong)',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              marginBottom: 10,
            }}
          >
            HOW FAWRY WORKS · آلية فوري
          </div>
          <ol
            style={{
              paddingInlineStart: 20,
              fontSize: 14,
              lineHeight: 1.7,
              color: 'var(--ink-2)',
            }}
          >
            <li>نرسل لك كود دفع فوري عبر رسالة نصية</li>
            <li>توجّه إلى أي منفذ فوري (٢٠٠,٠٠٠+ منفذ)</li>
            <li>ادفع المبلغ — الحجز يتأكد خلال دقيقتين</li>
          </ol>
        </div>
      )}

      {paymentMethod === 'INSTAPAY' && (
        <div
          style={{
            background: 'var(--sand)',
            padding: 20,
            marginTop: 20,
            border: '1px dashed var(--rule-strong)',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              marginBottom: 10,
            }}
          >
            HOW INSTAPAY WORKS · آلية InstaPay
          </div>
          <ol
            style={{
              paddingInlineStart: 20,
              fontSize: 14,
              lineHeight: 1.7,
              color: 'var(--ink-2)',
            }}
          >
            <li>سنرسل لك رقم الحساب عبر رسالة نصية</li>
            <li>حوّل المبلغ عبر تطبيق البنك أو InstaPay</li>
            <li>يتأكد الحجز فور وصول التحويل</li>
          </ol>
        </div>
      )}

      {paymentMethod === 'CARD' && (
        <div
          style={{
            background: 'var(--sand)',
            padding: 20,
            marginTop: 20,
            border: '1px dashed var(--rule-strong)',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              marginBottom: 10,
            }}
          >
            SECURE CARD PAYMENT · دفع آمن بالبطاقة
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', margin: 0 }}>
            ستُوجَّه إلى بوابة دفع آمنة لإدخال بيانات بطاقتك. يتم تشفير كل المعاملات بـ TLS.
          </p>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Confirmation (post-booking success screen)
// ---------------------------------------------------------------------------

interface Step4Props {
  bookingId: string
  bookingRef: string
  yacht: YachtDetail
  trip: TripDetails
  info: PersonalInfo
  paymentMethod: PaymentMethod
  locale: string
  onHome: () => void
}

function Step4Confirmation({
  bookingId,
  bookingRef,
  yacht,
  trip,
  info,
  paymentMethod,
  locale,
  onHome,
}: Step4Props): React.ReactElement {
  const { base, serviceFee, insurance, total } = calcFees(yacht.price_per_day)
  const router = useRouter()
  const t = useTranslations('booking.checkout')

  const paymentLabel =
    paymentMethod === 'FAWRY'
      ? 'Fawry · يرسل الكود عند التأكيد'
      : paymentMethod === 'INSTAPAY'
        ? 'InstaPay · تحويل بنكي فوري'
        : 'بطاقة ائتمان · Visa / Mastercard'

  const reviewRows: [string, string][] = [
    ['المسافر الرئيسي', info.fullName],
    ['البريد الإلكتروني', info.email],
    ['الهاتف', info.phone],
    [
      'التاريخ',
      trip.date
        ? `${formatDateAr(trip.date)} · ${trip.departureTime} → ${trip.returnTime}`
        : '—',
    ],
    ['المسافرون', `${trip.numPassengers} ${trip.numPassengers === 1 ? 'مسافر' : 'أشخاص'}`],
    ['طريقة الدفع', paymentLabel],
    ['رقم الحجز', bookingRef],
  ]

  return (
    <div className="confirm-wrap" style={{ maxWidth: '100%', margin: 0, padding: 0 }}>
      <div className="confirm-stamp">✓ CONFIRMATION · {t('bookingRef')} {bookingRef}</div>
      <div className="confirm-title">
        {t('successTitle')}
      </div>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)', marginTop: 12 }}>
        {paymentMethod === 'FAWRY' && (
          <>
            أرسلنا كود دفع فوري إلى <strong>{info.phone}</strong>. ادفع خلال ٤٨ ساعة
            لتأمين حجزك. ستصلك التفاصيل الكاملة على بريدك.
          </>
        )}
        {paymentMethod === 'INSTAPAY' && (
          <>
            أرسلنا بيانات التحويل إلى <strong>{info.phone}</strong>. أتمّ التحويل خلال
            ٤٨ ساعة لتأمين حجزك.
          </>
        )}
        {paymentMethod === 'CARD' && (
          <>
            تم استلام بطاقتك بنجاح. الحجز مؤكد وستصلك التفاصيل على{' '}
            <strong>{info.email}</strong>.
          </>
        )}
      </p>

      {/* Review rows */}
      <div
        style={{
          marginTop: 28,
          border: '1px solid var(--rule)',
          background: 'var(--foam)',
        }}
      >
        {reviewRows.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              padding: '14px 20px',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.08em',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                paddingTop: 2,
              }}
            >
              {label}
            </span>
            <span style={{ fontSize: 15 }}>{value || '—'}</span>
          </div>
        ))}
      </div>

      {/* Ticket */}
      <div className="ticket" style={{ marginTop: 32 }}>
        <div
          className="main"
          style={{ borderInlineStart: '1px dashed var(--rule-strong)' }}
        >
          <h4>التذكرة</h4>
          <div className="display" style={{ fontSize: 32, lineHeight: 1, marginBottom: 4 }}>
            {yacht.name_ar || yacht.name}
          </div>
          {yacht.type_en && (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              {yacht.type_en}
              {yacht.region_en ? ` · ${yacht.region_en}` : ''}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div
                className="mono"
                style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}
              >
                DATE · التاريخ
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
                {trip.date ? formatDateAr(trip.date) : '—'}
              </div>
            </div>
            <div>
              <div
                className="mono"
                style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}
              >
                BOARDING · الصعود
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
                {trip.departureTime} صباحاً
              </div>
            </div>
            <div>
              <div
                className="mono"
                style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}
              >
                MARINA · المرسى
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
                {yacht.departure_port?.name_ar ?? '—'}
              </div>
            </div>
            <div>
              <div
                className="mono"
                style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}
              >
                PAX · المسافرون
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
                {trip.numPassengers}{' '}
                {trip.numPassengers === 1 ? 'مسافر' : 'أشخاص'}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              padding: 16,
              background: 'var(--ink)',
              color: 'var(--sand)',
              fontFamily: 'var(--ff-mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              direction: 'ltr',
              textAlign: 'center',
            }}
          >
            BOOKING REF · {bookingRef}
          </div>
        </div>

        <div className="side">
          <h4>ملخص التكلفة</h4>
          <div className="display" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
            <span className="num">{fmtNum(total)}</span>
            <span
              className="mono"
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: 'var(--muted)',
                marginInlineStart: 6,
              }}
            >
              {yacht.currency}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            <span>{fmtNum(base)} أساسي</span>
            <span style={{ margin: '0 6px' }}>+</span>
            <span>{fmtNum(serviceFee)} رسوم</span>
            <span style={{ margin: '0 6px' }}>+</span>
            <span>{fmtNum(insurance)} تأمين</span>
          </div>

          <h4 style={{ marginTop: 28 }}>ماذا بعد؟</h4>
          <ol
            style={{
              paddingInlineStart: 20,
              fontSize: 13,
              lineHeight: 1.8,
              color: 'var(--ink-2)',
            }}
          >
            {paymentMethod === 'FAWRY' && <li>ادفع عبر فوري خلال ٤٨ ساعة</li>}
            {paymentMethod === 'INSTAPAY' && <li>أتمّ التحويل خلال ٤٨ ساعة</li>}
            <li>ستصلك تأكيد نهائي + بيانات الربان</li>
            <li>الوصول للمرسى قبل ١٥ دقيقة من الإبحار</li>
            <li>بعد الرحلة — شاركنا تقييمك</li>
          </ol>

          <button
            className="btn btn-clay"
            style={{ marginTop: 20, width: '100%' }}
            onClick={() => router.push(`/${locale}/bookings/${bookingId}`)}
          >
            {t('trackBooking')}
          </button>

          <button
            className="btn btn-ghost"
            style={{ marginTop: 10, width: '100%' }}
            onClick={onHome}
          >
            العودة إلى الرئيسية
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main wizard (inner — runs after AuthGuard confirms user)
// ---------------------------------------------------------------------------

interface InnerProps {
  locale: string
  yachtId: string
}

function BookingWizardInner({ locale, yachtId }: InnerProps): React.ReactElement {
  const router = useRouter()
  const { user } = useAuth()
  const t = useTranslations('booking.checkout')

  // Remote state
  const [yacht, setYacht] = React.useState<YachtDetail | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  // Step state
  const [step, setStep] = React.useState<number>(1)
  const [globalError, setGlobalError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState<boolean>(false)

  // Post-booking success state (step 4)
  const [bookingId, setBookingId] = React.useState<string>('')
  const [bookingRef, setBookingRef] = React.useState<string>('')

  // Step 1 — Trip Details
  const [trip, setTrip] = React.useState<TripDetails>({
    date: todayIso(),
    numPassengers: 1,
    departureTime: '06:00',
    returnTime: '16:00',
    tripType: 'deep_fishing',
    specialRequests: '',
  })

  // Step 2 — Personal Info (pre-fill from auth user)
  const [info, setInfo] = React.useState<PersonalInfo>({
    fullName: user ? `${user.first_name} ${user.last_name}`.trim() : '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    idType: 'national_id',
    idNumber: '',
    emergencyName: '',
    emergencyPhone: '',
  })

  // Step 3 — Payment
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('FAWRY')

  // Fetch yacht on mount
  React.useEffect(() => {
    let cancelled = false
    setLoadError(null)
    get<YachtDetail>(`/yachts/${yachtId}/`)
      .then((data) => {
        if (!cancelled) setYacht(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError('لم يتم العثور على اليخت المطلوب.')
      })
    return () => {
      cancelled = true
    }
  }, [yachtId])

  // Sync info email/name/phone when user loads (if not already set)
  React.useEffect(() => {
    if (!user) return
    setInfo((prev) => ({
      ...prev,
      fullName: prev.fullName || `${user.first_name} ${user.last_name}`.trim(),
      phone: prev.phone || (user.phone ?? ''),
      email: user.email,
    }))
  }, [user])

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  function validateStep(): string | null {
    if (step === 1) {
      if (!trip.date) return 'يرجى اختيار تاريخ الرحلة.'
      if (trip.numPassengers < 1) return 'يرجى اختيار عدد المسافرين.'
    }
    if (step === 2) {
      if (!info.fullName.trim()) return 'يرجى إدخال الاسم الكامل.'
      if (!info.phone.trim()) return 'يرجى إدخال رقم الهاتف.'
      if (!info.idNumber.trim()) return 'يرجى إدخال رقم الهوية.'
    }
    return null
  }

  // -------------------------------------------------------------------------
  // Submit booking on step 3 → next
  // -------------------------------------------------------------------------

  async function submitBooking(): Promise<void> {
    if (!yacht) return
    if (!yacht.departure_port) {
      setGlobalError('لا تتوفر بيانات ميناء الانطلاق لهذا اليخت. يرجى التواصل مع الدعم.')
      return
    }

    setSubmitting(true)
    setGlobalError(null)

    try {
      const endDate = trip.date // For day-trips, end_date = start_date
      const created = await post<BookingResponse>('/bookings/', {
        yacht_id: yacht.id,
        start_date: trip.date,
        end_date: endDate,
        num_passengers: trip.numPassengers,
        departure_port_id: yacht.departure_port.id,
        notes: trip.specialRequests || undefined,
      })

      // Generate a display reference if API doesn't return one
      const ref =
        created.reference ??
        `SC-${created.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`

      setBookingId(created.id)
      setBookingRef(ref)
      setStep(4)
    } catch (err) {
      if (err instanceof ApiError) {
        setGlobalError(err.message)
      } else if (err instanceof Error) {
        setGlobalError(err.message)
      } else {
        setGlobalError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleNext(): Promise<void> {
    setGlobalError(null)

    const validationError = validateStep()
    if (validationError) {
      setGlobalError(validationError)
      return
    }

    if (step === 3) {
      await submitBooking()
      return
    }

    setStep((s) => s + 1)
  }

  function handleBack(): void {
    setGlobalError(null)
    if (step === 1) {
      router.back()
    } else {
      setStep((s) => s - 1)
    }
  }

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  if (loadError) {
    return (
      <main
        dir="rtl"
        style={{ maxWidth: 640, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}
      >
        <p
          role="alert"
          style={{ color: 'var(--clay)', fontFamily: 'var(--ff-sans)', fontSize: 16 }}
        >
          {loadError}
        </p>
        <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => router.back()}>
          ← العودة
        </button>
      </main>
    )
  }

  if (!yacht) {
    return (
      <main
        dir="rtl"
        style={{ maxWidth: 640, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}
      >
        <div
          role="status"
          aria-label="جارٍ التحميل"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}
        >
          <span
            aria-hidden="true"
            className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-sea border-t-transparent"
          />
        </div>
      </main>
    )
  }

  // -------------------------------------------------------------------------
  // Confirmation screen (step 4) — full-width, no sidebar
  // -------------------------------------------------------------------------

  if (step === 4) {
    return (
      <main dir="rtl" style={{ fontFamily: 'var(--ff-sans)', paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ padding: '32px 48px 0' }}>
          <button
            className="mono"
            onClick={() => router.push(`/${locale}`)}
            style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              marginBottom: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ← العودة إلى الرئيسية
          </button>
        </div>

        <div style={{ padding: '32px 48px 60px' }}>
          <Step4Confirmation
            bookingId={bookingId}
            bookingRef={bookingRef}
            yacht={yacht}
            trip={trip}
            info={info}
            paymentMethod={paymentMethod}
            locale={locale}
            onHome={() => router.push(`/${locale}`)}
          />
        </div>
      </main>
    )
  }

  // -------------------------------------------------------------------------
  // Steps 1-3 — two-column layout with sticky sidebar
  // -------------------------------------------------------------------------

  const nextLabel = step === 3 ? t('confirmBook') : '→'

  return (
    <main dir="rtl" style={{ fontFamily: 'var(--ff-sans)', paddingBottom: 80 }}>
      {/* Page header */}
      <div style={{ padding: '32px 48px 0' }}>
        <button
          className="mono"
          onClick={handleBack}
          style={{
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            marginBottom: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {t('back')} {yacht.name_ar || yacht.name}
        </button>
        <h1
          className="display"
          style={{ fontSize: 56, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 4 }}
        >
          {t('title')}
        </h1>
      </div>

      {/* Step progress bar */}
      <StepBar
        current={step}
        stepLabels={[
          t('steps.tripDetails'),
          t('steps.yourInfo'),
          t('steps.payment'),
          t('steps.review'),
        ]}
      />

      {/* Body grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 48,
          padding: '0 48px 60px',
          alignItems: 'start',
        }}
      >
        {/* Form panel */}
        <div
          style={{
            background: 'var(--foam)',
            border: '1px solid var(--rule)',
            padding: 36,
          }}
        >
          {/* Global error */}
          {globalError && (
            <div
              role="alert"
              style={{
                background: 'oklch(0.94 0.04 25)',
                border: '1px solid oklch(0.72 0.12 25)',
                color: 'oklch(0.35 0.12 25)',
                padding: '12px 16px',
                fontSize: 14,
                marginBottom: 20,
                borderRadius: 2,
              }}
            >
              {globalError}
            </div>
          )}

          {step === 1 && (
            <Step1TripDetails
              trip={trip}
              capacity={yacht.capacity}
              onChange={(update) => setTrip((prev) => ({ ...prev, ...update }))}
            />
          )}

          {step === 2 && (
            <Step2PersonalInfo
              info={info}
              onChange={(update) => setInfo((prev) => ({ ...prev, ...update }))}
            />
          )}

          {step === 3 && (
            <Step3Payment
              paymentMethod={paymentMethod}
              onChange={setPaymentMethod}
            />
          )}

          {/* Navigation */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 32,
              paddingTop: 24,
              borderTop: '1px solid var(--rule)',
            }}
          >
            <button className="btn btn-ghost" onClick={handleBack} disabled={submitting}>
              ← {step === 1 ? 'إلغاء' : 'السابق'}
            </button>
            <button
              className="btn btn-clay"
              style={{ fontSize: 15, padding: '12px 28px' }}
              onClick={() => void handleNext()}
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-block',
                      width: 16,
                      height: 16,
                      border: '2px solid var(--foam)',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                  {t('processing')}
                </span>
              ) : (
                nextLabel
              )}
            </button>
          </div>
        </div>

        {/* Sticky summary */}
        <SummaryPanel yacht={yacht} trip={trip} t={t} />
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Page export — wrapped in AuthGuard
// ---------------------------------------------------------------------------

interface PageProps {
  params: { locale: string; id: string }
}

export function BookingFormPage({ params: { locale, id } }: PageProps): React.ReactElement {
  return (
    <AuthGuard locale={locale}>
      <BookingWizardInner locale={locale} yachtId={id} />
    </AuthGuard>
  )
}
