import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export default function AdvertisementReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}/reports/advertisement`),
      api.get(`/projects/${id}`),
    ]).then(([r, p]) => {
      setReport(r.data.data)
      setProject(p.data.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-40 animate-shimmer rounded-xl" />)}</div>
  if (!report) return <div className="text-center py-20 text-muted-foreground">Report not yet generated</div>

  const raw = report.raw_data || {}
  const budget = raw.budget_recommendations || {}
  const campaign = raw.campaign_structure || {}
  const headlines = raw.headlines || []
  const ctas = raw.cta_variations || []

  return (
    <div className="space-y-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link to={`/projects/${id}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Project
          </button>
        </Link>
        <h1 className="text-2xl font-bold gradient-brand-text">Advertisement Campaigns</h1>
        <p className="text-muted-foreground text-sm mt-1">{project?.business_name} · Google, Facebook, Instagram & LinkedIn ads</p>
      </motion.div>

      {/* Headlines & CTAs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Ad Headlines</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {headlines.map((h: string, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-foreground font-medium">{h}</p>
                <CopyButton text={h} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">CTA Variations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ctas.map((cta: string, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 border-2 border-primary/20 rounded-lg">
                <p className="text-sm font-semibold text-primary">{cta}</p>
                <CopyButton text={cta} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Budget Allocation */}
      {budget.allocation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex justify-between">
              <span>Monthly Ad Budget Allocation</span>
              <span className="text-primary font-bold">Total: ${(budget.total_monthly || 0).toLocaleString()}/mo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budget.allocation.map((alloc: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{alloc.platform}</span>
                    <span className="text-sm font-bold text-foreground">${(alloc.amount || 0).toLocaleString()} ({alloc.percentage}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <motion.div
                      className="h-2.5 rounded-full gradient-brand"
                      initial={{ width: 0 }}
                      animate={{ width: `${alloc.percentage}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{alloc.rationale}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ad Platform Tabs */}
      <Tabs defaultValue="google">
        <TabsList className="mb-4">
          <TabsTrigger value="google">🔍 Google</TabsTrigger>
          <TabsTrigger value="facebook">📘 Facebook</TabsTrigger>
          <TabsTrigger value="instagram">📸 Instagram</TabsTrigger>
          <TabsTrigger value="linkedin">💼 LinkedIn</TabsTrigger>
          <TabsTrigger value="retargeting">🎯 Retargeting</TabsTrigger>
        </TabsList>

        <TabsContent value="google">
          <div className="space-y-4">
            {(raw.google_ads?.search_campaigns || []).map((camp: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground mb-3">{camp.campaign_name}</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">KEYWORDS</p>
                      <ul className="space-y-1">{(camp.keywords || []).map((k: string, j: number) => <li key={j} className="text-xs text-primary">[{k}]</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">HEADLINES</p>
                      <ul className="space-y-1">{(camp.headlines || []).map((h: string, j: number) => <li key={j} className="text-xs text-foreground">{h}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">DESCRIPTIONS</p>
                      <ul className="space-y-1">{(camp.descriptions || []).map((d: string, j: number) => <li key={j} className="text-xs text-foreground">{d}</li>)}</ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {['facebook', 'instagram', 'linkedin', 'retargeting'].map(platform => (
          <TabsContent key={platform} value={platform}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(raw[`${platform}_ads`] || []).map((ad: any, i: number) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex justify-between mb-3">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{ad.format || ad.campaign_objective || ad.audience}</span>
                      <CopyButton text={ad.primary_text || ad.caption || ad.intro_text || ad.message || ''} />
                    </div>
                    {ad.headline && <p className="font-bold text-foreground mb-2">{ad.headline}</p>}
                    {(ad.primary_text || ad.caption || ad.intro_text || ad.message) && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{ad.primary_text || ad.caption || ad.intro_text || ad.message}</p>
                    )}
                    {ad.visual_concept && <p className="text-xs text-blue-400 mt-2 italic">Visual: {ad.visual_concept}</p>}
                    {ad.cta && <div className="mt-3 pt-3 border-t border-border"><span className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-medium">{ad.cta}</span></div>}
                    {ad.targeting && <p className="text-xs text-muted-foreground mt-2">Target: {ad.targeting}</p>}
                    {ad.audience && platform === 'retargeting' && <p className="text-xs text-muted-foreground mt-2">Audience: {ad.audience}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Campaign Timeline */}
      {Object.keys(campaign).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Campaign Rollout Timeline</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(campaign).map(([phase, data]: [string, any]) => (
                <div key={phase} className={cn('p-4 rounded-xl border-2', phase === 'phase1' ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20' : phase === 'phase2' ? 'border-purple-200 bg-purple-50 dark:bg-purple-950/20' : 'border-green-200 bg-green-50 dark:bg-green-950/20')}>
                  <p className="font-bold text-sm text-foreground capitalize">{phase.replace('phase', 'Phase ')}</p>
                  <p className="text-xs text-muted-foreground">{data.duration}</p>
                  <p className="text-xs font-medium text-foreground mt-2 capitalize">Focus: {data.focus}</p>
                  <p className="text-sm font-bold text-primary mt-1">${(data.budget || 0).toLocaleString()}/mo</p>
                  <p className="text-xs text-muted-foreground mt-1">KPI: {data.kpi}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
