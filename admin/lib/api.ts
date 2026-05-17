/**
 * Thin API client for the admin portal.
 * All requests are sent to the Django backend (NEXT_PUBLIC_API_URL).
 * Authentication is via Bearer token stored in localStorage under 'admin_token'.
 *
 * Security note: server-side role enforcement lives on the Django API — the
 * bearer token is validated and the admin role is checked on every request.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'

// ── Shared response shapes ────────────────────────────

/**
 * Generic paginated list response matching the Django CursorPagination shape
 * used across all SeaConnect list endpoints.
 */
export interface PaginatedResponse<T> {
  results: T[]
  next_cursor: string | null
  has_more: boolean
  /** Present on some endpoints (e.g. admin/users/) as a total record count. */
  count?: number
}

export async function adminGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export async function adminPost<T>(path: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export async function adminPatch<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json() as Promise<T>
}
