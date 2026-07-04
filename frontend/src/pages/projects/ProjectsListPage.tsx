import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Search, Filter, CheckCircle, Clock, Loader, XCircle,
  Building2, Globe, Target, DollarSign, MoreVertical, Play, Trash2, Eye, ArrowRight
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import api from '@/lib/api'
import { Breadcrumb } from '@/components/navigation/Breadcrumb'

function StatusBadge({ status }: { status: string }) {
  const configs = {
    completed: { icon: CheckCircle, label: 'Completed', className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900' },
    processing: { icon: Loader, label: 'Processing', className: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900' },
    draft: { icon: Clock, label: 'Draft', className: 'text-gray-600 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
    failed: { icon: XCircle, label: 'Failed', className: 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900' },
    partial: { icon: CheckCircle, label: 'Partial', className: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 border-orange-200' },
  }
  const config = configs[status as keyof typeof configs] || configs.draft
  const Icon = config.icon

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', config.className)}>
      <Icon className={cn('w-3 h-3', status === 'processing' && 'animate-spin')} />
      {config.label}
    </span>
  )
}

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || 'all'
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [total, setTotal] = useState(0)

  const loadProjects = async () => {
    try {
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      const { data } = await api.get('/projects', { params })
      setProjects(data.data)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProjects() }, [statusFilter])

  const filteredProjects = projects.filter((p) =>
    p.business_name.toLowerCase().includes(search.toLowerCase()) ||
    p.industry.toLowerCase().includes(search.toLowerCase())
  )

  const handleRun = async (projectId: number, options = {}) => {
    try {
      await api.post(`/projects/${projectId}/run`, options)
      setTimeout(loadProjects, 1000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (projectId: number) => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    try {
      await api.delete(`/projects/${projectId}`)
      loadProjects()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <Breadcrumb currentPage="Projects" />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} total projects</p>
        </div>
      </motion.div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Link to="/projects/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'draft', 'processing', 'completed', 'partial', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status)
              setSearchParams(status === 'all' ? {} : { status })
            }}
            className={cn(
              'px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all',
              statusFilter === status
                ? 'gradient-brand text-white shadow-sm'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-20 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">No projects found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {search ? `No projects matching "${search}"` : 'Create your first project to get started'}
              </p>
            </div>
            <Link to="/projects/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="card-hover h-full flex flex-col overflow-hidden group">
                {/* Top accent */}
                <div className="h-1 gradient-brand" />

                <CardContent className="p-5 flex flex-col flex-1 gap-4">
                  {/* Title Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {project.business_name[0]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">{project.business_name}</h3>
                        <p className="text-xs text-muted-foreground">{project.industry}</p>
                      </div>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {project.business_idea}
                  </p>

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{project.country}</span>
                    </div>
                    {project.budget && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{formatCurrency(project.budget, project.budget_currency)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Created {formatDate(project.created_at)}</span>
                    </div>
                  </div>

                  {/* Progress bar for processing */}
                  {project.status === 'processing' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="capitalize">{project.current_agent?.replace('_', ' ') || 'Starting'} agent...</span>
                        <span>{project.progress_percent}%</span>
                      </div>
                      <Progress value={project.progress_percent} className="h-1.5" />
                    </div>
                  )}

                  {/* Partial Status Indicators */}
                  {project.status === 'partial' && (
                    <div className="space-y-2 mt-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Overall Completion</span>
                        <span>{project.progress_percent || 0}%</span>
                      </div>
                      <Progress value={project.progress_percent || 0} className="h-1.5" />
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {['research', 'competitor', 'business_plan', 'finance', 'marketing'].map(report => {
                          const status = project.ai_diagnostics?.[report]?.status;
                          if (status === 'success') {
                            return <span key={report} className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded capitalize">{report.replace('_', ' ')}</span>
                          } else if (status === 'error' || status === 'failed') {
                            return <span key={report} className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded capitalize">{report.replace('_', ' ')} (Failed)</span>
                          } else {
                            return <span key={report} className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded capitalize">{report.replace('_', ' ')} (Missing)</span>
                          }
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-2 border-t border-border">
                    <Link to={`/projects/${project.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                    </Link>
                    {(project.status === 'draft' || project.status === 'failed') && (
                      <Button
                        size="sm"
                        className="gap-1.5 flex-1"
                        onClick={() => handleRun(project.id)}
                      >
                        <Play className="w-3.5 h-3.5" /> Run AI
                      </Button>
                    )}
                    {project.status === 'partial' && (
                      <div className="flex gap-1.5 flex-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-xs px-2" 
                          onClick={() => handleRun(project.id, { resume_mode: true })}
                        >
                          <Play className="w-3 h-3 mr-1" /> Resume
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 text-xs px-2" 
                          onClick={() => handleRun(project.id, { retry_mode: true })}
                        >
                          <Play className="w-3 h-3 mr-1" /> Retry
                        </Button>
                      </div>
                    )}
                    {project.status === 'completed' && (
                      <Link to={`/projects/${project.id}?tab=reports`} className="flex-1">
                        <Button size="sm" className="w-full gap-1.5">
                          Reports <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
