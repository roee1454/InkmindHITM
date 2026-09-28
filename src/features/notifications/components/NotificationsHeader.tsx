import { CheckCheck, Trash2 } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'

export interface NotificationsHeaderProps {
  /** What the active tab holds, for its actions. */
  unread: number
  total: number
  isMarkingAllRead: boolean
  isClearingAll: boolean
  onMarkAllRead: () => void
  onClearAll: () => void
}

/** The page title, and the two bulk actions — which act on the tab that's open, never on both. */
export function NotificationsHeader({ unread, total, isMarkingAllRead, isClearingAll, onMarkAllRead, onClearAll }: NotificationsHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="page-head hidden lg:flex">
        <h1>התראות</h1>
        <p>מה קרה במערכת, ומי כתב בוואטסאפ.</p>
      </div>
      <div className="flex items-center gap-1 lg:ms-auto">
        <Button type="button" variant="ghost" size="sm" onClick={onMarkAllRead} disabled={unread === 0 || isMarkingAllRead} className="gap-1.5">
          <CheckCheck size={15} />
          סימון הכל כנקרא
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          disabled={total === 0 || isClearingAll}
          className="gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={15} />
          ניקוי
        </Button>
      </div>
    </div>
  )
}
