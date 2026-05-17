'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import AdminSidebar from '@/components/AdminSidebar'
import { adminGet, adminPost } from '@/lib/api'

// ── Types ─────────────────────────────────────────────

export interface PayoutRecord {
  id: string
  owner_name: string
  owner_email: string
  amount: string
  currency: string
  status: string
  reference: string
  payment_method: string
  scheduled_date: string
  paid_at: string | null
  created_at: string
}

export interface PaginatedPayouts {
  results: PayoutRecord[]
  next_cursor: string | null
  has_more: boolean
}

type StatusFilter = 'scheduled' | 'processing' | 'paid' | 'failed'

interface ItemUIState {
  loading: boolean
  committed: boolean
  error: string | null
}

type UIStateMap = Record<string, ItemUIState>

function initialItemState(): ItemUIState {
  return { loading: false, committed: false, error: null }
}

// ── Confirmation dialog ───────────────────────────────

interface ConfirmDialogProps {
  ownerName: string
  amount: string
  currency: string
  reference: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  ownerName,
  amount,
  currency,
  reference,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: 'var(--sand)',
          border: '1px solid var(--rule)',
          padding: '32px 28px',
          maxWidth: 440,
          width: '90%',
          direction: 'rtl',
        }}
      >
        <div
          id="confirm-title"
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          CONFIRM PAYOUT APPROVAL
        </div>
        <div
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 18,
            marginBottom: 12,
            color: 'var(--ink)',
          }}
        >
          الموافقة على صرف مبلغ <em>{amount} {currency}</em>؟
        </div>
        <div
          style={{
            background: 'var(--pearl)',
            border: '1px solid var(--rule)',
            padding: '10px 14px',
            marginBottom: 16,
            fontFamily: 'var(--ff-sans)',
            fontSize: 13,
            color: 'var(--ink-2)',
            direction: 'ltr',
          }}
        >
          <div>Owner: {ownerName}</div>
          <div>Reference: {reference}</div>
        </div>
        <div
          style={{
            marginBottom: 16,
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          THIS WILL MOVE THE PAYOUT TO PROCESSING STATUS · ACTION IS LOGGED
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="btn btn-approve"
            onClick={onConfirm}
          >
            ✓ تأكيد الموافقة
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status pill ───────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    scheduled: { label: 'SCHEDULED', cls: 'pending' },
    processing: { label: 'PROCESSING', cls: 'ok' },
    paid: { label: 'PAID', cls: 'ok' },
    failed: { label: 'FAILED', cls: 'warn' },
  }
  const entry = map[status] ?? { label: status.toUpperCase(), cls: 'pending' }
  return <span className={`pill-status ${entry.cls}`}>{entry.label}</span>
}

// ── Summary card ──────────────────────────────────────

function SummaryCard({
  payouts,
  isLoading,
}: {
  payouts: PayoutRecord[]
  isLoading: boolean
}) {
  const scheduled = payouts.filter((p) => p.status === 'scheduled')
  const totalByCurrency = scheduled.reduce<Record<string, number>>((acc, p) => {
    const cur = p.currency
    acc[cur] = (acc[cur] ?? 0) + parseFloat(p.amount)
    return acc
  }, {})

  return (
    <div
      style={{
        background: 'var(--sand)',
        border: '1px solid var(--rule)',
        padding: '20px 24px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 40,
        direction: 'ltr',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'var(--muted)',
            marginBottom: 4,
          }}
        >
          TOTAL SCHEDULED
        </div>
        {isLoading ? (
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 13, color: 'var(--muted)' }}>
            LOADING...
          </div>
        ) : Object.keys(totalByCurrency).length === 0 ? (
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 20, color: 'var(--muted)' }}>—</div>
        ) : (
          Object.entries(totalByCurrency).map(([cur, total]) => (
            <div
              key={cur}
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
              }}
            >
              {total.toLocaleString('en', { minimumFractionDigits: 2 })} {cur}
            </div>
          ))
        )}
      </div>
      <div
        style={{
          borderLeft: '1px solid var(--rule)',
          paddingLeft: 40,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'var(--muted)',
            marginBottom: 4,
          }}
        >
          PENDING APPROVALS
        </div>
        <div
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 22,
            fontWeight: 700,
            color: scheduled.length > 0 ? 'var(--sea)' : 'var(--muted)',
            letterSpacing: '-0.02em',
          }}
        >
          {isLoading ? '—' : scheduled.length}
        </div>
      </div>
    </div>
  )
}

// ── Empty / loading / error states ────────────────────

