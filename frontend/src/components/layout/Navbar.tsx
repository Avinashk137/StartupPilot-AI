import { useLocation, Link } from 'react-router-dom'
import { Bell, Search, Plus, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/agents': 'AI Agents',
  '/reports': 'Reports',
  '/exports': 'Exports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/admin': 'Admin Panel',
}

export function Navbar() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const currentLabel = routeLabels[pathname] || 'StartupPilot AI'

  useEffect(() => {
    api.get('/dashboard/stats').then((res) => {
      setUnreadCount(res.data.data.unread_notifications || 0)
    }).catch(() => {})
  }, [pathname])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }


  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center gap-4 px-6 shrink-0 sticky top-0 z-30">
      {/* Removed old Breadcrumb implementation */}
      {/* Greeting */}
      <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground ml-4">
        <span>{greeting()},</span>
        <span className="font-medium text-foreground">{user?.full_name?.split(' ')[0]}</span>
        <span>👋</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search projects..."
          className="w-52 h-9 pl-9 pr-4 rounded-lg border border-input bg-muted text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>

      {/* New Project */}
      <Link to="/projects/new">
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Project</span>
        </Button>
      </Link>

      {/* Notifications */}
      <Link to="/notifications">
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 gradient-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Link>
    </header>
  )
}
