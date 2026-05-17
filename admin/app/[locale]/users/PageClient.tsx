'use client'

import { useState, useCallback, useRef } from 'react'
import useSWR from 'swr'
import AdminSidebar from '@/components/AdminSidebar'
import { adminGet, adminPost, adminPatch } from '@/lib/api'

// ── Types ─────────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  is_verified: boolean
  is_active: boolean
  created_at: string
  region_name: string | null
  kyc_status?: string
}

export interface PaginatedUsers {
  results: AdminUser[]
  next_cursor: string | null
  has_more: boolean
  count?: number
}

type UserRole = 'customer' | 'owner' | 'vendor'

// ── Per-item UI state ─────────────────────────────────

interface ItemUIState {
  suspendLoading: boolean
  roleLoading: boolean
  error: string | null
  optimisticActive: boolean | null
  optimisticRole: string | null
}

type UIStateMap = Record<string, ItemUIState>

function initialItemState(user: AdminUser): ItemUIState {
  return {
    suspendLoading: false,
    roleLoading: false,
    error: null,
    optimisticActive: null,
    optimisticRole: null,
  }
}

// ── Confirmation dialog ───────────────────────────────

type ConfirmKind = 'suspend' | 'unsuspend' | 'role'

interface PendingConfirmation {
  kind: ConfirmKind
  userId: string
  userName: string
  newRole?: UserRole
}

interface ConfirmDialogProps {
  confirmation: PendingConfirmation
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ confirmation, onConfirm, onCancel }: ConfirmDialogProps) {
  const { kind, userName, newRole } = confirmation

  const titles: Record<ConfirmKind, string> = {
    suspend: 'CONFIRM SUSPENSION',
    unsuspend: 'CONFIRM UNSUSPEND',
    role: 'CONFIRM ROLE CHANGE',
  }

  const headings: Record<ConfirmKind, string> = {
    suspend: `تعليق حساب ${userName}؟`,
    unsuspend: `رفع تعليق حساب ${userName}؟`,
    role: `تغيير دور ${userName} إلى ${newRole ?? ''}؟`,
  }

  const notes: Record<ConfirmKind, string> = {
    suspend:
      'لن يتمكن المستخدم من تسجيل الدخول · يتم تسجيل الإجراء',
    unsuspend:
      'سيتمكن المستخدم من تسجيل الدخول مجدداً · يتم تسجيل الإجراء',
    role: 'سيتغير مستوى الوصول للمستخدم · يتم تسجيل الإجراء',
  }

  const isDanger = kind === 'suspend'

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
          {titles[kind]}
        </div>
        <div
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 18,
            marginBottom: 12,
            color: 'var(--ink)',
          }}
        >
          {headings[kind]}
        </div>
        <div
          style={{
            background: 'var(--pearl)',
            border: '1px solid var(--rule)',
            padding: '10px 14px',
            marginBottom: 16,
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            color: 'var(--muted)',
            direction: 'ltr',
          }}
        >
          {notes[kind]}
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
            className={`btn ${isDanger ? 'btn-danger' : 'btn-approve'}`}
            onClick={onConfirm}
          >
            {isDanger ? '✗ تأكيد التعليق' : '✓ تأكيد'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Role badge ────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string }> = {
    customer: { label: 'CUSTOMER', color: 'var(--muted)' },
    owner: { label: 'OWNER', color: 'var(--sea)' },
    vendor: { label: 'VENDOR', color: 'oklch(0.6 0.12 140)' },
    admin: { label: 'ADMIN', color: 'oklch(0.5 0.15 30)' },
  }
  const entry = map[role] ?? { label: role.toUpperCase(), color: 'var(--muted)' }
  return (
    <span
      style={{
        fontFamily: 'var(--ff-mono)',
        fontSize: 10,
        letterSpacing: '0.08em',
        padding: '3px 8px',
        border: `1px solid ${entry.color}`,
        color: entry.color,
        borderRadius: 2,
      }}
    >
      {entry.label}
    </span>
  )
}

