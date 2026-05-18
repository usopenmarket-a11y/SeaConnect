'use client'

/**
 * NewProductClient — form to create a new vendor product.
 *
 * Fields:
 *   name_ar        Arabic product name  (required)
 *   name           English product name (required)
 *   category       select from 6 options
 *   price          number — currency read from API (ADR-018)
 *   stock_quantity number
 *   description_ar Arabic description textarea
 *   description    English description textarea
 *   is_available   availability toggle
 *
 * On submit: POST /marketplace/products/ via post() helper.
 * On success: redirect to /[locale]/vendor/products.
 * On error:   shows field-level error if ApiError.field is set, otherwise
 *             shows a generic error banner.
 *
 * Uses controlled native form state — react-hook-form is not a dependency yet.
 *
 * ADR-009 — JWT attached by post() from @/lib/api (never localStorage).
 * ADR-014 — logical CSS only (ms-, me-, ps-, pe-).
 * ADR-015 — all strings via t() — never hardcoded in JSX.
 * ADR-018 — currency never hardcoded.
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { post, ApiError } from '@/lib/api'

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

// ── Form state type ────────────────────────────────────────────────────────────

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

// ── API types ──────────────────────────────────────────────────────────────────

interface CreateProductPayload {
  name_ar: string
  name: string
  category?: Category
  price: number
  stock_quantity: number
  description_ar?: string
  description?: string
  is_available: boolean
}

interface ProductResponse {
  id: string
  name: string
  name_ar: string
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  locale: string
}

export function NewProductClient({ locale }: Props): React.ReactElement {
  const t = useTranslations('vendor.products')
  const router = useRouter()

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

  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [submitError, setSubmitError] = React.useState<string | null>(null)
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
    // Clear the field error when the user edits the field
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
    if (form.stock_quantity === '' || isNaN(stock) || stock < 0 || !Number.isInteger(stock))
      errs.stock_quantity = t('fieldInvalidQty')
    return errs
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitError(null)

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    const payload: CreateProductPayload = {
      name_ar: form.name_ar.trim(),
      name: form.name.trim(),
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity),
      is_available: form.is_available,
      ...(form.category ? { category: form.category } : {}),
      ...(form.description_ar.trim() ? { description_ar: form.description_ar.trim() } : {}),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    }

    setIsSubmitting(true)
    try {
      await post<ProductResponse>('/marketplace/products/', payload)
      router.push(`/${locale}/vendor/products`)
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
        err instanceof ApiError ? err.message : t('createError'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const isRtl = locale === 'ar'

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
        {t('newTitle')}
      </h1>

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
          {/* Arabic name — required */}
          <FormField
            id="name_ar"
            name="name_ar"
            label={t('nameAr')}
            required
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            value={form.name_ar}
            onChange={handleChange}
            error={fieldErrors.name_ar}
          />

          {/* English name — required */}
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
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
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
            disabled={isSubmitting}
            className="rounded-lg bg-[--sea] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? t('creating') : t('create')}
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
