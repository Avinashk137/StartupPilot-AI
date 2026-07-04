import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
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
import { Breadcrumb } from '@/components/navigation/Breadcrumb'
const AGENT_INFO: Record<string, { label: string; desc: string; icon: string }> = {
  research: { label: 'Research Agent', desc: 'Market size, trends, opportunities', icon: '🔍' },
  competitor: { label: 'Competitor Agent', desc: 'Competitor analysis & SWOT', icon: '🎯' },
  business_plan: { label: 'Business Plan Agent', desc: 'Full business plan creation', icon: '📋' },
  finance: { label: 'Finance Agent', desc: 'Financial forecasts & charts', icon: '💰' },
  marketing: { label: 'Marketing Agent', desc: 'Social posts & strategy', icon: '📣' },
}

const REPORT_LINKS = [
  { key: 'research', label: 'Market Research', icon: TrendingUp, path: 'research' },
  { key: 'competitor', label: 'Competitor Analysis', icon: BarChart3, path: 'competitor' },
  { key: 'business_plan', label: 'Business Plan', icon: FileText, path: 'business-plan' },
  { key: 'finance', label: 'Financial Report', icon: DollarSign, path: 'financial' },
  { key: 'marketing', label: 'Marketing Strategy', icon: Globe, path: 'marketing' },
]

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [project, setProject] = useState<any>(null)
  const [projectStatus, setProjectStatus] = useState<any>(null)
  const [reports, setReports] = useState<any>({})
  const [agentLogs, setAgentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [runError, setRunError] = useState<string | null>(null)
  const [regeneratingReport, setRegeneratingReport] = useState<string | null>(null)
  const pollingRef = useRef<any>(null)

  const loadProject = async () => {
    try {
      const [projRes, logsRes, statusRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/agent-logs`),
        api.get(`/projects/${id}/status`)
      ])
      
      const projData = projRes.data.data
      setProject(projData)
      setAgentLogs(logsRes.data.data)
      setProjectStatus(statusRes.data.data)

      if (projData.status === 'completed' || projData.status === 'failed' || projData.status === 'partial') {
        const reportsRes = await api.get(`/projects/${id}/reports`)
        setReports(reportsRes.data.data)
      }
    } catch {
      navigate('/projects')
    } finally {
      setLoading(false)
    }
  }

  const pollStatus = async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        api.get(`/projects/${id}/status`),
        api.get(`/projects/${id}/agent-logs`)
      ])
      
      const s = statusRes.data.data
      setProjectStatus(s)
      setAgentLogs(logsRes.data.data)
      
      setProject((p: any) => p ? {
        ...p,
        status: s.status,
        progress_percent: s.progress_percent,
        current_agent: s.current_agent,
        error_message: s.error_message
      } : p)

      const reportsRes = await api.get(`/projects/${id}/reports`)
      const reps = reportsRes.data.data
      setReports(reps)
      
      const anyRunning = Object.values(reps).some((r: any) => r.status === 'running')
      const anyGlobalProcessing = s.status === 'processing'

      if (!anyGlobalProcessing && !anyRunning) {
        clearInterval(pollingRef.current)
        setRunning(false)
        setRegeneratingReport(null)
      }
    } catch (e) {
      console.error("Polling error", e)
    }
  }

  useEffect(() => {
    loadProject()
    return () => clearInterval(pollingRef.current)
  }, [id])

  useEffect(() => {
    if (project?.status === 'processing') {
      pollingRef.current = setInterval(pollStatus, 2000)
    }
    return () => clearInterval(pollingRef.current)
  }, [project?.status])

  const handleRun = async () => {
    if (running || project?.status === 'processing') return
    
    setRunning(true)
    setRunError(null)
    try {
      await api.post(`/projects/${id}/run`)
      // Immediately start polling
      pollingRef.current = setInterval(pollStatus, 2000)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to start analysis'
      setRunError(msg)
      setRunning(false)
    }
  }

  const handleRegenerate = async (reportPath: string) => {
    if (regeneratingReport) return
    
    setRegeneratingReport(reportPath)
    
    // Optimistically set to processing to immediately trigger the progress UI
    setProject((p: any) => p ? { ...p, status: 'processing', current_agent: reportPath } : p)
    
    try {
      await api.post(`/projects/${id}/reports/${reportPath}/regenerate`)
      clearInterval(pollingRef.current)
      pollingRef.current = setInterval(pollStatus, 2000)
    } catch (err: any) {
      console.error("Failed to regenerate report:", err)
      setRegeneratingReport(null)
      loadProject() // Reload to restore state if it immediately fails
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
  const isPartial = project.status === 'partial'
  const isDraft = project.status === 'draft'
  const isFailed = project.status === 'failed'
  
  const canReanalyze = isCompleted && projectStatus?.is_modified

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumb projectId={id} projectName={project?.business_name} currentPage="Project Detail" />
      
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
                    <span>{formatCurrency(project.budget, project.budget_currency)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(isDraft || isFailed || isPartial) && (
              <Button onClick={handleRun} disabled={running || isProcessing} className="gap-2">
                <Play className="w-4 h-4" />
                {isFailed ? 'Retry Analysis' : isPartial ? 'Resume & Retry Failed' : 'Run AI Analysis'}
              </Button>
            )}
            {isProcessing && (
              <Button variant="outline" disabled className="gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Analyzing...
              </Button>
            )}
            {canReanalyze && !isProcessing && (
              <Button variant="outline" onClick={handleRun} disabled={running} size="sm" className="gap-2 border-primary/50 text-primary hover:bg-primary/5">
                <RefreshCw className="w-3.5 h-3.5" />
                Apply Updates & Re-analyze
              </Button>
            )}
          </div>
        </div>

        {/* Progress / Live Status Cards */}
        {isProcessing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">AI Analysis in Progress</h3>
                <p className="text-sm text-muted-foreground">Agents are working in a hybrid pipeline.</p>
              </div>
              <span className="text-2xl font-black text-primary">{project.progress_percent}%</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.keys(AGENT_INFO).map((key) => {
                const info = AGENT_INFO[key]
                const report = reports?.[key]
                const log = agentLogs.find(l => l.agent_name === key)
                const isCurrent = project.current_agent === key || report?.status === 'running'
                const isDone = report?.status === 'completed' || log?.status === 'completed'
                const isFailed = report?.status === 'failed' || log?.status === 'failed'
                
                let statusText = 'Queued'
                let StatusIcon = Clock
                let statusColor = 'text-muted-foreground'
                let bgColor = 'bg-card'
                let borderColor = 'border-border'

                if (isFailed) {
                  statusText = 'Failed'
                  StatusIcon = XCircle
                  statusColor = 'text-destructive'
                  bgColor = 'bg-destructive/5'
                  borderColor = 'border-destructive/20'
                } else if (isDone) {
                  statusText = 'Completed'
                  StatusIcon = CheckCircle
                  statusColor = 'text-emerald-500'
                  bgColor = 'bg-emerald-500/5'
                  borderColor = 'border-emerald-500/20'
                } else if (isCurrent) {
                  statusText = 'Running'
                  StatusIcon = Loader
                  statusColor = 'text-primary'
                  bgColor = 'bg-primary/5'
                  borderColor = 'border-primary/20'
                }

                return (
                  <Card key={key} className={cn("transition-colors shadow-sm", bgColor, borderColor)}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="text-2xl mt-0.5">{info.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm truncate pr-2">{info.label}</h4>
                          <StatusIcon className={cn("w-4 h-4 shrink-0", isCurrent && "animate-spin", statusColor)} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{info.desc}</p>
                        <div className={cn("text-xs font-medium mt-2", statusColor)}>
                          {statusText}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Show partial completion warning */}
        {project.status === 'partial' && project.error_message && (
          <Card className="border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20">
            <CardContent className="py-3 px-5">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Partially Completed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{project.error_message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show project error when status is failed */}
        {project.status === 'failed' && project.error_message && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-3 px-5">
              <div className="flex items-start gap-3">
                <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Analysis Failed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{project.error_message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Run button error feedback */}
        {runError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-3 px-5">
              <div className="flex items-start gap-3">
                <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Could not start analysis</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{runError}</p>
                </div>
              </div>
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
              const repStatus = reportData?.status || 'pending'
              const isRepRunning = repStatus === 'running' || regeneratingReport === report.path || (isProcessing && project.current_agent === report.key)
              const isRepFailed = repStatus === 'failed'
              const progressStep = reportData?.data?.raw_data?.progress_step
              const progressPct = reportData?.data?.raw_data?.progress_percent

              return (
                <Card key={report.key} className={cn('transition-all hover:shadow-md border-border', (!available && !isRepFailed && !isRepRunning) && 'opacity-70')}>
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", available ? "bg-primary/10" : isRepFailed ? "bg-destructive/10" : "bg-muted")}>
                        <report.icon className={cn("w-5 h-5", available ? "text-primary" : isRepFailed ? "text-destructive" : "text-muted-foreground")} />
                      </div>
                      {available ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full dark:bg-emerald-950/30 dark:text-emerald-400">Completed</span>
                      ) : isRepFailed ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive px-2 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      ) : isRepRunning ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1 dark:bg-blue-950/30 dark:text-blue-400">
                          <Loader className="w-3 h-3 animate-spin" /> {regeneratingReport === report.path ? 'Regenerating' : 'Running'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Pending</span>
                      )}
                    </div>
                    <div className="mb-4">
                      <h3 className="font-bold text-base text-foreground">{report.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {AGENT_INFO[report.key]?.desc}
                      </p>
                    </div>
                    <div className="mt-auto space-y-2">
                      {available ? (
                        <>
                          <Link to={`/projects/${id}/reports/${report.path}`} className="block">
                            <Button size="sm" className="w-full gap-1.5 shadow-sm">
                              View Report
                            </Button>
                          </Link>
                          <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => handleRegenerate(report.path)} disabled={!!regeneratingReport}>
                            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                          </Button>
                        </>
                      ) : isRepFailed && !isRepRunning ? (
                        <Button size="sm" variant="destructive" className="w-full gap-1.5 shadow-sm" onClick={() => handleRegenerate(report.path)} disabled={!!regeneratingReport}>
                          <RefreshCw className="w-3.5 h-3.5" /> Retry
                        </Button>
                      ) : isRepRunning ? (
                        <Button size="sm" variant="secondary" className="w-full gap-1.5 cursor-not-allowed" disabled>
                          <Loader className="w-3.5 h-3.5 animate-spin" /> {progressStep ? `${progressStep} (${progressPct}%)` : (regeneratingReport === report.path ? 'Retrying...' : 'Please Wait')}
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" className="w-full gap-1.5" onClick={() => handleRegenerate(report.path)} disabled={!!regeneratingReport}>
                          <Play className="w-3.5 h-3.5" /> Generate Report
                        </Button>
                      )}
                    </div>
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
                <Card key={key} className={cn("transition-colors", isProcessing && project.current_agent === key && "border-primary/50 shadow-sm")}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl shrink-0">
                      {info.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm text-foreground">{info.label}</h4>
                        {status === 'running' && <span className="flex h-2 w-2 relative ml-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{info.desc}</p>
                    </div>
                    <div className="flex flex-col sm:items-end gap-1 min-w-[140px]">
                      <div className="flex items-center gap-1.5">
                        {status === 'completed' && <><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-xs font-semibold text-emerald-500 uppercase">Completed</span></>}
                        {status === 'running' && <><Loader className="w-4 h-4 text-primary animate-spin" /><span className="text-xs font-semibold text-primary uppercase">Generating</span></>}
                        {status === 'failed' && <><XCircle className="w-4 h-4 text-destructive" /><span className="text-xs font-semibold text-destructive uppercase">Failed</span></>}
                        {status === 'pending' && <><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-xs font-semibold text-muted-foreground uppercase">Waiting</span></>}
                      </div>
                      {log && (
                        <div className="text-[10px] text-muted-foreground/70 font-mono">
                          {log.ai_provider && `${log.ai_provider} `}
                          {log.tokens_used && `• ${log.tokens_used}tk `}
                          {log.duration_ms && `• ${(log.duration_ms / 1000).toFixed(1)}s`}
                        </div>
                      )}
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
