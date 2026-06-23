import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Target, DollarSign, Users, Rocket, Shield, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

export default function BusinessPlanReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}/reports/business-plan`),
      api.get(`/projects/${id}`),
    ]).then(([r, p]) => {
      setReport(r.data.data)
      setProject(p.data.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-40 animate-shimmer rounded-xl" />)}</div>
  if (!report) return <div className="text-center py-20 text-muted-foreground">Report not yet generated</div>

  const raw = report.raw_data || {}
  const phases = [raw.growth_strategy?.phase1, raw.growth_strategy?.phase2, raw.growth_strategy?.phase3].filter(Boolean)
  const swot = raw.swot_analysis || {}
  const risks = raw.risk_analysis || []
  const milestones = raw.milestones || []
  const revenueModel = raw.revenue_model || []
  const ops = raw.operations_plan || {}

  return (
    <div className="space-y-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link to={`/projects/${id}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Project
          </button>
        </Link>
        <h1 className="text-2xl font-bold gradient-brand-text">Business Plan</h1>
        <p className="text-muted-foreground text-sm mt-1">{project?.business_name} · Full business plan</p>
      </motion.div>

      {/* Executive Summary */}
      <Card className="overflow-hidden">
        <div className="gradient-brand p-1" />
        <CardContent className="p-6">
          <h2 className="font-bold text-lg text-foreground mb-3">Executive Summary</h2>
          <p className="text-muted-foreground leading-relaxed">{raw.executive_summary}</p>
        </CardContent>
      </Card>

      {/* Mission + Vision + Value Prop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Mission', value: raw.mission, icon: Target, color: 'text-primary' },
          { label: 'Vision', value: raw.vision, icon: Rocket, color: 'text-purple-500' },
          { label: 'Value Proposition', value: raw.value_proposition, icon: TrendingUp, color: 'text-green-500' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <item.icon className={cn('w-5 h-5 mb-2', item.color)} />
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">{item.label}</h3>
              <p className="text-sm text-foreground leading-relaxed">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="growth">Growth Plan</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        {/* Revenue Model */}
        <TabsContent value="revenue">
          <div className="space-y-4">
            {revenueModel.map((stream: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-foreground">{stream.stream}</h3>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{stream.pricing}</p>
                      <p className="text-xs text-green-500">{stream.margin} margin</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{stream.description}</p>
                </CardContent>
              </Card>
            ))}
            {raw.pricing_strategy && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground mb-3">Pricing Strategy: {raw.pricing_strategy.model}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(raw.pricing_strategy.tiers || []).map((tier: any, i: number) => (
                      <div key={i} className={cn('p-4 rounded-xl border-2 text-center', i === 1 ? 'border-primary gradient-brand text-white' : 'border-border')}>
                        <p className="font-bold">{tier.tier}</p>
                        <p className={cn('text-2xl font-black my-2', i === 1 ? 'text-white' : 'text-primary')}>{tier.price}</p>
                        <ul className="space-y-1 text-sm">
                          {(tier.features || []).map((f: string, j: number) => <li key={j} className={i === 1 ? 'text-white/80' : 'text-muted-foreground'}>• {f}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Growth Plan */}
        <TabsContent value="growth">
          <div className="space-y-4">
            {phases.map((phase: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full gradient-brand text-white font-bold flex items-center justify-center text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Phase {i + 1}</h3>
                      <p className="text-xs text-muted-foreground">{phase.period}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{phase.focus}</p>
                  <ul className="space-y-1.5">
                    {(phase.milestones || []).map((m: string, j: number) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span className="text-foreground">{m}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Operations */}
        <TabsContent value="operations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Team Structure</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(ops.team || []).map((member: any, i: number) => (
                  <div key={i} className="p-3 border border-border rounded-lg">
                    <div className="flex justify-between">
                      <p className="font-medium text-sm text-foreground">{member.role}</p>
                      <span className="text-xs text-primary">{member.timing}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{member.responsibilities}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Technology Stack</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(ops.technology || []).map((tech: string, i: number) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">{tech}</span>
                  ))}
                </div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">KEY PROCESSES</h4>
                <ul className="space-y-1">
                  {(ops.processes || []).map((p: string, i: number) => <li key={i} className="text-sm text-foreground">• {p}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Analysis */}
        <TabsContent value="risk">
          <div className="space-y-3">
            {risks.map((risk: any, i: number) => {
              const impact = risk.impact || 'medium'
              const prob = risk.probability || 'medium'
              return (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-foreground">{risk.risk}</p>
                      <div className="flex gap-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', prob === 'high' ? 'bg-red-100 text-red-700' : prob === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700')}>
                          prob: {prob}
                        </span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', impact === 'high' ? 'bg-red-100 text-red-700' : impact === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700')}>
                          impact: {impact}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-primary">→ Mitigation: {risk.mitigation}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-6 pl-12">
              {milestones.map((m: any, i: number) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative">
                  <div className="absolute -left-11 w-6 h-6 rounded-full gradient-brand text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-foreground">{m.milestone}</p>
                        <span className="text-xs text-primary font-medium">{m.target_date}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Metric: {m.metric}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
