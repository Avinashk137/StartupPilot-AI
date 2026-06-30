import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime } from '@/lib/utils'
import api from '@/lib/api'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { data } = await api.get('/dashboard/notifications?limit=50')
      setNotifications(data.data)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const markAllRead = async () => {
    try {
      await api.put('/dashboard/notifications/read-all')
      load()
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }

  const markRead = async (id: number) => {
    try {
      await api.put(`/dashboard/notifications/${id}/read`)
      load()
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
  }

  const colors = {
    info: 'text-blue-500',
    success: 'text-green-500',
    warning: 'text-orange-500',
    error: 'text-red-500',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">{notifications.filter(n => !n.is_read).length} unread</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
        </Button>
      </motion.div>

      <div className="space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-20 animate-shimmer rounded-xl" />)
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-3">
              <Bell className="w-12 h-12 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((n, i) => {
            const Icon = icons[n.type as keyof typeof icons] || Info
            const color = colors[n.type as keyof typeof colors] || 'text-blue-500'
            return (
              <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card
                  className={cn('cursor-pointer transition-all', !n.is_read && 'border-primary/20 bg-primary/3')}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', color)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{formatRelativeTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full gradient-brand shrink-0 mt-1.5" />}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
