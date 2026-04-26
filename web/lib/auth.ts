/**
 * SeaConnect Auth Context
 *
 * Provides user authentication state and actions via React Context.
 *
 * ADR-009: JWT access token stored in module-level memory only — never in
 * localStorage, sessionStorage, or cookies accessible from JS.
 *
 * The token lives in lib/api.ts (_accessToken). This module owns the User
 * state and exposes login / register / logout actions that update both the
 * token store and the React context.
 */

'use client'

import * as React from 'react'
import { post, get, setAccessToken, getAccessToken } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRole = 'customer' | 'owner' | 'admin'

export interface AuthUser {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: UserRole
  is_verified: boolean
  preferred_lang: 'ar' | 'en'
  region: string | null
}

export interface RegisterPayload {
  first_name: string
  last_name: string
  email: string
  password: string
  role: 'customer' | 'owner'
}

interface LoginResponse {
  access: string
  refresh: string
}

interface RegisterResponse {
  user: AuthUser
  tokens: {
    access: string
    refresh: string
  }
}

// ---------------------------------------------------------------------------
// In-memory refresh token store — module level, never in storage (ADR-009)
// ---------------------------------------------------------------------------

let _refreshToken: string | null = null

function setRefreshToken(token: string | null): void {
  _refreshToken = token
}

function getRefreshToken(): string | null {
  return _refreshToken
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** Authenticated user or null when not logged in. */
  user: AuthUser | null
  /** True while the initial auth check or an auth action is in progress. */
  isLoading: boolean
  /** Login with email and password. Throws ApiError on failure. */
  login: (email: string, password: string) => Promise<void>
  /** Register a new user. Throws ApiError on failure. */
  register: (payload: RegisterPayload) => Promise<void>
  /** Log out the current user and clear the token. */
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * AuthProvider wraps the application and provides authentication state.
 *
 * On mount it checks whether an in-memory access token already exists
 * (e.g. the page has not been refreshed) and loads the user profile if so.
 * Because the token is in memory, a full page reload always clears auth state
 * and requires the user to log in again — this is by design (ADR-009).
 */
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(true)

  // On first mount: if a token is already present in the module store (possible
  // during HMR in development), try to load the user profile.
  React.useEffect(() => {
    const token = getAccessToken()
    if (token) {
      get<AuthUser>('/users/me/')
        .then((profile) => setUser(profile))
        .catch(() => {
          setAccessToken(null)
          setRefreshToken(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = React.useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true)
      try {
        const response = await post<LoginResponse>('/auth/login/', {
          email,
          password,
        })
        setAccessToken(response.access)
        setRefreshToken(response.refresh)

        // Fetch the full user profile after a successful login
        const profile = await get<AuthUser>('/users/me/')
        setUser(profile)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const register = React.useCallback(
    async (payload: RegisterPayload): Promise<void> => {
      setIsLoading(true)
      try {
        const response = await post<RegisterResponse>('/auth/register/', payload)
        setAccessToken(response.tokens.access)
        setRefreshToken(response.tokens.refresh)
        setUser(response.user)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const logout = React.useCallback(async (): Promise<void> => {
    const refresh = getRefreshToken()
    if (refresh) {
      try {
        // Blacklist the refresh token server-side (best-effort)
        await post('/auth/logout/', { refresh })
      } catch {
        // Non-fatal — clear client state regardless
      }
    }
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
  }, [])

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useAuth returns the current AuthContext value.
 *
 * Must be called inside a component tree wrapped by <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
