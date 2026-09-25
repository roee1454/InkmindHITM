import { BellRing } from '@/components/ui/icon'
import type { NotificationPermissionState } from '../types'

export interface PwaPermissionBannerProps {
  permission: NotificationPermissionState
  onEnable: () => void
}

export function PwaPermissionBanner({ permission, onEnable }: PwaPermissionBannerProps) {
  if (permission !== 'default') return null

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-3xl">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BellRing size={18} />
        </div>
        <div>
          <div className="text-sm font-extrabold text-foreground">הפעל התראות מכשיר ו-PWA</div>
          <div className="text-xs font-medium text-muted-foreground">
            קבל התראות קופצות בזמן אמת במחשב ובנייד על תורים, לידים ופניות חדשות
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onEnable}
        className="mt-1 h-9 shrink-0 cursor-pointer select-none rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground shadow-xs transition-all duration-150 ease-native hover:bg-primary/90 active:scale-95 sm:mt-0"
      >
        הפעל התראות
      </button>
    </div>
  )
}

