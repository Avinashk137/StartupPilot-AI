import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Play, FileText, BarChart3, Bot, Clock, Globe, DollarSign,
  CheckCircle, Loader, XCircle, RefreshCw, Download, TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import api from '@/lib/api'

const AGENT_INFO: Record<string, { label: string; desc: string; icon: string }> = {
  research: { label: 'Research Agent', desc: 'Market size, trends, opportunities', icon: '🔍' },
  competitor: { label: 'Competitor Agent', desc: 'Competitor analysis & SWOT', icon: '🎯' },
  business_plan: { label: 'Business Plan Agent', desc: 'Full business plan creation', icon: '📋' },
  finance: { label: 'Finance Agent', desc: 'Financial forecasts & charts', icon: '💰' },
  marketing: { label: 'Marketing Agent', desc: 'Social posts & strategy', icon: '📣' },
  advertisement: { label: 'Advertisement Agent', desc: 'Ad copy & campaigns', icon: '📺' },
  analytics: { label: 'Analytics Agent', desc: 'CEO scores & recommendations', icon: '📊' },
}

const REPORT_LINKS = [
  { key: 'research', label: 'Market Research', icon: TrendingUp, path: 'research' },
  { key: 'competitor', label: 'Competitor Analysis', icon: BarChart3, path: 'competitor' },
  { key: 'business_plan', label: 'Business Plan', icon: FileText, path: 'business-plan' },
  { key: 'finance', label: 'Financial Report', icon: DollarSign, path: 'finance' },
  { key: 'marketing', label: 'Marketing Strategy', icon: Globe, path: 'marketing' },
  { key: 'advertisement', label: 'Advertisements', icon: Play, path: 'advertisement' },
  { key: 'analytics', label: 'CEO Analytics', icon: BarChart3, path: 'analytics' },
]

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<any>(null)
  const [reports, setReports] = useState<any>({})
  const [agentLogs, setAgentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const loadProject = async () => {
    try {
      const [projRes, logsRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/agent-logs`),
      ])
      setProject(projRes.data.data)
      setAgentLogs(logsRes.data.data)

      if (projRes.data.data.status === 'completed') {
        const reportsRes = await api.get(`/projects/${id}/reports`)
        setReports(reportsRes.data.data)
      }
    } catch {
      navigate('/projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProject()
  }, [id])

  // Poll when processing
  useEffect(() => {
    if (project?.status === 'processing') {
      const interval = setInterval(loadProject, 3000)
      return () => clearInterval(interval)
    }
  }, [project?.status])

  const handleRun = async () => {
    setRunning(true)
    try {
      await api.post(`/projects/${id}/run`)
      setTimeout(loadProject, 1000)
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to start analysis')
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="h-40 animate-shimmer rounded-xl" />
        <div className="h-64 animate-shimmer rounded-xl" />
      </div>
    )
  }

  if (!project) return null

  const isProcessing = project.status === 'processing'
  const isCompleted = project.status === 'completed'
  const isDraft = project.status === 'draft' || project.status === 'failed'

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-2">
          <Link to="/projects">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Projects
            </button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-lg shrink-0">
              {project.business_name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.business_name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>{project.industry}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{project.country}</span>
                {project.budget && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{formatCurrency(project.budget, project.budget_currency)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDraft && (
              <Button onClick={handleRun} loading={running} className="gap-2">
                <Play className="w-4 h-4" />
                Run AI Analysis
              </Button>
            )}
            {isProcessing && (
              <Button variant="outline" disabled className="gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Analyzing...
              </Button>
            )}
            {isCompleted && (
              <Button variant="outline" onClick={handleRun} loading={running} size="sm" className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Re-analyze
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        {isProcessing && (
          <Card>
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">
                    {project.current_agent
                      ? `Running: ${AGENT_INFO[project.current_agent]?.label || project.current_agent}`
                      : 'Starting analysis...'}
                  </span>
                </div>
                <span className="text-sm font-bold text-primary">{project.progress_percent}%</span>
              </div>
              <Progress value={project.progress_percent} />
              <p className="text-xs text-muted-foreground mt-2">
                🤖 7 AI agents working on your business blueprint. This takes 3-5 minutes.
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Business Idea</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{project.business_idea}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Project Details</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  {[
                    ['Stage', project.business_stage?.replace('_', ' ')],
                    ['Risk Appetite', project.risk_appetite],
                    ['Timeline', project.timeline || 'Not specified'],
                    ['Target Audience', project.target_audience || 'Not specified'],
                    ['Created', formatDate(project.created_at)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                      <dt className="text-muted-foreground w-32 shrink-0 capitalize">{label}:</dt>
                      <dd className="font-medium text-foreground capitalize truncate">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {REPORT_LINKS.map((report) => {
              const reportData = reports[report.key]
              const available = reportData?.available

              return (
                <Card key={report.key} className={cn('card-hover', !available && 'opacity-60')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg gradient-brand bg-opacity-10 flex items-center justify-center">
                        <report.icon className="w-4 h-4 text-primary" />
                      </div>
                      {available ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : isProcessing ? (
                        <Loader className="w-4 h-4 text-muted-foreground animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="font-medium text-sm text-foreground">{report.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {available ? 'Ready to view' : isProcessing ? 'Generating...' : 'Run analysis first'}
                    </p>
                    {available && (
                      <Link to={`/projects/${id}/reports/${report.path}`} className="block mt-3">
                        <Button size="sm" variant="outline" className="w-full gap-1.5">
                          View Report
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <div className="space-y-3 mt-4">
            {Object.entries(AGENT_INFO).map(([key, info]) => {
              const log = agentLogs.find((l) => l.agent_name === key)
              const status = log?.status || (isProcessing && project.current_agent === key ? 'running' : 'pending')

              return (
                <Card key={key}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <span className="text-2xl">{info.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{info.label}</p>
                        {log && (
                          <span className="text-xs text-muted-foreground">
                            {log.ai_provider && `· ${log.ai_provider}`}
                            {log.tokens_used && ` · ${log.tokens_used} tokens`}
                            {log.duration_ms && ` · ${(log.duration_ms / 1000).toFixed(1)}s`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{info.desc}</p>
                    </div>
                    <div>
                      {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {status === 'running' && <Loader className="w-5 h-5 text-blue-500 animate-spin" />}
                      {status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                      {status === 'pending' && <Clock className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
