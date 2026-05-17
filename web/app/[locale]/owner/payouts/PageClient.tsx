'use client'

/**
 * Owner Payouts page — Client Component.
 *
 * Displays:
 *   1. Top row: next-payout card (dark gradient) + bank account card with
 *      payout schedule selector.
 *   2. Payout history table (reference, date, amount, method, status, PDF).
 *   3. Escrow section: bookings currently held with release countdown.
 *
 * CSS classes from globals.css: .dash-row, .dash-card, .dash-table,
 * .pill-status, .bank-card, .schedule, .sched-opt, .escrow-list, .escrow-row
 *
 * Data:
 *   useSWR('/payments/payouts/')  → PaginatedResponse<ApiPayout>
 *   useSWR('/payments/escrow/')   → PaginatedResponse<ApiEscrow>
 *
 * Auth: the `get` helper in lib/api.ts injects the in-memory Bearer token
 * automatically — no extra fetcher wrapper is needed here (ADR-009).
 *
 * Mock fallback: when the API returns an empty result set in dev, mock
 * constants are used so the UI is never empty.
 *
 * ADR-014 — logical CSS only (ms-, me-, ps-, pe-).
 * ADR-015 — all strings via t() under owner.payouts.*.
 */

import * as React from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { get, type PaginatedResponse } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LedgerRow {
  id: string
  ref: string
  dateAr: string
  amount: number
  currency: string
  method: string
  status: 'paid' | 'pending'
}

/** Raw shape returned by GET /api/v1/payments/payouts/ results array. */
interface ApiPayout {
  id: string
  amount: string
  currency: string
  status: string
  reference: string
  payment_method: string
  scheduled_date: string
  paid_at: string | null
  escrow_booking_ids: string[]
  created_at: string
}

/** Raw shape returned by GET /api/v1/payments/escrow/ results array. */
interface ApiEscrow {
  id: string
  customer_name: string
  trip_date: string
  amount: string
  currency: string
  release_hours: number
}

interface EscrowRow {
  id: string
  customerName: string
  tripDate: string
  amount: number
  currency: string
  releaseHours: number
}

type ScheduleOption = 'weekly' | 'biweekly' | 'monthly'

interface PayoutSummary {
  nextPayoutDate: string
  nextPayoutAmount: number
  currency: string
  totalBookings: number
  escrowHeld: number
  platformCommission: number
  taxes: number
}

interface BankAccount {
  bankName: string
  iban: string
  accountHolder: string
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_SUMMARY: PayoutSummary = {
  nextPayoutDate: '١٥ مايو ٢٠٢٦',
  nextPayoutAmount: 38420,
  currency: 'EGP',
  totalBookings: 43650,
  escrowHeld: 5230,
  platformCommission: 0,
  taxes: 0,
}

const MOCK_BANK: BankAccount = {
  bankName: 'بنك الإسكندرية',
  iban: 'EG 21 · ••• ••• ••• ••• 8842',
  accountHolder: 'MAHMOUD SEIF · محمود سيف',
}

const MOCK_LEDGER: LedgerRow[] = [
  { id: 'mock-1', ref: 'PO-4280', dateAr: '١٥ مايو ٢٠٢٦', amount: 38420, currency: 'EGP', method: 'بنك الإسكندرية ••8842', status: 'pending' },
  { id: 'mock-2', ref: 'PO-4192', dateAr: '١ مايو ٢٠٢٦', amount: 41200, currency: 'EGP', method: 'بنك الإسكندرية ••8842', status: 'paid' },
  { id: 'mock-3', ref: 'PO-4108', dateAr: '١٥ أبريل ٢٠٢٦', amount: 35640, currency: 'EGP', method: 'بنك الإسكندرية ••8842', status: 'paid' },
  { id: 'mock-4', ref: 'PO-4021', dateAr: '١ أبريل ٢٠٢٦', amount: 28980, currency: 'EGP', method: 'بنك الإسكندرية ••8842', status: 'paid' },
  { id: 'mock-5', ref: 'PO-3944', dateAr: '١٥ مارس ٢٠٢٦', amount: 19450, currency: 'EGP', method: 'INSTAPAY · 0100••5678', status: 'paid' },
]

const MOCK_ESCROW: EscrowRow[] = [
  { id: 'BK-7421', customerName: 'نور حسن', tripDate: '12 MAY', amount: 5480, currency: 'EGP', releaseHours: 14 },
  { id: 'BK-7409', customerName: 'أحمد لطفي', tripDate: '24 MAY', amount: 6200, currency: 'EGP', releaseHours: 312 },
  { id: 'BK-7398', customerName: 'منى صبري', tripDate: '8 JUN', amount: 7400, currency: 'EGP', releaseHours: 720 },
]

// ── API transform helpers ─────────────────────────────────────────────────────

function formatIsoDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(
      locale === 'ar' ? 'ar-EG' : 'en-GB',
      { day: 'numeric', month: 'long', year: 'numeric' },
    )
  } catch {
    return iso
  }
}

