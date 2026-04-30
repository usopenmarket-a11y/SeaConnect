'use client'

import { useState } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { KYC_QUEUE, type KycQueueItem } from '@/lib/mockData'

type ReviewAction = 'approve' | 'reject' | null

interface KycItemState {
  action: ReviewAction
  rejectReason: string
}

type KycStateMap = Record<string, KycItemState>

// ── Document list ────────────────────────────────────

function DocumentList({ docs }: { docs: string[] }) {
  return (
    <ul
      style={{
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        marginTop: 8,
      }}
    >
      {docs.map((doc) => (
        <li
          key={doc}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'var(--ff-mono)',
            fontSize: 12,
            color: 'var(--ink-2)',
            direction: 'ltr',
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              background: 'var(--pearl)',
              border: '1px solid var(--rule)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            ☁
          </span>
          {doc}
          <button
            type="button"
            style={{
              marginInlineStart: 'auto',
              fontFamily: 'var(--ff-mono)',
              fontSize: 10,
              color: 'var(--sea)',
              letterSpacing: '0.05em',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            VIEW →
          </button>
        </li>
      ))}
    </ul>
  )
}

// ── KYC Detail Card ───────────────────────────────────

function KycDetailCard({
  item,
  itemState,
  onApprove,
  onReject,
  onReasonChange,
}: {
  item: KycQueueItem
  itemState: KycItemState
  onApprove: () => void
  onReject: () => void
  onReasonChange: (reason: string) => void
}) {
  const typeLabel = item.type === 'boat' ? 'BOAT' : 'VENDOR'
  const actionDone = itemState.action !== null

  return (
    <div className="kyc-full-item">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div className="kyc-heading">{item.name}</div>
          <div className="kyc-sub">
            {typeLabel} · SUBMITTED {item.submittedAgo} AGO · {item.location}
          </div>
        </div>
        {actionDone && (
          <span
            className={`pill-status ${itemState.action === 'approve' ? 'ok' : 'warn'}`}
            style={{ alignSelf: 'flex-start' }}
          >
            {itemState.action === 'approve' ? '✓ APPROVED' : '✗ REJECTED'}
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
          <span className="value">{item.ownerName}</span>
        </div>
        <div className="kyc-field-row">
          <span className="label">رقم الهوية</span>
          <span className="value" style={{ direction: 'ltr' }}>{item.ownerNationalId}</span>
        </div>
        <div className="kyc-field-row">
          <span className="label">رقم الترخيص</span>
          <span className="value" style={{ direction: 'ltr' }}>{item.licenseNumber}</span>
        </div>
      </div>

      {/* Documents */}
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
          SUBMITTED DOCUMENTS ({item.documents.length})
        </div>
        <DocumentList docs={item.documents} />
      </div>

      {/* Reject reason textarea */}
      {!actionDone && (
        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor={`reject-reason-${item.id}`}
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
            REJECTION REASON (OPTIONAL)
          </label>
          <textarea
            id={`reject-reason-${item.id}`}
            value={itemState.rejectReason}
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
            onClick={onApprove}
            aria-label={`Approve ${item.name}`}
          >
            ✓ موافقة
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onReject}
            aria-label={`Reject ${item.name}`}
          >
            ✗ رفض
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginInlineStart: 'auto' }}
          >
            طلب معلومات إضافية
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main KYC Page Client ──────────────────────────────

/**
 * KYC queue client component — shows pending document review items
 * with approve/reject actions. Mirrors the KYC queue panel from AdminDash.
 */
export default function KycPageClient({ locale }: { locale: string }) {
  const [states, setStates] = useState<KycStateMap>(() => {
    const initial: KycStateMap = {}
    for (const item of KYC_QUEUE) {
      initial[item.id] = { action: null, rejectReason: '' }
    }
    return initial
  })

  function handleApprove(id: string) {
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], action: 'approve' },
    }))
  }

  function handleReject(id: string) {
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], action: 'reject' },
    }))
  }

  function handleReasonChange(id: string, reason: string) {
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], rejectReason: reason },
    }))
  }

  const pendingCount = Object.values(states).filter((s) => s.action === null).length

  return (
    <div className="dash-layout" dir="rtl">
      <AdminSidebar locale={locale} />

      <div className="dash-wrap">
        {/* Page header */}
        <header className="dash-head">
          <div>
            <div className="num-tag">§ ADMIN · KYC REVIEW QUEUE · APR 2026</div>
            <h1>
              تحقق <em>KYC</em>
            </h1>
          </div>
          <div className="head-actions">
            <span
              className="pill-status pending"
              style={{ fontSize: 12, padding: '6px 14px' }}
            >
              {pendingCount} PENDING
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

        {/* KYC item cards */}
        <div className="kyc-grid">
          {KYC_QUEUE.map((item) => (
            <KycDetailCard
              key={item.id}
              item={item}
              itemState={states[item.id]}
              onApprove={() => handleApprove(item.id)}
              onReject={() => handleReject(item.id)}
              onReasonChange={(reason) => handleReasonChange(item.id, reason)}
            />
          ))}
        </div>

        {/* Placeholder for full paginated list */}
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
            SHOWING 3 OF 14 · PAGINATED LIST REQUIRES ADMIN ANALYTICS API
          </div>
          <button type="button" className="btn btn-ghost">
            تحميل المزيد ↓
          </button>
        </div>
      </div>
    </div>
  )
}