function EmptyState({ statusFilter }: { statusFilter: StatusFilter }) {
  return (
    <div
      className="dash-card"
      style={{ textAlign: 'center', padding: '60px 28px', color: 'var(--muted-2)' }}
    >
      <div
        style={{
          fontFamily: 'var(--ff-mono)',
          fontSize: 13,
          letterSpacing: '0.12em',
          marginBottom: 8,
        }}
      >
        ALL CLEAR
      </div>
      <div style={{ fontFamily: 'var(--ff-sans)', fontSize: 15, color: 'var(--muted)' }}>
        لا توجد مدفوعات بحالة{' '}
        <strong style={{ fontFamily: 'var(--ff-mono)' }}>{statusFilter.toUpperCase()}</strong>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div
      className="dash-card"
      style={{ textAlign: 'center', padding: '60px 28px', color: 'var(--muted)' }}
    >
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.12em' }}>
        LOADING PAYOUTS...
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="dash-card"
      style={{
        padding: '40px 28px',
        border: '1px solid #f8b4b4',
        background: '#fff8f8',
        direction: 'ltr',
      }}
      role="alert"
    >
      <div
        style={{
          fontFamily: 'var(--ff-mono)',
          fontSize: 11,
          letterSpacing: '0.1em',
          color: '#c53030',
          marginBottom: 8,
        }}
      >
        API ERROR
      </div>
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: '#742a2a' }}>
        {message}
      </div>
    </div>
  )
}

// ── Payout table ──────────────────────────────────────

interface PayoutTableProps {
  payouts: PayoutRecord[]
  uiStates: UIStateMap
  onApproveClick: (payout: PayoutRecord) => void
}

