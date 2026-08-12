import type { ReactNode } from 'react'

interface LeadColumnProps {
  stage: string
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
  stage,
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
      data-stage={stage}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex h-full w-[calc(100%-22px)] shrink-0 snap-center flex-col rounded-[20px] border transition-colors duration-150 lg:w-[236px] ${
        isDropTarget ? 'border-primary border-dashed bg-primary/10' : 'border-border/80 bg-muted/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 p-3">
        <span className={`pill ${color}`}>{label}</span>
        <span className="text-[13px] font-bold text-muted-foreground">{count}</span>
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {isDropTarget && (
          <div className="flex h-[82px] items-center justify-center rounded-2xl border-2 border-dashed border-primary/50 text-[13px] font-bold text-primary">
            שחרר כאן
          </div>
        )}
        {count === 0 ? (
          <p className="pt-4 text-center text-[13px] text-muted-foreground">עמודה ריקה</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
