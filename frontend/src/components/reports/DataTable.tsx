import { cn } from '@/lib/utils'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  className?: string
  striped?: boolean
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = 'No data available',
  className,
  striped = true,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  'px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap',
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  col.width
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground text-sm italic">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'border-b border-border last:border-0 transition-colors hover:bg-muted/30',
                  striped && i % 2 === 1 && 'bg-muted/20'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cn(
                      'px-4 py-3 text-foreground',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    )}
                  >
                    {col.render ? col.render(row) : row[col.key as string] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
