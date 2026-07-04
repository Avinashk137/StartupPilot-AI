import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Share2, MessageSquare, Mail, Copy, Check, Hash, Globe,
  TrendingUp, Target, Megaphone, BarChart3, Users, Search, Zap, CheckCircle2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import ReportShell from '@/components/reports/ReportShell'
import KpiCard from '@/components/reports/KpiCard'

const PALETTE = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function PostCard({ post, platform }: { post: any; platform: string }) {
  const content = post.caption || post.content || post.tweet || ''
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">{post.type || platform}</span>
          <CopyButton text={content} />
        </div>
        <p className="text-sm text-foreground leading-relaxed">{content}</p>
        {post.hashtags && (
          <p className="text-xs text-primary mt-2 leading-relaxed font-medium">{Array.isArray(post.hashtags) ? post.hashtags.join(' ') : post.hashtags}</p>
        )}
        {post.cta && (
          <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2 flex items-center gap-1">
            <Target className="w-3 h-3" /> CTA: {post.cta}
          </p>
        )}
        {post.image_concept && (
          <p className="text-xs text-muted-foreground/60 mt-1 italic">📷 {post.image_concept}</p>
        )}
      </CardContent>
    </Card>
  )
}

function EmailCard({ email }: { email: any }) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-semibold text-sm text-foreground">{email.campaign}</p>
            <p className="text-xs text-muted-foreground">{email.target_segment}</p>
          </div>
          <CopyButton text={email.body || ''} />
        </div>
        <div className="space-y-1.5 mb-3 text-sm">
          <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">Subject:</span><span className="font-medium text-foreground">{email.subject}</span></div>
          {email.preview && <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">Preview:</span><span className="text-foreground">{email.preview}</span></div>}
          {email.cta && <div className="flex gap-2"><span className="text-muted-foreground w-16 shrink-0">CTA:</span><span className="text-primary">{email.cta}</span></div>}
        </div>
        {email.body && (
          <div className="bg-muted rounded-xl p-3 text-xs text-muted-foreground max-h-36 overflow-y-auto leading-relaxed">{email.body}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default function MarketingReportPage({ projectId, hideNavigation, overrideData, overrideProject, overrideReportMetadata }: { projectId?: string, hideNavigation?: boolean, overrideData?: any, overrideProject?: any, overrideReportMetadata?: any } = {}) {
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
        api.get(`/projects/${id}/reports/marketing`),
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
  const strategy = raw.marketing_strategy || {}
  const seo = raw.seo_strategy || {}
  const growth = raw.growth_hacking_plan || []
  const hashtags = raw.hashtags || {}
  const leadGen = raw.lead_gen_strategy || {}
  const channels = strategy.channels || []

  // Channel budget chart
  const channelBudgetData = channels.map((ch: any, i: number) => ({
    name: ch.channel?.length > 14 ? ch.channel.slice(0, 14) + '…' : (ch.channel || `Channel ${i+1}`),
    budget: typeof ch.budget_percent === 'number' ? ch.budget_percent : (20 - i * 2),
    fill: PALETTE[i % PALETTE.length],
  }))

  // Funnel steps
  const funnel = leadGen.funnel || []

  const totalPosts = [
    ...(raw.instagram_posts || []),
    ...(raw.linkedin_posts || []),
    ...(raw.twitter_posts || []),
    ...(raw.facebook_posts || []),
  ].length
  const totalCampaigns = (raw.email_campaigns || []).length
  const totalKeywords = (seo.target_keywords || []).length
  const totalHacks = growth.length

  return (
    <ReportShell
      projectId={id!}
      reportType="marketing"
      title="Marketing Strategy"
      subtitle={`Project: ${project?.business_name || 'Unknown'} · Industry: ${project?.industry || 'N/A'}`}
      projectData={project}
      reportMetadata={report}
      accentColor="from-pink-600 to-rose-600"
      rawData={raw}
      loading={loading}
      error={error}
      onReload={loadData}
      hideNavigation={hideNavigation}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Social Posts Ready" value={String(totalPosts)} icon={Share2} iconColor="text-pink-500" highlight />
        <KpiCard label="Email Campaigns" value={String(totalCampaigns)} icon={Mail} iconColor="text-indigo-500" />
        <KpiCard label="Target Keywords" value={String(totalKeywords)} icon={Search} iconColor="text-emerald-500" />
        <KpiCard label="Growth Tactics" value={String(totalHacks)} icon={Zap} iconColor="text-amber-500" />
      </div>

      {/* Brand Positioning Banner */}
      {strategy.positioning && (
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-br from-pink-600 to-rose-700 p-6 text-white">
            <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Megaphone className="w-5 h-5" /> Brand Positioning
            </h2>
            <p className="text-white/90 text-sm leading-relaxed mb-4">{strategy.positioning}</p>
            {strategy.key_messages && (
              <div className="flex flex-wrap gap-2">
                {strategy.key_messages.map((msg: string, i: number) => (
                  <span key={i} className="text-xs bg-white/20 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm">{msg}</span>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Marketing Funnel */}
      {funnel.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-pink-500" /> Customer Acquisition Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnel.map((step: any, i: number) => {
                const width = Math.max(30, 100 - i * (60 / Math.max(funnel.length - 1, 1)))
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scaleX: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-4"
                    style={{ width: `${width}%` }}
                  >
                    <div
                      className="flex-1 rounded-xl py-3 px-5 text-white font-semibold text-sm text-center"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    >
                      {step.stage || step}
                    </div>
                    {(step.metric || step.conversion) && (
                      <span className="text-xs text-muted-foreground shrink-0">{step.metric || step.conversion}</span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Budget Chart */}
      {channelBudgetData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Marketing Channel Budget Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={channelBudgetData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={100} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="budget" radius={[0, 4, 4, 0]}>
                  {channelBudgetData.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Social Media Content Tabs */}
      <div>
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-pink-500" /> Social Media Content Library
        </h2>
        <Tabs defaultValue="instagram">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="instagram" className="gap-1.5 text-xs"><Share2 className="w-3 h-3" /> Instagram</TabsTrigger>
            <TabsTrigger value="linkedin" className="gap-1.5 text-xs"><Globe className="w-3 h-3" /> LinkedIn</TabsTrigger>
            <TabsTrigger value="twitter" className="gap-1.5 text-xs"><MessageSquare className="w-3 h-3" /> Twitter/X</TabsTrigger>
            <TabsTrigger value="facebook" className="gap-1.5 text-xs"><Share2 className="w-3 h-3" /> Facebook</TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5 text-xs"><Mail className="w-3 h-3" /> Email</TabsTrigger>
          </TabsList>

          <TabsContent value="instagram">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(raw.instagram_posts || []).map((post: any, i: number) => <PostCard key={i} post={post} platform="instagram" />)}
              {(raw.instagram_posts || []).length === 0 && <p className="text-muted-foreground text-sm col-span-2 py-6 text-center">No Instagram content generated</p>}
            </div>
          </TabsContent>
          <TabsContent value="linkedin">
            <div className="grid grid-cols-1 gap-4">
              {(raw.linkedin_posts || []).map((post: any, i: number) => <PostCard key={i} post={post} platform="linkedin" />)}
              {(raw.linkedin_posts || []).length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">No LinkedIn content generated</p>}
            </div>
          </TabsContent>
          <TabsContent value="twitter">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(raw.twitter_posts || []).map((post: any, i: number) => (
                <Card key={i} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400 px-2 py-0.5 rounded-full">Tweet</span>
                      <CopyButton text={post.tweet || ''} />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{post.tweet}</p>
                    {post.thread && post.thread.length > 0 && (
                      <div className="mt-3 space-y-2 border-l-2 border-sky-300 pl-3">
                        {post.thread.map((t: string, j: number) => <p key={j} className="text-xs text-muted-foreground">{t}</p>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(raw.twitter_posts || []).length === 0 && <p className="text-muted-foreground text-sm col-span-2 py-6 text-center">No Twitter content generated</p>}
            </div>
          </TabsContent>
          <TabsContent value="facebook">
            <div className="grid grid-cols-1 gap-4">
              {(raw.facebook_posts || []).map((post: any, i: number) => <PostCard key={i} post={post} platform="facebook" />)}
              {(raw.facebook_posts || []).length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">No Facebook content generated</p>}
            </div>
          </TabsContent>
          <TabsContent value="email">
            <div className="space-y-4">
              {(raw.email_campaigns || []).map((email: any, i: number) => <EmailCard key={i} email={email} />)}
              {(raw.email_campaigns || []).length === 0 && <p className="text-muted-foreground text-sm py-6 text-center">No email campaigns generated</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* SEO + Growth Hacking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-500" /> SEO Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {seo.target_keywords?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Target Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {seo.target_keywords.map((kw: string, i: number) => (
                    <span key={i} className={cn('text-xs px-3 py-1 rounded-full font-medium border',
                      i < 3 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-muted text-foreground border-border'
                    )}>
                      {i < 3 && '⭐ '}{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {seo.content_topics?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Content Topics</p>
                <ul className="space-y-1.5">
                  {seo.content_topics.map((t: string, i: number) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-emerald-500 shrink-0">•</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {seo.backlink_strategy && (
              <div className="p-3 rounded-xl bg-muted">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Backlink Strategy</p>
                <p className="text-sm text-foreground">{seo.backlink_strategy}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Growth Hacking Tactics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {growth.map((hack: any, i: number) => (
              <div key={i} className="p-3 rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <p className="font-semibold text-sm text-foreground">{hack.tactic}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                    hack.impact === 'high' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30' :
                    hack.impact === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/30'
                  )}>
                    {hack.impact} impact
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{hack.description}</p>
                {hack.expected_result && (
                  <p className="text-xs text-primary mt-1.5 flex items-start gap-1">
                    <TrendingUp className="w-3 h-3 shrink-0 mt-0.5" /> {hack.expected_result}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Hashtag Strategy */}
      {Object.keys(hashtags).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" /> Hashtag Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(hashtags).map(([type, tags]: [string, any]) => (
                <div key={type}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 capitalize">{type}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(tags) ? tags : []).map((tag: string, i: number) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 hover:bg-primary/20 cursor-default transition-colors">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead Gen Summary */}
      {leadGen.primary_channels && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Lead Generation Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {leadGen.primary_channels && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Primary Channels</p>
                  <ul className="space-y-1.5">
                    {(Array.isArray(leadGen.primary_channels) ? leadGen.primary_channels : [leadGen.primary_channels]).map((ch: string, i: number) => (
                      <li key={i} className="text-sm text-foreground flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{i+1}</span>
                        {ch}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {leadGen.nurture_sequence && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Nurture Sequence</p>
                  <ul className="space-y-1.5">
                    {(Array.isArray(leadGen.nurture_sequence) ? leadGen.nurture_sequence : [leadGen.nurture_sequence]).map((step: string, i: number) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-primary shrink-0 mt-0.5">→</span> {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {leadGen.conversion_tactics && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Conversion Tactics</p>
                  <ul className="space-y-1.5">
                    {(Array.isArray(leadGen.conversion_tactics) ? leadGen.conversion_tactics : [leadGen.conversion_tactics]).map((t: string, i: number) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-emerald-500 shrink-0 mt-0.5">✓</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </ReportShell>
  )
}
