import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, CheckCircle, XCircle, Info, AlertTriangle, Trash2, Check, ArrowRight
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime } from '@/lib/utils'
import api from '@/lib/api'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export function DashboardNotificationsPopup({
  children,
  onOpenChange
}: {
  children: React.ReactNode,
  onOpenChange?: (open: boolean) => void
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const loadNotifications = async () => {
    try {
      const { data } = await api.get('/dashboard/notifications?limit=20')
      setNotifications(data.data || [])
    } catch (err) {
      console.error('Failed to load notifications', err)
    }
  }

  useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (onOpenChange) onOpenChange(newOpen)
  }

  const markAsRead = async (id: number) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      await api.put(`/dashboard/notifications/${id}/read`)
    } catch (err) {
      console.error(err)
    }
  }

  const markAllRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      await api.put(`/dashboard/notifications/read-all`)
    } catch (err) {
      console.error(err)
    }
  }

  const deleteNotification = async (id: number) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id))
      await api.delete(`/dashboard/notifications/${id}`)
    } catch (err) {
      console.error(err)
    }
  }

  const clearAll = async () => {
    try {
      setNotifications([])
      await api.delete(`/dashboard/notifications/clear-all`)
    } catch (err) {
      console.error(err)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'info': default: return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l border-border transition-colors duration-200">
        <SheetHeader className="p-6 border-b border-border bg-card shrink-0 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center transition-colors duration-200">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <SheetTitle className="text-xl font-bold text-foreground transition-colors duration-200">Notifications</SheetTitle>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button variant="outline" size="sm" onClick={markAllRead} className="flex-1 h-9 rounded-lg border-border bg-card text-[14px] font-medium hover:bg-accent text-foreground transition-all duration-200">
              <Check className="w-4 h-4 mr-2" /> Mark all read
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll} className="flex-1 h-9 rounded-lg border-red-200 dark:border-red-900/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 text-[14px] font-medium transition-all duration-200">
              <Trash2 className="w-4 h-4 mr-2" /> Clear all
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background transition-colors duration-200">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-20">
              <div className="w-16 h-16 rounded-2xl bg-card shadow-sm flex items-center justify-center border border-border transition-colors duration-200">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground transition-colors duration-200">You're all caught up!</p>
                <p className="text-[15px] text-muted-foreground mt-1 transition-colors duration-200">No new notifications to show right now.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={cn(
                    "flex flex-col gap-3 p-5 rounded-xl transition-all duration-300 group border",
                    notif.is_read 
                      ? "bg-card border-border shadow-sm" 
                      : "bg-blue-500/10 border-blue-500/20 shadow-md"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-1">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("font-bold text-[16px] leading-tight transition-colors duration-200", notif.is_read ? "text-foreground" : "text-blue-900 dark:text-blue-100")}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1 shadow-sm" />
                        )}
                      </div>
                      <p className="text-muted-foreground text-[15px] mt-1.5 leading-snug transition-colors duration-200">
                        {notif.message}
                      </p>
                      <p className="text-[13px] font-medium text-muted-foreground mt-3 transition-colors duration-200">
                        {formatRelativeTime(notif.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions Bar inside card */}
                  <div className="flex items-center gap-2 mt-2 pt-4 border-t border-border transition-colors duration-200">
                    {!notif.is_read && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => markAsRead(notif.id)}
                        className="h-8 px-3 text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/20 rounded-lg transition-colors duration-200"
                      >
                        <Check className="w-3.5 h-3.5 mr-1.5" /> Mark read
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteNotification(notif.id)}
                      className={cn(
                        "h-8 px-3 text-[13px] font-medium rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/20 transition-colors duration-200",
                        notif.is_read && "ml-auto"
                      )}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer Area */}
        <div className="p-4 border-t border-border bg-card shrink-0 transition-colors duration-200">
          <Link to="/notifications" className="block" onClick={() => handleOpenChange(false)}>
            <Button className="w-full h-11 text-[15px] font-semibold bg-muted text-foreground hover:bg-accent rounded-xl transition-all duration-200">
              View All History <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
