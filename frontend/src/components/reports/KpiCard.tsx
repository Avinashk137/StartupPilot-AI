import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon?: LucideIcon
  iconColor?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  badge?: React.ReactNode
  highlight?: boolean
  className?: string
}

const TREND_MAP = {
  up: { Icon: TrendingUp, color: 'text-emerald-500' },
  down: { Icon: TrendingDown, color: 'text-red-500' },
  neutral: { Icon: Minus, color: 'text-muted-foreground' },
}

export default function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  trendLabel,
  badge,
  highlight = false,
  className,
}: KpiCardProps) {
  const TrendIcon = trend ? TREND_MAP[trend].Icon : null
  const trendColor = trend ? TREND_MAP[trend].color : ''

  return (
    <div className={cn(
      'kpi-card rounded-xl border border-border bg-card p-5 flex flex-col',
      'transition-all hover:shadow-md hover:-translate-y-0.5',
      'print:bg-white print:border-gray-200 print:shadow-none print:translate-y-0 print:p-3',
      highlight && 'border-primary/30 bg-primary/5 print:border-indigo-200 print:bg-indigo-50/50',
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className={cn('w-9 h-9 rounded-lg bg-muted flex items-center justify-center', highlight && 'bg-primary/10')}>
            <Icon className={cn('w-4.5 h-4.5', iconColor)} />
          </div>
        )}
        <div className="flex items-center gap-2">
          {TrendIcon && (
            <div className="flex items-center gap-1">
              <TrendIcon className={cn('w-3.5 h-3.5', trendColor)} />
              {trendLabel && <span className={cn('text-xs font-medium', trendColor)}>{trendLabel}</span>}
            </div>
          )}
          {badge && <div>{badge}</div>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-lg font-bold text-foreground leading-snug break-words', highlight && 'text-primary')}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{sub}</p>}
    </div>
  )
}
