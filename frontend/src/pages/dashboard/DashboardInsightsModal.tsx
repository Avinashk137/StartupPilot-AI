import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, CheckCircle, Clock, Loader, XCircle,
  Building2, Globe, Play, Eye, ArrowRight, X
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent
} from '@/components/ui/dialog'
import {
  Drawer, DrawerContent
} from '@/components/ui/drawer'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { cn, formatDate } from '@/lib/utils'
import api from '@/lib/api'

// Simple hook for media queries
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) setMatches(media.matches)
    const listener = () => setMatches(media.matches)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [matches, query])
  return matches
}

function StatusBadge({ status }: { status: string }) {
  const configs = {
    completed: { icon: CheckCircle, label: 'Completed', className: 'text-emerald-600 bg-emerald-500/10 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' },
    processing: { icon: Loader, label: 'Processing', className: 'text-blue-600 bg-blue-500/10 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' },
    draft: { icon: Clock, label: 'Draft', className: 'text-muted-foreground bg-muted border-border' },
    failed: { icon: XCircle, label: 'Failed', className: 'text-red-600 bg-red-500/10 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30' },
    partial: { icon: CheckCircle, label: 'Partial', className: 'text-orange-600 bg-orange-500/10 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30' },
  }
  const config = configs[status as keyof typeof configs] || configs.draft
  const Icon = config.icon

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-200', config.className)}>
      <Icon className={cn('w-3.5 h-3.5', status === 'processing' && 'animate-spin')} />
      {config.label}
    </span>
  )
}

