import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rocket, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, extractErrorMessage } from '@/providers/auth-provider'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  // Redirect already-authenticated users away from login
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message = extractErrorMessage(
        err,
        'Login failed. Please check your credentials and try again.'
      )
      setError(message)
      console.error('[Login] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-slate-950">
      {/* ── Background: Full Screen Gradient ───────────────────── */}
      <div className="absolute inset-0 z-0" style={{
        background: 'linear-gradient(135deg, oklch(20% 0.06 260) 0%, oklch(14% 0.04 280) 50%, oklch(10% 0.03 260) 100%)'
      }} />
      {/* Mesh overlay */}
      <div className="absolute inset-0 z-0" style={{
        backgroundImage: 'radial-gradient(at 20% 20%, oklch(55% 0.22 260 / 0.20) 0px, transparent 50%), radial-gradient(at 80% 80%, oklch(62% 0.26 285 / 0.15) 0px, transparent 50%), radial-gradient(at 50% 50%, oklch(70% 0.22 200 / 0.08) 0px, transparent 70%)'
      }} />

      {/* Floating orbs */}
      <div className="absolute top-16 right-16 w-64 h-64 rounded-full opacity-10 animate-float z-0" style={{ background: 'oklch(62% 0.26 285)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-24 left-12 w-80 h-80 rounded-full opacity-8 animate-float z-0" style={{ background: 'oklch(55% 0.22 260)', filter: 'blur(80px)', animationDelay: '1.5s' }} />

      {/* ── Centered Login Card ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[500px] bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_8px_40px_rgb(0,0,0,0.12)] border border-white/20 p-8 sm:p-12 flex flex-col"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-primary/30">
            <Rocket className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
          <p className="text-slate-500">Sign in to your StartupPilot AI account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-slate-700 font-semibold">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              className="h-12 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-700 font-semibold">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
                tabIndex={-1}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                className="h-12 pr-12 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium shadow-sm"
              role="alert"
            >
              {error}
            </motion.div>
          )}

          <Button 
            type="submit" 
            size="lg" 
            className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5" 
            loading={loading} 
            disabled={loading}
          >
            Sign In
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 font-medium">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            Create one free
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
