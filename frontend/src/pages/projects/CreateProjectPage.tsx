import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Check, Rocket, Building2, Globe, Users, DollarSign, Target, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Education', 'Finance', 'E-commerce',
  'Food & Beverage', 'Fitness & Wellness', 'Real Estate', 'Travel & Tourism',
  'Agriculture', 'Manufacturing', 'Media & Entertainment', 'Consulting',
  'Logistics', 'Fashion', 'Beauty & Personal Care', 'Legal', 'Other'
]

const INDIAN_STATES = [
  // States
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi (NCT)',
  'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

const TIMELINE_OPTIONS = [
  { value: '1 Month',  label: '1 Month'  },
  { value: '2 Months', label: '2 Months' },
  { value: '3 Months', label: '3 Months' },
  { value: '6 Months', label: '6 Months' },
  { value: '12 Months', label: '12 Months (1 Year)' },
  { value: '18 Months', label: '18 Months' },
  { value: '24 Months', label: '24 Months (2 Years)' },
  { value: '36 Months', label: '36 Months (3 Years)' },
]

const BUDGET_PRESETS = [
  { label: '₹50,000',    value: '50000'   },
  { label: '₹1,00,000',  value: '100000'  },
  { label: '₹5,00,000',  value: '500000'  },
  { label: '₹10,00,000', value: '1000000' },
  { label: '₹50,00,000', value: '5000000' },
]

const STAGES = [
  { value: 'idea',        label: 'Idea Stage',   desc: 'Just an idea, not validated yet' },
  { value: 'validation',  label: 'Validation',   desc: 'Testing the market fit' },
  { value: 'early_stage', label: 'Early Stage',  desc: 'Have initial customers' },
  { value: 'growth',      label: 'Growth',       desc: 'Growing revenue' },
  { value: 'scaling',     label: 'Scaling',      desc: 'Ready to scale rapidly' },
]

const RISKS = [
  { value: 'low',    label: 'Conservative', desc: 'Safe & steady growth',   color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:border-green-800' },
  { value: 'medium', label: 'Balanced',     desc: 'Risk/reward balance',    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' },
  { value: 'high',   label: 'Aggressive',   desc: 'Go big or go home',      color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800' },
]

const steps = [
  { id: 1, title: 'Basic Info',  icon: Building2, desc: 'Business name & idea' },
  { id: 2, title: 'Market',      icon: Globe,     desc: 'Location & audience'  },
  { id: 3, title: 'Financials',  icon: DollarSign,desc: 'Budget & timeline'    },
  { id: 4, title: 'Strategy',    icon: Target,    desc: 'Stage & risk level'   },
]

export default function CreateProjectPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    business_name: '',
    business_idea: '',
    industry: '',
    country: 'India',
    state: '',
    target_audience: '',
    budget: '',
    budget_currency: 'INR',
    goals: '',
    business_stage: 'idea',
    risk_appetite: 'medium',
    timeline: '',
  })

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (step === 1) {
      if (!form.business_name.trim()) newErrors.business_name = 'Business name is required'
      if (!form.business_idea.trim()) newErrors.business_idea = 'Business idea is required'
      if (!form.industry) newErrors.industry = 'Please select an industry'
    }
    if (step === 2) {
      if (!form.country.trim()) newErrors.country = 'Country is required'
      if (!form.state) newErrors.state = 'Please select your state'
    }
    if (step === 3) {
      if (!form.budget || parseFloat(form.budget) <= 0) newErrors.budget = 'Please enter a valid budget'
      if (!form.timeline) newErrors.timeline = 'Please select a timeline'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const payload = {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : null,
      }
      const { data } = await api.post('/projects', payload)
      const projectId = data.data.id

      // Auto-trigger AI analysis immediately after project creation
      // Fire-and-forget: if this fails, user can retry from the detail page
      try {
        await api.post(`/projects/${projectId}/run`)
      } catch (runErr: any) {
        // Non-critical — user can manually click "Run AI Analysis" on the detail page
        console.warn('[CreateProject] Auto-run AI failed:', runErr?.response?.data?.detail || runErr?.message)
      }

      navigate(`/projects/${projectId}`)
    } catch (err: any) {
      console.error(err)
      let errorMsg = 'Failed to create project. Please try again.'
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string') {
        errorMsg = detail
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map((d: any) => {
          const field = d.loc?.[d.loc.length - 1] || 'Field'
          return `${field}: ${d.msg}`
        }).join(' | ')
      }
      setErrors({ submit: errorMsg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Create New Project</h1>
        <p className="text-muted-foreground text-sm mt-1">Tell our AI agents about your business idea</p>
      </motion.div>

      {/* Step Indicator */}
      <div className="flex items-center mb-8 gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className={cn('flex items-center gap-2 flex-1', i < steps.length - 1 && 'mr-2')}>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0',
                step > s.id ? 'gradient-brand text-white' :
                  step === s.id ? 'gradient-brand text-white ring-4 ring-primary/20' :
                    'bg-muted text-muted-foreground'
              )}>
                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
              </div>
              <div className="hidden sm:block min-w-0">
                <p className={cn('text-xs font-medium truncate', step >= s.id ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.title}
                </p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 flex-1 rounded-full mx-2 transition-all', step > s.id ? 'gradient-brand' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="business_name"
                    placeholder="e.g., FitCoach Pro"
                    value={form.business_name}
                    onChange={(e) => update('business_name', e.target.value)}
                    className={cn(errors.business_name && 'border-destructive')}
                  />
                  {errors.business_name && <p className="text-xs text-destructive">{errors.business_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_idea">Business Idea <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="business_idea"
                    placeholder="Describe your business idea in detail. What problem does it solve? Who is it for?"
                    value={form.business_idea}
                    onChange={(e) => update('business_idea', e.target.value)}
                    className={cn('min-h-[120px]', errors.business_idea && 'border-destructive')}
                  />
                  <p className="text-xs text-muted-foreground">The more detail you provide, the better the AI analysis</p>
                  {errors.business_idea && <p className="text-xs text-destructive">{errors.business_idea}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Industry <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <select
                      value={form.industry}
                      onChange={(e) => update('industry', e.target.value)}
                      className={cn(
                        'w-full h-10 px-3 pr-10 rounded-lg border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring transition-all',
                        errors.industry && 'border-destructive',
                        !form.industry && 'text-muted-foreground'
                      )}
                    >
                      <option value="">Select an industry</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.industry && <p className="text-xs text-destructive">{errors.industry}</p>}
                </div>
              </motion.div>
            )}

            {/* Step 2: Market */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                    <Input
                      id="country"
                      placeholder="e.g., India"
                      value={form.country}
                      onChange={(e) => update('country', e.target.value)}
                      className={cn(errors.country && 'border-destructive')}
                    />
                    {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>State <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <select
                        value={form.state}
                        onChange={(e) => update('state', e.target.value)}
                        className={cn(
                          'w-full h-10 px-3 pr-10 rounded-lg border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring transition-all',
                          errors.state && 'border-destructive',
                          !form.state && 'text-muted-foreground'
                        )}
                      >
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                    {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Textarea
                    id="target_audience"
                    placeholder="Who are your ideal customers? Age, demographics, interests, pain points..."
                    value={form.target_audience}
                    onChange={(e) => update('target_audience', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goals">Business Goals</Label>
                  <Textarea
                    id="goals"
                    placeholder="What are you trying to achieve? Revenue targets, user milestones, market share..."
                    value={form.goals}
                    onChange={(e) => update('goals', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Financials */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label>Budget <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <select
                      value={form.budget_currency}
                      onChange={(e) => update('budget_currency', e.target.value)}
                      className="h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-24"
                    >
                      <option value="INR">INR ₹</option>
                      <option value="USD">USD $</option>
                      <option value="EUR">EUR €</option>
                      <option value="GBP">GBP £</option>
                      <option value="AUD">AUD $</option>
                    </select>
                    <Input
                      type="number"
                      placeholder="e.g., 500000"
                      value={form.budget}
                      onChange={(e) => update('budget', e.target.value)}
                      className={cn('flex-1', errors.budget && 'border-destructive')}
                      min="0"
                    />
                  </div>
                  {errors.budget && <p className="text-xs text-destructive">{errors.budget}</p>}

                  {/* Budget quick-select presets (INR) */}
                  {form.budget_currency === 'INR' && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {BUDGET_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => update('budget', preset.value)}
                          className={cn(
                            'px-3 py-1 text-xs rounded-full border transition-all',
                            form.budget === preset.value
                              ? 'border-primary bg-primary/10 text-primary font-medium'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Total startup budget available</p>
                </div>

                <div className="space-y-2">
                  <Label>Timeline <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <select
                      value={form.timeline}
                      onChange={(e) => update('timeline', e.target.value)}
                      className={cn(
                        'w-full h-10 px-3 pr-10 rounded-lg border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring transition-all',
                        errors.timeline && 'border-destructive',
                        !form.timeline && 'text-muted-foreground'
                      )}
                    >
                      <option value="">Select timeline</option>
                      {TIMELINE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.timeline && <p className="text-xs text-destructive">{errors.timeline}</p>}
                  <p className="text-xs text-muted-foreground">How long until you expect to achieve your primary goal?</p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Strategy */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <Label>Business Stage</Label>
                  <div className="space-y-2">
                    {STAGES.map((stage) => (
                      <button
                        key={stage.value}
                        type="button"
                        onClick={() => update('business_stage', stage.value)}
                        className={cn(
                          'w-full flex items-center justify-between p-3.5 rounded-lg border-2 transition-all text-left',
                          form.business_stage === stage.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-border/80'
                        )}
                      >
                        <div>
                          <p className="font-medium text-sm text-foreground">{stage.label}</p>
                          <p className="text-xs text-muted-foreground">{stage.desc}</p>
                        </div>
                        {form.business_stage === stage.value && (
                          <div className="w-5 h-5 rounded-full gradient-brand flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Risk Appetite</Label>
                  <p className="text-xs text-muted-foreground">This shapes financial forecasts, marketing strategy, and growth recommendations</p>
                  <div className="grid grid-cols-3 gap-3">
                    {RISKS.map((risk) => (
                      <button
                        key={risk.value}
                        type="button"
                        onClick={() => update('risk_appetite', risk.value)}
                        className={cn(
                          'p-3 rounded-lg border-2 transition-all text-center',
                          form.risk_appetite === risk.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        )}
                      >
                        <p className="font-semibold text-sm text-foreground">{risk.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{risk.desc}</p>
                        {form.risk_appetite === risk.value && (
                          <div className="mt-2 flex justify-center">
                            <div className="w-4 h-4 rounded-full gradient-brand flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-xl bg-muted space-y-2">
                  <p className="text-sm font-semibold text-foreground">Project Summary</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex gap-1"><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground truncate">{form.business_name || '-'}</span></div>
                    <div className="flex gap-1"><span className="text-muted-foreground">Industry:</span> <span className="font-medium text-foreground">{form.industry || '-'}</span></div>
                    <div className="flex gap-1"><span className="text-muted-foreground">Location:</span> <span className="font-medium text-foreground">{form.state ? `${form.state}, ${form.country}` : form.country || '-'}</span></div>
                    <div className="flex gap-1"><span className="text-muted-foreground">Budget:</span> <span className="font-medium text-foreground">{form.budget ? `${form.budget_currency} ${Number(form.budget).toLocaleString('en-IN')}` : '-'}</span></div>
                    <div className="flex gap-1"><span className="text-muted-foreground">Timeline:</span> <span className="font-medium text-foreground">{form.timeline || '-'}</span></div>
                    <div className="flex gap-1"><span className="text-muted-foreground">Risk:</span> <span className="font-medium text-foreground capitalize">{form.risk_appetite}</span></div>
                  </div>
                </div>

                {errors.submit && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">{errors.submit}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            {step < 4 ? (
              <Button onClick={handleNext} className="gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={loading} className="gap-2" size="lg">
                <Rocket className="w-4 h-4" />
                Create & Analyze
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
