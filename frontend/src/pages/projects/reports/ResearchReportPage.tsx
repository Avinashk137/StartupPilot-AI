import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, AlertTriangle, Target, Lightbulb } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']

function SeverityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-950/30',
    medium: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30',
    low: 'bg-green-100 text-green-700 dark:bg-green-950/30',
  }
  return <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', map[level] || map.medium)}>{level}</span>
}

export default function ResearchReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}/reports/research`),
      api.get(`/projects/${id}`),
    ]).then(([r, p]) => {
      setReport(r.data.data)
      setProject(p.data.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-40 animate-shimmer rounded-xl" />)}</div>
  if (!report) return <div className="text-center py-20 text-muted-foreground">Report not yet generated</div>

  const raw = report.raw_data || {}
  const segments = raw.customer_segments || []
  const trends = raw.growth_trends || []
  const opportunities = raw.opportunities || []
  const risks = raw.risks || []
  const insights = raw.key_insights || []
  const painPoints = raw.pain_points || []
  const recommendations = raw.recommendations || []

  // Segment chart data
  const segmentChartData = segments.map((s: any) => ({
    name: s.segment,
    value: parseInt(s.size) || 0,
  }))

  return (
    <div className="space-y-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link to={`/projects/${id}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Project
          </button>
        </Link>
        <h1 className="text-2xl font-bold gradient-brand-text">Market Research Report</h1>
        <p className="text-muted-foreground text-sm mt-1">{project?.business_name} · {project?.industry} · {project?.country}</p>
      </motion.div>

      {/* Market Size Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Market Size', value: raw.market_size || 'N/A', icon: '📊' },
          { label: 'TAM', value: raw.tam || 'N/A', icon: '🌍' },
          { label: 'SAM', value: raw.sam || 'N/A', icon: '🎯' },
          { label: 'Growth Rate', value: raw.growth_rate || 'N/A', icon: '📈' },
        ].map(item => (
          <Card key={item.label} className="card-hover">
            <CardContent className="p-5">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
              <p className="text-sm font-bold text-foreground mt-1 leading-tight">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Insights Banner */}
      {insights.length > 0 && (
        <Card className="overflow-hidden">
          <div className="gradient-brand p-5 text-white">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Key Market Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {insights.map((insight: string, i: number) => (
                <div key={i} className="bg-white/10 rounded-lg p-3 text-sm text-white/90">{insight}</div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Customer Segments & Pain Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Customer Segments</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {segments.map((seg: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">{seg.segment}</span>
                  <span className="text-xs text-muted-foreground">{seg.size}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-1000"
                    style={{ width: seg.size, background: COLORS[i % COLORS.length] }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{seg.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Customer Pain Points</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {painPoints.map((pain: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full gradient-brand text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-sm text-foreground">{pain}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Growth Trends */}
      {trends.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Market Trends</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trends.map((trend: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <div className="flex justify-between mb-1">
                    <p className="font-medium text-sm text-foreground">{trend.trend}</p>
                    <SeverityBadge level={trend.impact || 'medium'} />
                  </div>
                  <p className="text-xs text-muted-foreground">{trend.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-green-500" /> Opportunities</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {opportunities.map((opp: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <div className="flex justify-between mb-1">
                  <p className="font-medium text-sm text-foreground">{opp.opportunity}</p>
                  <SeverityBadge level={opp.potential || 'medium'} />
                </div>
                <p className="text-xs text-muted-foreground">{opp.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Risks & Mitigations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {risks.map((risk: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border border-border">
                <div className="flex justify-between mb-1">
                  <p className="font-medium text-sm text-foreground">{risk.risk}</p>
                  <SeverityBadge level={risk.severity || 'medium'} />
                </div>
                <p className="text-xs text-muted-foreground">{risk.description}</p>
                {risk.mitigation && <p className="text-xs text-primary mt-1">→ {risk.mitigation}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Strategic Recommendations</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec: string, i: number) => (
                <li key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-primary font-bold text-sm mt-0.5">{i + 1}.</span>
                  <span className="text-sm text-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
