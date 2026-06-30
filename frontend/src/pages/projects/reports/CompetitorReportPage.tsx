import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ExternalLink, Target, TrendingUp, Shield, AlertTriangle, CheckCircle2, ArrowRight, BarChart3 } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import ReportShell from '@/components/reports/ReportShell'
import SwotMatrix from '@/components/reports/SwotMatrix'
import DataTable from '@/components/reports/DataTable'
import KpiCard from '@/components/reports/KpiCard'

const PALETTE = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function CompetitorReportPage() {
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
        api.get(`/projects/${id}/reports/competitor`),
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

  const raw = (typeof report?.raw_data === 'object' && report?.raw_data !== null) ? report.raw_data : {}
  const competitors = Array.isArray(raw.competitors) ? raw.competitors : []
  const swot = (typeof raw.swot_analysis === 'object' && raw.swot_analysis !== null) ? raw.swot_analysis : {}
  const gaps = Array.isArray(raw.market_gaps) ? raw.market_gaps : []
  const advantages = Array.isArray(raw.competitive_advantages) ? raw.competitive_advantages : []
  const pricing = (typeof raw.pricing_analysis === 'object' && raw.pricing_analysis !== null) ? raw.pricing_analysis : {}
  const recommendations = Array.isArray(raw.recommendations) ? raw.recommendations : []

  // Pie chart from competitor market shares (estimated)
  const shareData = competitors.map((c: any) => ({
    name: c?.name || 'Unknown',
    value: 100 / (competitors.length + 1),
  }))
  if (competitors.length > 0) shareData.push({ name: 'Your Position', value: 100 / (competitors.length + 1) })

  // Competitor comparison table columns
  const compColumns = [
    { key: 'name', label: 'Competitor', render: (row: any) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {row.name?.[0] || '?'}
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{row.name}</p>
          {row.website && (
            <a href={`https://${row.website}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5">
              {row.website} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
    )},
    { key: 'type', label: 'Type', render: (row: any) => (
      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', row.type === 'direct' ? 'bg-red-100 text-red-700 dark:bg-red-950/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/30')}>
        {row.type}
      </span>
    )},
    { key: 'pricing', label: 'Pricing' },
    { key: 'market_share', label: 'Market Share' },
    { key: 'strengths', label: 'Key Strengths', render: (row: any) => (
      <ul className="space-y-0.5">
        {(Array.isArray(row.strengths) ? row.strengths : []).slice(0, 2).map((s: string, i: number) => (
          <li key={i} className="text-xs text-foreground flex items-start gap-1">
            <span className="text-emerald-500 shrink-0">✓</span> {s}
          </li>
        ))}
      </ul>
    )},
    { key: 'weaknesses', label: 'Weaknesses', render: (row: any) => (
      <ul className="space-y-0.5">
        {(Array.isArray(row.weaknesses) ? row.weaknesses : []).slice(0, 2).map((w: string, i: number) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
            <span className="text-red-400 shrink-0">✗</span> {w}
          </li>
        ))}
      </ul>
    )},
  ]

  return (
    <ReportShell
      projectId={id!}
      reportType="competitor"
      title="Competitor Analysis"
      subtitle={project ? `${project.business_name} · ${competitors.length} competitors identified` : ''}
      accentColor="from-rose-600 to-orange-600"
      rawData={raw}
      loading={loading}
      error={error}
      onReload={loadData}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Competitors Found" value={String(competitors.length)} icon={BarChart3} iconColor="text-rose-500" />
        <KpiCard label="Direct Competitors" value={String(competitors.filter((c: any) => c.type === 'direct').length)} icon={Target} iconColor="text-red-500" />
        <KpiCard label="Market Gaps" value={String(gaps.length)} icon={TrendingUp} iconColor="text-emerald-500" highlight />
        <KpiCard label="Your Advantages" value={String(advantages.length)} icon={Shield} iconColor="text-indigo-500" />
      </div>

      {/* Competitor Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competitive Landscape Table</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={compColumns} data={competitors} emptyMessage="No competitors analyzed yet" />
        </CardContent>
      </Card>

      {/* Market Share + Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shareData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Market Share Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={shareData} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                    paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${(name || '').length > 10 ? (name || '').slice(0,10) + '…' : (name || '')} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={10}>
                    {shareData.map((_: any, i: number) => (
                      <Cell key={i} fill={i === shareData.length - 1 ? '#6366f1' : PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-xs text-center text-muted-foreground mt-2">Estimated relative market positioning</p>
            </CardContent>
          </Card>
        )}

        {/* Pricing Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pricing.market_average && (
              <div className="p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-1">Market Average Pricing</p>
                <p className="font-semibold text-foreground">{pricing.market_average}</p>
              </div>
            )}
            {pricing.our_recommended_price && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                <p className="text-xs text-white/70 mb-1">Recommended Price for You</p>
                <p className="font-bold text-lg">{pricing.our_recommended_price}</p>
                {pricing.rationale && <p className="text-xs text-white/80 mt-2 leading-relaxed">{pricing.rationale}</p>}
              </div>
            )}
            {competitors.map((c: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground font-medium">{c.name}</span>
                <span className="text-sm text-muted-foreground">{c.pricing || '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* SWOT Matrix */}
      <Card>
        <CardContent className="p-6">
          <SwotMatrix swot={swot} title="Your SWOT vs Competitors" />
        </CardContent>
      </Card>

      {/* Market Gaps + Competitive Advantages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" /> Market Gaps (Your Opportunities)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gaps.map((gap: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm text-foreground">{gap.gap}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                    gap.size === 'large' ? 'bg-emerald-100 text-emerald-700' :
                    gap.size === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  )}>
                    {gap.size}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{gap.opportunity}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" /> Your Competitive Advantages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {advantages.map((adv: string, i: number) => (
                <li key={i} className="flex items-start gap-3 py-2 border-b border-border/60 last:border-0">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
                  <span className="text-sm text-foreground leading-relaxed">{adv}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Feature Comparison per competitor */}
      {competitors.some((c: any) => Array.isArray(c?.services) && c.services.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature & Service Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {competitors.map((c: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: PALETTE[i % PALETTE.length] }}>
                      {c?.name?.[0] || '?'}
                    </div>
                    <p className="font-semibold text-sm text-foreground">{c?.name || 'Unknown Competitor'}</p>
                    <span className="text-xs text-muted-foreground">{c?.target_market}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(c?.services) ? c.services : []).map((svc: string, j: number) => (
                      <span key={j} className="text-xs bg-muted text-foreground px-3 py-1 rounded-full border border-border">{svc}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
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
