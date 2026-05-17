'use client'

/**
 * Owner — edit existing yacht form.
 *
 * GET  /api/v1/yachts/{id}/ — fetch current data to pre-fill the form.
 * PATCH /api/v1/yachts/{id}/ — submit only the changed fields (partial update).
 *
 * The backend returns 403 if the authenticated user does not own this yacht.
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, get, patch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { YACHT_TYPES } from '../new/PageClient'
import type { YachtType, FieldErrors } from '../new/PageClient'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Port {
  id: string
  name_en: string
  name_ar: string
  city_en: string
  city_ar: string
}

interface YachtDetail {
  id: string
  name: string
  name_ar: string
  description: string
  description_ar: string
  capacity: number
  price_per_day: string
  yacht_type: YachtType
  departure_port_id: string | null
}

interface Props {
  params: { locale: string; id: string }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditYachtPage({ params: { locale, id } }: Props): React.ReactElement {
  const t = useTranslations('owner.yachts.form')
  const tCommon = useTranslations('common')
  const router = useRouter()

  // ── Form state ───────────────────────────────────────────────────────────────

  const [name, setName] = React.useState('')
  const [nameAr, setNameAr] = React.useState('')
  const [descriptionEn, setDescriptionEn] = React.useState('')
  const [descriptionAr, setDescriptionAr] = React.useState('')
  const [capacity, setCapacity] = React.useState<number>(2)
  const [pricePerDay, setPricePerDay] = React.useState<string>('1000.00')
  const [yachtType, setYachtType] = React.useState<YachtType>('motorboat')
  const [portId, setPortId] = React.useState<string>('')

  // Track what was originally loaded so we only PATCH changed fields
  const [originalData, setOriginalData] = React.useState<YachtDetail | null>(null)

  // ── Remote data ──────────────────────────────────────────────────────────────

  const [ports, setPorts] = React.useState<Port[]>([])
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isLoadingYacht, setIsLoadingYacht] = React.useState(true)

  // ── Submission state ─────────────────────────────────────────────────────────

  const [submitting, setSubmitting] = React.useState(false)
  const [globalMessage, setGlobalMessage] = React.useState<{
    kind: 'success' | 'error' | 'info'
    text: string
  } | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})

  // ── Load ports ───────────────────────────────────────────────────────────────

  React.useEffect(() => {
    let cancelled = false
    get<Port[] | { results: Port[] }>('/ports/?region=EG')
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data.results ?? [])
        setPorts(list)
      })
      .catch(() => {
        // Non-fatal — port select will show empty until API is available
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ── Load existing yacht data ─────────────────────────────────────────────────

  React.useEffect(() => {
    let cancelled = false
    setIsLoadingYacht(true)
    setLoadError(null)

    get<YachtDetail>(`/yachts/${id}/`)
      .then((data) => {
        if (cancelled) return
        setOriginalData(data)
        setName(data.name)
        setNameAr(data.name_ar)
        setDescriptionEn(data.description ?? '')
        setDescriptionAr(data.description_ar ?? '')
        setCapacity(data.capacity)
        setPricePerDay(data.price_per_day)
        setYachtType(data.yacht_type)
        setPortId(data.departure_port_id ?? '')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError) {
          setLoadError(err.message)
        } else {
          setLoadError(t('loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingYacht(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, t])

  // ── Validation ───────────────────────────────────────────────────────────────

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = t('errors.nameEnRequired')
    if (!nameAr.trim()) errors.name_ar = t('errors.nameArRequired')
    if (!Number.isFinite(capacity) || capacity < 1) {
      errors.capacity = t('errors.capacityInvalid')
    }
    const price = Number(pricePerDay)
    if (!Number.isFinite(price) || price <= 0) {
      errors.price_per_day = t('errors.priceInvalid')
    }
    if (!portId) errors.departure_port = t('errors.portRequired')
    return errors
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setGlobalMessage(null)
    setSubmitting(true)

    // Build partial payload — only send fields that changed
    const payload: Partial<{
      name: string
      name_ar: string
      description: string
      description_ar: string
      capacity: number
      price_per_day: string
      yacht_type: YachtType
      departure_port_id: string
    }> = {}

    if (!originalData || name !== originalData.name) payload.name = name
    if (!originalData || nameAr !== originalData.name_ar) payload.name_ar = nameAr
    if (!originalData || descriptionEn !== (originalData.description ?? ''))
      payload.description = descriptionEn
    if (!originalData || descriptionAr !== (originalData.description_ar ?? ''))
      payload.description_ar = descriptionAr
    if (!originalData || capacity !== originalData.capacity) payload.capacity = capacity
    if (!originalData || pricePerDay !== originalData.price_per_day)
      payload.price_per_day = pricePerDay
    if (!originalData || yachtType !== originalData.yacht_type)
      payload.yacht_type = yachtType
    if (!originalData || portId !== (originalData.departure_port_id ?? ''))
      payload.departure_port_id = portId

    // If nothing changed, skip the network call
    if (Object.keys(payload).length === 0) {
      setGlobalMessage({ kind: 'info', text: t('editSuccessMessage') })
      router.push(`/${locale}/owner/yachts`)
      return
    }

    try {
      await patch<YachtDetail>(`/yachts/${id}/`, payload)
      setGlobalMessage({ kind: 'success', text: t('editSuccessMessage') })
      router.push(`/${locale}/owner/yachts`)
    } catch (err) {
      if (err instanceof ApiError) {
        setGlobalMessage({ kind: 'error', text: err.message })
        const knownFields: ReadonlyArray<keyof FieldErrors> = [
          'name',
          'name_ar',
          'capacity',
          'price_per_day',
          'yacht_type',
          'departure_port',
        ]
        if (err.field && (knownFields as ReadonlyArray<string>).includes(err.field)) {
          setFieldErrors((prev) => ({
            ...prev,
            [err.field as keyof FieldErrors]: err.message,
          }))
        }
      } else if (err instanceof Error) {
        setGlobalMessage({ kind: 'error', text: err.message })
      } else {
        setGlobalMessage({ kind: 'error', text: tCommon('error') })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────────

  const inputBase = cn(
    'h-10 w-full rounded-lg border border-ink/20 bg-white',
    'ps-3 pe-3 text-ink',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea/30',
    'focus-visible:border-sea',
  )

  const textareaBase = cn(
    'min-h-[5rem] w-full rounded-lg border border-ink/20 bg-white',
    'ps-3 pe-3 pt-2 pb-2 text-ink',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea/30',
    'focus-visible:border-sea',
  )

  const messageColor = {
    success: 'bg-emerald-50 text-emerald-700',
    error: 'bg-red-50 text-red-700',
    info: 'bg-amber-50 text-amber-700',
  } as const

  // ── Loading / error states ────────────────────────────────────────────────────

  if (isLoadingYacht) {
    return (
      <section>
        <Card>
          <Card.Body>
            <p className="text-sm text-ink/60">{tCommon('loading')}</p>
          </Card.Body>
        </Card>
      </section>
    )
  }

  if (loadError !== null) {
    return (
      <section>
        <Card>
          <Card.Body>
            <p role="alert" className="text-sm text-red-600">
              {loadError}
            </p>
          </Card.Body>
        </Card>
      </section>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <section>
      <Card>
        <Card.Header>
          <h1 className="font-display text-2xl font-bold text-ink">
            {t('editTitle')}
          </h1>
        </Card.Header>

        <Card.Body>
          {globalMessage && (
            <div
              role="alert"
              className={cn(
                'mb-4 rounded-lg px-4 py-3 text-sm',
                messageColor[globalMessage.kind],
              )}
            >
              {globalMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* Names */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-ink">
                  {t('nameEn')}
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputBase}
                  aria-invalid={!!fieldErrors.name}
                />
                {fieldErrors.name && (
                  <p role="alert" className="text-xs text-red-600">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="name_ar" className="text-sm font-medium text-ink">
                  {t('nameAr')}
                </label>
                <input
                  id="name_ar"
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className={inputBase}
                  aria-invalid={!!fieldErrors.name_ar}
                />
                {fieldErrors.name_ar && (
                  <p role="alert" className="text-xs text-red-600">
                    {fieldErrors.name_ar}
                  </p>
                )}
              </div>
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="description_en"
                  className="text-sm font-medium text-ink"
                >
                  {t('descriptionEn')}
                </label>
                <textarea
                  id="description_en"
                  rows={4}
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  className={textareaBase}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="description_ar"
                  className="text-sm font-medium text-ink"
                >
                  {t('descriptionAr')}
                </label>
                <textarea
                  id="description_ar"
                  rows={4}
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  className={textareaBase}
                />
              </div>
            </div>

            {/* Capacity, price, type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="capacity" className="text-sm font-medium text-ink">
                  {t('capacity')}
                </label>
                <input
                  id="capacity"
                  type="number"
                  min={1}
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value || 0))}
                  className={inputBase}
                  aria-invalid={!!fieldErrors.capacity}
                />
                {fieldErrors.capacity && (
                  <p role="alert" className="text-xs text-red-600">
                    {fieldErrors.capacity}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="price_per_day"
                  className="text-sm font-medium text-ink"
                >
                  {t('pricePerDay')}
                </label>
                <input
                  id="price_per_day"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(e.target.value)}
                  className={inputBase}
                  aria-invalid={!!fieldErrors.price_per_day}
                />
                {fieldErrors.price_per_day && (
                  <p role="alert" className="text-xs text-red-600">
                    {fieldErrors.price_per_day}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="yacht_type" className="text-sm font-medium text-ink">
                  {t('type')}
                </label>
                <select
                  id="yacht_type"
                  value={yachtType}
                  onChange={(e) => setYachtType(e.target.value as YachtType)}
                  className={inputBase}
                >
                  {YACHT_TYPES.map((typ) => (
                    <option key={typ} value={typ}>
                      {t(`typeOptions.${typ}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Departure port */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="port" className="text-sm font-medium text-ink">
                {t('departurePort')}
              </label>
              <select
                id="port"
                required
                value={portId}
                onChange={(e) => setPortId(e.target.value)}
                className={inputBase}
                aria-invalid={!!fieldErrors.departure_port}
              >
                {ports.length === 0 && (
                  <option value="">{tCommon('loading')}</option>
                )}
                {ports.map((p) => (
                  <option key={p.id} value={p.id}>
                    {locale === 'ar' ? p.name_ar : p.name_en} —{' '}
                    {locale === 'ar' ? p.city_ar : p.city_en}
                  </option>
                ))}
              </select>
              {fieldErrors.departure_port && (
                <p role="alert" className="text-xs text-red-600">
                  {fieldErrors.departure_port}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={submitting}
            >
              {submitting ? t('saving') : t('saveChanges')}
            </Button>
          </form>
        </Card.Body>
      </Card>
    </section>
  )
}