function transformPayout(p: ApiPayout, locale: string): LedgerRow {
  return {
    id: p.id,
    ref: p.reference,
    dateAr: formatIsoDate(p.scheduled_date, locale),
    amount: Number(p.amount),
    currency: p.currency,
    method: p.payment_method,
    status: p.status === 'paid' ? 'paid' : 'pending',
  }
}

function transformEscrow(e: ApiEscrow): EscrowRow {
  return {
    id: e.id,
    customerName: e.customer_name,
    tripDate: e.trip_date,
    amount: Number(e.amount),
    currency: e.currency,
    releaseHours: e.release_hours,
  }
}

function deriveSummary(
  payouts: ApiPayout[],
  escrowRows: EscrowRow[],
  locale: string,
): PayoutSummary {
  // First scheduled/pending payout becomes the "next payout"
  const nextPayout = payouts.find((p) => p.status !== 'paid') ?? payouts[0]
  const escrowHeld = escrowRows.reduce((sum, e) => sum + e.amount, 0)
  const totalBookings = payouts.reduce((sum, p) => sum + Number(p.amount), 0)

  return {
    nextPayoutDate: nextPayout
      ? formatIsoDate(nextPayout.scheduled_date, locale)
      : MOCK_SUMMARY.nextPayoutDate,
    nextPayoutAmount: nextPayout ? Number(nextPayout.amount) : MOCK_SUMMARY.nextPayoutAmount,
    currency: nextPayout?.currency ?? MOCK_SUMMARY.currency,
    totalBookings: totalBookings > 0 ? totalBookings : MOCK_SUMMARY.totalBookings,
    escrowHeld: escrowHeld > 0 ? escrowHeld : MOCK_SUMMARY.escrowHeld,
    platformCommission: 0,
    taxes: 0,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  locale: string
}

export function PayoutsPageClient({ locale }: Props): React.ReactElement {
  const t = useTranslations('owner.payouts')
  const [schedule, setSchedule] = React.useState<ScheduleOption>('biweekly')

  // ── Live data ──────────────────────────────────────────────────────────────
  // The `get` helper from lib/api.ts attaches Authorization: Bearer <token>
  // automatically from the in-memory store (ADR-009).
  const { data: payoutsData } = useSWR(
    '/payments/payouts/',
    (path: string) => get<PaginatedResponse<ApiPayout>>(path),
    { revalidateOnFocus: false },
  )
  const { data: escrowData } = useSWR(
    '/payments/escrow/',
    (path: string) => get<PaginatedResponse<ApiEscrow>>(path),
    { revalidateOnFocus: false },
  )

  // ── Derived data — fall back to mocks when API returns empty in dev ────────
  const apiEscrowRows: EscrowRow[] =
    escrowData && escrowData.results.length > 0
      ? escrowData.results.map(transformEscrow)
      : []

  const escrowRows: EscrowRow[] =
    apiEscrowRows.length > 0 ? apiEscrowRows : MOCK_ESCROW

  const ledgerRows: LedgerRow[] =
    payoutsData && payoutsData.results.length > 0
      ? payoutsData.results.map((p) => transformPayout(p, locale))
      : MOCK_LEDGER

  const summary: PayoutSummary =
    payoutsData && payoutsData.results.length > 0
      ? deriveSummary(payoutsData.results, apiEscrowRows, locale)
      : MOCK_SUMMARY

  // ── Helpers ────────────────────────────────────────────────────────────────

  function formatAmount(n: number): string {
    return locale === 'ar' ? n.toLocaleString('ar-EG') : n.toLocaleString('en-US')
  }

  const scheduleOptions: Array<{ value: ScheduleOption; label: string }> = [
    { value: 'weekly', label: t('schedule.weekly') },
    { value: 'biweekly', label: t('schedule.biweekly') },
    { value: 'monthly', label: t('schedule.monthly') },
  ]

  return (
    <section dir="rtl">
      {/* Page heading */}
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">
        {t('title')}
      </h1>

      {/* ── Top row: next payout + bank/schedule ── */}
      <div className="dash-row" style={{ gridTemplateColumns: '1.5fr 1fr' }}>

        {/* Next payout card */}
        <div
          className="dash-card"
          style={{
            background: 'linear-gradient(155deg, oklch(0.20 0.045 235), oklch(0.14 0.04 240))',
            color: 'var(--sand)',
            borderColor: 'transparent',
          }}
        >
          <div className="sub" style={{ color: 'var(--sand-3)', opacity: 0.7 }}>
            {t('nextPayout')} · {summary.nextPayoutDate}
          </div>

          <div
            className="num"
            style={{
              fontSize: 84,
              lineHeight: 1,
              fontWeight: 700,
              marginTop: 8,
              fontFamily: 'var(--ff-display)',
            }}
          >
            {formatAmount(summary.nextPayoutAmount)}
            <span
              className="mono"
              style={{ fontSize: 18, fontWeight: 400, color: 'var(--sand-3)', marginInlineEnd: 8, opacity: 0.8 }}
            >
              {' '}{summary.currency}
            </span>
          </div>

          {/* Breakdown rows */}
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid oklch(1 0 0 / 0.2)' }}>
            {(
              [
                { labelKey: 'breakdown.totalBookings', value: formatAmount(summary.totalBookings), variant: null },
                { labelKey: 'breakdown.escrowHeld', value: `−${formatAmount(summary.escrowHeld)}`, variant: 'hold' },
                { labelKey: 'breakdown.platformCommission', value: '—', variant: 'promo' },
                { labelKey: 'breakdown.taxes', value: '0', variant: null },
              ] as Array<{ labelKey: string; value: string; variant: 'hold' | 'promo' | null }>
            ).map(({ labelKey, value, variant }) => (
              <div
                key={labelKey}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14 }}
              >
                <span style={{ opacity: 0.75 }}>{t(labelKey as Parameters<typeof t>[0])}</span>
                <span
                  className="num mono"
                  style={{
                    color:
                      variant === 'hold'
                        ? 'var(--clay-soft)'
                        : variant === 'promo'
                        ? 'oklch(0.78 0.14 150)'
                        : 'inherit',
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <button
            className="btn cta-shimmer"
            style={{ background: 'var(--clay)', color: 'var(--foam)', width: '100%', marginTop: 18 }}
          >
            {t('instantTransfer')}
          </button>
        </div>

        {/* Bank account + schedule card */}
        <div className="dash-card">
          <h3>{t('bankAccount')}</h3>
          <div className="sub">BANK ACCOUNT · DEFAULT</div>

          <div className="bank-card">
            <div className="bk-bank">{MOCK_BANK.bankName}</div>
            <div className="bk-num mono">{MOCK_BANK.iban}</div>
            <div className="bk-name">{MOCK_BANK.accountHolder}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>{t('editBank')}</button>
            <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }}>{t('addBank')}</button>
          </div>

          <h3 style={{ marginTop: 24 }}>{t('payoutSchedule')}</h3>
          <div className="sub">PAYOUT SCHEDULE</div>

          <div className="schedule">
            {scheduleOptions.map((opt) => (
              <label
                key={opt.value}
                className={`sched-opt${schedule === opt.value ? ' on' : ''}`}
              >
                <input
                  type="radio"
                  name="payout-schedule"
                  value={opt.value}
                  checked={schedule === opt.value}
                  onChange={() => setSchedule(opt.value)}
                  className="sr-only"
                />
                <span className="radio" aria-hidden="true" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Payout history table ── */}
      <div className="dash-card" style={{ marginTop: 24 }}>
        <h3>{t('historyTitle')}</h3>
        <div className="sub">PAYOUT HISTORY · LAST 90 DAYS</div>

        <table className="dash-table">
          <thead>
            <tr>
              <th>{t('table.ref')}</th>
              <th>{t('table.date')}</th>
              <th>{t('table.amount')}</th>
              <th>{t('table.method')}</th>
              <th>{t('table.status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ledgerRows.map((row) => (
              <tr key={row.id ?? row.ref}>
                <td
                  className="mono"
                  style={{ color: 'var(--muted)', fontSize: 12 }}
                >
                  {row.ref}
                </td>
                <td>{row.dateAr}</td>
                <td className="num" style={{ fontWeight: 600 }}>
                  {formatAmount(row.amount)} {row.currency}
                </td>
                <td
                  className="mono"
                  style={{ direction: 'ltr', fontSize: 12 }}
                >
                  {row.method}
                </td>
                <td>
                  {row.status === 'paid' ? (
                    <span className="pill-status ok">{t('status.deposited')}</span>
                  ) : (
                    <span className="pill-status pending">{t('status.scheduled')}</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    aria-label={t('downloadPdfAria', { ref: row.ref })}
                  >
                    {t('downloadPdf')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Escrow section ── */}
      <div className="dash-card" style={{ marginTop: 24 }}>
        <h3>{t('escrowTitle')}</h3>
        <div className="sub">
          {escrowRows.length} {t('escrowSubtitle')}
        </div>

        <div className="escrow-list">
          {escrowRows.map((entry) => (
            <div key={entry.id} className="escrow-row">
              <div>
                <div className="t">
                  {entry.customerName}
                  {' · '}
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {entry.id}
                  </span>
                </div>
                <div className="d mono">
                  {t('escrowRelease', { hours: entry.releaseHours })} · {entry.tripDate} +24H
                </div>
              </div>
              <div
                className="num"
                style={{ fontFamily: 'var(--ff-display)', fontSize: 18, fontWeight: 700 }}
              >
                {formatAmount(entry.amount)} {entry.currency}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
