import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'

// Whether to emit verbose auth debug logs to the browser console
const AUTH_DEBUG = import.meta.env.DEV
// ── Types ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string           // UUID from Supabase
  email: string
  full_name: string
  role: string
  avatar_url: string | null
  bio: string | null
  company: string | null
  phone: string | null
  created_at: string | null
  last_sign_in_at: string | null
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    full_name: string
  ) => Promise<{ emailConfirmationRequired?: boolean; message?: string }>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<string>
  refreshUser: () => Promise<void>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extract a meaningful error message from an Axios error.
 * Tries the backend's { error: "..." } shape first, then falls back
 * to network-level messages.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const axiosErr = err as {
      response?: { data?: { detail?: string; error?: string; message?: string }; status?: number }
      message?: string
      code?: string
    }

    // Backend returns { detail: "..." } via FastAPI HTTPException handler
    const detail = axiosErr.response?.data?.detail
    if (detail && typeof detail === 'string') return detail

    // Backend might return { error: "..." }
    const error = axiosErr.response?.data?.error
    if (error && typeof error === 'string') return error

    // Backend might return { message: "..." }
    const message = axiosErr.response?.data?.message
    if (message && typeof message === 'string') return message

    // Network-level error (no response from server)
    if (!axiosErr.response) {
      return 'Backend unavailable'
    }

    // HTTP status-specific fallbacks
    const status = axiosErr.response?.status
    if (status === 401) return 'Invalid credentials. Please check your email and password.'
    if (status === 403) return 'Access denied. You do not have permission.'
    if (status === 422) return 'Validation error. Please check your input.'
    if (status === 500) return 'Server error. Please try again later.'
    if (status === 502 || status === 503 || status === 504) return 'Backend unavailable'
  }
  return fallback
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBackendReady, setIsBackendReady] = useState(false)
  const [healthMessage, setHealthMessage] = useState('Backend starting...')

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    const checkHealth = async () => {
      try {
        const baseURL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/v1', '') : '/api'
        const res = await fetch(`${baseURL}/health`)
        if (!res.ok) throw new Error('Not okay')
        const data = await res.json()
        if (data.status === 'healthy') {
          setIsBackendReady(true)
          if (interval) clearInterval(interval)
        } else {
          setHealthMessage('Backend unavailable')
        }
      } catch (err) {
        setHealthMessage('Backend unavailable')
      }
    }

    if (!isBackendReady) {
      checkHealth()
      interval = setInterval(checkHealth, 3000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isBackendReady])

  const fetchUser = useCallback(async () => {
    try {
      if (AUTH_DEBUG) console.log('[Auth] Fetching current user via /auth/me...')
      const { data } = await api.get('/auth/me')
      if (AUTH_DEBUG) console.log('[Auth] User fetched:', data.data?.email, data.data?.id)
      setUser(data.data as User)
    } catch (err) {
      if (AUTH_DEBUG) console.warn('[Auth] fetchUser failed:', err)
      setUser(null)
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('refresh_token')
    }
  }, [])

  // Restore session on mount if a token exists in sessionStorage
  useEffect(() => {
    if (!isBackendReady) return
    const token = sessionStorage.getItem('access_token')
    if (AUTH_DEBUG) {
      console.log('[Auth] Initializing — stored access_token:', token ? `${token.substring(0, 20)}...` : 'none')
    }
    if (token) {
      fetchUser().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [fetchUser, isBackendReady])

  const login = async (email: string, password: string): Promise<void> => {
    if (AUTH_DEBUG) console.log('[Auth] Login attempt:', email)
    const { data } = await api.post('/auth/login', { email, password })
    if (AUTH_DEBUG) {
      console.log('[Auth] Login response:', {
        has_access_token: !!data.access_token,
        access_token_len: data.access_token?.length,
        has_refresh_token: !!data.refresh_token,
        user_id: data.user?.id,
        user_email: data.user?.email,
      })
    }
    sessionStorage.setItem('access_token', data.access_token)
    sessionStorage.setItem('refresh_token', data.refresh_token)
    setUser(data.user as User)
    if (AUTH_DEBUG) console.log('[Auth] Login complete — tokens stored, user set')
  }

  const register = async (
    email: string,
    password: string,
    full_name: string
  ): Promise<{ emailConfirmationRequired?: boolean; message?: string }> => {
    if (AUTH_DEBUG) console.log('[Auth] Register attempt:', email, full_name)
    const { data } = await api.post('/auth/register', { email, password, full_name })
    if (AUTH_DEBUG) console.log('[Auth] Register response:', data)

    if (data.email_confirmation_required) {
      // Email confirmation is enabled — user needs to verify email before logging in
      if (AUTH_DEBUG) console.log('[Auth] Email confirmation required')
      return { emailConfirmationRequired: true, message: data.message }
    }

    // Email confirmation disabled — user is logged in immediately
    sessionStorage.setItem('access_token', data.access_token)
    sessionStorage.setItem('refresh_token', data.refresh_token)
    setUser(data.user as User)
    if (AUTH_DEBUG) console.log('[Auth] Register complete — user logged in immediately')
    return {}
  }

  const logout = async (): Promise<void> => {
    if (AUTH_DEBUG) console.log('[Auth] Logging out...')
    try {
      // Call server to invalidate the Supabase session
      await api.post('/auth/logout')
      if (AUTH_DEBUG) console.log('[Auth] Server-side logout successful')
    } catch (err) {
      // Non-critical — local state is cleared regardless
      console.warn('[Auth] Server-side logout failed (session still cleared locally)', err)
    } finally {
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('refresh_token')
      setUser(null)
      if (AUTH_DEBUG) console.log('[Auth] Local session cleared, redirecting to /login')
      window.location.href = '/login'
    }
  }

  const forgotPassword = async (email: string): Promise<string> => {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data.message as string
  }

  const refreshUser = async (): Promise<void> => {
    await fetchUser()
  }

  if (!isBackendReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xl font-medium text-muted-foreground animate-pulse">{healthMessage}</p>
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        forgotPassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
