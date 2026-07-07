import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, Bot, Shield, Info, Moon, Sun, Monitor,
  Globe, Clock, Trash2, BarChart3, Zap, RefreshCw,
  Download, Upload, RotateCcw, Database, Cpu, FileText,
  Layers, Settings, Check, Loader2, AlertTriangle, ChevronRight,
  Wifi, LogOut, Server
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useTheme, Theme } from '@/providers/theme-provider'
import { useAuth } from '@/providers/auth-provider'

// ── Types ──────────────────────────────────────────────────────────────────────
type AIQuality = 'fast' | 'balanced' | 'high'
type AIProvider = 'auto' | 'openai' | 'gemini'

interface UserSettings {
  theme: Theme
  ai_quality: AIQuality
  ai_provider: AIProvider
  auto_retry: boolean
  max_retries: number
  retry_delay_seconds: number
  email_notifications: boolean
  ai_notifications: boolean
  weekly_reports: boolean
  browser_notifications: boolean
  desktop_notifications: boolean
  default_download_format: 'pdf' | 'markdown'
  open_reports_in: 'current' | 'new_tab'
  auto_save_reports: boolean
  auto_backup_reports: boolean
  date_format: string
  project_sorting: string
  default_status_filter: string
  parallel_agents: boolean
  smart_cache: boolean
  background_processing: boolean
  session_timeout: string
  remember_login: boolean
}

const DEFAULTS: UserSettings = {
  theme: 'system',
  ai_quality: 'balanced',
  ai_provider: 'auto',
  auto_retry: true,
  max_retries: 3,
  retry_delay_seconds: 10,
  email_notifications: true,
  ai_notifications: true,
  weekly_reports: false,
  browser_notifications: false,
  desktop_notifications: false,
  default_download_format: 'pdf',
  open_reports_in: 'current',
  auto_save_reports: true,
  auto_backup_reports: true,
  date_format: 'DD/MM/YYYY',
  project_sorting: 'newest',
  default_status_filter: 'all',
  parallel_agents: true,
  smart_cache: true,
  background_processing: true,
  session_timeout: '1h',
  remember_login: true,
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed',
        checked 
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-[0_0_12px_rgba(79,70,229,0.4)]' 
          : 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-md ring-0 transition-transform duration-300',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

function Section({ id, icon: Icon, title, description, children }: {
  id: string; icon: React.ElementType; title: string; description?: string; children: React.ReactNode
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          {title}
        </CardTitle>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  )
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-border" />
}

function SelectField({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[180px]">
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── Save Status Indicator ──────────────────────────────────────────────────────
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed top-4 left-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg border',
        status === 'saving' && 'bg-background border-border text-foreground',
        status === 'saved' && 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300',
        status === 'error' && 'bg-destructive/10 border-destructive/30 text-destructive'
      )}
    >
      {status === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'saved' && <Check className="w-3 h-3" />}
      {status === 'error' && <AlertTriangle className="w-3 h-3" />}
      {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved successfully' : 'Failed to save'}
    </motion.div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'ai-quality', label: 'AI Preferences', icon: Bot },
  { id: 'ai-provider', label: 'AI Provider', icon: Server },
  { id: 'ai-retry', label: 'Retry Config', icon: RefreshCw },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'reports', label: 'Report Preferences', icon: FileText },
  { id: 'project', label: 'Project Preferences', icon: Layers },
  { id: 'performance', label: 'Performance', icon: Cpu },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'data', label: 'Data Management', icon: Database },
  { id: 'about', label: 'About', icon: Info },
]

