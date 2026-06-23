import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

function SwotBox({ type, items }: { type: 'strengths' | 'weaknesses' | 'opportunities' | 'threats'; items: string[] }) {
  const config = {
    strengths: { label: 'Strengths', color: 'bg-green-50 border-green-200 dark:bg-green-950/20', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
    weaknesses: { label: 'Weaknesses', color: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
    opportunities: { label: 'Opportunities', color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
    threats: { label: 'Threats', color: 'bg-red-50 border-red-200 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  }
  const c = config[type]
  return (
    <div className={cn('p-4 rounded-xl border', c.color)}>
      <h4 className={cn('font-bold text-sm mb-3', c.text)}>{c.label}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', c.dot)} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CompetitorReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}/reports/competitor`),
      api.get(`/projects/${id}`),
    ]).then(([r, p]) => {
      setReport(r.data.data)
      setProject(p.data.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-40 animate-shimmer rounded-xl" />)}</div>
  if (!report) return <div className="text-center py-20 text-muted-foreground">Report not yet generated</div>

  const raw = report.raw_data || {}
  const competitors = raw.competitors || []
  const swot = raw.swot_analysis || {}
  const gaps = raw.market_gaps || []
  const advantages = raw.competitive_advantages || []
  const pricing = raw.pricing_analysis || {}
  const recommendations = raw.recommendations || []

  return (
    <div className="space-y-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link to={`/projects/${id}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Project
          </button>
        </Link>
        <h1 className="text-2xl font-bold gradient-brand-text">Competitor Analysis</h1>
        <p className="text-muted-foreground text-sm mt-1">{project?.business_name} · {competitors.length} competitors identified</p>
      </motion.div>

      {/* Competitors Grid */}
      <div className="space-y-4">
        <h2 className="font-semibold text-foreground">Competitive Landscape</h2>
        {competitors.map((comp: any, i: number) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold">
                      {comp.name?.[0] || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground">{comp.name}</h3>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', comp.type === 'direct' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>{comp.type}</span>
                      </div>
                      <a href={`https://${comp.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                        {comp.website} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Market Share</p>
                    <p className="text-sm font-semibold text-foreground">{comp.market_share}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{comp.description}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">✅ STRENGTHS</p>
                    <ul className="space-y-1">
                      {(comp.strengths || []).map((s: string, j: number) => <li key={j} className="text-xs text-foreground">{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">❌ WEAKNESSES</p>
                    <ul className="space-y-1">
                      {(comp.weaknesses || []).map((w: string, j: number) => <li key={j} className="text-xs text-foreground">{w}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">💰 PRICING</p>
                    <p className="text-xs text-foreground">{comp.pricing}</p>
                    <p className="text-xs font-semibold text-muted-foreground mt-2 mb-1">🎯 TARGET</p>
                    <p className="text-xs text-foreground">{comp.target_market}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* SWOT Analysis */}
      <div>
        <h2 className="font-semibold text-foreground mb-4">Your SWOT Analysis</h2>
        <div className="grid grid-cols-2 gap-4">
          <SwotBox type="strengths" items={swot.strengths || []} />
          <SwotBox type="weaknesses" items={swot.weaknesses || []} />
          <SwotBox type="opportunities" items={swot.opportunities || []} />
          <SwotBox type="threats" items={swot.threats || []} />
        </div>
      </div>

      {/* Market Gaps & Advantages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Market Gaps (Your Opportunities)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {gaps.map((gap: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="font-medium text-sm text-foreground">{gap.gap}</p>
                <p className="text-xs text-muted-foreground mt-1">{gap.opportunity}</p>
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full mt-2 inline-block', gap.size === 'large' ? 'bg-green-100 text-green-700' : gap.size === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700')}>
                  {gap.size} opportunity
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Your Competitive Advantages</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {advantages.map((adv: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full gradient-brand text-white text-xs font-bold flex items-center justify-center shrink-0">✓</span>
                  <span className="text-sm text-foreground">{adv}</span>
                </li>
              ))}
            </ul>
            {pricing.our_recommended_price && (
              <div className="mt-4 p-3 rounded-lg gradient-brand text-white text-sm">
                <p className="font-bold mb-1">Recommended Pricing:</p>
                <p className="opacity-90">{pricing.our_recommended_price}</p>
                <p className="text-xs opacity-75 mt-1">{pricing.rationale}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
