'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import AdminSidebar from '@/components/AdminSidebar'
import { adminGet, adminPost } from '@/lib/api'

// ── Types ─────────────────────────────────────────────

export interface Dispute {
  id: string
  booking_id: string
  booking_ref: string
  raised_by_name: string
  reason: string
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  resolution: string
  created_at: string
}

export interface PaginatedDisputes {
  results: Dispute[]
  next_cursor: string | null
  has_more: boolean
}

type StatusFilter = 'all' | 'open' | 'investigating' | 'resolved' | 'closed'

interface ResolveState {
  /** Whether the inline resolution form is expanded for this dispute */
  expanded: boolean
  /** Text being typed into the resolution textarea */
  text: string
  /** Whether the POST request is in flight */
  loading: boolean
  /** API error, if any */
  error: string | null
  /** Whether the dispute has been resolved in this session */
  done: boolean
}

type ResolveStateMap = Record<string, ResolveState>

function initialResolveState(): ResolveState {
  return { expanded: false, text: '', loading: false, error: null, done: false }
}

// ── Status badge ──────────────────────────────────────

const STATUS_STYLES: Record<Dispute['status'], { bg: string; color: string; label: string }> = {
  open: { bg: '#fff0f0', color: '#c53030', label: 'OPEN' },
  investigating: { bg: '#fffbeb', color: '#92400e', label: 'INVESTIGATING' },
  resolved: { bg: '#f0fff4', color: '#276749', label: 'RESOLVED' },
  closed: { bg: '#f7f7f7', color: '#6b7280', label: 'CLOSED' },
}

function StatusBadge({ status }: { status: Dispute['status'] }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.closed
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        background: style.bg,
        color: style.color,
        fontFamily: 'var(--ff-mono)',
        fontSize: 10,
        letterSpacing: '0.08em',
        borderRadius: 2,
        fontWeight: 600,
      }}
    >
      {style.label}
    </span>
  )
}

// ── Status filter tabs ────────────────────────────────

const FILTER_TABS: { key: StatusFilter; labelAr: string }[] = [
  { key: 'all', labelAr: 'الكل' },
  { key: 'open', labelAr: 'مفتوح' },
  { key: 'investigating', labelAr: 'قيد التحقيق' },
  { key: 'resolved', labelAr: 'تم الحل' },
  { key: 'closed', labelAr: 'مغلق' },
]

// ── Resolve form (inline per row) ─────────────────────

interface ResolveFormProps {
  disputeId: string
  state: ResolveState
  onTextChange: (text: string) => void
  onSubmit: () => void
  onCancel: () => void
}

