'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import AdminSidebar from '@/components/AdminSidebar'
import { adminGet, adminPost } from '@/lib/api'

// ── Types ─────────────────────────────────────────────

export interface KYCProfile {
  id: string
  owner_email: string
  owner_name: string
  kyc_status: string
  completed_steps: number
  total_steps: number
  created_at: string
}

export interface PaginatedKYC {
  results: KYCProfile[]
  next_cursor: string | null
  has_more: boolean
}

type ReviewAction = 'approve' | 'reject' | null

interface ItemUIState {
  /** Pending action the user has not yet confirmed */
  pendingAction: ReviewAction
  /** Rejection reason text */
  rejectReason: string
  /** Committed result after API call succeeded */
  committed: ReviewAction
  /** Whether an API call is in flight for this item */
  loading: boolean
  /** Last API error message, if any */
  error: string | null
}

type UIStateMap = Record<string, ItemUIState>

function initialItemState(): ItemUIState {
  return {
    pendingAction: null,
    rejectReason: '',
    committed: null,
    loading: false,
    error: null,
  }
}

// ── Confirmation dialog ───────────────────────────────

interface ConfirmDialogProps {
  action: 'approve' | 'reject'
  name: string
  reason: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ action, name, reason, onConfirm, onCancel }: ConfirmDialogProps) {
  const isReject = action === 'reject'
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
          maxWidth: 420,
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
          {isReject ? 'CONFIRM REJECTION' : 'CONFIRM APPROVAL'}
        </div>
        <div
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 18,
            marginBottom: 12,
            color: 'var(--ink)',
          }}
        >
          {isReject ? 'رفض' : 'الموافقة على'}{' '}
          <em>{name}</em>؟
        </div>
        {isReject && reason && (
          <div
            style={{
              background: 'var(--pearl)',
              border: '1px solid var(--rule)',
              padding: '10px 14px',
              marginBottom: 16,
              fontFamily: 'var(--ff-sans)',
              fontSize: 13,
              color: 'var(--ink-2)',
              direction: 'rtl',
            }}
          >
            {reason}
          </div>
        )}
        {isReject && !reason && (
          <div
            style={{
              marginBottom: 16,
              fontFamily: 'var(--ff-mono)',
              fontSize: 11,
              color: 'var(--muted)',
            }}
          >
            NO REJECTION REASON PROVIDED — OWNER WILL RECEIVE GENERIC NOTICE
          </div>
        )}
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
            className={`btn ${isReject ? 'btn-danger' : 'btn-approve'}`}
            onClick={onConfirm}
          >
            {isReject ? '✗ تأكيد الرفض' : '✓ تأكيد الموافقة'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────

function StepProgress({
  completed,
  total,
}: {
  completed: number
  total: number
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, direction: 'ltr' }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: 'var(--rule)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
        aria-label={`KYC progress: ${completed} of ${total} steps`}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--sea)',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--ff-mono)',
          fontSize: 11,
          color: 'var(--muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {completed}/{total} STEPS
      </span>
    </div>
  )
}

// ── KYC Detail Card ───────────────────────────────────

interface KycDetailCardProps {
  profile: KYCProfile
  uiState: ItemUIState
  onApproveClick: () => void
  onRejectClick: () => void
  onReasonChange: (reason: string) => void
}

