import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rocket, Eye, EyeOff, ArrowRight, Zap, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'

const features = [
  { icon: Zap, text: '7 AI Agents working for you' },
  { icon: TrendingUp, text: 'Financial forecasts in minutes' },
  { icon: Users, text: 'Investor-ready reports instantly' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Gradient bg */}
        <div className="absolute inset-0 gradient-brand opacity-95" />
        <div className="absolute inset-0 gradient-mesh opacity-30" />

        {/* Floating orbs */}
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-white/5 blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-white/5 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg leading-none">StartupPilot</p>
              <p className="text-white/60 text-xs font-medium">AI Platform</p>
            </div>
          </div>

          {/* Main copy */}
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl font-bold leading-tight mb-4">
                Your AI Team.<br />Working 24/7.
              </h1>
              <p className="text-white/75 text-lg leading-relaxed max-w-md">
                Enter your business idea and watch as 7 specialized AI agents build your complete startup blueprint — market research, business plan, financials, and more.
              </p>
            </div>

            <div className="space-y-4">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <f.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/85 font-medium">{f.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="glass rounded-2xl p-5 bg-white/10 border-white/20">
            <p className="text-white/90 text-sm italic leading-relaxed">
              "StartupPilot gave me a complete business plan for my EdTech idea in under 5 minutes. The financial projections alone saved me weeks of work."
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">AK</div>
              <div>
                <p className="text-white/80 text-xs font-medium">Avinash K.</p>
                <p className="text-white/50 text-xs">Founder, EduTech India</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
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
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
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