function ResolveForm({ disputeId, state, onTextChange, onSubmit, onCancel }: ResolveFormProps) {
  return (
    <div
      style={{
        background: 'var(--pearl)',
        border: '1px solid var(--rule)',
        padding: '16px 20px',
        marginTop: 12,
      }}
    >
      <label
        htmlFor={`resolution-${disputeId}`}
        style={{
          fontFamily: 'var(--ff-mono)',
          fontSize: 10,
          letterSpacing: '0.1em',
          color: 'var(--muted)',
          textTransform: 'uppercase',
          display: 'block',
          marginBottom: 8,
        }}
      >
        RESOLUTION NOTE (REQUIRED)
      </label>
      <textarea
        id={`resolution-${disputeId}`}
        value={state.text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="اكتب ملاحظة الحل للأطراف المعنية..."
        rows={3}
        style={{
          width: '100%',
          border: '1px solid var(--rule)',
          padding: '8px 12px',
          fontFamily: 'var(--ff-sans)',
          fontSize: 13,
          color: 'var(--ink)',
          background: 'white',
          resize: 'vertical',
          borderRadius: 2,
          outline: 'none',
          marginBottom: 10,
          boxSizing: 'border-box',
        }}
      />
      {state.error && (
        <div
          role="alert"
          style={{
            background: '#fff0f0',
            border: '1px solid #f8b4b4',
            padding: '8px 12px',
            marginBottom: 10,
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            color: '#c53030',
            direction: 'ltr',
          }}
        >
          ERROR: {state.error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          className="btn btn-approve"
          disabled={state.loading || state.text.trim().length < 5}
          onClick={onSubmit}
        >
          {state.loading ? 'جاري التسجيل...' : '✓ تأكيد الحل'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </div>
  )
}

// ── Dispute row ───────────────────────────────────────

interface DisputeRowProps {
  dispute: Dispute
  resolveState: ResolveState
  onExpandResolve: () => void
  onTextChange: (text: string) => void
  onSubmitResolve: () => void
  onCancelResolve: () => void
}

function DisputeRow({
  dispute,
  resolveState,
  onExpandResolve,
  onTextChange,
  onSubmitResolve,
  onCancelResolve,
}: DisputeRowProps) {
  const dateStr = new Date(dispute.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const canResolve = dispute.status === 'open' || dispute.status === 'investigating'
  const effectiveStatus = resolveState.done ? 'resolved' : dispute.status

  return (
    <div
      style={{
        background: 'var(--sand)',
        border: '1px solid var(--rule)',
        padding: '16px 20px',
        marginBottom: 12,
      }}
    >
      {/* Row header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 1fr 130px 110px 100px',
          gap: 16,
          alignItems: 'center',
        }}
      >
        {/* Booking ref */}
        <div>
          <div
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 10,
              color: 'var(--muted)',
              letterSpacing: '0.08em',
              marginBottom: 2,
            }}
          >
            BOOKING REF
          </div>
          <div
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 12,
              color: 'var(--ink)',
            }}
          >
            #{dispute.booking_ref}
          </div>
        </div>

        {/* Raised by */}
        <div>
          <div
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 10,
              color: 'var(--muted)',
              letterSpacing: '0.08em',
              marginBottom: 2,
            }}
          >
            RAISED BY
          </div>
          <div style={{ fontFamily: 'var(--ff-sans)', fontSize: 13, color: 'var(--ink)' }}>
            {dispute.raised_by_name}
          </div>
        </div>

        {/* Reason (truncated) */}
        <div>
          <div
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 10,
              color: 'var(--muted)',
              letterSpacing: '0.08em',
              marginBottom: 2,
            }}
          >
            REASON
          </div>
          <div
            style={{
              fontFamily: 'var(--ff-sans)',
              fontSize: 13,
              color: 'var(--ink-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={dispute.reason}
          >
            {dispute.reason}
          </div>
        </div>

        {/* Status */}
        <div>
          <StatusBadge status={effectiveStatus as Dispute['status']} />
        </div>

        {/* Date */}
        <div
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          {dateStr}
        </div>

        {/* Action */}
        <div>
          {canResolve && !resolveState.done && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onExpandResolve}
              style={{ fontSize: 11, padding: '5px 12px' }}
            >
              {resolveState.expanded ? 'إخفاء' : 'حل البلاغ'}
            </button>
          )}
          {resolveState.done && (
            <span
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 10,
                color: '#276749',
                letterSpacing: '0.08em',
              }}
            >
              ✓ RESOLVED
            </span>
          )}
          {!canResolve && !resolveState.done && (
            <span
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 10,
                color: 'var(--muted)',
                letterSpacing: '0.08em',
              }}
            >
              —
            </span>
          )}
        </div>
      </div>

      {/* Inline resolve form */}
      {resolveState.expanded && !resolveState.done && (
        <ResolveForm
          disputeId={dispute.id}
          state={resolveState}
          onTextChange={onTextChange}
          onSubmit={onSubmitResolve}
          onCancel={onCancelResolve}
        />
      )}

      {/* Existing resolution text (if already resolved) */}
      {dispute.status === 'resolved' && dispute.resolution && (
        <div
          style={{
            marginTop: 10,
            background: '#f0fff4',
            border: '1px solid #c6f6d5',
            padding: '10px 14px',
            fontFamily: 'var(--ff-sans)',
            fontSize: 13,
            color: '#276749',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              display: 'block',
              marginBottom: 4,
            }}
          >
            RESOLUTION
          </span>
          {dispute.resolution}
        </div>
      )}
    </div>
  )
}

// ── Loading / error / empty states ────────────────────

function LoadingState() {
  return (
    <div
      className="dash-card"
      style={{ textAlign: 'center', padding: '60px 28px', color: 'var(--muted)' }}
    >
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.12em' }}>
        LOADING DISPUTES...
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="dash-card"
      style={{ padding: '40px 28px', border: '1px solid #f8b4b4', background: '#fff8f8', direction: 'ltr' }}
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
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: '#742a2a' }}>{message}</div>
    </div>
  )
}

function EmptyState() {
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
        لا توجد بلاغات مطابقة للفلتر المحدد
      </div>
    </div>
  )
}

// ── Main disputes page client ─────────────────────────

/**
 * Disputes management client component.
 *
 * Fetches disputes from GET /api/v1/admin/disputes/?status=<filter> via SWR.
 * Allows admin to expand an inline resolve form and POST to the resolve endpoint.
 *
 * Auth: reads bearer token from localStorage('admin_token'). Role enforcement
 * is on the Django API on every request.
 */
