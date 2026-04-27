'use client'

/**
 * Booking form page — Client Component (form interaction + auth required).
 *
 * Sprint 3 deliverable: replaces the dead "Book Now" CTA from Sprint 2 with a
 * real flow that POSTs to /api/v1/bookings/ and redirects to the new booking
 * detail page.
 *
 * ADR-009 — JWT access token attached via the in-memory api client.
 * ADR-014 — Logical CSS only (ms-/me-/ps-/pe-).
 * ADR-015 — All user-visible strings via t() — no hardcoded Arabic / English.
 * ADR-018 — Currency read from the yacht response, never hardcoded.
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { AuthGuard } from '@/components/auth/AuthGuard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ApiError, get, post } from '@/lib/api'
import { cn } from '@/lib/utils'

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
}

interface BookingResponse {
  id: string
}

interface FieldErrors {
  start_date?: string
  end_date?: string
  num_passengers?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function diffDays(start: string, end: string): number {
  if (!start || !end) return 0
  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0
  const ms = endMs - startMs
  return Math.max(Math.floor(ms / (1000 * 60 * 60 * 24)), 0)
}

function formatNumber(value: number, locale: string): string {
  return locale === 'ar'
    ? value.toLocaleString('ar-EG')
    : value.toLocaleString('en-US')
}

// ---------------------------------------------------------------------------
// Inner page (wrapped in <AuthGuard> below)
// ---------------------------------------------------------------------------

interface InnerProps {
  locale: string
  yachtId: string
}

function BookingFormInner({ locale, yachtId }: InnerProps): React.ReactElement {
  const t = useTranslations('booking')
  const tCommon = useTranslations('common')
  const router = useRouter()

  const [yacht, setYacht] = React.useState<YachtDetail | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const today = React.useMemo(() => todayIso(), [])
  const [startDate, setStartDate] = React.useState<string>(today)
  const [endDate, setEndDate] = React.useState<string>(addDays(today, 1))
  const [numPassengers, setNumPassengers] = React.useState<number>(1)
  const [submitting, setSubmitting] = React.useState<boolean>(false)
  const [globalError, setGlobalError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})

  // Fetch yacht detail once.
  React.useEffect(() => {
    let cancelled = false
    get<YachtDetail>(`/yachts/${yachtId}/`)
      .then((data) => {
        if (!cancelled) setYacht(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(t('yachtNotFound'))
      })
    return () => {
      cancelled = true
    }
  }, [yachtId, t])

  const days = diffDays(startDate, endDate)
  const totalAmount = React.useMemo(() => {
    if (!yacht) return 0
    const price = Number(yacht.price_per_day)
    if (Number.isNaN(price)) return 0
    return price * Math.max(days, 1)
  }, [yacht, days])

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!startDate) errors.start_date = t('startDate')
    if (!endDate) errors.end_date = t('endDate')
    if (startDate && endDate && Date.parse(endDate) <= Date.parse(startDate)) {
      errors.end_date = t('error.dateRange')
    }
    if (yacht && numPassengers > yacht.capacity) {
      errors.num_passengers = t('error.capacity')
    }
    if (numPassengers < 1) {
      errors.num_passengers = t('passengers')
    }
    return errors
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    if (!yacht) return

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    if (!yacht.departure_port) {
      setGlobalError(t('error.generic'))
      return
    }

    setSubmitting(true)
    setGlobalError(null)
    try {
      const created = await post<BookingResponse>('/bookings/', {
        yacht_id: yacht.id,
        start_date: startDate,
        end_date: endDate,
        num_passengers: numPassengers,
        departure_port_id: yacht.departure_port.id,
      })
      router.push(`/${locale}/bookings/${created.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.field === 'num_passengers' || err.field === 'end_date' || err.field === 'start_date') {
          setFieldErrors({ [err.field]: err.message })
        } else {
          setGlobalError(err.message)
        }
      } else if (err instanceof Error) {
        setGlobalError(err.message)
      } else {
        setGlobalError(t('error.generic'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render — error / loading
  // -------------------------------------------------------------------------

  if (loadError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <Card.Body>
            <p role="alert" className="py-8 text-center text-ink/60">
              {loadError}
            </p>
          </Card.Body>
        </Card>
      </main>
    )
  }

  if (!yacht) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="py-8 text-center text-ink/60">{tCommon('loading')}</p>
      </main>
    )
  }

  // -------------------------------------------------------------------------
  // Render — form
  // -------------------------------------------------------------------------

  const yachtName = locale === 'ar' ? yacht.name_ar : yacht.name
  const formattedTotal = formatNumber(Math.round(totalAmount), locale)
  const formattedPrice = formatNumber(Number(yacht.price_per_day), locale)
  const formattedDays = formatNumber(Math.max(days, 1), locale)

  const inputBase = cn(
    'h-10 w-full rounded-lg border bg-white',
    'ps-3 pe-3 text-ink',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea/30',
    'border-ink/20 focus-visible:border-sea',
  )

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <Card.Header>
          <h1 className="font-display text-2xl font-bold text-ink">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-ink/60">{yachtName}</p>
        </Card.Header>

        <Card.Body>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {globalError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {globalError}
              </div>
            )}

            {/* Start date */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="start_date" className="text-sm font-medium text-ink">
                {t('startDate')}
              </label>
              <input
                id="start_date"
                type="date"
                required
                min={today}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (e.target.value && Date.parse(endDate) <= Date.parse(e.target.value)) {
                    setEndDate(addDays(e.target.value, 1))
                  }
                }}
                aria-invalid={!!fieldErrors.start_date}
                aria-describedby={fieldErrors.start_date ? 'start-date-error' : undefined}
                className={inputBase}
              />
              {fieldErrors.start_date && (
                <p id="start-date-error" role="alert" className="text-xs text-red-600">
                  {fieldErrors.start_date}
                </p>
              )}
            </div>

            {/* End date */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="end_date" className="text-sm font-medium text-ink">
                {t('endDate')}
              </label>
              <input
                id="end_date"
                type="date"
                required
                min={addDays(startDate, 1)}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-invalid={!!fieldErrors.end_date}
                aria-describedby={fieldErrors.end_date ? 'end-date-error' : undefined}
                className={inputBase}
              />
              {fieldErrors.end_date && (
                <p id="end-date-error" role="alert" className="text-xs text-red-600">
                  {fieldErrors.end_date}
                </p>
              )}
            </div>

            {/* Passengers */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="num_passengers" className="text-sm font-medium text-ink">
                {t('passengers')}
              </label>
              <input
                id="num_passengers"
                type="number"
                required
                min={1}
                max={yacht.capacity}
                value={numPassengers}
                onChange={(e) => setNumPassengers(Number(e.target.value || 1))}
                aria-invalid={!!fieldErrors.num_passengers}
                aria-describedby={
                  fieldErrors.num_passengers ? 'passengers-error' : undefined
                }
                className={inputBase}
              />
              {fieldErrors.num_passengers && (
                <p id="passengers-error" role="alert" className="text-xs text-red-600">
                  {fieldErrors.num_passengers}
                </p>
              )}
            </div>

            {/* Total */}
            <div className="rounded-lg bg-sand p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
                {t('totalAmount')}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-ink">
                {formattedTotal}{' '}
                <span className="text-sm font-normal text-ink/60">
                  {yacht.currency}
                </span>
              </p>
              <p className="mt-1 text-xs text-ink/50">
                {formattedPrice} {yacht.currency} {t('perDay')} × {formattedDays}{' '}
                {t('nights')}
              </p>
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
    </main>
  )
}

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------

interface PageProps {
  params: { locale: string; id: string }
}

export function BookingFormPage({
  params: { locale, id },
}: PageProps): React.ReactElement {
  return (
    <AuthGuard locale={locale}>
      <BookingFormInner locale={locale} yachtId={id} />
    </AuthGuard>
  )
}
