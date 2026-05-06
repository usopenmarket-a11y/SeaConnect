'use client'

/**
 * Owner Listing Editor — full tabbed editor for yacht listings.
 *
 * Six tabs: basics, specs, photos, pricing, amenities, policies.
 * Sticky live preview column updates as the user edits name and price.
 *
 * TODO: Replace hardcoded Arabic strings with t() calls (next-intl, ADR-015).
 * TODO: Wire save button to PATCH /api/v1/yachts/{id}/ via api.ts.
 */

import * as React from 'react'
import { useTranslations } from 'next-intl'

// ── Types ────────────────────────────────────────────────────────────────────

type TabId = 'basics' | 'specs' | 'photos' | 'pricing' | 'amenities' | 'policies'

interface TabDef {
  ar: string
  en: string
  id: TabId
}

interface FieldProps {
  label: string
  value: string | number
  onChange?: (v: string) => void
  mono?: boolean
  suffix?: string
  type?: 'text' | 'select' | 'textarea'
  options?: string[]
  readOnly?: boolean
  rows?: number
}

// ── Tabs config ──────────────────────────────────────────────────────────────

const TABS: TabDef[] = [
  { ar: 'الأساسيات', en: 'BASICS', id: 'basics' },
  { ar: 'المواصفات', en: 'SPECS', id: 'specs' },
  { ar: 'الصور', en: 'PHOTOS', id: 'photos' },
  { ar: 'التسعير', en: 'PRICING', id: 'pricing' },
  { ar: 'الخدمات', en: 'AMENITIES', id: 'amenities' },
  { ar: 'السياسات', en: 'POLICIES', id: 'policies' },
]

// ── Pricing matrix data ──────────────────────────────────────────────────────

const DAY_ROWS: [string, number][] = [
  ['أحد', 1.0],
  ['اثنين', 1.0],
  ['ثلاثاء', 1.0],
  ['أربعاء', 1.05],
  ['خميس', 1.15],
  ['جمعة', 1.3],
  ['سبت', 1.25],
]

const SEASON_MULTIPLIERS: number[] = [0.85, 1.0, 1.2, 0.95]
const SEASON_LABELS: string[] = ['شتاء', 'ربيع', 'صيف', 'خريف']

// ── Equipment chips ──────────────────────────────────────────────────────────

const EQUIPMENT_ITEMS: string[] = [
  'سونار Garmin',
  'GPS متطور',
  'راديو VHF',
  '٤ كراسي صيد دوارة',
  'صنّارات Shimano',
  'مظلة خلفية',
  'مكيف هواء',
  'مطبخ صغير',
  'حمام بمياه عذبة',
  'سترات نجاة ×١٠',
  'إطفاء حريق',
  'نظام قمر صناعي',
]

// ── Amenities data ───────────────────────────────────────────────────────────

const AMENITIES_INITIAL: [string, boolean][] = [
  ['طاقم من ٣ أفراد', true],
  ['وقود الرحلة كاملة', true],
  ['وجبة غداء طازجة', true],
  ['مشروبات + قهوة', true],
  ['طعم طازج', true],
  ['معدات صيد كاملة', true],
  ['صاج مزدوج للشواء', true],
  ['سترات نجاة', true],
  ['تأمين رحلة', true],
  ['مدرّب صيد محترف', false],
  ['غطس مع الزعانف', false],
  ['نقل من الفندق', false],
]

// ── Policies data ────────────────────────────────────────────────────────────

const POLICIES: [string, string][] = [
  ['إلغاء مرن', 'استرداد كامل قبل ٤٨ ساعة'],
  ['إلغاء معتدل', 'استرداد كامل قبل ٧ أيام · جزئي قبل ٤٨ ساعة'],
  ['إلغاء صارم', 'استرداد جزئي ٥٠٪ قبل ١٤ يوم فقط'],
]

const RULES: string[] = [
  'التدخين ممنوع داخل الكابينة',
  'الحيوانات الأليفة بإذن مسبق',
  'لا تسمح بالحفلات الصاخبة',
  'الأطفال تحت ١٢ مع وصي',
]

// ── Photo placeholders ───────────────────────────────────────────────────────

const PHOTO_COUNT = 6

