import { BellRing } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import type { NotificationPermissionState } from '../types'

export interface PwaPermissionBannerProps {
  permission: NotificationPermissionState
  onEnable: () => void
}

/** Offered once, while the browser hasn't been asked: pop-up notifications on this device. */
export function PwaPermissionBanner({ permission, onEnable }: PwaPermissionBannerProps) {
  if (permission !== 'default') return null

  return (
    <div className="card-native flex items-center gap-3 px-4 py-3">
      <BellRing size={18} className="shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-bold text-foreground">התראות במכשיר הזה</span>
        <span className="text-muted-foreground"> — גם כשהחלון סגור: הודעות, תורים ופניות חדשות.</span>
      </p>
      <Button type="button" size="sm" onClick={onEnable} className="shrink-0">
        הפעלה
      </Button>
    </div>
  )
}
