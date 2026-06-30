import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rocket, Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, extractErrorMessage } from '@/providers/auth-provider'

// ── Password strength indicator ────────────────────────────────────────────────

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

// ── Register Page ──────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  // Redirect already-authenticated users away from register
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const validate = (): string | null => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      return 'Please enter your full name (at least 2 characters).'
    }
    if (!email.trim()) {
      return 'Please enter your email address.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid email address.'
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long.'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter.'
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter.'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number.'
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match. Please check and try again.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const result = await register(email.trim(), password, fullName.trim())

      if (result.emailConfirmationRequired) {
        // Show confirmation message — don't navigate yet
        setSuccessMessage(
          result.message ||
            `We've sent a confirmation email to ${email}. Please check your inbox.`
        )
      } else {
        // Logged in immediately
        navigate('/dashboard', { replace: true })
      }
    } catch (err: unknown) {
      const message = extractErrorMessage(
        err,
        'Registration failed. Please try again.'
      )
      setError(message)
      console.error('[Register] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Show email confirmation success screen
  if (successMessage) {
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
          <h2 className="text-2xl font-bold text-foreground mb-3">Check your email</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">{successMessage}</p>
          <Link
            to="/login"
            className="text-primary font-semibold hover:underline text-sm"
          >
            Back to Sign In
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 gradient-brand opacity-95" />
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="absolute top-1/4 right-10 w-64 h-64 rounded-full bg-white/5 blur-3xl animate-float" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">StartupPilot AI</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Start your startup journey today
          </h1>
          <p className="text-white/75 text-lg leading-relaxed mb-10">
            Join thousands of entrepreneurs using AI to validate, plan, and launch their business ideas faster than ever before.
          </p>
          <div className="space-y-3">
            {[
              'Free to start, no credit card required',
              '5 AI agents working on your business',
              'PDF reports ready in minutes',
              'Market research & financial forecasts',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-white/85 text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg gradient-brand-text">StartupPilot AI</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Create your account</h2>
            <p className="text-muted-foreground">Start building your business with AI in seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                autoComplete="name"
                className="h-11"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="h-11"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <PasswordStrength password={password} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className={`h-11 pr-10 ${
                    confirmPassword && confirmPassword !== password
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
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            {/* Error */}
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
              Create free account
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
