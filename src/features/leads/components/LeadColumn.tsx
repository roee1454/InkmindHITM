import type { ReactNode } from 'react'

interface LeadColumnProps {
  label: string
  color: string
  count: number
  isDropTarget: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  children: ReactNode
}

export function LeadColumn({
  label,
  color,
  count,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: LeadColumnProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex h-full w-[85vw] max-w-[19rem] shrink-0 snap-center flex-col rounded-2xl border transition-colors lg:w-72 lg:max-w-none ${
        isDropTarget ? 'border-primary/60 bg-primary/5' : 'border-border bg-muted/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${color}`}>{label}</span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {count === 0 ? (
          <p className="pt-4 text-center text-xs text-muted-foreground">עמודה ריקה</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
