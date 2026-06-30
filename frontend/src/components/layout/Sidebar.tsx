import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderKanban, Bot, FileText, BarChart3,
  Download, Bell, Settings, User, LogOut, ChevronLeft,
  Rocket, Moon, Sun, Shield, Zap, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  path: string
  badge?: string
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FolderKanban, label: 'Projects', path: '/projects' },
  { icon: Bot, label: 'AI Agents', path: '/agents' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Download, label: 'Exports', path: '/exports' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
]

const bottomItems: NavItem[] = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: User, label: 'Profile', path: '/profile' },
]

interface SidebarProps {
  theme: 'light' | 'dark'
  onThemeToggle: () => void
  collapsed: boolean
  onCollapse: (v: boolean) => void
}

export function Sidebar({ theme, onThemeToggle, collapsed, onCollapse }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border overflow-hidden shrink-0"
    >
      {/* ── Logo ────────────────────────────────────────────── */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="font-bold text-sm text-sidebar-foreground leading-none">StartupPilot</p>
              <p className="text-xs text-sidebar-foreground/50 mt-0.5 gradient-brand-text font-semibold">AI</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        <button
          onClick={() => onCollapse(!collapsed)}
          className={cn(
            "ml-auto w-6 h-6 rounded-md flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all",
            collapsed && "mx-auto ml-0"
          )}
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </button>
      </div>

      {/* ── Nav Items ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* ── Bottom Section ──────────────────────────────────── */}
      <div className="px-2 pb-4 space-y-1 border-t border-sidebar-border pt-3">
        {user?.role === 'admin' && (
          <NavItem
            item={{ icon: Shield, label: 'Admin', path: '/admin' }}
            collapsed={collapsed}
          />
        )}
        {bottomItems.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200",
            collapsed && "justify-center px-0"
          )}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 shrink-0" />
          )}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User avatar */}
        <div className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-all",
          collapsed && "justify-center px-0"
        )}
          onClick={() => navigate('/profile')}
        >
          <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-hidden min-w-0"
              >
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.full_name}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { e.stopPropagation(); logout() }}
                className="text-sidebar-foreground/40 hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}

function NavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm shadow-primary/20"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
          collapsed && "justify-center px-0"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-white")} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
          {item.badge && !collapsed && (
            <span className="ml-auto text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {item.badge}
            </span>
          )}
          {/* Tooltip on collapsed */}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-popover border border-border rounded-md text-xs text-popover-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {item.label}
            </div>
          )}
        </>
      )}
    </NavLink>
  )
}
