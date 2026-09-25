import { CheckCheck, Trash2 } from '@/components/ui/icon'

export interface NotificationsHeaderProps {
  unreadCount: number
  totalCount: number
  isLoading: boolean
  isMarkingAllRead: boolean
  isClearingAll: boolean
  onMarkAllRead: () => void
  onClearAll: () => void
}

export function NotificationsHeader({
  unreadCount,
  totalCount,
  isLoading,
  isMarkingAllRead,
  isClearingAll,
  onMarkAllRead,
  onClearAll,
}: NotificationsHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="page-head">
        <h1>התראות מערכת</h1>
        <p>{isLoading ? 'טוען התראות…' : `יש לך ${unreadCount} התראות שלא נקראו`}</p>
      </div>

      <div className="flex items-center gap-3">
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={isMarkingAllRead}
            className="flex shrink-0 cursor-pointer items-center gap-1 text-sm font-bold text-primary transition-colors hover:underline disabled:opacity-50"
          >
            <CheckCheck size={14} />
            <span>סמן הכל כנקרא</span>
          </button>
        )}

        {totalCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            disabled={isClearingAll}
            className="flex shrink-0 cursor-pointer items-center gap-1 text-sm font-bold text-destructive transition-colors hover:underline disabled:opacity-50"
          >
            <Trash2 size={14} />
            <span>מחק הכל</span>
          </button>
        )}
      </div>
    </div>
  )
}

