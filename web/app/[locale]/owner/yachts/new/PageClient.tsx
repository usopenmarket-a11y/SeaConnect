'use client'

/**
 * Owner — new yacht listing form.
 *
 * The POST /api/v1/yachts/ endpoint does not exist yet — full owner
 * yacht CRUD is Sprint 6 scope. This page submits to that path; if the
 * server returns 404 or 405 we show a "coming soon" toast instead of
 * an error so the form stays usable for QA.
 *
 * Departure port options come from the public GET /api/v1/ports/ endpoint
 * (Sprint 1) which already supports `?region=EG` filtering.
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, get, post } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Port {
  id: string
  name_en: string
  name_ar: string
  city_en: string
  city_ar: string
}

type YachtType =
  | 'motorboat'
  | 'sailboat'
  | 'catamaran'
  | 'fishing'
  | 'speedboat'

const YACHT_TYPES: YachtType[] = [
  'motorboat',
  'sailboat',
  'catamaran',
  'fishing',
  'speedboat',
]

interface FieldErrors {
  name?: string
  name_ar?: string
  capacity?: string
  price_per_day?: string
  yacht_type?: string
  departure_port?: string
}

interface Props {
  params: { locale: string }
}

export function NewYachtPage({
  params: { locale },
}: Props): React.ReactElement {
  const t = useTranslations('owner.yachts.form')
  const tCommon = useTranslations('common')
  const router = useRouter()

  const [name, setName] = React.useState('')
  const [nameAr, setNameAr] = React.useState('')
  const [descriptionEn, setDescriptionEn] = React.useState('')
  const [descriptionAr, setDescriptionAr] = React.useState('')
  const [capacity, setCapacity] = React.useState<number>(2)
  const [pricePerDay, setPricePerDay] = React.useState<string>('1000.00')
  const [yachtType, setYachtType] = React.useState<YachtType>('motorboat')
  const [portId, setPortId] = React.useState<string>('')

  const [ports, setPorts] = React.useState<Port[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [globalMessage, setGlobalMessage] = React.useState<{
    kind: 'success' | 'error' | 'info'
    text: string
  } | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})

  // Load ports.
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
    return () => {
      cancelled = true
    }
  }, [])

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = t('nameEn')
    if (!nameAr.trim()) errors.name_ar = t('nameAr')
    if (!Number.isFinite(capacity) || capacity < 1) {
      errors.capacity = t('capacity')
    }
    const price = Number(pricePerDay)
    if (!Number.isFinite(price) || price <= 0) {
      errors.price_per_day = t('pricePerDay')
    }
    if (!portId) errors.departure_port = t('departurePort')
    return errors
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setGlobalMessage(null)
    setSubmitting(true)

    try {
      const created = await post<{ id: string }>('/yachts/', {
        name,
        name_ar: nameAr,
        description: descriptionEn,
        description_ar: descriptionAr,
        capacity,
        price_per_day: pricePerDay,
        yacht_type: yachtType,
        departure_port_id: portId,
      })
      setGlobalMessage({ kind: 'success', text: t('successMessage') })
      router.push(`/${locale}/owner/yachts`)
      void created
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404 || err.status === 405) {
          // Endpoint not yet implemented (Sprint 6). Show graceful info toast.
          setGlobalMessage({ kind: 'info', text: t('comingSoon') })
        } else {
          setGlobalMessage({ kind: 'error', text: err.message })
          if (err.field && err.field in (fieldErrors as object)) {
            setFieldErrors({ [err.field]: err.message } as FieldErrors)
          }
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

  return (
    <section>
      <Card>
        <Card.Header>
          <h1 className="font-display text-2xl font-bold text-ink">
            {t('title')}
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
                      {typ}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
              {submitting ? t('submitting') : t('submit')}
            </Button>
          </form>
        </Card.Body>
      </Card>
    </section>
  )
}