export default function DisputesPageClient({ locale }: { locale: string }) {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') ?? '') : ''

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [resolveStates, setResolveStates] = useState<ResolveStateMap>({})

  // Build SWR key: include filter in key so SWR re-fetches when filter changes
  const swrKey = token
    ? (['/admin/disputes/', statusFilter, token] as const)
    : null

  const {
    data,
    error: fetchError,
    isLoading,
    mutate,
  } = useSWR<PaginatedDisputes>(
    swrKey,
    ([path, filter, tok]: readonly [string, string, string]) => {
      const qs = filter !== 'all' ? `?status=${filter}` : ''
      return adminGet<PaginatedDisputes>(`${path}${qs}`, tok)
    },
    { revalidateOnFocus: false },
  )

  // ── resolve state helpers ────────────────────────────

  function getResolveState(id: string): ResolveState {
    return resolveStates[id] ?? initialResolveState()
  }

  function patchResolveState(id: string, patch: Partial<ResolveState>) {
    setResolveStates((prev) => ({
      ...prev,
      [id]: { ...getResolveState(id), ...patch },
    }))
  }

  const handleTextChange = useCallback((id: string, text: string) => {
    setResolveStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? initialResolveState()), text },
    }))
  }, [])

  function handleExpandResolve(id: string) {
    patchResolveState(id, { expanded: !getResolveState(id).expanded })
  }

  function handleCancelResolve(id: string) {
    patchResolveState(id, { expanded: false, text: '', error: null })
  }

  async function handleSubmitResolve(id: string) {
    const state = getResolveState(id)
    if (state.text.trim().length < 5) return

    patchResolveState(id, { loading: true, error: null })
    try {
      await adminPost(`/admin/disputes/${id}/resolve/`, token, { resolution: state.text })
      patchResolveState(id, { loading: false, done: true, expanded: false })
      await mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      patchResolveState(id, { loading: false, error: message })
    }
  }

  // ── derived counts ────────────────────────────────────

  const disputes = data?.results ?? []
  const openCount = disputes.filter((d) => d.status === 'open').length

  // ── render ────────────────────────────────────────────

  return (
    <div className="dash-layout" dir="rtl">
      <AdminSidebar locale={locale} />

      <div className="dash-wrap">
        {/* Page header */}
        <header className="dash-head">
          <div>
            <div className="num-tag">§ ADMIN · DISPUTES · LIVE</div>
            <h1>
              البلاغات <em>Disputes</em>
            </h1>
          </div>
          <div className="head-actions">
            <span className="pill-status pending" style={{ fontSize: 12, padding: '6px 14px' }}>
              {isLoading ? '— OPEN' : `${openCount} OPEN`}
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
          MANAGE CUSTOMER AND OWNER DISPUTES · ALL RESOLUTIONS ARE LOGGED WITH YOUR ADMIN ID · SLA: 48H
        </div>

        {/* Status filter tabs */}
        <div
          style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}
          role="tablist"
          aria-label="Filter disputes by status"
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '7px 18px',
                fontFamily: 'var(--ff-sans)',
                fontSize: 13,
                border: '1px solid var(--rule)',
                background: statusFilter === tab.key ? 'var(--sea)' : 'var(--sand)',
                color: statusFilter === tab.key ? 'white' : 'var(--ink)',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {tab.labelAr}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading && <LoadingState />}
        {!isLoading && fetchError instanceof Error && <ErrorState message={fetchError.message} />}
        {!isLoading && !fetchError && disputes.length === 0 && <EmptyState />}
        {!isLoading && !fetchError && disputes.length > 0 && (
          <>
            {disputes.map((dispute) => (
              <DisputeRow
                key={dispute.id}
                dispute={dispute}
                resolveState={getResolveState(dispute.id)}
                onExpandResolve={() => handleExpandResolve(dispute.id)}
                onTextChange={(text) => handleTextChange(dispute.id, text)}
                onSubmitResolve={() => void handleSubmitResolve(dispute.id)}
                onCancelResolve={() => handleCancelResolve(dispute.id)}
              />
            ))}

            {data?.has_more && (
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
                  SHOWING {disputes.length} · MORE AVAILABLE
                </div>
                <button type="button" className="btn btn-ghost">
                  تحميل المزيد ↓
                </button>
              </div>
            )}
          </>
        )}

        {/* Token missing warning */}
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
            NO ADMIN TOKEN · Set <code>localStorage.admin_token</code> to a valid JWT to load
            disputes.
          </div>
        )}
      </div>
    </div>
  )
}