function PayoutTable({ payouts, uiStates, onApproveClick }: PayoutTableProps) {
  return (
    <div className="dash-card" style={{ marginBottom: 32 }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="dash-table" aria-label="Payout records">
          <thead>
            <tr>
              <th scope="col">المالك</th>
              <th scope="col">المبلغ</th>
              <th scope="col">طريقة الدفع</th>
              <th scope="col">تاريخ الجدولة</th>
              <th scope="col">المرجع</th>
              <th scope="col">الحالة</th>
              <th scope="col">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}
                >
                  لا توجد سجلات
                </td>
              </tr>
            ) : (
              payouts.map((payout) => {
                const ui = uiStates[payout.id] ?? initialItemState()
                const isApproved = ui.committed
                return (
                  <tr key={payout.id}>
                    <td>
                      <div
                        style={{ fontFamily: 'var(--ff-display)', fontSize: 14, fontWeight: 600 }}
                      >
                        {payout.owner_name}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--ff-mono)',
                          fontSize: 11,
                          color: 'var(--muted)',
                          direction: 'ltr',
                        }}
                      >
                        {payout.owner_email}
                      </div>
                    </td>
                    <td className="num">
                      <span style={{ fontWeight: 700 }}>
                        {parseFloat(payout.amount).toLocaleString('en', {
                          minimumFractionDigits: 2,
                        })}
                      </span>{' '}
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>{payout.currency}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 }}>
                        {payout.payment_method || '—'}
                      </span>
                    </td>
                    <td className="num" style={{ direction: 'ltr', color: 'var(--muted)' }}>
                      {payout.scheduled_date}
                    </td>
                    <td className="num" style={{ direction: 'ltr', fontSize: 11 }}>
                      {payout.reference}
                    </td>
                    <td>
                      {isApproved ? (
                        <span className="pill-status ok">PROCESSING</span>
                      ) : (
                        <StatusPill status={payout.status} />
                      )}
                    </td>
                    <td>
                      {ui.error && (
                        <div
                          style={{
                            fontFamily: 'var(--ff-mono)',
                            fontSize: 10,
                            color: '#c53030',
                            marginBottom: 4,
                          }}
                        >
                          ERROR
                        </div>
                      )}
                      {payout.status === 'scheduled' && !isApproved && (
                        <button
                          type="button"
                          className="btn btn-approve"
                          style={{ fontSize: 12, padding: '6px 14px' }}
                          onClick={() => onApproveClick(payout)}
                          disabled={ui.loading}
                          aria-label={`Approve payout for ${payout.owner_name}`}
                        >
                          {ui.loading ? '...' : '✓ موافقة'}
                        </button>
                      )}
                      {(payout.status !== 'scheduled' || isApproved) && (
                        <span
                          style={{
                            fontFamily: 'var(--ff-mono)',
                            fontSize: 10,
                            color: 'var(--muted)',
                          }}
                        >
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Status filter tabs ────────────────────────────────

const STATUS_TABS: { value: StatusFilter; labelAr: string }[] = [
  { value: 'scheduled', labelAr: 'مجدول' },
  { value: 'processing', labelAr: 'قيد التنفيذ' },
  { value: 'paid', labelAr: 'مدفوع' },
  { value: 'failed', labelAr: 'فشل' },
]

// ── Pending confirmation state ────────────────────────

interface PendingConfirmation {
  payout: PayoutRecord
}

// ── Main Payouts Page Client ──────────────────────────

/**
 * Admin payout approvals client component.
 * Fetches payouts from GET /api/v1/admin/payouts/?status=... and lets
 * admins approve scheduled payouts with a confirmation dialog.
 *
 * Auth: reads the bearer token from localStorage('admin_token').
 * Server-side role enforcement is on the Django side on every request.
 */
export default function PayoutsPageClient({ locale }: { locale: string }) {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') ?? '') : ''

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('scheduled')
  const [uiStates, setUiStates] = useState<UIStateMap>({})
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null)

  const {
    data: payoutsData,
    error: fetchError,
    isLoading,
    mutate,
  } = useSWR<PaginatedPayouts>(
    token ? ([`/admin/payouts/?status=${statusFilter}`, token] as const) : null,
    ([path, tok]: readonly [string, string]) => adminGet<PaginatedPayouts>(path, tok),
    { revalidateOnFocus: false },
  )

  // ── helpers ──────────────────────────────────────────

  function patchItem(id: string, patch: Partial<ItemUIState>) {
    setUiStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? initialItemState()), ...patch },
    }))
  }

  const handleApproveClick = useCallback((payout: PayoutRecord) => {
    setConfirmation({ payout })
  }, [])

  function cancelConfirmation() {
    setConfirmation(null)
  }

  async function executeApprove() {
    if (!confirmation) return
    const { payout } = confirmation
    setConfirmation(null)

    patchItem(payout.id, { loading: true, error: null })

    try {
      await adminPost(`/admin/payouts/${payout.id}/approve/`, token)
      patchItem(payout.id, { loading: false, committed: true })
      await mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      patchItem(payout.id, { loading: false, error: message })
    }
  }

  // ── derived ──────────────────────────────────────────

  const payouts = payoutsData?.results ?? []
  const scheduledCount = payouts.filter(
    (p) => p.status === 'scheduled' && !(uiStates[p.id]?.committed),
  ).length

  // ── render ───────────────────────────────────────────

  return (
    <div className="dash-layout" dir="rtl">
      {confirmation && (
        <ConfirmDialog
          ownerName={confirmation.payout.owner_name}
          amount={parseFloat(confirmation.payout.amount).toLocaleString('en', {
            minimumFractionDigits: 2,
          })}
          currency={confirmation.payout.currency}
          reference={confirmation.payout.reference}
          onConfirm={() => void executeApprove()}
          onCancel={cancelConfirmation}
        />
      )}

      <AdminSidebar locale={locale} />

      <div className="dash-wrap">
        {/* Page header */}
        <header className="dash-head">
          <div>
            <div className="num-tag">§ ADMIN · PAYOUT APPROVALS · LIVE</div>
            <h1>
              المدفوعات <em>Payouts</em>
            </h1>
          </div>
          <div className="head-actions">
            <span className="pill-status pending" style={{ fontSize: 12, padding: '6px 14px' }}>
              {isLoading ? '— PENDING' : `${scheduledCount} PENDING`}
            </span>
          </div>
        </header>

        {/* Info strip */}
        <div
          style={{
            background: 'var(--sand)',
            border: '1px solid var(--rule)',
            padding: '14px 20px',
            marginBottom: 20,
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            direction: 'ltr',
          }}
        >
          APPROVE SCHEDULED PAYOUTS TO BEGIN BANK TRANSFER · ALL ACTIONS ARE LOGGED WITH YOUR ADMIN ID
        </div>

        {/* Summary card */}
        <SummaryCard payouts={payouts} isLoading={isLoading} />

        {/* Status filter tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 24,
            borderBottom: '1px solid var(--rule)',
            paddingBottom: 0,
          }}
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                padding: '10px 18px',
                border: 'none',
                borderBottom: statusFilter === tab.value ? '2px solid var(--sea)' : '2px solid transparent',
                background: 'transparent',
                color: statusFilter === tab.value ? 'var(--sea)' : 'var(--muted)',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
              aria-selected={statusFilter === tab.value}
            >
              {tab.labelAr} · {tab.value.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading && <LoadingState />}
        {!isLoading && fetchError instanceof Error && (
          <ErrorState message={fetchError.message} />
        )}
        {!isLoading && !fetchError && payouts.length === 0 && (
          <EmptyState statusFilter={statusFilter} />
        )}
        {!isLoading && !fetchError && payouts.length > 0 && (
          <>
            <PayoutTable
              payouts={payouts}
              uiStates={uiStates}
              onApproveClick={handleApproveClick}
            />

            {payoutsData?.has_more && (
              <div
                className="dash-card"
                style={{ textAlign: 'center', padding: '40px 28px', color: 'var(--muted-2)' }}
              >
                <div
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    marginBottom: 12,
                  }}
                >
                  SHOWING {payouts.length} · MORE AVAILABLE
                </div>
                <button type="button" className="btn btn-ghost">
                  تحميل المزيد ↓
                </button>
              </div>
            )}
          </>
        )}

        {!token && (
          <div
            className="dash-card"
            style={{
              padding: '20px 24px',
              border: '1px solid #f6e05e',
              background: '#fffff0',
              direction: 'ltr',
              fontFamily: 'var(--ff-mono)',
              fontSize: 11,
              color: '#744210',
            }}
            role="alert"
          >
            NO ADMIN TOKEN · Set <code>localStorage.admin_token</code> to a valid JWT to load payouts.
          </div>
        )}
      </div>
    </div>
  )
}
