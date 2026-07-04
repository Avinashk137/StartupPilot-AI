import { cn } from '@/lib/utils'

interface SwotItem { label: string; color: string; text: string; dot: string; bg: string; border: string }

const SWOT_CONFIG: Record<string, SwotItem> = {
  strengths: {
    label: 'Strengths', color: 'text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800'
  },
  weaknesses: {
    label: 'Weaknesses', color: 'text-orange-600 dark:text-orange-400',
    text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800'
  },
  opportunities: {
    label: 'Opportunities', color: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800'
  },
  threats: {
    label: 'Threats', color: 'text-red-600 dark:text-red-400',
    text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800'
  },
}

interface SwotMatrixProps {
  swot: { strengths?: string[]; weaknesses?: string[]; opportunities?: string[]; threats?: string[] }
  title?: string
}

export default function SwotMatrix({ swot, title = 'SWOT Analysis' }: SwotMatrixProps) {
  const keys = ['strengths', 'weaknesses', 'opportunities', 'threats'] as const

  return (
    <div className="space-y-3">
      {title && <h2 className="font-semibold text-foreground text-base">{title}</h2>}
      <div className="grid grid-cols-2 gap-4">
        {keys.map((key) => {
          const c = SWOT_CONFIG[key]
          const items = swot[key] || []
          return (
            <div key={key} className={cn('rounded-xl border p-4', c.bg, c.border)}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('w-2.5 h-2.5 rounded-full', c.dot)} />
                <h4 className={cn('font-bold text-sm', c.color)}>{c.label}</h4>
                <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
              </div>
              <ul className="space-y-1.5">
                {items.length === 0 ? (
                  <li className="text-xs text-muted-foreground italic">No data</li>
                ) : items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', c.dot)} />
                    <span className="text-foreground leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
