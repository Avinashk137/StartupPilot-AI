import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Dev-mode diagnostics ──────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[Supabase] Missing environment variables.\n' +
      '  Create frontend/.env.local with:\n' +
      '    VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
      '    VITE_SUPABASE_ANON_KEY=sb_publishable_...\n' +
      '  Auth features will be unavailable until these are set.',
    )
  } else {
    console.log(
      '[Supabase] Connecting to project:',
      supabaseUrl,
      '| Key prefix:',
      supabaseAnonKey.substring(0, 16) + '...',
    )
  }
}

// ── Client creation ───────────────────────────────────────────────────────────
// If env vars are missing, create the client with placeholder values that will
// fail gracefully on actual API calls — this prevents a white-screen crash on
// app startup and allows the AuthProvider to show a helpful error instead.
const _url = supabaseUrl || 'https://placeholder.supabase.co'
const _key = supabaseAnonKey || 'placeholder-key'

export const supabase = createClient(_url, _key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Export a flag so components can check if Supabase is properly configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
