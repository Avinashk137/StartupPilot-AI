import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Target, Rocket, TrendingUp, DollarSign, Users, Shield, CheckCircle2,
  Briefcase, Layers, Clock, AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import ReportShell from '@/components/reports/ReportShell'
import SwotMatrix from '@/components/reports/SwotMatrix'
import KpiCard from '@/components/reports/KpiCard'

const PALETTE = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function BusinessPlanReportPage({ projectId, hideNavigation, overrideData, overrideProject, overrideReportMetadata }: { projectId?: string, hideNavigation?: boolean, overrideData?: any, overrideProject?: any, overrideReportMetadata?: any } = {}) {
  const params = useParams<{ id: string }>()
  const id = projectId || params.id
  const [report, setReport] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    if (overrideData) {
      setReport({ raw_data: overrideData, ...overrideReportMetadata })
      setProject(overrideProject || { business_name: 'Historical Version' })
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [r, p] = await Promise.all([
        api.get(`/projects/${id}/reports/business-plan`),
        api.get(`/projects/${id}`),
      ])
      setReport(r.data.data)
      setProject(p.data.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Report not yet generated. Run AI Analysis first.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id, overrideData])

  const raw = report?.raw_data || {}
  const phases = [raw.growth_strategy?.phase1, raw.growth_strategy?.phase2, raw.growth_strategy?.phase3].filter(Boolean)
  const swot = raw.swot_analysis || {}
  const risks = raw.risk_analysis || []
  const milestones = raw.milestones || []
  const revenueModel = raw.revenue_model || []
  const ops = raw.operations_plan || {}

  const bmcSections = [
    { label: 'Value Proposition', value: raw.value_proposition, icon: '💎', color: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800' },
    { label: 'Customer Segments', value: raw.target_market, icon: '👥', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
    { label: 'Revenue Streams', value: revenueModel.map((r: any) => r.stream).join(', '), icon: '💰', color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
    { label: 'Key Activities', value: (ops.processes || []).slice(0, 3).join(', '), icon: '⚙️', color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
    { label: 'Key Resources', value: (ops.technology || []).slice(0, 3).join(', '), icon: '🔧', color: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800' },
    { label: 'Channels', value: raw.go_to_market?.channels?.join(', '), icon: '📢', color: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800' },
    { label: 'Cost Structure', value: raw.pricing_strategy?.model, icon: '📊', color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
    { label: 'Mission', value: raw.mission, icon: '🎯', color: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800' },
    { label: 'Vision', value: raw.vision, icon: '🚀', color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
  ].filter(s => s.value)

  return (
    <ReportShell
      projectId={id!}
      reportType="business-plan"
      title="Business Plan"
      subtitle={`Project: ${project?.business_name || 'Unknown'} · Industry: ${project?.industry || 'N/A'}`}
      projectData={project}
      reportMetadata={report}
      accentColor="from-emerald-600 to-teal-600"
      rawData={raw}
      loading={loading}
      error={error}
      onReload={loadData}
      hideNavigation={hideNavigation}
    >
      {/* Executive Summary */}
      {raw.executive_summary && (
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5" /> Executive Summary
            </h2>
            <p className="text-white/90 text-sm leading-relaxed">{raw.executive_summary}</p>
          </div>
        </Card>
      )}

      {/* Mission · Vision · Value Prop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Mission', value: raw.mission, icon: Target, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
          { label: 'Vision', value: raw.vision, icon: Rocket, color: 'text-purple-500', bg: 'bg-purple-500/5 border-purple-500/20' },
          { label: 'Value Proposition', value: raw.value_proposition, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/20' },
        ].filter(i => i.value).map(item => (
          <Card key={item.label} className={cn('border', item.bg)}>
            <CardContent className="p-5">
              <item.icon className={cn('w-5 h-5 mb-2', item.color)} />
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">{item.label}</h3>
              <p className="text-sm text-foreground leading-relaxed">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Business Model Canvas */}
      {bmcSections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" /> Business Model Canvas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {bmcSections.map((section, i) => (
                <motion.div
                  key={section.label}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn('p-4 rounded-xl border', section.color)}
                >
                  <div className="text-xl mb-2">{section.icon}</div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{section.label}</p>
                  <p className="text-sm text-foreground leading-snug">{section.value}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Detail */}
      <Tabs defaultValue="revenue">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="growth">Growth Plan</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          {Object.keys(swot).length > 0 && <TabsTrigger value="swot">SWOT</TabsTrigger>}
        </TabsList>

        {/* Revenue */}
        <TabsContent value="revenue">
          <div className="space-y-4">
            {revenueModel.map((stream: any, i: number) => (
              <Card key={i} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: PALETTE[i % PALETTE.length] }}>
                        {i + 1}
                      </div>
                      <h3 className="font-semibold text-foreground">{stream.stream}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{stream.pricing}</p>
                      <p className="text-xs text-emerald-500">{stream.margin} margin</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{stream.description}</p>
                </CardContent>
              </Card>
            ))}

            {raw.pricing_strategy && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground mb-4">Pricing Tiers: {raw.pricing_strategy.model}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(raw.pricing_strategy.tiers || []).map((tier: any, i: number) => (
                      <div key={i} className={cn(
                        'p-5 rounded-xl border-2 text-center transition-all',
                        i === 1 ? 'border-primary bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg scale-[1.02]' : 'border-border'
                      )}>
                        {i === 1 && <div className="text-xs font-bold uppercase tracking-widest mb-2 opacity-80">Most Popular</div>}
                        <p className={cn('font-bold text-base', i === 1 ? 'text-white' : 'text-foreground')}>{tier.tier}</p>
                        <p className={cn('text-3xl font-black my-3', i === 1 ? 'text-white' : 'text-primary')}>{tier.price}</p>
                        <ul className="space-y-1.5 text-sm text-left">
                          {(tier.features || []).map((f: string, j: number) => (
                            <li key={j} className={cn('flex items-center gap-1.5', i === 1 ? 'text-white/90' : 'text-muted-foreground')}>
                              <span className={i === 1 ? 'text-white' : 'text-emerald-500'}>✓</span> {f}
                            </li>
                          ))}
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
              <Card key={i} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Phase {i + 1}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{phase.period}</p>
                    </div>
                    {phase.budget && <span className="ml-auto text-sm font-bold text-primary">{phase.budget}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{phase.focus}</p>
                  <ul className="space-y-1.5">
                    {(phase.milestones || []).map((m: string, j: number) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
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
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Team Structure</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(ops.team || []).map((member: any, i: number) => (
                  <div key={i} className="p-3 border border-border rounded-xl hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-sm text-foreground">{member.role}</p>
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{member.timing}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{member.responsibilities}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Tech Stack & Processes</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(ops.technology || []).map((tech: string, i: number) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">{tech}</span>
                  ))}
                </div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Key Processes</h4>
                <ul className="space-y-1.5">
                  {(ops.processes || []).map((p: string, i: number) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary shrink-0">•</span> {p}
                    </li>
                  ))}
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
              const badgeClass = (lvl: string) => lvl === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-950/30' : lvl === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30'
              return (
                <Card key={i} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="font-semibold text-foreground text-sm">{risk.risk}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', badgeClass(prob))}>prob: {prob}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', badgeClass(impact))}>impact: {impact}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{risk.description}</p>
                    <p className="text-xs text-primary flex items-start gap-1">
                      <Shield className="w-3 h-3 shrink-0 mt-0.5" /> Mitigation: {risk.mitigation}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones">
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-600 to-indigo-600 opacity-30" />
            <div className="space-y-5 pl-14">
              {milestones.map((m: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="relative"
                >
                  <div className="absolute -left-12 w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
                    {i + 1}
                  </div>
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-foreground">{m.milestone}</p>
                        <span className="text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full shrink-0 ml-2">{m.target_date}</span>
                      </div>
                      {m.metric && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Target className="w-3 h-3" /> Metric: {m.metric}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* SWOT */}
        {Object.keys(swot).length > 0 && (
          <TabsContent value="swot">
            <Card>
              <CardContent className="p-6">
                <SwotMatrix swot={swot} title="Business SWOT Analysis" />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Recommendations */}
      {raw.success_factors && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Success Factors & Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {(Array.isArray(raw.success_factors) ? raw.success_factors : [raw.success_factors]).map((rec: string, i: number) => (
                <li key={i} className="flex items-start gap-3 py-2 border-b border-border/60 last:border-0">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-sm text-foreground leading-relaxed">{rec}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </ReportShell>
  )
}
