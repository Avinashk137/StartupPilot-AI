import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { ArrowLeft, TrendingUp, DollarSign, Users, Target, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency, getScoreColor } from '@/lib/utils'
import api from '@/lib/api'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size / 2) - 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 75 ? '#10b981' : score >= 55 ? '#6366f1' : score >= 35 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ stroke: color, transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
        <text
          x={size / 2} y={size / 2 + 5}
          textAnchor="middle" fontSize="15" fontWeight="700"
          fill="currentColor" className="text-foreground"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          {score}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground text-center leading-tight max-w-[80px]">{label}</span>
    </div>
  )
}

export default function AnalyticsReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}/reports/analytics`),
      api.get(`/projects/${id}`),
    ]).then(([reportRes, projRes]) => {
      setReport(reportRes.data.data)
      setProject(projRes.data.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-40 animate-shimmer rounded-xl" />)}</div>
  if (!report) return <div className="text-center py-20 text-muted-foreground">Report not yet generated</div>

  const scores = [
    { label: 'Business Health', score: report.health_score || 0 },
    { label: 'Market Opportunity', score: report.market_opportunity_score || 0 },
    { label: 'Competition', score: report.competition_score || 0 },
    { label: 'Financial Health', score: report.financial_health_score || 0 },
    { label: 'Marketing', score: report.marketing_score || 0 },
    { label: 'Readiness', score: report.readiness_score || 0 },
    { label: 'Risk Level', score: report.risk_score || 0 },
    { label: 'Growth Potential', score: report.growth_score || 0 },
  ]

  const radarData = scores.map(s => ({ subject: s.label, score: s.score, fullMark: 100 }))

  const recommendations = report.raw_data?.ceo_recommendations || []
  const riskAlerts = report.raw_data?.risk_alerts || []
  const growthOpportunities = report.raw_data?.growth_opportunities || []
  const weeklyPlan = report.raw_data?.weekly_action_plan || {}

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link to={`/projects/${id}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Project
          </button>
        </Link>
        <h1 className="text-2xl font-bold gradient-brand-text">CEO Analytics Report</h1>
        <p className="text-muted-foreground text-sm mt-1">{project?.business_name} · AI Business Intelligence</p>
      </motion.div>

      {/* Overall Score Banner */}
      <Card className="overflow-hidden">
        <div className="gradient-brand p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium mb-1">Overall Business Score</p>
              <div className="flex items-end gap-2">
                <span className="text-6xl font-bold">{Math.round(report.overall_score || 0)}</span>
                <span className="text-white/60 text-xl mb-2">/100</span>
              </div>
              <p className="text-white/80 text-sm mt-2">
                {report.overall_score >= 80 ? '🚀 Excellent business potential!' :
                  report.overall_score >= 65 ? '📈 Good progress, keep building' :
                    report.overall_score >= 50 ? '⚡ Solid foundation, work on weak areas' :
                      '⚠️ Needs significant improvement'}
              </p>
            </div>
            <div className="flex gap-6 flex-wrap justify-end">
              {scores.slice(0, 4).map(s => (
                <ScoreRing key={s.label} score={s.score} label={s.label} size={72} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* All Score Rings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">8-Dimension Business Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4 justify-items-center">
            {scores.map(s => (
              <ScoreRing key={s.label} score={s.score} label={s.label} size={80} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Bar Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Score Breakdown</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={scores} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} angle={-25} textAnchor="end" height={50} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {scores.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* CEO Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> CEO Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'p-4 rounded-xl border-l-4',
                  rec.priority === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
                    rec.priority === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' :
                      'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{rec.recommendation}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rec.expected_impact}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      rec.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                    )}>
                      {rec.priority}
                    </span>
                    <span className="text-xs text-muted-foreground">{rec.timeline?.replace('_', ' ')}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk Alerts & Growth Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {riskAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {riskAlerts.map((alert: any, i: number) => (
                <div key={i} className={cn(
                  'p-3 rounded-lg border text-sm',
                  alert.severity === 'critical' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                    alert.severity === 'high' ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' :
                      'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20'
                )}>
                  <p className="font-medium text-foreground">{alert.alert}</p>
                  <p className="text-muted-foreground text-xs mt-1">{alert.action}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {growthOpportunities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" /> Growth Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {growthOpportunities.map((opp: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 text-sm">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-foreground">{opp.opportunity}</p>
                    <span className="text-xs text-green-600 font-medium ml-2">
                      {opp.potential_revenue ? `+$${opp.potential_revenue.toLocaleString()}` : opp.effort}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{opp.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opp.timeline}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Weekly Action Plan */}
      {Object.keys(weeklyPlan).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" /> 30-Day Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(weeklyPlan).map(([week, tasks]: [string, any]) => (
                <div key={week} className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground capitalize border-b border-border pb-1">
                    {week.replace('week', 'Week ')}
                  </h4>
                  <ul className="space-y-2">
                    {(Array.isArray(tasks) ? tasks : []).map((task: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                          task.priority === 'critical' ? 'bg-red-500' :
                            task.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'
                        )} />
                        <div>
                          <p className="text-foreground">{task.task}</p>
                          <p className="text-muted-foreground">{task.owner}</p>
                        </div>
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
  )
}
