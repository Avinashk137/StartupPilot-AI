import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Rocket, Plus, ArrowRight,
  CheckCircle, Clock, Loader, XCircle, Activity, Bell, AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn, formatRelativeTime, getScoreColor } from '@/lib/utils'
import api from '@/lib/api'
import { Breadcrumb } from '@/components/navigation/Breadcrumb'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DashboardInsightsModal } from './DashboardInsightsModal'
import { DashboardNotificationsPopup } from './DashboardNotificationsPopup'

// ── Status Badge ─────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const configs = {
    completed: { icon: CheckCircle, label: 'Completed', className: 'text-green-600 bg-green-50 dark:bg-green-950/30' },
    partial: { icon: Clock, label: 'Partial', className: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
    processing: { icon: Loader, label: 'Processing', className: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
    draft: { icon: Clock, label: 'Draft', className: 'text-gray-600 bg-gray-100 dark:bg-gray-800' },
    failed: { icon: XCircle, label: 'Failed', className: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
  }
  const config = configs[status as keyof typeof configs] || configs.draft
  const Icon = config.icon

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.className)}>
      <Icon className={cn('w-3 h-3', status === 'processing' && 'animate-spin')} />
      {config.label}
    </span>
  )
}

// ── Main Dashboard ────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Insights Modal State
  const [insightsModalOpen, setInsightsModalOpen] = useState(false)
  const [activeInsightsFilter, setActiveInsightsFilter] = useState('all')

  const handleKPIClick = (label: string) => {
    let filter = 'all'
    if (label === 'Completed') filter = 'completed'
    if (label === 'Partial') filter = 'partial'
    if (label === 'Failed') filter = 'failed'
    
    setActiveInsightsFilter(filter)
    setInsightsModalOpen(true)
  }

  const loadDashboard = async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    try {
      const [statsRes, activityRes, notifRes, projectsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/activity?limit=5'),
        api.get('/dashboard/notifications?limit=4'),
        api.get('/projects?limit=3'),
      ])
      setStats(statsRes.data.data)
      setActivity(activityRes.data.data)
      setNotifications(notifRes.data.data)
      setProjects(projectsRes.data.data)
    } catch (err) {
      console.error('Dashboard load failed', err)
    } finally {
      if (!isBackground) setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    const intervalId = setInterval(() => {
      loadDashboard(true)
    }, 5000)
    return () => clearInterval(intervalId)
  }, [])



  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl animate-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl animate-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <Breadcrumb currentPage="Dashboard" />
      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">CEO Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back to StartupPilot AI
        </p>
      </motion.div>

      {/* ── Overview Stats ───────────────────────────────────── */}
      <TooltipProvider>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              label: 'Total Projects', 
              subtitle: 'All business ideas',
              value: stats?.total_projects || 0, 
              icon: FolderIcon, 
              color: 'text-primary',
              bgLight: 'bg-primary/5',
              tooltip: 'Total number of projects belonging to you, including all statuses.',
              link: '/projects',
              actionLabel: 'View All'
            },
            { 
              label: 'Completed', 
              subtitle: 'Ready to use',
              value: stats?.completed_projects || 0, 
              icon: CheckCircle, 
              color: 'text-emerald-500',
              bgLight: 'bg-emerald-500/5',
              tooltip: 'Projects where all five AI reports were generated successfully.',
              link: '/projects?status=completed',
              actionLabel: 'Open Reports'
            },
            { 
              label: 'Partial', 
              subtitle: 'Needs attention',
              value: stats?.partial_projects || 0, 
              icon: AlertTriangle, 
              color: 'text-amber-500',
              bgLight: 'bg-amber-500/5',
              tooltip: 'Projects where at least one report failed but others completed.',
              link: '/projects?status=partial',
              actionLabel: 'Resume Analysis'
            },
            { 
              label: 'Notifications', 
              subtitle: 'Unread updates',
              value: stats?.unread_notifications || 0, 
              icon: Bell, 
              color: 'text-orange-500',
              bgLight: 'bg-orange-500/5',
              tooltip: 'Unread updates and alerts regarding your projects and agents.',
              link: '/notifications',
              actionLabel: 'View Notifications'
            },
          ].map((stat, i) => {
            const cardContent = (
              <Card className="h-full flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/40 cursor-pointer">
                {/* Top gradient border on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm font-medium text-foreground mt-2">{stat.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                    </div>
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110", stat.bgLight)}>
                      <stat.icon className={cn("w-5 h-5", stat.color)} />
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    {stat.actionLabel}
                    <ArrowRight className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            )

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="h-full"
              >
                {stat.label === 'Notifications' ? (
                  <DashboardNotificationsPopup>
                    <div className="block h-full group">
                      {cardContent}
                    </div>
                  </DashboardNotificationsPopup>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div onClick={() => handleKPIClick(stat.label)} className="block h-full group">
                        {cardContent}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-center">
                      <p>{stat.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </motion.div>
            )
          })}
        </div>
      </TooltipProvider>

      {/* ── Call To Action ──────────────────────────────────────── */}
      {(!stats?.total_projects) && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Ready to launch?</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Create your first project and let AI agents analyze your business idea.
              </p>
            </div>
            <Link to="/projects/new">
              <Button size="lg" className="gap-2">
                <Plus className="w-4 h-4" />
                Create First Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── Bottom Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Projects</CardTitle>
            <Link to="/projects">
              <Button variant="ghost" size="sm">View all <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No projects yet</p>
            ) : (
              projects.map((project: any) => (
                <Link key={project.id} to={`/projects/${project.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center text-white font-bold text-sm">
                        {project.business_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{project.business_name}</p>
                        <p className="text-xs text-muted-foreground">{project.industry} · {project.country}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {project.status === 'processing' && (
                        <Progress value={project.progress_percent} className="w-16 h-1.5" />
                      )}
                      <StatusBadge status={project.status} />
                    </div>
                  </div>
                </Link>
              ))
            )}
            <Link to="/projects/new">
              <div className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer text-muted-foreground hover:text-primary">
                <Plus className="w-4 h-4" />
                <span className="text-sm">New Project</span>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Activity & Notifications */}
        <div className="space-y-4">
          {/* Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4" /> Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-4">All caught up!</p>
              ) : (
                notifications.slice(0, 3).map((n: any) => (
                  <div key={n.id} className={cn('p-3 rounded-lg text-sm', !n.is_read && 'bg-primary/5 border border-primary/10')}>
                    <p className="font-medium text-foreground text-xs">{n.title}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" /> Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activity.length === 0 ? (
                  <p className="text-muted-foreground text-xs text-center py-4">No recent activity</p>
                ) : (
                  activity.slice(0, 4).map((act: any) => (
                    <div key={act.id} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{act.action}</p>
                        <p className="text-xs text-muted-foreground">{act.project_name}</p>
                        <p className="text-xs text-muted-foreground/60">{formatRelativeTime(act.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <DashboardInsightsModal 
        open={insightsModalOpen} 
        onOpenChange={setInsightsModalOpen}
        initialFilter={activeInsightsFilter} 
      />
    </div>
  )
}

// Placeholder icon
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}
