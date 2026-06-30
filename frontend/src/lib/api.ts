import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

// ── Dev-mode logging ─────────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  console.log('[API] Base URL:', BASE_URL)
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// ── Auth endpoint paths that must NOT trigger the token-refresh interceptor ──
const AUTH_ONLY_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
]

function isAuthOnlyPath(url: string | undefined): boolean {
  if (!url) return false
  return AUTH_ONLY_PATHS.some((p) => url.includes(p))
}

// ── Request Interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (import.meta.env.DEV) {
      console.log(
        `[API] ${config.method?.toUpperCase()} ${config.url}`,
        token ? '(auth)' : '(no-auth)',
      )
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor: handle 401 & token refresh ────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(
        `[API] ✓ ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`,
      )
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Never try to refresh tokens for auth-only endpoints —
    // these are expected to sometimes return 401 (wrong credentials, etc.)
    if (isAuthOnlyPath(originalRequest?.url)) {
      if (import.meta.env.DEV) {
        console.warn(
          `[API] ✗ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} → ${error.response?.status}`,
          error.response?.data,
        )
      }
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh is done
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        isRefreshing = false
        processQueue(error, null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        const { access_token, refresh_token: new_refresh } = response.data
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', new_refresh)
        api.defaults.headers.common.Authorization = `Bearer ${access_token}`
        processQueue(null, access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
