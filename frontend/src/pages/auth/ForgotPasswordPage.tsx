import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rocket, ArrowRight, Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, extractErrorMessage } from '@/providers/auth-provider'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const { forgotPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const message = await forgotPassword(email.trim())
      setSuccessMessage(message)
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to send reset email. Please try again.')
      setError(message)
      console.error('[ForgotPassword] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Success screen — show after email sent
  if (successMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 rounded-full gradient-brand flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Check your inbox</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">{successMessage}</p>
          <p className="text-muted-foreground text-sm mb-8">
            Didn't receive it? Check your spam folder, or{' '}
            <button
              onClick={() => setSuccessMessage('')}
              className="text-primary hover:underline font-medium"
            >
              try again
            </button>
            .
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
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
            Forgot your password?
          </h1>
          <p className="text-white/75 text-lg leading-relaxed">
            No worries! Enter your email address and we'll send you a secure link to reset your password.
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
            <h2 className="text-3xl font-bold text-foreground mb-2">Reset your password</h2>
            <p className="text-muted-foreground">
              Enter the email address linked to your account and we'll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              Send reset link
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
