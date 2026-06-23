import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Share2, MessageSquare, Mail, Copy, Check, Hash, Globe } from 'lucide-react'
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

function PostCard({ post, platform }: { post: any; platform: string }) {
  const content = post.caption || post.content || post.tweet || ''
  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">{post.type}</span>
          <CopyButton text={content} />
        </div>
        <p className="text-sm text-foreground leading-relaxed">{content}</p>
        {post.hashtags && (
          <p className="text-xs text-primary mt-2 leading-relaxed">{post.hashtags.join(' ')}</p>
        )}
        {post.cta && (
          <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">CTA: {post.cta}</p>
        )}
        {post.image_concept && (
          <p className="text-xs text-muted-foreground mt-1 italic">{post.image_concept}</p>
        )}
      </CardContent>
    </Card>
  )
}

function EmailCard({ email }: { email: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex justify-between mb-3">
          <div>
            <p className="font-semibold text-sm text-foreground">{email.campaign}</p>
            <p className="text-xs text-muted-foreground">{email.target_segment}</p>
          </div>
          <CopyButton text={email.body || ''} />
        </div>
        <div className="space-y-1.5 mb-3 text-sm">
          <div className="flex gap-2"><span className="text-muted-foreground w-16">Subject:</span><span className="font-medium text-foreground">{email.subject}</span></div>
          <div className="flex gap-2"><span className="text-muted-foreground w-16">Preview:</span><span className="text-foreground">{email.preview}</span></div>
          <div className="flex gap-2"><span className="text-muted-foreground w-16">CTA:</span><span className="text-primary">{email.cta}</span></div>
        </div>
        <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground max-h-32 overflow-y-auto">{email.body}</div>
      </CardContent>
    </Card>
  )
}

export default function MarketingReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}/reports/marketing`),
      api.get(`/projects/${id}`),
    ]).then(([r, p]) => {
      setReport(r.data.data)
      setProject(p.data.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-40 animate-shimmer rounded-xl" />)}</div>
  if (!report) return <div className="text-center py-20 text-muted-foreground">Report not yet generated</div>

  const raw = report.raw_data || {}
  const strategy = raw.marketing_strategy || {}
  const seo = raw.seo_strategy || {}
  const growth = raw.growth_hacking_plan || []
  const hashtags = raw.hashtags || {}
  const leadGen = raw.lead_gen_strategy || {}

  return (
    <div className="space-y-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link to={`/projects/${id}`}>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Project
          </button>
        </Link>
        <h1 className="text-2xl font-bold gradient-brand-text">Marketing Strategy</h1>
        <p className="text-muted-foreground text-sm mt-1">{project?.business_name} · Social content, SEO & growth</p>
      </motion.div>

      {/* Brand Strategy Banner */}
      {strategy.positioning && (
        <Card className="overflow-hidden">
          <div className="gradient-brand p-5 text-white">
            <h3 className="font-bold mb-2">Brand Positioning</h3>
            <p className="text-sm text-white/90">{strategy.positioning}</p>
            {strategy.key_messages && (
              <div className="mt-3 flex flex-wrap gap-2">
                {strategy.key_messages.map((msg: string, i: number) => (
                  <span key={i} className="text-xs bg-white/20 rounded-full px-3 py-1">{msg}</span>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Social Media Tabs */}
      <div>
        <h2 className="font-semibold text-foreground mb-4">Social Media Content</h2>
        <Tabs defaultValue="instagram">
          <TabsList className="mb-4">
            <TabsTrigger value="instagram" className="gap-1.5"><Share2 className="w-3.5 h-3.5" /> Instagram</TabsTrigger>
            <TabsTrigger value="linkedin" className="gap-1.5"><Globe className="w-3.5 h-3.5" /> LinkedIn</TabsTrigger>
            <TabsTrigger value="twitter" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Twitter</TabsTrigger>
            <TabsTrigger value="facebook" className="gap-1.5"><Share2 className="w-3.5 h-3.5" /> Facebook</TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</TabsTrigger>
          </TabsList>

          <TabsContent value="instagram">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(raw.instagram_posts || []).map((post: any, i: number) => <PostCard key={i} post={post} platform="instagram" />)}
            </div>
          </TabsContent>
          <TabsContent value="linkedin">
            <div className="grid grid-cols-1 gap-4">
              {(raw.linkedin_posts || []).map((post: any, i: number) => <PostCard key={i} post={post} platform="linkedin" />)}
            </div>
          </TabsContent>
          <TabsContent value="twitter">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(raw.twitter_posts || []).map((post: any, i: number) => (
                <Card key={i} className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-950/30 px-2 py-0.5 rounded-full">Tweet</span>
                      <CopyButton text={post.tweet || ''} />
                    </div>
                    <p className="text-sm text-foreground">{post.tweet}</p>
                    {post.thread && post.thread.length > 0 && (
                      <div className="mt-3 space-y-2 border-l-2 border-sky-300 pl-3">
                        {post.thread.map((t: string, j: number) => <p key={j} className="text-xs text-muted-foreground">{t}</p>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="facebook">
            <div className="grid grid-cols-1 gap-4">
              {(raw.facebook_posts || []).map((post: any, i: number) => <PostCard key={i} post={post} platform="facebook" />)}
            </div>
          </TabsContent>
          <TabsContent value="email">
            <div className="space-y-4">
              {(raw.email_campaigns || []).map((email: any, i: number) => <EmailCard key={i} email={email} />)}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* SEO + Growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">SEO Strategy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {seo.target_keywords && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">TARGET KEYWORDS</p>
                <div className="flex flex-wrap gap-2">
                  {seo.target_keywords.map((kw: string, i: number) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            )}
            {seo.content_topics && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">CONTENT TOPICS</p>
                <ul className="space-y-1">
                  {seo.content_topics.map((t: string, i: number) => <li key={i} className="text-sm text-foreground">• {t}</li>)}
                </ul>
              </div>
            )}
            {seo.backlink_strategy && <p className="text-sm text-muted-foreground">{seo.backlink_strategy}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Growth Hacking Plan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {growth.map((hack: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border border-border">
                <div className="flex justify-between mb-1">
                  <p className="font-medium text-sm text-foreground">{hack.tactic}</p>
                  <div className="flex gap-1">
                    <span className="text-xs text-muted-foreground">impact:</span>
                    <span className={cn('text-xs font-medium', hack.impact === 'high' ? 'text-green-500' : hack.impact === 'medium' ? 'text-orange-500' : 'text-blue-500')}>{hack.impact}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{hack.description}</p>
                {hack.expected_result && <p className="text-xs text-primary mt-1">→ {hack.expected_result}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Hashtags */}
      {Object.keys(hashtags).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Hashtag Strategy</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(hashtags).map(([type, tags]: [string, any]) => (
                <div key={type}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 capitalize">{type}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(tags) ? tags : []).map((tag: string, i: number) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