// ── Status pill ───────────────────────────────────────

function ActivePill({ isActive }: { isActive: boolean }) {
  return (
    <span className={`pill-status ${isActive ? 'ok' : 'warn'}`}>
      {isActive ? 'ACTIVE' : 'SUSPENDED'}
    </span>
  )
}

// ── KYC pill (owners only) ────────────────────────────

function KycPill({ kycStatus }: { kycStatus: string | undefined }) {
  if (!kycStatus) return <span style={{ color: 'var(--muted)', fontFamily: 'var(--ff-mono)', fontSize: 10 }}>—</span>
  const map: Record<string, string> = {
    not_started: 'pending',
    in_progress: 'pending',
    submitted: 'pending',
    approved: 'ok',
    rejected: 'warn',
  }
  return (
    <span className={`pill-status ${map[kycStatus] ?? 'pending'}`} style={{ fontSize: 10 }}>
      {kycStatus.replace('_', ' ').toUpperCase()}
    </span>
  )
}

// ── Role dropdown ─────────────────────────────────────

interface RoleDropdownProps {
  currentRole: string
  optimisticRole: string | null
  loading: boolean
  onRoleChange: (role: UserRole) => void
}

function RoleDropdown({ currentRole, optimisticRole, loading, onRoleChange }: RoleDropdownProps) {
  const displayRole = optimisticRole ?? currentRole

  if (displayRole === 'admin') {
    return (
      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--muted)' }}>
        ADMIN
      </span>
    )
  }

  return (
    <select
      value={displayRole}
      onChange={(e) => onRoleChange(e.target.value as UserRole)}
      disabled={loading}
      style={{
        fontFamily: 'var(--ff-mono)',
        fontSize: 11,
        letterSpacing: '0.05em',
        padding: '4px 8px',
        border: '1px solid var(--rule)',
        background: 'var(--pearl)',
        color: 'var(--ink)',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
      aria-label="Change user role"
    >
      <option value="customer">Customer</option>
      <option value="owner">Owner</option>
      <option value="vendor">Vendor</option>
    </select>
  )
}

// ── Empty / loading / error states ────────────────────

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
        NO USERS FOUND
      </div>
      <div style={{ fontFamily: 'var(--ff-sans)', fontSize: 15, color: 'var(--muted)' }}>
        لا يوجد مستخدمون مطابقون للبحث
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
        LOADING USERS...
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

// ── User table ────────────────────────────────────────

interface UserTableProps {
  users: AdminUser[]
  uiStates: UIStateMap
  onSuspendClick: (user: AdminUser) => void
  onUnsuspendClick: (user: AdminUser) => void
  onRoleChangeRequest: (user: AdminUser, newRole: UserRole) => void
}

function UserTable({
  users,
  uiStates,
  onSuspendClick,
  onUnsuspendClick,
  onRoleChangeRequest,
}: UserTableProps) {
  return (
    <div className="dash-card" style={{ marginBottom: 32 }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="dash-table" aria-label="User records">
          <thead>
            <tr>
              <th scope="col">الاسم</th>
              <th scope="col">البريد الإلكتروني</th>
              <th scope="col">الدور</th>
              <th scope="col">الحالة</th>
              <th scope="col">KYC</th>
              <th scope="col">تاريخ الانضمام</th>
              <th scope="col">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}
                >
                  لا يوجد مستخدمون
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const ui = uiStates[user.id] ?? initialItemState(user)
                const effectiveActive = ui.optimisticActive ?? user.is_active
                const effectiveRole = ui.optimisticRole ?? user.role
                const fullName =
                  `${user.first_name} ${user.last_name}`.trim() || '—'

                return (
                  <tr key={user.id}>
                    <td>
                      <div
                        style={{
                          fontFamily: 'var(--ff-display)',
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {fullName}
                      </div>
                      {user.region_name && (
                        <div
                          style={{
                            fontFamily: 'var(--ff-mono)',
                            fontSize: 10,
                            color: 'var(--muted)',
                          }}
                        >
                          {user.region_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--ff-mono)',
                          fontSize: 12,
                          direction: 'ltr',
                          display: 'inline-block',
                        }}
                      >
                        {user.email}
                      </span>
                    </td>
                    <td>
                      <RoleDropdown
                        currentRole={effectiveRole}
                        optimisticRole={ui.optimisticRole}
                        loading={ui.roleLoading}
                        onRoleChange={(newRole) => onRoleChangeRequest(user, newRole)}
                      />
                    </td>
                    <td>
                      <ActivePill isActive={effectiveActive} />
                    </td>
                    <td>
                      <KycPill kycStatus={user.kyc_status} />
                    </td>
                    <td className="num" style={{ direction: 'ltr', color: 'var(--muted)', fontSize: 12 }}>
                      {new Date(user.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
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
                      {user.role !== 'admin' && (
                        <button
                          type="button"
                          className={`btn ${effectiveActive ? 'btn-danger' : 'btn-approve'}`}
                          style={{ fontSize: 11, padding: '5px 12px' }}
                          onClick={() =>
                            effectiveActive
                              ? onSuspendClick(user)
                              : onUnsuspendClick(user)
                          }
                          disabled={ui.suspendLoading}
                          aria-label={
                            effectiveActive
                              ? `Suspend ${fullName}`
                              : `Unsuspend ${fullName}`
                          }
                        >
                          {ui.suspendLoading
                            ? '...'
                            : effectiveActive
                              ? '✗ تعليق'
                              : '✓ رفع التعليق'}
                        </button>
                      )}
                      {user.role === 'admin' && (
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

// ── Main Users Page Client ────────────────────────────

/**
 * Admin user management client component.
 * Fetches users from GET /api/v1/admin/users/?search=... with debounced
 * email search, and allows admins to:
 *   - suspend/unsuspend users (with confirmation dialog)
 *   - change user roles via dropdown (with confirmation dialog)
 *
 * Auth: reads the bearer token from localStorage('admin_token').
 * Server-side role enforcement is on the Django side on every request.
 */
export default function UsersPageClient({ locale }: { locale: string }) {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') ?? '') : ''

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [uiStates, setUiStates] = useState<UIStateMap>({})
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    data: usersData,
    error: fetchError,
    isLoading,
    mutate,
  } = useSWR<PaginatedUsers>(
    token
      ? ([
          `/admin/users/${debouncedQuery ? `?search=${encodeURIComponent(debouncedQuery)}` : ''}`,
          token,
        ] as const)
      : null,
    ([path, tok]: readonly [string, string]) => adminGet<PaginatedUsers>(path, tok),
    { revalidateOnFocus: false },
  )

  // ── helpers ──────────────────────────────────────────

  function patchItem(id: string, patch: Partial<ItemUIState>) {
    setUiStates((prev) => {
      const existing = prev[id] ?? {
        suspendLoading: false,
        roleLoading: false,
        error: null,
        optimisticActive: null,
        optimisticRole: null,
      }
      return { ...prev, [id]: { ...existing, ...patch } }
    })
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)
  }

  const handleSuspendClick = useCallback((user: AdminUser) => {
    const name = `${user.first_name} ${user.last_name}`.trim() || user.email
    setConfirmation({ kind: 'suspend', userId: user.id, userName: name })
  }, [])

  const handleUnsuspendClick = useCallback((user: AdminUser) => {
    const name = `${user.first_name} ${user.last_name}`.trim() || user.email
    setConfirmation({ kind: 'unsuspend', userId: user.id, userName: name })
  }, [])

  const handleRoleChangeRequest = useCallback((user: AdminUser, newRole: UserRole) => {
    const name = `${user.first_name} ${user.last_name}`.trim() || user.email
    setConfirmation({ kind: 'role', userId: user.id, userName: name, newRole })
  }, [])

  function cancelConfirmation() {
    setConfirmation(null)
  }

  async function executeConfirmation() {
    if (!confirmation) return
    const { kind, userId, newRole } = confirmation
    setConfirmation(null)

    if (kind === 'suspend') {
      patchItem(userId, { suspendLoading: true, error: null })
      try {
        await adminPost(`/admin/users/${userId}/suspend/`, token)
        patchItem(userId, { suspendLoading: false, optimisticActive: false })
        await mutate()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        patchItem(userId, { suspendLoading: false, error: message })
      }
    } else if (kind === 'unsuspend') {
      patchItem(userId, { suspendLoading: true, error: null })
      try {
        await adminPost(`/admin/users/${userId}/unsuspend/`, token)
        patchItem(userId, { suspendLoading: false, optimisticActive: true })
        await mutate()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        patchItem(userId, { suspendLoading: false, error: message })
      }
    } else if (kind === 'role' && newRole) {
      patchItem(userId, { roleLoading: true, error: null })
      try {
        await adminPatch(`/admin/users/${userId}/role/`, token, { role: newRole })
        patchItem(userId, { roleLoading: false, optimisticRole: newRole })
        await mutate()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        patchItem(userId, { roleLoading: false, error: message })
      }
    }
  }

  // ── derived ──────────────────────────────────────────

  const users = usersData?.results ?? []
  const totalCount = usersData?.count ?? usersData?.results.length ?? 0

  // ── render ───────────────────────────────────────────

  return (
    <div className="dash-layout" dir="rtl">
      {confirmation && (
        <ConfirmDialog
          confirmation={confirmation}
          onConfirm={() => void executeConfirmation()}
          onCancel={cancelConfirmation}
        />
      )}

      <AdminSidebar locale={locale} />

      <div className="dash-wrap">
        {/* Page header */}
        <header className="dash-head">
          <div>
            <div className="num-tag">§ ADMIN · USER MANAGEMENT · LIVE</div>
            <h1>
              المستخدمون <em>Users</em>
            </h1>
          </div>
          <div className="head-actions">
            <span className="pill-status ok" style={{ fontSize: 12, padding: '6px 14px' }}>
              {isLoading ? '—' : `${totalCount} TOTAL`}
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
          MANAGE USER ACCOUNTS · SUSPEND, UNSUSPEND, AND REASSIGN ROLES · ALL ACTIONS ARE LOGGED
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--sand)',
              border: '1px solid var(--rule)',
              padding: '10px 16px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--ff-mono)',
                fontSize: 11,
                color: 'var(--muted)',
                letterSpacing: '0.08em',
              }}
            >
              SEARCH
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="البحث بالبريد الإلكتروني..."
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontFamily: 'var(--ff-sans)',
                fontSize: 14,
                color: 'var(--ink)',
                outline: 'none',
                direction: 'rtl',
              }}
              aria-label="Search users by email"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setDebouncedQuery('')
                }}
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 11,
                  color: 'var(--muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading && <LoadingState />}
        {!isLoading && fetchError instanceof Error && (
          <ErrorState message={fetchError.message} />
        )}
        {!isLoading && !fetchError && users.length === 0 && <EmptyState />}
        {!isLoading && !fetchError && users.length > 0 && (
          <>
            <UserTable
              users={users}
              uiStates={uiStates}
              onSuspendClick={handleSuspendClick}
              onUnsuspendClick={handleUnsuspendClick}
              onRoleChangeRequest={handleRoleChangeRequest}
            />

            {usersData?.has_more && (
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
                  SHOWING {users.length} OF {totalCount} · MORE AVAILABLE
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
            NO ADMIN TOKEN · Set <code>localStorage.admin_token</code> to a valid JWT to load users.
          </div>
        )}
      </div>
    </div>
  )
}
