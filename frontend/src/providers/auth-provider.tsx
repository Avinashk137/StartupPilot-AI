import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import api from '@/lib/api'

// Whether to emit verbose auth debug logs to the browser console
const AUTH_DEBUG = import.meta.env.DEV

// How many times to try the health check before showing a "taking long" message
const MAX_QUICK_ATTEMPTS = 10   // 0–30 seconds (every 3 seconds)
const MAX_TOTAL_ATTEMPTS = 40   // ~2 minutes total

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
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const axiosErr = err as {
      response?: { data?: { detail?: string; error?: string; message?: string }; status?: number }
      message?: string
      code?: string
    }

    const detail = axiosErr.response?.data?.detail
    if (detail && typeof detail === 'string') return detail

    const error = axiosErr.response?.data?.error
    if (error && typeof error === 'string') return error

    const message = axiosErr.response?.data?.message
    if (message && typeof message === 'string') return message

    if (!axiosErr.response) {
      return 'Cannot reach backend'
    }

    const status = axiosErr.response?.status
    if (status === 401) return 'Invalid credentials. Please check your email and password.'
    if (status === 403) return 'Access denied. You do not have permission.'
    if (status === 422) return 'Validation error. Please check your input.'
    if (status === 500) return 'Server error. Please try again later.'
    if (status === 502 || status === 503 || status === 504) return 'Backend temporarily unavailable'
  }
  return fallback
}

// ── Backend Splash Screen ──────────────────────────────────────────────────────

function BackendLoadingScreen({ attempt, maxAttempts }: { attempt: number; maxAttempts: number }) {
  const isLate = attempt > MAX_QUICK_ATTEMPTS
  const isFailed = attempt >= maxAttempts

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#e2e8f0',
        gap: '32px',
        padding: '24px',
      }}
    >
      {/* Animated logo */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            opacity: 0.25,
            animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(99,102,241,0.4)',
          }}
        >
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity={0.9} />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
          StartupPilot AI
        </h1>
        <p style={{ color: '#94a3b8', marginTop: 8, fontSize: 15 }}>
          Autonomous Business Builder
        </p>
      </div>

      {/* Status message */}
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '20px 32px',
          textAlign: 'center',
          maxWidth: 400,
        }}
      >
        {isFailed ? (
          <>
            <p style={{ color: '#f87171', fontWeight: 600, margin: 0 }}>
              ⚠️ Backend Unreachable
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
              Could not connect after {maxAttempts} attempts.
              <br />
              Make sure the backend server is running:
            </p>
            <code
              style={{
                display: 'block',
                marginTop: 12,
                padding: '8px 16px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 6,
                fontSize: 12,
                color: '#a5f3fc',
              }}
            >
              npm run dev
            </code>
          </>
        ) : (
          <>
            <p style={{ color: '#a5b4fc', fontWeight: 600, margin: 0 }}>
              {isLate ? '⏳ Backend is starting up...' : '🔄 Connecting to backend...'}
            </p>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
              {isLate
                ? 'This is taking longer than usual. The server may be cold-starting.'
                : 'Waiting for the API server to become ready.'}
            </p>
            {/* Progress bar */}
            <div
              style={{
                marginTop: 16,
                height: 4,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min((attempt / maxAttempts) * 100, 95)}%`,
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  borderRadius: 2,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>
              Attempt {attempt} / {maxAttempts}
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBackendReady, setIsBackendReady] = useState(false)
  const attemptRef = useRef(0)
  const [attempt, setAttempt] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const baseURL = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace('/v1', '')
        : '/api'
      const res = await fetch(`${baseURL}/health`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return false
      const data = await res.json()
      // Accept both "healthy" and "degraded" — degraded means DB is up but AI keys may be missing
      return data.status === 'healthy' || data.status === 'degraded'
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      attemptRef.current += 1
      const n = attemptRef.current
      if (!cancelled) setAttempt(n)

      if (n > MAX_TOTAL_ATTEMPTS) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        return
      }

      const healthy = await checkHealth()
      if (healthy && !cancelled) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setIsBackendReady(true)
        if (AUTH_DEBUG) console.log('[Auth] Backend ready after', n, 'attempts')
      }
    }

    // Immediate first check
    poll()
    // Then poll every 3 seconds
    intervalRef.current = setInterval(poll, 3000)

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [checkHealth])

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

  // Restore session on mount once backend is ready
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
      if (AUTH_DEBUG) console.log('[Auth] Email confirmation required')
      return { emailConfirmationRequired: true, message: data.message }
    }

    sessionStorage.setItem('access_token', data.access_token)
    sessionStorage.setItem('refresh_token', data.refresh_token)
    setUser(data.user as User)
    if (AUTH_DEBUG) console.log('[Auth] Register complete — user logged in immediately')
    return {}
  }

  const logout = async (): Promise<void> => {
    if (AUTH_DEBUG) console.log('[Auth] Logging out...')
    try {
      await api.post('/auth/logout')
      if (AUTH_DEBUG) console.log('[Auth] Server-side logout successful')
    } catch (err) {
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

  // Show branded loading screen while waiting for backend
  if (!isBackendReady) {
    return <BackendLoadingScreen attempt={attempt} maxAttempts={MAX_TOTAL_ATTEMPTS} />
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
