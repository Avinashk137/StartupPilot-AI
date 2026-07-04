import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const resolved = theme === 'system' ? getSystemTheme() : theme
  root.classList.toggle('dark', resolved === 'dark')
  return resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read from localStorage for instant (no-flicker) application on mount
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('sp-theme') as Theme) || 'system'
    } catch {
      return 'system'
    }
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    applyTheme((localStorage.getItem('sp-theme') as Theme) || 'system')
  )

  // Apply theme whenever it changes
  useEffect(() => {
    const resolved = applyTheme(theme)
    setResolvedTheme(resolved)
    try {
      localStorage.setItem('sp-theme', theme)
    } catch {}
  }, [theme])

  // Listen to system preference changes when theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const resolved = applyTheme('system')
      setResolvedTheme(resolved)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
