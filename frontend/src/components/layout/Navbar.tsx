import { useLocation, Link } from 'react-router-dom'
import { Bell, Plus, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

interface NavbarProps {
  theme: 'light' | 'dark'
  onThemeToggle: () => void
}

export function Navbar({ theme, onThemeToggle }: NavbarProps) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

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
      {/* Greeting */}
      <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground ml-4">
        <span>{greeting()},</span>
        <span className="font-medium text-foreground">{user?.full_name?.split(' ')[0]}</span>
        <span>👋</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Dark Mode Toggle */}
      <button
        onClick={onThemeToggle}
        className={cn(
          'w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          'border border-transparent hover:border-border'
        )}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      >
        <div className="relative w-4 h-4">
          <Sun
            className={cn(
              'absolute inset-0 w-4 h-4 transition-all duration-300',
              theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'
            )}
          />
          <Moon
            className={cn(
              'absolute inset-0 w-4 h-4 transition-all duration-300',
              theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
            )}
          />
        </div>
      </button>

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
