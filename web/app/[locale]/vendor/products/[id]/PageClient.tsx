'use client'

/**
 * EditProductClient — form to edit an existing vendor product.
 *
 * Pre-fills all fields from GET /marketplace/products/{id}/ via useSWR.
 * On submit: PATCH /marketplace/products/{id}/ with only changed fields.
 * On success: redirect to /[locale]/vendor/products.
 *
 * Uses controlled native form state — react-hook-form is not a dependency yet.
 *
 * ADR-009 — JWT attached by patch()/get() from @/lib/api (never localStorage).
 * ADR-014 — logical CSS only (ms-, me-, ps-, pe-).
 * ADR-015 — all strings via t() — never hardcoded in JSX.
 * ADR-018 — currency never hardcoded — read from API response.
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import useSWR from 'swr'

import { get, patch, ApiError } from '@/lib/api'

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'rods-reels',
  'lures',
  'tackle-boxes',
  'clothing',
  'safety',
  'electronics',
] as const

type Category = (typeof CATEGORIES)[number]

// ── API types ──────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  name_ar: string
  description: string
  description_ar: string
  price: string
  currency: string
  category: Category | null
  stock_quantity: number
  is_available: boolean
  vendor_id: string
}

interface PatchPayload {
  name_ar?: string
  name?: string
  category?: Category | null
  price?: number
  stock_quantity?: number
  description_ar?: string
  description?: string
  is_available?: boolean
}

// ── Form state ─────────────────────────────────────────────────────────────────

interface FormState {
  name_ar: string
  name: string
  category: Category | ''
  price: string
  stock_quantity: string
  description_ar: string
  description: string
  is_available: boolean
}

type FieldErrors = Partial<Record<keyof FormState, string>>

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  locale: string
  productId: string
}

export function EditProductClient({ locale, productId }: Props): React.ReactElement {
  const t = useTranslations('vendor.products')
  const router = useRouter()

  // Fetch existing product
  const { data: product, error: fetchError, isLoading } = useSWR<Product>(
    `/marketplace/products/${productId}/`,
    (path: string) => get<Product>(path),
    { revalidateOnFocus: false },
  )

  // Form state — initialised from defaults, then reset once product loads
  const [form, setForm] = React.useState<FormState>({
    name_ar: '',
    name: '',
    category: '',
    price: '',
    stock_quantity: '0',
    description_ar: '',
    description: '',
    is_available: true,
  })

  // Snapshot of the original values to calculate dirty fields for PATCH
  const originalRef = React.useRef<FormState | null>(null)
  const hasPopulated = React.useRef(false)

  React.useEffect(() => {
    if (product && !hasPopulated.current) {
      hasPopulated.current = true
      const initial: FormState = {
        name_ar: product.name_ar,
        name: product.name,
        category: product.category ?? '',
        price: String(product.price),
        stock_quantity: String(product.stock_quantity),
        description_ar: product.description_ar ?? '',
        description: product.description ?? '',
        is_available: product.is_available,
      }
      setForm(initial)
      originalRef.current = initial
    }
  }, [product])

  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ): void {
    const { name, type } = e.target
    const value =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value
    setForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name as keyof FormState]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {}
    if (!form.name_ar.trim()) errs.name_ar = t('fieldRequired')
    if (!form.name.trim()) errs.name = t('fieldRequired')
    const price = Number(form.price)
    if (!form.price || isNaN(price) || price <= 0) errs.price = t('fieldInvalidPrice')
    const stock = Number(form.stock_quantity)
    if (
      form.stock_quantity === '' ||
      isNaN(stock) ||
      stock < 0 ||
      !Number.isInteger(stock)
    )
      errs.stock_quantity = t('fieldInvalidQty')
    return errs
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitError(null)
    setSaveSuccess(false)

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    // Build PATCH payload with only changed fields
    const orig = originalRef.current
    const changed: PatchPayload = {}
    if (!orig || form.name_ar !== orig.name_ar) changed.name_ar = form.name_ar.trim()
    if (!orig || form.name !== orig.name) changed.name = form.name.trim()
    if (!orig || form.category !== orig.category)
      changed.category = form.category || null
    if (!orig || form.price !== orig.price) changed.price = Number(form.price)
    if (!orig || form.stock_quantity !== orig.stock_quantity)
      changed.stock_quantity = Number(form.stock_quantity)
    if (!orig || form.description_ar !== orig.description_ar)
      changed.description_ar = form.description_ar.trim()
    if (!orig || form.description !== orig.description)
      changed.description = form.description.trim()
    if (!orig || form.is_available !== orig.is_available)
      changed.is_available = form.is_available

    if (Object.keys(changed).length === 0) {
      router.push(`/${locale}/vendor/products`)
      return
    }

    setIsSubmitting(true)
    try {
      await patch(`/marketplace/products/${productId}/`, changed)
      setSaveSuccess(true)
      setTimeout(() => {
        router.push(`/${locale}/vendor/products`)
      }, 800)
    } catch (err) {
      if (err instanceof ApiError && err.field) {
        const knownFields: Array<keyof FormState> = [
          'name_ar',
          'name',
          'price',
          'stock_quantity',
          'category',
          'description_ar',
          'description',
        ]
        if (knownFields.includes(err.field as keyof FormState)) {
          setFieldErrors({ [err.field]: err.message })
          setIsSubmitting(false)
          return
        }
      }
      setSubmitError(
        err instanceof ApiError ? err.message : t('saveError'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const isRtl = locale === 'ar'

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-[--sand] p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-[--ink]/10"
            />
          ))}
        </div>
      </div>
    )
  }

  if (fetchError || !product) {
    return (
      <div
        role="alert"
        className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800"
      >
        {t('loadError')}
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Back link */}
      <Link
        href={`/${locale}/vendor/products`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-[--ink]/60 hover:text-[--ink]"
      >
        {isRtl ? '→' : '←'} {t('backToProducts')}
      </Link>

      <h1 className="mb-6 font-display text-2xl font-bold text-[--ink]">
        {t('editTitle')}
      </h1>

      {/* Success banner */}
      {saveSuccess && (
        <div
          role="status"
          className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          {t('saveSuccess')}
        </div>
      )}

      {/* Error banner */}
      {submitError && (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {submitError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl bg-[--sand] p-6"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Arabic name */}
          <FormField
            id="name_ar"
            name="name_ar"
            label={t('nameAr')}
            required
            dir="rtl"
            value={form.name_ar}
            onChange={handleChange}
            error={fieldErrors.name_ar}
          />

          {/* English name */}
          <FormField
            id="name"
            name="name"
            label={t('nameEn')}
            required
            dir="ltr"
            value={form.name}
            onChange={handleChange}
            error={fieldErrors.name}
          />

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="category"
              className="text-xs font-semibold uppercase tracking-wide text-[--ink]/60"
            >
              {t('category')}
            </label>
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="rounded-lg border border-[--ink]/15 bg-white px-3 py-2 text-sm text-[--ink] focus:outline-none focus:ring-2 focus:ring-[--sea]"
            >
              <option value="">{t('categoryNone')}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`categoryLabel.${cat.replace(/-/g, '_') as 'rods_reels' | 'lures' | 'tackle_boxes' | 'clothing' | 'safety' | 'electronics'}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <FormField
            id="price"
            name="price"
            label={t('price')}
            required
            type="number"
            min="0"
            step="0.01"
            dir="ltr"
            value={form.price}
            onChange={handleChange}
            error={fieldErrors.price}
          />

          {/* Stock quantity */}
          <FormField
            id="stock_quantity"
            name="stock_quantity"
            label={t('stock')}
            required
            type="number"
            min="0"
            dir="ltr"
            value={form.stock_quantity}
            onChange={handleChange}
            error={fieldErrors.stock_quantity}
          />
        </div>

        {/* Arabic description */}
        <div className="mt-5 flex flex-col gap-1">
          <label
            htmlFor="description_ar"
            className="text-xs font-semibold uppercase tracking-wide text-[--ink]/60"
          >
            {t('descriptionAr')}
          </label>
          <textarea
            id="description_ar"
            name="description_ar"
            rows={4}
            dir="rtl"
            value={form.description_ar}
            onChange={handleChange}
            className="rounded-lg border border-[--ink]/15 bg-white px-3 py-2 text-sm text-[--ink] focus:outline-none focus:ring-2 focus:ring-[--sea]"
          />
        </div>

        {/* English description */}
        <div className="mt-5 flex flex-col gap-1">
          <label
            htmlFor="description"
            className="text-xs font-semibold uppercase tracking-wide text-[--ink]/60"
          >
            {t('descriptionEn')}
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            dir="ltr"
            value={form.description}
            onChange={handleChange}
            className="rounded-lg border border-[--ink]/15 bg-white px-3 py-2 text-sm text-[--ink] focus:outline-none focus:ring-2 focus:ring-[--sea]"
          />
        </div>

        {/* Availability toggle */}
        <div className="mt-5 flex items-center gap-3">
          <input
            id="is_available"
            name="is_available"
            type="checkbox"
            checked={form.is_available}
            onChange={handleChange}
            className="h-4 w-4 accent-[--sea]"
          />
          <label
            htmlFor="is_available"
            className="text-sm font-medium text-[--ink]"
          >
            {t('isAvailable')}
          </label>
        </div>

        {/* Submit row */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting || saveSuccess}
            className="rounded-lg bg-[--sea] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? t('saving') : t('saveChanges')}
          </button>
          <Link
            href={`/${locale}/vendor/products`}
            className="rounded-lg border border-[--ink]/20 px-6 py-2.5 text-sm font-medium text-[--ink]/70 transition-colors hover:bg-[--ink]/5"
          >
            {t('cancelBtn')}
          </Link>
        </div>
      </form>
    </section>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface FormFieldProps {
  id: string
  name: string
  label: string
  required?: boolean
  type?: string
  min?: string
  step?: string
  dir?: string
  value: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
  error?: string
}

function FormField({
  id,
  name,
  label,
  required,
  type = 'text',
  min,
  step,
  dir,
  value,
  onChange,
  error,
}: FormFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wide text-[--ink]/60"
      >
        {label}
        {required && <span className="ms-0.5 text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        min={min}
        step={step}
        dir={dir}
        value={value}
        onChange={onChange}
        className={`rounded-lg border bg-white px-3 py-2 text-sm text-[--ink] focus:outline-none focus:ring-2 focus:ring-[--sea] ${
          error
            ? 'border-red-400 focus:ring-red-400'
            : 'border-[--ink]/15'
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
