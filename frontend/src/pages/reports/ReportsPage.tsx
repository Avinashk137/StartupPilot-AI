import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, TrendingUp, DollarSign, Users, Megaphone, 
  Search, X, Play, RefreshCw, AlertCircle, ChevronLeft, Calendar, Download
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useExportPDF } from '@/hooks/useExportPDF'

// Import report pages
import ResearchReportPage from '@/pages/projects/reports/ResearchReportPage'
import CompetitorReportPage from '@/pages/projects/reports/CompetitorReportPage'
import BusinessPlanReportPage from '@/pages/projects/reports/BusinessPlanReportPage'
import FinancialReportPage from '@/pages/projects/reports/FinancialReportPage'
import MarketingReportPage from '@/pages/projects/reports/MarketingReportPage'

import api from '@/lib/api'
import { cn } from '@/lib/utils'

// Interfaces
interface ReportData {
  status: string
  raw_data?: any
  updated_at?: string
}

interface Project {
  id: string
  business_name: string
  industry: string
  country: string
  state: string
  budget: number
  status: string
  created_at: string
  research_reports: ReportData[]
  competitor_reports: ReportData[]
  business_plans: ReportData[]
  financial_reports: ReportData[]
  marketing_reports: ReportData[]
}

const REPORT_TYPES = [
  { id: 'research', key: 'research_reports', icon: TrendingUp, label: 'Market Research', desc: 'TAM, SAM, SOM, trends, opportunities', color: 'bg-blue-500' },
  { id: 'competitor', key: 'competitor_reports', icon: Users, label: 'Competitor Analysis', desc: 'SWOT, pricing, market gaps', color: 'bg-violet-500' },
  { id: 'business-plan', key: 'business_plans', icon: FileText, label: 'Business Plan', desc: 'Executive summary, strategy, roadmap', color: 'bg-emerald-500' },
  { id: 'finance', key: 'financial_reports', icon: DollarSign, label: 'Financial Report', desc: 'Forecasts, cashflow, break-even', color: 'bg-amber-500' },
  { id: 'marketing', key: 'marketing_reports', icon: Megaphone, label: 'Marketing Strategy', desc: 'Social posts, campaigns, SEO', color: 'bg-pink-500' },
]

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  
  // Modal State
  const [selectedReport, setSelectedReport] = useState<{
    projectId: string, 
    typeId: string, 
    title: string, 
    reportData: any,
    viewingVersion?: number // undefined means latest
  } | null>(null)
  
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Fetch Data
  useEffect(() => {
    let isMounted = true
    
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get('/reports/dashboard')
        if (isMounted) {
          setProjects(data.data || [])
          setError(null)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to fetch reports dashboard', err)
        if (isMounted) {
          setProjects([])
          setError('Unable to load reports. Please try again.')
          setLoading(false)
        }
      }
    }

    fetchDashboard()

    const interval = setInterval(fetchDashboard, 5000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [refreshTrigger])

  const handleAction = async (projectId: string, action: 'retry' | 'resume') => {
    try {
      if (action === 'retry') {
        await api.post(`/projects/${projectId}/run`, { retry_mode: true })
      } else {
        await api.post(`/projects/${projectId}/run`, { resume_mode: true })
      }
      setRefreshTrigger(prev => prev + 1)
    } catch (err) {
      console.error(`Failed to ${action} project`, err)
    }
  }

  const handleRegenerate = async (projectId: string, reportType: string) => {
    try {
      await api.post(`/projects/${projectId}/reports/${reportType}/regenerate`)
      setRefreshTrigger(prev => prev + 1)
    } catch (err) {
      console.error('Failed to regenerate report', err)
    }
  }

  const getReport = (project: Project, categoryKey: string): ReportData | null => {
    const reportData = (project as any)[categoryKey]
    if (reportData && !Array.isArray(reportData)) return reportData
    if (Array.isArray(reportData) && reportData.length > 0) return reportData[0]
    return null
  }

  // View: 1. Categories Grid
  if (!activeCategory) {
    return (
      <div className="space-y-6 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">Report Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Select a report category to view all generated intelligence.</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="h-[140px] flex flex-col p-5 bg-muted/20 animate-pulse">
                <div className="flex gap-3 items-center mb-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/50" />
                  <div className="w-32 h-5 bg-muted/50 rounded" />
                </div>
                <div className="w-full h-3 bg-muted/50 rounded mb-2 mt-auto" />
                <div className="w-2/3 h-3 bg-muted/50 rounded" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border rounded-2xl">
            <AlertCircle className="w-10 h-10 text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Failed to Load</h3>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => setRefreshTrigger(p => p + 1)}>
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_TYPES.map((cat, i) => (
              <motion.div key={cat.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card 
                  className="card-hover cursor-pointer h-full"
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <CardContent className="p-5">
                    <div className={`w-10 h-10 rounded-xl ${cat.color} bg-opacity-15 flex items-center justify-center mb-3`}>
                      <cat.icon className={`w-5 h-5 ${cat.color.replace('bg-', 'text-')}`} />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{cat.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{cat.desc}</p>
                    
                    {/* Tiny stats overview could go here */}
                    <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
                      <span>{projects.filter(p => getReport(p, cat.key)?.status === 'completed').length} completed</span>
                      <ChevronLeft className="w-4 h-4 rotate-180" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // View: 2. Project List for Category
  const category = REPORT_TYPES.find(c => c.id === activeCategory)
  if (!category) {
    return null
  }
  
  const filteredProjects = projects.filter(p => {
    const report = getReport(p, category.key)
    // Only show projects that have an actual report, OR are in draft status (meaning they haven't run AI yet)
    if (!report && p.status !== 'draft') return false
    
    // Basic search filtering
    const s = search.toLowerCase()
    const matchesSearch = !s || 
      p.business_name?.toLowerCase().includes(s) || 
      p.industry?.toLowerCase().includes(s)
    
    return matchesSearch
  })

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground" onClick={() => setActiveCategory(null)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Categories
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${category.color} bg-opacity-15 flex items-center justify-center`}>
              <category.icon className={`w-5 h-5 ${category.color.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{category.label}</h1>
              <p className="text-muted-foreground text-sm">{category.desc}</p>
            </div>
          </div>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </motion.div>

      <div className="grid gap-3">
        {filteredProjects.map((project) => {
          const report = getReport(project, category.key)
          const status = report?.status || (project.status === 'draft' ? 'draft' : 'pending')
          const rawData = report?.raw_data || {}
          
          let badge = <Badge variant="secondary">Pending</Badge>
          if (status === 'completed') badge = <Badge className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>
          if (status === 'running') badge = <Badge className="bg-blue-500 hover:bg-blue-600 animate-pulse">Processing</Badge>
          if (status === 'failed') badge = <Badge variant="destructive">Failed</Badge>
          if (status === 'draft') badge = <Badge variant="outline" className="text-muted-foreground">Draft</Badge>
          
          return (
            <Card key={project.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center p-4">
                  {/* Left Side */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-sm truncate">{project.business_name || 'Untitled Project'}</h3>
                      {badge}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary/40" />{project.industry || 'Unknown'}</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary/40" />{project.country || 'Unknown'}</span>
                      {report?.updated_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Side / Actions */}
                  <div className="shrink-0 flex items-center gap-3">
                    {status === 'running' && (
                      <div className="w-48 text-right mr-4 hidden md:block">
                        <div className="flex justify-between text-xs mb-1.5 text-muted-foreground">
                          <span className="truncate pr-2">{rawData?.progress_step || 'Generating...'}</span>
                          <span>{rawData?.progress_percent || 0}%</span>
                        </div>
                        <Progress value={rawData?.progress_percent || 0} className="h-1.5" />
                      </div>
                    )}
                    
                    {status === 'failed' && (
                      <div className="text-xs text-destructive max-w-[200px] truncate mr-4 hidden md:block" title={rawData?.error}>
                        {rawData?.error || 'Generation failed'}
                      </div>
                    )}

                    {status === 'completed' && report && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => setSelectedReport({
                            projectId: project.id,
                            typeId: category.id,
                            title: category.label,
                            reportData: report
                          })}
                        >
                          <FileText className="w-4 h-4 mr-2" /> View Report
                        </Button>
                      </>
                    )}
                    
                    {status === 'running' && (
                      <Button variant="outline" size="sm" onClick={() => handleAction(project.id, 'resume')}>
                        <Play className="w-4 h-4 mr-2" /> Resume
                      </Button>
                    )}

                    {status === 'failed' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleAction(project.id, 'resume')}>
                          <Play className="w-4 h-4 mr-2" /> Resume
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleAction(project.id, 'retry')} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                          <RefreshCw className="w-4 h-4 mr-2" /> Retry
                        </Button>
                      </>
                    )}

                    {status === 'draft' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => window.location.href = `/projects/create?draft=${project.id}`}>
                          Continue Editing
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleAction(project.id, 'resume')}>
                          <Play className="w-4 h-4 mr-2" /> Run Analysis
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        
        {filteredProjects.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No projects found matching your criteria.
          </div>
        )}
      </div>

      {/* Modal / Slide Over for Viewing Report */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-center"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-6xl my-4 mx-4 bg-card border shadow-2xl rounded-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">{selectedReport.title}</h2>
                    {selectedReport.reportData?.version > 1 && (
                      <Badge variant="outline" className="bg-background">v{selectedReport.viewingVersion || selectedReport.reportData.version}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Project: {projects.find(p => p.id === selectedReport.projectId)?.business_name}</p>
                </div>
                
                <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
                  {selectedReport.reportData?.previous_versions?.length > 0 && (
                    <Select 
                      value={selectedReport.viewingVersion?.toString() || selectedReport.reportData?.version?.toString() || '1'} 
                      onValueChange={(val) => setSelectedReport(prev => prev ? {...prev, viewingVersion: parseInt(val)} : null)}
                    >
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={selectedReport.reportData?.version?.toString() || '1'}>Latest (v{selectedReport.reportData?.version || 1})</SelectItem>
                        {selectedReport.reportData.previous_versions.map((v: any, i: number) => (
                          <SelectItem key={i} value={v.version?.toString() || (i + 1).toString()}>
                            Version {v.version || (i + 1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {/* Removed Download PDF button, now inside ReportShell */}
                  <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => setSelectedReport(null)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-0 md:p-6 scrollbar-custom bg-background/50">
                {(() => {
                  let dataToPass = selectedReport.reportData.raw_data
                  let reportMetadataToPass = selectedReport.reportData
                  if (selectedReport.viewingVersion && selectedReport.viewingVersion !== selectedReport.reportData.version) {
                    const historic = selectedReport.reportData.previous_versions?.find((v: any) => v.version === selectedReport.viewingVersion)
                    if (historic) {
                      dataToPass = historic.raw_data
                      reportMetadataToPass = historic
                    }
                  }
                  
                  const projectToPass = projects.find(p => p.id === selectedReport.projectId)
                  
                  return (
                    <>
                      {selectedReport.typeId === 'research' && <ResearchReportPage projectId={selectedReport.projectId} hideNavigation={true} overrideData={dataToPass} overrideProject={projectToPass} overrideReportMetadata={reportMetadataToPass} />}
                      {selectedReport.typeId === 'competitor' && <CompetitorReportPage projectId={selectedReport.projectId} hideNavigation={true} overrideData={dataToPass} overrideProject={projectToPass} overrideReportMetadata={reportMetadataToPass} />}
                      {selectedReport.typeId === 'business-plan' && <BusinessPlanReportPage projectId={selectedReport.projectId} hideNavigation={true} overrideData={dataToPass} overrideProject={projectToPass} overrideReportMetadata={reportMetadataToPass} />}
                      {selectedReport.typeId === 'finance' && <FinancialReportPage projectId={selectedReport.projectId} hideNavigation={true} overrideData={dataToPass} overrideProject={projectToPass} overrideReportMetadata={reportMetadataToPass} />}
                      {selectedReport.typeId === 'marketing' && <MarketingReportPage projectId={selectedReport.projectId} hideNavigation={true} overrideData={dataToPass} overrideProject={projectToPass} overrideReportMetadata={reportMetadataToPass} />}
                    </>
                  )
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