function KycDetailCard({
  profile,
  uiState,
  onApproveClick,
  onRejectClick,
  onReasonChange,
}: KycDetailCardProps) {
  const actionDone = uiState.committed !== null

  const submittedDate = new Date(profile.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="kyc-full-item">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div>
          <div className="kyc-heading">{profile.owner_name}</div>
          <div className="kyc-sub">
            SUBMITTED {submittedDate} · {profile.owner_email}
          </div>
        </div>
        {actionDone && (
          <span
            className={`pill-status ${uiState.committed === 'approve' ? 'ok' : 'warn'}`}
            style={{ alignSelf: 'flex-start' }}
          >
            {uiState.committed === 'approve' ? '✓ APPROVED' : '✗ REJECTED'}
          </span>
        )}
        {uiState.loading && (
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 11,
              color: 'var(--muted)',
              alignSelf: 'flex-start',
            }}
          >
            PROCESSING...
          </span>
        )}
      </div>

      {/* Owner details */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          OWNER DETAILS
        </div>
        <div className="kyc-field-row">
          <span className="label">اسم المالك</span>
          <span className="value">{profile.owner_name}</span>
        </div>
        <div className="kyc-field-row">
          <span className="label">البريد الإلكتروني</span>
          <span className="value" style={{ direction: 'ltr' }}>
            {profile.owner_email}
          </span>
        </div>
        <div className="kyc-field-row">
          <span className="label">حالة KYC</span>
          <span
            className="value"
            style={{ direction: 'ltr', textTransform: 'uppercase', fontFamily: 'var(--ff-mono)' }}
          >
            {profile.kyc_status}
          </span>
        </div>
      </div>

      {/* KYC step progress */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          COMPLETION PROGRESS
        </div>
        <StepProgress completed={profile.completed_steps} total={profile.total_steps} />
      </div>

      {/* Error notice */}
      {uiState.error && (
        <div
          style={{
            background: '#fff0f0',
            border: '1px solid #f8b4b4',
            padding: '8px 12px',
            marginBottom: 12,
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            color: '#c53030',
            direction: 'ltr',
          }}
          role="alert"
        >
          ERROR: {uiState.error}
        </div>
      )}

      {/* Reject reason textarea */}
      {!actionDone && (
        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor={`reject-reason-${profile.id}`}
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: 6,
            }}
          >
            REJECTION REASON (REQUIRED FOR REJECTION)
          </label>
          <textarea
            id={`reject-reason-${profile.id}`}
            value={uiState.rejectReason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="وضّح سبب الرفض للمالك..."
            rows={2}
            style={{
              width: '100%',
              border: '1px solid var(--rule)',
              padding: '8px 12px',
              fontFamily: 'var(--ff-sans)',
              fontSize: 13,
              color: 'var(--ink)',
              background: 'var(--pearl)',
              resize: 'vertical',
              borderRadius: 2,
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Action buttons */}
      {!actionDone && (
        <div className="kyc-actions-bar">
          <button
            type="button"
            className="btn btn-approve"
            onClick={onApproveClick}
            disabled={uiState.loading}
            aria-label={`Approve ${profile.owner_name}`}
          >
            ✓ موافقة
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onRejectClick}
            disabled={uiState.loading}
            aria-label={`Reject ${profile.owner_name}`}
          >
            ✗ رفض
          </button>
        </div>
      )}
    </div>
  )
}

// ── Empty / loading states ────────────────────────────

function EmptyQueue() {
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
        لا توجد طلبات KYC قيد المراجعة
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
        LOADING KYC QUEUE...
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

// ── Main KYC Page Client ──────────────────────────────

interface Confirmation {
  profileId: string
  profileName: string
  action: 'approve' | 'reject'
}

/**
 * KYC queue client component — fetches submitted BoatOwnerProfiles from the
 * real Django API and lets admins approve or reject them with a confirmation
 * dialog before each destructive action.
 *
 * Auth: reads the bearer token from localStorage('admin_token'). This is
 * acceptable for an internal admin-only portal; server-side role enforcement
 * is on the Django side on every request.
 */
export default function KycPageClient({ locale }: { locale: string }) {
  // Read token client-side only (localStorage is not available during SSR)
  const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') ?? '') : ''

  const {
    data: kycData,
    error: fetchError,
    isLoading,
    mutate,
  } = useSWR<PaginatedKYC>(
    token ? (['/admin/kyc/', token] as const) : null,
    ([path, tok]: readonly [string, string]) => adminGet<PaginatedKYC>(path, tok),
    { revalidateOnFocus: false },
  )

  // Per-item UI state (reject reason, loading flag, committed result, error)
  const [uiStates, setUiStates] = useState<UIStateMap>({})

  // Pending confirmation dialog
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  // ── helpers ──────────────────────────────────────────

  function getItemState(id: string): ItemUIState {
    return uiStates[id] ?? initialItemState()
  }

  function patchItem(id: string, patch: Partial<ItemUIState>) {
    setUiStates((prev) => ({
      ...prev,
      [id]: { ...getItemState(id), ...patch },
    }))
  }

  const handleReasonChange = useCallback((id: string, reason: string) => {
    setUiStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? initialItemState()), rejectReason: reason },
    }))
  }, [])

  function openConfirmation(profileId: string, profileName: string, action: 'approve' | 'reject') {
    setConfirmation({ profileId, profileName, action })
  }

  function cancelConfirmation() {
    setConfirmation(null)
  }

  async function executeAction() {
    if (!confirmation) return
    const { profileId, action } = confirmation
    setConfirmation(null)

    patchItem(profileId, { loading: true, error: null })

    try {
      if (action === 'approve') {
        await adminPost(`/admin/kyc/${profileId}/approve/`, token)
      } else {
        const reason = getItemState(profileId).rejectReason
        await adminPost(`/admin/kyc/${profileId}/reject/`, token, { rejection_reason: reason })
      }
      patchItem(profileId, { loading: false, committed: action })
      // Revalidate so the list reflects the new state (item moves out of queue)
      await mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      patchItem(profileId, { loading: false, error: message })
    }
  }

  // ── derived ──────────────────────────────────────────

  const profiles = kycData?.results ?? []
  // Count items that have not yet been acted on in this session
  const pendingCount = profiles.filter(
    (p) => getItemState(p.id).committed === null,
  ).length

  // ── render ───────────────────────────────────────────

  return (
    <div className="dash-layout" dir="rtl">
      {confirmation && (
        <ConfirmDialog
          action={confirmation.action}
          name={confirmation.profileName}
          reason={getItemState(confirmation.profileId).rejectReason}
          onConfirm={() => void executeAction()}
          onCancel={cancelConfirmation}
        />
      )}

      <AdminSidebar locale={locale} />

      <div className="dash-wrap">
        {/* Page header */}
        <header className="dash-head">
          <div>
            <div className="num-tag">§ ADMIN · KYC REVIEW QUEUE · LIVE</div>
            <h1>
              تحقق <em>KYC</em>
            </h1>
          </div>
          <div className="head-actions">
            <span className="pill-status pending" style={{ fontSize: 12, padding: '6px 14px' }}>
              {isLoading ? '— PENDING' : `${pendingCount} PENDING`}
            </span>
            <button type="button" className="btn btn-ghost">
              تصفية
            </button>
          </div>
        </header>

        {/* Info strip */}
        <div
          style={{
            background: 'var(--sand)',
            border: '1px solid var(--rule)',
            padding: '14px 20px',
            marginBottom: 28,
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            direction: 'ltr',
          }}
        >
          REVIEW EACH SUBMISSION CAREFULLY · ALL ACTIONS ARE LOGGED WITH YOUR ADMIN ID · SLA: 24H
        </div>

        {/* Content */}
        {isLoading && <LoadingState />}
        {!isLoading && fetchError instanceof Error && (
          <ErrorState message={fetchError.message} />
        )}
        {!isLoading && !fetchError && profiles.length === 0 && <EmptyQueue />}
        {!isLoading && !fetchError && profiles.length > 0 && (
          <>
            <div className="kyc-grid">
              {profiles.map((profile) => (
                <KycDetailCard
                  key={profile.id}
                  profile={profile}
                  uiState={getItemState(profile.id)}
                  onApproveClick={() =>
                    openConfirmation(profile.id, profile.owner_name, 'approve')
                  }
                  onRejectClick={() =>
                    openConfirmation(profile.id, profile.owner_name, 'reject')
                  }
                  onReasonChange={(reason) => handleReasonChange(profile.id, reason)}
                />
              ))}
            </div>

            {/* Load more — only shown when more pages exist */}
            {kycData?.has_more && (
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
                  SHOWING {profiles.length} · MORE AVAILABLE
                </div>
                <button type="button" className="btn btn-ghost">
                  تحميل المزيد ↓
                </button>
              </div>
            )}
          </>
        )}

        {/* Token missing warning — useful in dev before login is wired */}
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
            NO ADMIN TOKEN · Set <code>localStorage.admin_token</code> to a valid JWT to load the
            KYC queue.
          </div>
        )}
      </div>
    </div>
  )
}