export default function SettingsPage() {
  const { theme: contextTheme, setTheme: setContextTheme } = useTheme()
  const { user, logout } = useAuth()

  const [settings, setSettings] = useState<UserSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [loggingOut, setLoggingOut] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch settings on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings')
        const fetched = { ...DEFAULTS, ...res.data }
        setSettings(fetched)
        // Sync theme with global ThemeProvider
        if (fetched.theme && fetched.theme !== contextTheme) {
          setContextTheme(fetched.theme as Theme)
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, []) // eslint-disable-line

  // ── Auto-save with debounce and rollback ──────────────────────────────────────
  const persistSetting = useCallback((updates: Partial<UserSettings>, previousState: UserSettings) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current)

    setSaveStatus('saving')

    debounceRef.current = setTimeout(async () => {
      try {
        await api.put('/settings', updates)
        setSaveStatus('saved')
        saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 2500)
      } catch (err) {
        console.error('Failed to save settings:', err)
        setSettings(previousState)
        
        // Revert theme if it was changed
        if (updates.theme && previousState.theme !== contextTheme) {
          setContextTheme(previousState.theme as Theme)
        }
        
        setSaveStatus('error')
        saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 3000)
      }
    }, 800)
  }, [contextTheme, setContextTheme])

  // ── Update handler ────────────────────────────────────────────────────────────
  const update = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      persistSetting({ [key]: value }, prev)
      return next
    })

    // Immediately apply theme via ThemeProvider
    if (key === 'theme') {
      setContextTheme(value as Theme)
    }
  }, [persistSetting, setContextTheme])

  // ── Export / Import / Reset ──────────────────────────────────────────────────
  const handleExportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `startuppilot-settings-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportSettings = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text) as Partial<UserSettings>
        const merged = { ...DEFAULTS, ...imported }
        setSettings(merged)
        persistSetting(merged, settings)
        if (merged.theme) setContextTheme(merged.theme as Theme)
      } catch {
        alert('Invalid settings file. Please select a valid StartupPilot settings export.')
      }
    }
    input.click()
  }

  const handleResetSettings = async () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return
    setSettings(DEFAULTS)
    setContextTheme(DEFAULTS.theme)
    persistSetting(DEFAULTS, settings)
  }

  const handleClearCache = () => {
    try {
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('sp-cache'))
      keysToRemove.forEach(k => localStorage.removeItem(k))
      alert('Local cache cleared successfully.')
    } catch {
      alert('Cache cleared.')
    }
  }

  const handleLogoutAllDevices = async () => {
    if (!confirm('This will terminate all active sessions including your current one. Continue?')) return
    try {
      setLoggingOut(true)
      await api.post('/settings/logout-all-devices')
      await logout()
    } catch (err) {
      console.error('Failed to logout all devices:', err)
      alert('Failed to terminate sessions. Please try again.')
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex gap-8 max-w-6xl animate-in fade-in duration-500">
        <aside className="hidden lg:flex flex-col gap-2 w-52 shrink-0 pt-2">
          <Skeleton className="h-4 w-20 mb-2" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </aside>
        <div className="flex-1 space-y-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="p-6 pb-4">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-72" />
              </div>
              <div className="p-6 pt-0 space-y-6">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-8 max-w-6xl">
      <SaveIndicator status={saveStatus} />

      {/* ── Left sidebar nav ── */}
      <aside className="hidden lg:flex flex-col gap-1 w-52 shrink-0 sticky top-20 h-fit">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Settings</p>
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </a>
        ))}
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 space-y-6 min-w-0">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Application Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure your AI workflow, appearance, and preferences. All changes save automatically.
          </p>
        </motion.div>

        {/* ── 1. Appearance ── */}
        <Section id="appearance" icon={Monitor} title="Appearance">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ] as { value: Theme; label: string; icon: React.ElementType }[]).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update('theme', value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm',
                    settings.theme === value
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-1">Applied instantly across every page, modal, and report viewer.</p>
          </div>
        </Section>

        {/* ── 2. AI Preferences ── */}
        <Section
          id="ai-quality"
          icon={Bot}
          title="AI Preferences"
          description="Controls the quality and depth of every AI-generated report."
        >
          <div className="space-y-2">
            <Label>Analysis Quality</Label>
            <div className="space-y-2">
              {([
                { value: 'fast', label: 'Fast', desc: 'Quick generation · Lower token usage · Reduced API cost', icon: Zap },
                { value: 'balanced', label: 'Balanced', desc: 'Recommended · Best quality-to-speed ratio', icon: BarChart3 },
                { value: 'high', label: 'High Quality', desc: 'Maximum depth · Longest output · Slower generation', icon: Bot },
              ] as { value: AIQuality; label: string; desc: string; icon: React.ElementType }[]).map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update('ai_quality', value)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                    settings.ai_quality === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    settings.ai_quality === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  {settings.ai_quality === value && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 3. AI Provider Settings ── */}
        <Section
          id="ai-provider"
          icon={Server}
          title="AI Provider Settings"
          description="Controls which AI provider handles your analysis requests."
        >
          <div className="space-y-2">
            <Label>Primary AI Provider</Label>
            <div className="space-y-2">
              {([
                { value: 'auto', label: 'Auto (Recommended)', desc: 'Uses configured provider · Automatically switches to backup if quota exceeded or rate-limited · Never fails immediately' },
                { value: 'gemini', label: 'Gemini', desc: 'Always tries Google Gemini first' },
                { value: 'openai', label: 'OpenAI', desc: 'Always tries OpenAI GPT first' },
              ] as { value: AIProvider; label: string; desc: string }[]).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update('ai_provider', value)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                    settings.ai_provider === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className={cn(
                    'w-2.5 h-2.5 rounded-full border-2 shrink-0 transition-all',
                    settings.ai_provider === value ? 'border-primary bg-primary' : 'border-muted-foreground'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {settings.ai_provider === 'auto' && (
              <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
                <Wifi className="w-3 h-3 inline mr-1" />
                Auto mode will display "Automatically switched to backup AI provider." if a failover occurs during generation.
              </div>
            )}
          </div>
        </Section>

        {/* ── 4. AI Retry Configuration ── */}
        <Section id="ai-retry" icon={RefreshCw} title="AI Retry Configuration">
          <Row label="Automatic Retry" description="Retry failed agents automatically before reporting an error">
            <Toggle checked={settings.auto_retry} onChange={v => update('auto_retry', v)} />
          </Row>
          <Divider />
          <Row label="Maximum Retry Attempts" description="How many times to retry a failed agent">
            <SelectField
              value={settings.max_retries.toString()}
              onChange={v => update('max_retries', parseInt(v))}
              options={[
                { value: '1', label: '1 attempt' },
                { value: '2', label: '2 attempts' },
                { value: '3', label: '3 attempts (default)' },
                { value: '5', label: '5 attempts' },
              ]}
            />
          </Row>
          <Divider />
          <Row label="Retry Delay" description="How long to wait between retry attempts">
            <SelectField
              value={settings.retry_delay_seconds.toString()}
              onChange={v => update('retry_delay_seconds', parseInt(v))}
              options={[
                { value: '5', label: '5 seconds' },
                { value: '10', label: '10 seconds (default)' },
                { value: '30', label: '30 seconds' },
              ]}
            />
          </Row>
        </Section>

        {/* ── 5. Notifications ── */}
        <Section id="notifications" icon={Bell} title="Notifications">
          <Row label="Email Notifications" description="Receive project updates and alerts via email">
            <Toggle checked={settings.email_notifications} onChange={v => update('email_notifications', v)} />
          </Row>
          <Divider />
          <Row label="AI Analysis Notifications" description="Get notified when analysis starts, completes, or fails">
            <Toggle checked={settings.ai_notifications} onChange={v => update('ai_notifications', v)} />
          </Row>
          <Divider />
          <Row label="Weekly Reports" description="Receive a weekly digest of your project insights">
            <Toggle checked={settings.weekly_reports} onChange={v => update('weekly_reports', v)} />
          </Row>
          <Divider />
          <Row label="Browser Notifications" description="Show browser push notifications for key events">
            <Toggle checked={settings.browser_notifications} onChange={v => update('browser_notifications', v)} />
          </Row>
          <Divider />
          <Row label="Desktop Notifications" description="Show desktop notifications when the browser is minimized">
            <Toggle checked={settings.desktop_notifications} onChange={v => update('desktop_notifications', v)} />
          </Row>
        </Section>

        {/* ── 6. Report Preferences ── */}
        <Section id="reports" icon={FileText} title="Report Preferences">
          <Row label="Default Download Format" description="Format used when downloading reports">
            <SelectField
              value={settings.default_download_format}
              onChange={v => update('default_download_format', v as any)}
              options={[
                { value: 'pdf', label: 'PDF (default)' },
                { value: 'markdown', label: 'Markdown' },
              ]}
            />
          </Row>
          <Divider />
          <Row label="Open Reports In" description="Where to open a report when clicking View Report">
            <SelectField
              value={settings.open_reports_in}
              onChange={v => update('open_reports_in', v as any)}
              options={[
                { value: 'current', label: 'Current tab' },
                { value: 'new_tab', label: 'New tab' },
              ]}
            />
          </Row>
          <Divider />
          <Row label="Auto-Save Generated Reports" description="Automatically save reports after AI generation completes">
            <Toggle checked={settings.auto_save_reports} onChange={v => update('auto_save_reports', v)} />
          </Row>
          <Divider />
          <Row label="Auto-Backup Reports" description="Keep previous versions when a report is regenerated">
            <Toggle checked={settings.auto_backup_reports} onChange={v => update('auto_backup_reports', v)} />
          </Row>
        </Section>

        {/* ── 7. Project Preferences ── */}
        <Section id="project" icon={Layers} title="Project Preferences">
          <Row label="Default Country" description="All projects are India-only">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> India
              <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">Locked</span>
            </span>
          </Row>
          <Divider />
          <Row label="Default Currency" description="StartupPilot AI supports INR only">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              ₹ Indian Rupee (INR)
              <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">Locked</span>
            </span>
          </Row>
          <Divider />
          <Row label="Date Format">
            <SelectField
              value={settings.date_format}
              onChange={v => update('date_format', v)}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]}
            />
          </Row>
          <Divider />
          <Row label="Project Sorting" description="Default order when viewing your project list">
            <SelectField
              value={settings.project_sorting}
              onChange={v => update('project_sorting', v)}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'alphabetical', label: 'Alphabetical' },
                { value: 'last_updated', label: 'Last Updated' },
              ]}
            />
          </Row>
          <Divider />
          <Row label="Default Status Filter" description="Pre-selected filter on the Projects page">
            <SelectField
              value={settings.default_status_filter}
              onChange={v => update('default_status_filter', v)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'draft', label: 'Draft' },
                { value: 'processing', label: 'Processing' },
                { value: 'completed', label: 'Completed' },
                { value: 'partial', label: 'Partial' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
          </Row>
        </Section>

        {/* ── 8. Performance ── */}
        <Section id="performance" icon={Cpu} title="Performance">
          <Row
            label="Parallel Agent Execution"
            description="After Research completes, run Competitor, Business Plan, Finance & Marketing simultaneously"
          >
            <Toggle checked={settings.parallel_agents} onChange={v => update('parallel_agents', v)} />
          </Row>
          <Divider />
          <Row label="Enable Smart Cache" description="Cache AI responses to avoid redundant API calls for similar inputs">
            <Toggle checked={settings.smart_cache} onChange={v => update('smart_cache', v)} />
          </Row>
          <Divider />
          <Row
            label="Enable Background Processing"
            description="Continue AI analysis even when you navigate to other pages"
          >
            <Toggle checked={settings.background_processing} onChange={v => update('background_processing', v)} />
          </Row>
        </Section>

        {/* ── 9. Security ── */}
        <Section id="security" icon={Shield} title="Security">
          <Row label="Session Timeout" description="Automatically log out after a period of inactivity">
            <SelectField
              value={settings.session_timeout}
              onChange={v => update('session_timeout', v)}
              options={[
                { value: '15m', label: '15 minutes' },
                { value: '30m', label: '30 minutes' },
                { value: '1h', label: '1 hour' },
                { value: 'never', label: 'Never' },
              ]}
            />
          </Row>
          <Divider />
          <Row label="Remember Login" description="Stay logged in across browser restarts">
            <Toggle checked={settings.remember_login} onChange={v => update('remember_login', v)} />
          </Row>
          <Divider />
          <Row label="Logout From All Devices" description="Immediately invalidates all active sessions, including this one">
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1.5"
              onClick={handleLogoutAllDevices}
              disabled={loggingOut}
            >
              {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              {loggingOut ? 'Logging out...' : 'Logout All Devices'}
            </Button>
          </Row>
        </Section>

        {/* ── 10. Data Management ── */}
        <Section id="data" icon={Database} title="Data Management">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={handleExportSettings}>
              <Download className="w-4 h-4" />
              Export Settings
              <span className="ml-auto text-xs text-muted-foreground">.json</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={handleImportSettings}>
              <Upload className="w-4 h-4" />
              Import Settings
            </Button>
            <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={handleResetSettings}>
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </Button>
            <Button variant="outline" size="sm" className="gap-2 justify-start" onClick={handleClearCache}>
              <Trash2 className="w-4 h-4" />
              Clear Local Cache
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export saves all application settings as a JSON file. Import restores them. Reset returns all settings to factory defaults.
          </p>
        </Section>

        {/* ── 11. About ── */}
        <Section id="about" icon={Info} title="About StartupPilot AI">
          <div className="space-y-0.5 rounded-xl border border-border overflow-hidden">
            {[
              { label: 'Application', value: 'StartupPilot AI' },
              { label: 'Version', value: '1.0.0' },
              { label: 'Build', value: import.meta.env.VITE_BUILD_DATE || new Date().toLocaleDateString('en-IN') },
              { label: 'Environment', value: import.meta.env.MODE || 'production' },
              { label: 'Primary AI', value: 'Google Gemini + OpenAI GPT Fallback' },
              { label: 'Database', value: 'Supabase PostgreSQL' },
              { label: 'Backend', value: 'FastAPI + Python' },
              { label: 'Frontend', value: 'React + Vite + TypeScript' },
            ].map(({ label, value }, i) => (
              <div
                key={label}
                className={cn(
                  'flex items-center justify-between px-4 py-2.5 text-sm',
                  i % 2 === 0 ? 'bg-muted/30' : 'bg-background'
                )}
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground font-mono text-xs">{value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <a href="mailto:support@startuppilot.ai" className="text-xs text-primary hover:underline flex items-center gap-1">
              Contact Support <ChevronRight className="w-3 h-3" />
            </a>
            <span className="text-muted-foreground text-xs">·</span>
            <a href="#" className="text-xs text-muted-foreground hover:underline">Privacy Policy</a>
            <span className="text-muted-foreground text-xs">·</span>
            <a href="#" className="text-xs text-muted-foreground hover:underline">Terms of Service</a>
          </div>
        </Section>
      </div>
    </div>
  )
}