export function DashboardInsightsModal({
  open,
  onOpenChange,
  initialFilter = 'all'
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialFilter?: string
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialFilter)
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    if (open) {
      setStatusFilter(initialFilter)
      loadProjects(initialFilter)
      
      const interval = setInterval(() => {
        loadProjects(statusFilter, true)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [open, initialFilter])

  useEffect(() => {
    if (open) {
      loadProjects(statusFilter)
    }
  }, [statusFilter])

  const loadProjects = async (currentStatus: string, isBackground = false) => {
    if (!isBackground) setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (currentStatus !== 'all') params.status = currentStatus
      const { data } = await api.get('/projects', { params })
      setProjects(data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  const handleRun = async (projectId: number, options = {}) => {
    try {
      await api.post(`/projects/${projectId}/run`, options)
      loadProjects(statusFilter)
    } catch (err) {
      console.error(err)
    }
  }

  // Filter & Sort Logic
  const filteredAndSortedProjects = projects
    .filter((p) =>
      p.business_name.toLowerCase().includes(search.toLowerCase()) ||
      p.industry.toLowerCase().includes(search.toLowerCase()) ||
      p.country.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'alphabetical') return a.business_name.localeCompare(b.business_name)
      if (sortBy === 'updated') return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
      return 0
    })

  const Content = () => (
    <div className="flex flex-col h-full overflow-hidden bg-background transition-colors duration-200 rounded-[24px]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 p-6 sm:px-8 pt-8 pb-4 border-b border-border bg-background/95 backdrop-blur-md transition-colors duration-200 rounded-t-[24px]">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground transition-colors duration-200">Project Insights</h2>
              <p className="text-[15px] text-muted-foreground mt-1.5 font-medium transition-colors duration-200">Manage and track your AI analyses directly from the dashboard.</p>
            </div>
            {isDesktop ? (
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-accent text-muted-foreground transition-colors duration-200" onClick={() => onOpenChange(false)}>
                <X className="h-5 w-5" />
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Pill Filters */}
            <div className="flex flex-wrap gap-2">
              {['all', 'draft', 'processing', 'completed', 'partial', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-4 py-2 rounded-full text-[14px] font-semibold capitalize transition-all duration-200',
                    statusFilter === status
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border-transparent'
                      : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border shadow-sm'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-200" />
                <Input
                  placeholder="Search project..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 rounded-full bg-card border-border text-[15px] transition-colors duration-200"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-11 rounded-full bg-card border-border text-[15px] transition-colors duration-200">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    <SelectItem value="updated">Recently Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Project Grid */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredAndSortedProjects.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-card shadow-sm flex items-center justify-center border border-border transition-colors duration-200">
              <Building2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground transition-colors duration-200">No projects found</h3>
              <p className="text-[15px] text-muted-foreground mt-2 transition-colors duration-200">
                No projects match the current filters. Try adjusting your search.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredAndSortedProjects.map((project, i) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                >
                  <Card className="h-full flex flex-col overflow-hidden bg-card border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl group">
                    <CardContent className="p-6 flex flex-col flex-1 gap-5">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-inner">
                            {project.business_name[0]}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-[22px] text-foreground truncate leading-tight tracking-tight transition-colors duration-200">{project.business_name}</h3>
                            <p className="text-[15px] text-muted-foreground truncate font-medium transition-colors duration-200">{project.industry}</p>
                          </div>
                        </div>
                      </div>

                      {/* Idea / Description */}
                      <p className="text-[15px] text-muted-foreground line-clamp-2 leading-relaxed transition-colors duration-200">
                        {project.business_idea}
                      </p>

                      {/* Meta */}
                      <div className="grid grid-cols-2 gap-3 text-[14px] text-muted-foreground font-medium transition-colors duration-200">
                        <div className="flex items-center gap-2 truncate">
                          <Globe className="w-4 h-4 shrink-0" />
                          <span className="truncate">{project.country}, {project.state || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span className="truncate">{formatDate(project.created_at)}</span>
                        </div>
                        <div className="col-span-2">
                           <StatusBadge status={project.status} />
                        </div>
                      </div>

                      {/* Progress Area */}
                      {project.status === 'processing' && (
                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between text-[14px] font-semibold text-blue-600 dark:text-blue-400 transition-colors duration-200">
                            <span className="capitalize">{project.current_agent?.replace('_', ' ') || 'Starting'} agent...</span>
                            <span>{project.progress_percent}%</span>
                          </div>
                          <Progress value={project.progress_percent} className="h-2 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-blue-600 [&>div]:to-indigo-600" />
                        </div>
                      )}

                      {/* Partial Diagnostics */}
                      {project.status === 'partial' && (
                        <div className="space-y-3 mt-1 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 transition-colors duration-200">
                          <div className="flex justify-between text-[14px] font-semibold text-orange-600 dark:text-orange-400">
                            <span>Analysis Completion</span>
                            <span>{project.progress_percent || 0}%</span>
                          </div>
                          <Progress value={project.progress_percent || 0} className="h-2 bg-orange-500/20 [&>div]:bg-orange-500" />
                          <div className="flex flex-wrap gap-1.5 text-[12px] font-medium pt-1">
                            {['research', 'competitor', 'business_plan', 'finance', 'marketing'].map(report => {
                              const status = project.ai_diagnostics?.[report]?.status;
                              if (status === 'success') {
                                return <span key={report} className="text-emerald-600 dark:text-emerald-400 capitalize transition-colors duration-200">{report.replace('_', ' ')} ✓</span>
                              } else if (status === 'error' || status === 'failed') {
                                return <span key={report} className="text-red-600 dark:text-red-400 capitalize transition-colors duration-200">{report.replace('_', ' ')} ✗</span>
                              } else {
                                return <span key={report} className="text-muted-foreground capitalize transition-colors duration-200">{report.replace('_', ' ')} -</span>
                              }
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 mt-auto pt-5">
                        <Link to={`/projects/${project.id}`} className="flex-1" onClick={() => onOpenChange(false)}>
                          <Button variant="outline" className="w-full h-11 text-[15px] font-semibold gap-2 rounded-xl transition-all duration-200">
                            <Eye className="w-4 h-4" /> View
                          </Button>
                        </Link>
                        
                        {(project.status === 'draft' || project.status === 'failed') && (
                          <Button
                            className="flex-1 h-11 text-[15px] font-semibold gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md border-0 transition-all duration-200"
                            onClick={() => handleRun(project.id)}
                          >
                            <Play className="w-4 h-4 fill-current" /> Run AI
                          </Button>
                        )}
                        
                        {project.status === 'partial' && (
                          <div className="flex gap-2 flex-[2]">
                            <Button 
                              className="flex-1 h-11 text-[15px] font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md border-0 transition-all duration-200" 
                              onClick={() => handleRun(project.id, { resume_mode: true })}
                            >
                              Resume
                            </Button>
                            <Button 
                              variant="outline"
                              className="flex-1 h-11 text-[15px] font-semibold rounded-xl transition-all duration-200" 
                              onClick={() => handleRun(project.id, { retry_mode: true })}
                            >
                              Retry
                            </Button>
                          </div>
                        )}
                        
                        {project.status === 'completed' && (
                          <Link to={`/projects/${project.id}?tab=reports`} className="flex-[1.5]" onClick={() => onOpenChange(false)}>
                            <Button className="w-full h-11 text-[15px] font-semibold gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md border-0 transition-all duration-200">
                              Open Reports <ArrowRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1500px] w-[90vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden shadow-2xl rounded-[24px] border-0 bg-transparent">
          <Content />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[95vh] flex flex-col rounded-t-[24px] overflow-hidden p-0 bg-transparent">
        <Content />
      </DrawerContent>
    </Drawer>
  )
}
