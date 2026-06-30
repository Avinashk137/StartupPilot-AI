import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rocket, Eye, EyeOff, ArrowRight, TrendingUp, BarChart3, FileText, DollarSign, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, extractErrorMessage } from '@/providers/auth-provider'

const agents = [
  { icon: TrendingUp,  label: 'Market Research',      desc: 'Market size, trends & opportunities',   color: 'bg-indigo-500/20 text-indigo-400',  delay: 0.15 },
  { icon: BarChart3,   label: 'Competitor Analysis',   desc: 'SWOT analysis & competitive landscape', color: 'bg-violet-500/20 text-violet-400',   delay: 0.25 },
  { icon: FileText,    label: 'Business Plan',          desc: 'Full business strategy & model',        color: 'bg-cyan-500/20 text-cyan-400',       delay: 0.35 },
  { icon: DollarSign,  label: 'Financial Report',       desc: 'Forecasts, ROI & cash flow analysis',  color: 'bg-emerald-500/20 text-emerald-400', delay: 0.45 },
  { icon: Megaphone,   label: 'Marketing Strategy',     desc: 'Social posts & growth tactics',        color: 'bg-pink-500/20 text-pink-400',       delay: 0.55 },
]

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
    <div className="min-h-screen flex bg-background">
      {/* ── Left — Branding Panel ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Layered gradient background */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, oklch(20% 0.06 260) 0%, oklch(14% 0.04 280) 50%, oklch(10% 0.03 260) 100%)'
        }} />
        {/* Mesh overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(at 20% 20%, oklch(55% 0.22 260 / 0.20) 0px, transparent 50%), radial-gradient(at 80% 80%, oklch(62% 0.26 285 / 0.15) 0px, transparent 50%), radial-gradient(at 50% 50%, oklch(70% 0.22 200 / 0.08) 0px, transparent 70%)'
        }} />

        {/* Floating orbs */}
        <div className="absolute top-16 right-16 w-64 h-64 rounded-full opacity-10 animate-float" style={{ background: 'oklch(62% 0.26 285)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-24 left-12 w-80 h-80 rounded-full opacity-8 animate-float" style={{ background: 'oklch(55% 0.22 260)', filter: 'blur(80px)', animationDelay: '1.5s' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-primary/30">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-base text-white leading-none">StartupPilot</p>
              <p className="text-white/40 text-xs font-semibold mt-0.5 tracking-wider uppercase">AI Platform</p>
            </div>
          </div>

          {/* Main copy */}
          <div className="space-y-8">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-3">5 AI Agents Working for You</p>
                <h1 className="text-5xl font-bold leading-tight text-white mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Build Your Startup<br />with AI.
                </h1>
                <p className="text-white/60 text-base leading-relaxed max-w-md">
                  Enter your business idea. Our 5 specialized AI agents will generate a complete startup blueprint — instantly.
                </p>
              </motion.div>
            </div>

            {/* Agent list */}
            <div className="space-y-3">
              {agents.map((agent, i) => (
                <motion.div
                  key={agent.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: agent.delay, duration: 0.5 }}
                  className="flex items-center gap-4 group"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${agent.color} border border-white/10`}>
                    <agent.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-white/90 font-semibold text-sm">{agent.label}</p>
                    <p className="text-white/40 text-xs">{agent.desc}</p>
                  </div>
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400/60 shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <div className="flex -space-x-2">
              {['S', 'A', 'R'].map((l, i) => (
                <div key={i} className="w-7 h-7 rounded-full gradient-brand border-2 border-white/10 flex items-center justify-center text-white text-[10px] font-bold">{l}</div>
              ))}
            </div>
            <p className="text-white/40 text-xs">Join founders already using StartupPilot AI</p>
          </div>
        </div>
      </div>

      {/* ── Right — Login Form ────────────────────────────────── */}
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
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your StartupPilot AI account</p>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
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
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                role="alert"
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading} disabled={loading}>
              Sign in
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
