import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  User, Bell, Bot, Shield, Info, Moon, Sun, Monitor,
  ChevronRight, Globe, DollarSign, Clock, Trash2, Mail,
  KeyRound, BarChart3, Zap, RefreshCw, MessageSquare, AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'

// ── Types ──────────────────────────────────────────────────────────────────
type Theme = 'light' | 'dark' | 'system'
type AIQuality = 'fast' | 'balanced' | 'high'

// ── Toggle Switch ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
        checked ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// ── Section Wrapper ────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

// ── Settings Row ───────────────────────────────────────────────────────────
function SettingsRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Main Settings Page ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, logout, forgotPassword } = useAuth()

  // Profile state
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [resetEmailSending, setResetEmailSending] = useState(false)

  // Preferences state  
  const [theme, setTheme] = useState<Theme>('system')
  const [currency, setCurrency] = useState('INR')
  const [timezone, setTimezone] = useState('Asia/Kolkata')

  // Notifications state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [aiAnalysisNotifications, setAiAnalysisNotifications] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(false)

  // AI Preferences state
  const [aiQuality, setAiQuality] = useState<AIQuality>('balanced')
  const [autoRetry, setAutoRetry] = useState(true)
  const [autoResume, setAutoResume] = useState(true)

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileError(null)
    try {
      await api.put('/auth/profile', { full_name: fullName })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (err: any) {
      setProfileError(err?.response?.data?.detail || err?.message || 'Failed to save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSendResetEmail = async () => {
    if (!user?.email) return
    setResetEmailSending(true)
    try {
      await forgotPassword(user.email)
      setResetEmailSent(true)
      setTimeout(() => setResetEmailSent(false), 5000)
    } catch (err: any) {
      console.error('Failed to send reset email:', err)
    } finally {
      setResetEmailSending(false)
    }
  }

  const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  const AI_QUALITY_OPTIONS: { value: AIQuality; label: string; desc: string; icon: React.ElementType }[] = [
    { value: 'fast', label: 'Fast', desc: 'Quick results, lower detail', icon: Zap },
    { value: 'balanced', label: 'Balanced', desc: 'Best quality/speed ratio', icon: BarChart3 },
    { value: 'high', label: 'High Quality', desc: 'Maximum depth, slower', icon: Bot },
  ]

  const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD', 'AUD']

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and application preferences</p>
      </motion.div>

      {/* ── Profile ── */}
      <Section icon={User} title="Profile">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact support if needed.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveProfile} size="sm" className="gap-1.5" disabled={profileSaving}>
              {profileSaving ? 'Saving...' : profileSaved ? '✓ Saved!' : 'Save Profile'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowChangePassword(!showChangePassword)}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Change Password
            </Button>
          </div>
          {showChangePassword && (
            <div className="p-3 rounded-lg bg-muted space-y-2 text-sm">
              <p className="text-muted-foreground">
                A password reset link will be sent to{' '}
                <span className="font-medium text-foreground">{user?.email}</span>.
              </p>
              <Button size="sm" variant="outline" onClick={handleSendResetEmail} disabled={resetEmailSending || resetEmailSent}>
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                {resetEmailSending ? 'Sending...' : resetEmailSent ? '✓ Email Sent!' : 'Send Reset Email'}
              </Button>
            </div>
          )}
        </div>
      </Section>

      {/* ── Preferences ── */}
      <Section icon={Monitor} title="Preferences">
        <div className="space-y-4">
          {/* Theme */}
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-sm',
                    theme === value
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <Label htmlFor="currency" className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Default Currency
            </Label>
            <div className="relative">
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-lg border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <Label htmlFor="timezone" className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time Zone
            </Label>
            <div className="relative">
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-lg border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Asia/Kolkata">India Standard Time (IST)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                <option value="Europe/Berlin">Central European Time (CET)</option>
                <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                <option value="Asia/Singapore">Singapore Time (SGT)</option>
                <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                <option value="Australia/Sydney">Australian Eastern Time (AEST)</option>
              </select>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Notifications ── */}
      <Section icon={Bell} title="Notifications">
        <SettingsRow
          label="Email Notifications"
          description="Receive project updates and alerts via email"
        >
          <Toggle checked={emailNotifications} onChange={setEmailNotifications} />
        </SettingsRow>
        <div className="border-t border-border" />
        <SettingsRow
          label="AI Analysis Notifications"
          description="Get notified when analysis starts, completes, or fails"
        >
          <Toggle checked={aiAnalysisNotifications} onChange={setAiAnalysisNotifications} />
        </SettingsRow>
        <div className="border-t border-border" />
        <SettingsRow
          label="Weekly Reports"
          description="Receive a weekly digest of your project insights"
        >
          <Toggle checked={weeklyReports} onChange={setWeeklyReports} />
        </SettingsRow>
      </Section>

      {/* ── AI Preferences ── */}
      <Section icon={Bot} title="AI Preferences">
        {/* Quality */}
        <div className="space-y-2">
          <Label>Analysis Quality</Label>
          <div className="space-y-2">
            {AI_QUALITY_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAiQuality(value)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all',
                  aiQuality === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  aiQuality === value ? 'gradient-brand text-white' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                {aiQuality === value && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border" />

        <SettingsRow
          label="Auto-Retry Failed Analysis"
          description="Automatically retry if an AI provider fails or rate-limits"
        >
          <Toggle checked={autoRetry} onChange={setAutoRetry} />
        </SettingsRow>
        <div className="border-t border-border" />
        <SettingsRow
          label="Resume Interrupted Analysis"
          description="Automatically continue from where analysis stopped"
        >
          <Toggle checked={autoResume} onChange={setAutoResume} />
        </SettingsRow>
      </Section>

      {/* ── Application ── */}
      <Section icon={Info} title="Application">
        <div className="space-y-1">
          {[
            { label: 'About StartupPilot AI', desc: 'AI-powered startup analysis platform', href: null },
            { label: 'Version', desc: '1.0.0', href: null },
            { label: 'Privacy Policy', desc: 'How we handle your data', href: '#' },
            { label: 'Terms of Service', desc: 'Usage terms and conditions', href: '#' },
            { label: 'Contact Support', desc: 'Get help from our team', href: 'mailto:support@startuppilot.ai' },
          ].map(({ label, desc, href }) => (
            <div key={label}>
              {href ? (
                <a
                  href={href}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </a>
              ) : (
                <div className="flex items-center justify-between p-2.5">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <span className="text-xs text-muted-foreground font-mono">{desc}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Danger Zone ── */}
      <Card className="border-destructive/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsRow
              label="Delete Account"
              description="Permanently delete your account and all project data. This cannot be undone."
            >
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1.5 shrink-0"
                onClick={() => alert('Account deletion is not yet implemented. Please contact support at support@startuppilot.ai.')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Account
              </Button>
            </SettingsRow>
        </CardContent>
      </Card>
    </div>
  )
}
