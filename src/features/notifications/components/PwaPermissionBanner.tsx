import { BellRing, Check, Info } from '@/components/ui/icon'
import { IMButton } from '@/components/ui/button'
import type { NotificationPermissionState } from '../types'

export interface PwaPermissionBannerProps {
  permission: NotificationPermissionState
  isSubscribed: boolean
  isIosNotStandalone: boolean
  isLoading?: boolean
  isTesting?: boolean
  onEnable: () => void
  onSendTest: () => void
}

/**
 * Manages device Web Push status, iOS standalone guidance, and test push triggers.
 */
export function PwaPermissionBanner({
  permission,
  isSubscribed,
  isIosNotStandalone,
  isLoading,
  isTesting,
  onEnable,
  onSendTest,
}: PwaPermissionBannerProps) {
  // If user is on an iPhone browser tab without having added the app to Home Screen
  if (isIosNotStandalone) {
    return (
      <div className="card-native flex items-center gap-3 border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-500 dark:text-amber-400">
        <Info size={20} className="shrink-0" />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-bold">התראות ב-iPhone:</span>
          <span className="opacity-90">
            {' '}
            כדי לקבל התראות כשהמסך נעול, לחץ על שיתוף בספארי ובחר <strong>"הוסף למסך הבית"</strong>.
          </span>
        </p>
      </div>
    )
  }

  // If already subscribed: show status and provide quick test push button
  if (isSubscribed) {
    return (
      <div className="card-native flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <Check size={16} />
          </div>
          <p className="min-w-0 text-sm">
            <span className="font-bold text-foreground">התראות Push פעילות במכשיר זה</span>
            <span className="text-muted-foreground hidden sm:inline"> — תקבל עדכונים גם כשהמסך כבוי.</span>
          </p>
        </div>
        <IMButton
          type="button"
          size="sm"
          variant="outline"
          disabled={isTesting}
          onClick={onSendTest}
          className="shrink-0 text-xs gap-1.5"
        >
          <BellRing size={14} />
          {isTesting ? 'שולח...' : 'בדיקת התראה'}
        </IMButton>
      </div>
    )
  }

  // If unsupported or blocked
  if (permission === 'denied') {
    return (
      <div className="card-native flex items-center gap-3 px-4 py-3 text-muted-foreground">
        <BellRing size={18} className="shrink-0 text-destructive" />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-bold text-destructive">ההתראות חסומות בדפדפן</span>
          <span> — יש לאפשר התראות בהגדרות הדפדפן כדי לקבל עדכונים.</span>
        </p>
      </div>
    )
  }

  if (permission === 'unsupported') {
    return null
  }

  // Default: offer activation
  return (
    <div className="card-native flex items-center gap-3 px-4 py-3">
      <BellRing size={18} className="shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-bold text-foreground">התראות במכשיר הזה</span>
        <span className="text-muted-foreground"> — גם כשהחלון סגור: הודעות, תורים ופניות חדשות.</span>
      </p>
      <IMButton
        type="button"
        size="sm"
        disabled={isLoading}
        onClick={onEnable}
        className="shrink-0"
      >
        {isLoading ? 'מפעיל...' : 'הפעלה'}
      </IMButton>
    </div>
  )
}
