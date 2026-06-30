import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingUp, AlertTriangle, Target, Lightbulb, Users,
  BarChart3, Globe, Zap, ShieldAlert, CheckCircle2, ArrowRight
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import ReportShell from '@/components/reports/ReportShell'
import SwotMatrix from '@/components/reports/SwotMatrix'
import KpiCard from '@/components/reports/KpiCard'

const PALETTE = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

function SeverityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200',
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200',
  }
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize border', map[level?.toLowerCase()] || map.medium)}>
      {level || 'medium'}
    </span>
  )
}

export default function ResearchReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, p] = await Promise.all([
        api.get(`/projects/${id}/reports/research`),
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

  useEffect(() => { loadData() }, [id])

  const raw = report?.raw_data || {}
  const segments = raw.customer_segments || []
  const trends = raw.growth_trends || []
  const opportunities = raw.opportunities || []
  const risks = raw.risks || []
  const insights = raw.key_insights || []
  const painPoints = raw.pain_points || []
  const recommendations = raw.recommendations || []
  const swot = raw.swot_analysis

  const segmentChartData = segments.map((s: any, i: number) => ({
    name: s.segment?.length > 16 ? s.segment.slice(0, 16) + '…' : s.segment,
    value: parseFloat(s.size) || (20 - i * 3),
    fill: PALETTE[i % PALETTE.length],
  }))

  return (
    <ReportShell
      projectId={id!}
      reportType="research"
      title="Market Research Report"
      subtitle={project ? `${project.business_name} · ${project.industry} · ${project.country}` : ''}
      accentColor="from-violet-600 to-indigo-600"
      rawData={raw}
      loading={loading}
      error={error}
      onReload={loadData}
    >
      {/* KPI Cards */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Market Size" value={raw.market_size || '—'} icon={Globe} iconColor="text-violet-500" />
        <KpiCard label="TAM" value={raw.tam || '—'} icon={Target} iconColor="text-indigo-500" highlight />
        <KpiCard label="SAM" value={raw.sam || '—'} icon={BarChart3} iconColor="text-cyan-500" />
        <KpiCard label="Annual Growth Rate" value={raw.growth_rate || '—'} icon={TrendingUp} iconColor="text-emerald-500" trend="up" />
      </motion.div>

      {/* Executive Summary — Key Insights Banner */}
      {insights.length > 0 && (
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white">
            <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" /> Key Market Insights
            </h2>
            <p className="text-white/70 text-sm mb-4">Critical findings from your market research</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {insights.map((insight: string, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                >
                  <div className="w-6 h-6 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center mb-2">{i + 1}</div>
                  <p className="text-sm text-white/90 leading-relaxed">{insight}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* SOM + Segment Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {segmentChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Market Segments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={segmentChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} unit="%" />
                  <Tooltip
                    formatter={(v: any) => [`${v}%`, 'Market Share']}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {segmentChartData.map((_: any, i: number) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Customer Pain Points */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Customer Pain Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {painPoints.map((pain: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-sm text-foreground leading-relaxed">{pain}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Customer Segments Detail */}
      {segments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> Customer Personas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {segments.map((seg: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: PALETTE[i % PALETTE.length] }}>
                        {seg.segment?.[0] || '?'}
                      </div>
                      <p className="font-semibold text-sm text-foreground">{seg.segment}</p>
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{seg.size}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{seg.description}</p>
                  {seg.pain_points && (
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(seg.pain_points) ? seg.pain_points : [seg.pain_points]).map((pp: string, j: number) => (
                        <span key={j} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{pp}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Trends */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Market Trends & Growth Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trends.map((trend: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-sm text-foreground">{trend.trend}</p>
                    <SeverityBadge level={trend.impact || 'medium'} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{trend.description}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" /> Market Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunities.map((opp: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm text-foreground">{opp.opportunity}</p>
                  <SeverityBadge level={opp.potential || 'medium'} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{opp.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" /> Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {risks.map((risk: any, i: number) => (
              <div key={i} className="p-3 rounded-xl border border-border">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm text-foreground">{risk.risk}</p>
                  <SeverityBadge level={risk.severity || 'medium'} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{risk.description}</p>
                {risk.mitigation && (
                  <p className="text-xs text-primary mt-2 flex items-start gap-1">
                    <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" /> {risk.mitigation}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* SWOT */}
      {swot && (
        <Card>
          <CardContent className="p-6">
            <SwotMatrix swot={swot} title="Strategic SWOT Analysis" />
          </CardContent>
        </Card>
      )}

      {/* Recommendations & Next Steps */}
      {recommendations.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Strategic Recommendations & Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {recommendations.map((rec: string, i: number) => (
                <li key={i} className="flex items-start gap-3 py-2 border-b border-border/60 last:border-0">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
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