// ── Field component ───────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  mono = false,
  suffix,
  type = 'text',
  options = [],
  readOnly = false,
}: FieldProps): React.ReactElement {
  const inputClass = mono ? 'mono' : ''

  return (
    <div className="ff">
      <label>{label}</label>
      {type === 'select' ? (
        <select
          value={String(value)}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={readOnly}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : suffix ? (
        <div className="ff-row">
          <input
            type="text"
            className={inputClass}
            value={String(value)}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={readOnly}
          />
          <span className="ff-suffix mono">{suffix}</span>
        </div>
      ) : (
        <input
          type="text"
          className={inputClass}
          value={String(value)}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
        />
      )}
    </div>
  )
}

// ── Tab panels ────────────────────────────────────────────────────────────────

function BasicsTab({
  name,
  setName,
}: {
  name: string
  setName: (v: string) => void
}): React.ReactElement {
  const [description, setDescription] = React.useState(
    'رحلة صيد كاملة في أعماق البحر الأحمر. الربان محمود سيف معتمد منذ ١٢ سنة، متخصص في صيد التونة والباراكودا. القارب مجهز بأحدث معدات السونار والصيد من Shimano، مع طاقم من ثلاثة أفراد لخدمتك.',
  )

  return (
    <>
      <h3>الأساسيات</h3>
      <div className="sub">BASIC INFORMATION</div>
      <div className="form-grid">
        <Field label="اسم القارب · بالعربية" value={name} onChange={setName} />
        <Field label="NAME · ENGLISH" value="Red Sea" />
        <Field
          label="نوع القارب"
          type="select"
          value="يخت صيد"
          options={['يخت صيد', 'فلوكة', 'يخت رفاهية', 'كاتاماران']}
        />
        <Field
          label="المنطقة"
          type="select"
          value="الغردقة · البحر الأحمر"
          options={[
            'الغردقة · البحر الأحمر',
            'شرم الشيخ',
            'الإسكندرية',
            'دهب',
          ]}
        />
        <Field label="نقطة الانطلاق" value="مرسى الغردقة · حوض ٤٢" />
        <Field
          label="إحداثيات GPS"
          value="27.2579° N, 33.8116° E"
          mono
        />
      </div>

      <div className="subhead-mini">وصف الرحلة · بالعربية</div>
      <textarea
        className="ta"
        rows={5}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="char-count mono">
        {description.length} / 1500 CHARS
      </div>

      <div className="subhead-mini">TRIP DESCRIPTION · ENGLISH</div>
      <textarea
        className="ta"
        rows={4}
        defaultValue="Full-day offshore fishing in the Red Sea. Captain Mahmoud Seif has 12 years of experience specialising in tuna and barracuda. The boat is fitted with the latest Shimano gear and Garmin sonar."
      />
    </>
  )
}

function SpecsTab(): React.ReactElement {
  return (
    <>
      <h3>المواصفات التقنية</h3>
      <div className="sub">VESSEL SPECIFICATIONS</div>
      <div className="form-grid">
        <Field label="الطول · FT" value="42" mono />
        <Field label="السنة" value="2021" mono />
        <Field label="الطاقة · HP" value="2 × 350" mono />
        <Field label="السرعة القصوى · KNOTS" value="32" mono />
        <Field label="السعة · PAX" value="8" mono />
        <Field label="الكابينات" value="2" mono />
        <Field label="الحمامات" value="1" mono />
        <Field label="مدى الإبحار · NM" value="180" mono />
      </div>

      <div className="subhead-mini">المعدات الموجودة</div>
      <div className="chip-grid">
        {EQUIPMENT_ITEMS.map((item) => (
          <span key={item} className="chip-on">
            ✓ {item}
          </span>
        ))}
        <span className="chip-add">+ إضافة</span>
      </div>
    </>
  )
}

function PhotosTab(): React.ReactElement {
  return (
    <>
      <h3>معرض الصور · {PHOTO_COUNT} صور</h3>
      <div className="sub">
        PHOTOS · DRAG TO REORDER · FIRST PHOTO IS THE COVER
      </div>
      <div className="photo-mgr">
        {Array.from({ length: PHOTO_COUNT }, (_, i) => (
          <div
            key={i}
            className={`pm-cell${i === 0 ? ' cover' : ''}`}
            style={{
              background: `oklch(${0.55 + i * 0.05} 0.04 220)`,
            }}
          >
            <div className="pm-num mono">{String(i + 1).padStart(2, '0')}</div>
            {i === 0 && <div className="pm-badge mono">COVER</div>}
            <div className="pm-actions">
              <button title="جعل الغلاف">★</button>
              <button title="حذف">✕</button>
            </div>
          </div>
        ))}
        <div className="pm-cell pm-add">
          <div className="plus">+</div>
          <div className="lbl">إضافة صور</div>
          <div className="hint mono">DRAG · OR CLICK</div>
        </div>
        <div className="pm-cell pm-add">
          <div className="plus">▶</div>
          <div className="lbl">إضافة فيديو</div>
          <div className="hint mono">MP4 · MAX 60S</div>
        </div>
      </div>
    </>
  )
}

function PricingTab({
  price,
  setPrice,
}: {
  price: number
  setPrice: (v: number) => void
}): React.ReactElement {
  return (
    <>
      <h3>التسعير الديناميكي</h3>
      <div className="sub">DYNAMIC PRICING · WEEKDAY × SEASON</div>

      <div className="pricing-matrix">
        <div className="pm-head">
          <div />
          {SEASON_LABELS.map((s) => (
            <div key={s}>{s}</div>
          ))}
        </div>

        {DAY_ROWS.map(([day, dayMult]) => (
          <div key={day} className="pm-row">
            <div className="pm-day">{day}</div>
            {SEASON_MULTIPLIERS.map((seasonMult, si) => {
              const p = Math.round((price * dayMult * seasonMult) / 10) * 10
              const high = p > 3200
              return (
                <div
                  key={si}
                  className={`pm-cell-p${high ? ' high' : ''}`}
                >
                  <div className="num">
                    {(p / 1000).toFixed(2)}
                    <span>K</span>
                  </div>
                  <div className="mono mult">
                    ×{(dayMult * seasonMult).toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="row-2" style={{ marginTop: 24 }}>
        <Field
          label="السعر الأساسي · باليوم"
          value={price}
          onChange={(v) => setPrice(Number(v) || 0)}
          mono
          suffix="EGP"
        />
        <Field label="نصف يوم · ٦ ساعات" value="60% من اليوم" />
        <Field label="رحلة ليلية" value="+ 800 EGP" mono />
        <Field label="عرض ٣ أيام" value="−10% خصم" />
      </div>
    </>
  )
}

function AmenitiesTab({
  amenities,
  toggleAmenity,
}: {
  amenities: Set<string>
  toggleAmenity: (item: string) => void
}): React.ReactElement {
  return (
    <>
      <h3>الخدمات المشمولة</h3>
      <div className="sub">WHAT&apos;S INCLUDED IN THE TRIP</div>
      <div className="amen-toggle-grid">
        {AMENITIES_INITIAL.map(([item]) => {
          const on = amenities.has(item)
          return (
            <label
              key={item}
              className={`atog${on ? ' on' : ''}`}
              onClick={() => toggleAmenity(item)}
            >
              <span className="check">{on ? '✓' : '+'}</span>
              <span>{item}</span>
            </label>
          )
        })}
      </div>
    </>
  )
}

function PoliciesTab({
  selectedPolicy,
  setSelectedPolicy,
}: {
  selectedPolicy: number
  setSelectedPolicy: (i: number) => void
}): React.ReactElement {
  return (
    <>
      <h3>سياسات الإلغاء والحضور</h3>
      <div className="sub">CANCELLATION &amp; POLICIES</div>
      <div className="policy-stack">
        {POLICIES.map(([title, description], i) => (
          <label
            key={i}
            className={`policy-card${selectedPolicy === i ? ' on' : ''}`}
            onClick={() => setSelectedPolicy(i)}
          >
            <div className="radio" />
            <div>
              <div className="t">{title}</div>
              <div className="d">{description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="subhead-mini" style={{ marginTop: 28 }}>
        قواعد إضافية
      </div>
      <div className="rules">
        {RULES.map((rule) => (
          <div key={rule} className="rule-item">
            <span className="x">✓</span>
            <span>{rule}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Live preview ──────────────────────────────────────────────────────────────

function LivePreview({
  name,
  price,
}: {
  name: string
  price: number
}): React.ReactElement {
  return (
    <div
      className="dash-card"
      style={{
        position: 'sticky',
        top: 20,
        alignSelf: 'flex-start',
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <div className="preview-bar mono">
        <span>● LIVE PREVIEW · كما يراه العميل</span>
        <span style={{ marginInlineStart: 'auto', opacity: 0.6 }}>↗</span>
      </div>

      {/* Hero image placeholder */}
      <div
        style={{
          background:
            'linear-gradient(160deg, oklch(0.32 0.07 220), oklch(0.20 0.045 235))',
          height: 220,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 12,
            insetInlineStart: 12,
            padding: '4px 10px',
            background: 'oklch(1 0 0 / 0.92)',
            fontFamily: 'var(--ff-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
          }}
        >
          OFFSHORE FISHING
        </div>
      </div>

      {/* Preview details */}
      <div style={{ padding: '20px 24px 24px' }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            direction: 'ltr',
          }}
        >
          OFFSHORE FISHING · HURGHADA
        </div>
        <div
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 28,
            fontWeight: 700,
            marginTop: 4,
          }}
        >
          {name || 'اسم القارب'}
        </div>
        <div
          style={{ fontSize: 13, color: 'var(--muted-2)', marginTop: 4 }}
        >
          مع <em>Capt. Mahmoud Seif</em>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'var(--muted)',
            marginTop: 10,
            direction: 'ltr',
          }}
        >
          42FT · 8 PAX · 2021
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid var(--rule)',
          }}
        >
          <div>
            <span
              className="num"
              style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {price.toLocaleString('en')}
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginInlineStart: 4,
              }}
            >
              EGP / DAY
            </span>
          </div>
          <div className="num">★ 4.92 (148)</div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  params: { locale: string }
}

export function OwnerYachtsPage({ params: { locale: _locale } }: Props): React.ReactElement {
  const t = useTranslations('owner.listing')
  const [tab, setTab] = React.useState<TabId>('basics')
  const [name, setName] = React.useState('البحر الأحمر')
  const [price, setPrice] = React.useState(2280)
  const [selectedPolicy, setSelectedPolicy] = React.useState(1)

  // Amenities: initialise from AMENITIES_INITIAL (items where on === true)
  const [amenities, setAmenities] = React.useState<Set<string>>(
    () =>
      new Set(
        AMENITIES_INITIAL.filter(([, on]) => on).map(([item]) => item),
      ),
  )

  const toggleAmenity = React.useCallback((item: string) => {
    setAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(item)) {
        next.delete(item)
      } else {
        next.add(item)
      }
      return next
    })
  }, [])

  return (
    <div dir="rtl">
      {/* Tab bar */}
      <div className="seller-tabs">
        {TABS.map(({ ar, en, id }) => (
          <button
            key={id}
            className={`stab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
            type="button"
          >
            <span className="ar">{ar}</span>
            <span className="en">{en}</span>
          </button>
        ))}
      </div>

      {/* Main two-column layout */}
      <div
        className="dash-row"
        style={{ gridTemplateColumns: '1.6fr 1fr' }}
      >
        {/* Editor panel */}
        <div className="dash-card">
          {tab === 'basics' && (
            <BasicsTab name={name} setName={setName} />
          )}
          {tab === 'specs' && <SpecsTab />}
          {tab === 'photos' && <PhotosTab />}
          {tab === 'pricing' && (
            <PricingTab price={price} setPrice={setPrice} />
          )}
          {tab === 'amenities' && (
            <AmenitiesTab
              amenities={amenities}
              toggleAmenity={toggleAmenity}
            />
          )}
          {tab === 'policies' && (
            <PoliciesTab
              selectedPolicy={selectedPolicy}
              setSelectedPolicy={setSelectedPolicy}
            />
          )}
        </div>

        {/* Live preview */}
        <LivePreview name={name} price={price} />
      </div>

      {/* Sticky action bar */}
      <div className="action-bar">
        <div className="status">
          <span className="dot-live" />
          <strong>{t('published')}</strong>
          <span className="mono">· LAST EDIT 12 MIN AGO</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" type="button">
            {t('previewAsCustomer')}
          </button>
          <button className="btn btn-clay" type="button">
            {t('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  )
}
