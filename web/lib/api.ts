/**
 * Thin API client for SeaConnect backend.
 *
 * - Base URL resolved from NEXT_PUBLIC_API_URL environment variable.
 * - Attaches Authorization: Bearer {token} header when a token is available.
 * - JWT tokens are stored in an in-memory store (ADR-009: never in localStorage).
 *   On page reload tokens are lost and the user must re-authenticate;
 *   the refresh token flow is handled by the auth module at login time.
 * - All non-2xx responses are thrown as ApiError instances so callers can
 *   pattern-match on error.code.
 */

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010') + '/api/v1'

/** In-memory access token store — never touches localStorage (ADR-009). */
let _accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

/** Structured error returned by the API. */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
    field?: string
  }
}

/** Error thrown for non-2xx responses. */
export class ApiError extends Error {
  public readonly code: string
  public readonly field: string | undefined
  public readonly status: number

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.error.code
    this.field = body.error.field
  }
}

/** Cursor-paginated list response shape (ADR-013). */
export interface PaginatedResponse<T> {
  results: T[]
  next_cursor: string | null
  has_more: boolean
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

/**
 * Core fetch wrapper. Attaches auth header, serialises JSON body,
 * appends query params, and throws ApiError on failure.
 */
async function request<T>(
  path: string,
  { body, params, headers: extraHeaders, ...init }: RequestOptions = {},
): Promise<T> {
  // Build URL with optional query params
  const url = new URL(`${API_BASE_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(extraHeaders as Record<string, string>),
  }

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let errorBody: ApiErrorBody
    try {
      errorBody = (await response.json()) as ApiErrorBody
    } catch {
      errorBody = {
        error: {
          code: 'ERR_UNKNOWN',
          message: response.statusText,
        },
      }
    }
    throw new ApiError(response.status, errorBody)
  }

  // 204 No Content — return empty object
  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}

/** GET request. */
export function get<T>(
  path: string,
  params?: RequestOptions['params'],
): Promise<T> {
  return request<T>(path, { method: 'GET', params })
}

/** POST request. */
export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body })
}

/** PATCH request. */
export function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body })
}

/** PUT request. */
export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body })
}

/** DELETE request. */
export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}
