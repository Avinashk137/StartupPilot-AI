import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rocket, Eye, EyeOff, ArrowRight, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { extractErrorMessage } from '@/providers/auth-provider'
import api from '@/lib/api'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.pass).length
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600']

  if (!password) return null

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score - 1] : 'bg-border'
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((c) => (
          <div
            key={c.label}
            className={`flex items-center gap-1 text-xs ${
              c.pass ? 'text-green-500' : 'text-muted-foreground'
            }`}
          >
            <Check className="w-3 h-3" />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState('')
  const navigate = useNavigate()

  // Supabase redirects to /reset-password#access_token=xxx&type=recovery
  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', '?'))
    const token = params.get('access_token')
    const type = params.get('type')

    if (!token) {
      setTokenError(
        'No reset token found. Please use the link from your password reset email. ' +
        'If the link has expired, request a new one.'
      )
      return
    }

    if (type !== 'recovery') {
      setTokenError(
        'This link is not a password reset link. Please use the link from your password reset email.'
      )
      return
    }

    setAccessToken(token)
  }, [])

  const validate = (): string | null => {
    if (newPassword.length < 8) return 'Password must be at least 8 characters long.'
    if (!/[A-Z]/.test(newPassword)) return 'Password must contain at least one uppercase letter.'
    if (!/[a-z]/.test(newPassword)) return 'Password must contain at least one lowercase letter.'
    if (!/[0-9]/.test(newPassword)) return 'Password must contain at least one number.'
    if (newPassword !== confirmPassword) return 'Passwords do not match.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!accessToken) {
      setError('Reset token is missing. Please use the link from your email.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        access_token: accessToken,
        new_password: newPassword,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Password reset failed. Please try again.')
      setError(message)
      console.error('[ResetPassword] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Token missing / invalid
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Invalid reset link</h2>
          <p className="text-muted-foreground leading-relaxed mb-8">{tokenError}</p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Request a new reset link
          </Link>
        </motion.div>
      </div>
    )
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 rounded-full gradient-brand flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Password updated!</h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Your password has been changed successfully. You can now sign in with your new password.
          </p>
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate('/login', { replace: true })}
          >
            Sign in now
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 gradient-brand opacity-95" />
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="absolute top-1/3 right-10 w-64 h-64 rounded-full bg-white/5 blur-3xl animate-float" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">StartupPilot AI</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Create a new password
          </h1>
          <p className="text-white/75 text-lg leading-relaxed">
            Choose a strong password to keep your account secure. Make sure it's at least 8 characters with uppercase, lowercase, and a number.
          </p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg gradient-brand-text">StartupPilot AI</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Set new password</h2>
            <p className="text-muted-foreground">
              Your new password must be at least 8 characters and include uppercase, lowercase, and a number.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={newPassword} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className={`h-11 pr-10 ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                role="alert"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              Update password
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Back to Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
