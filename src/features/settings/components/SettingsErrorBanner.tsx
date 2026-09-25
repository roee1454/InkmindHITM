import React from 'react'
import { AlertTriangle, X } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export interface SettingsErrorBannerProps {
  error: string | null | undefined
  onDismiss?: () => void
  className?: string
}

export const SettingsErrorBanner: React.FC<SettingsErrorBannerProps> = ({
  error,
  onDismiss,
  className,
}) => {
  if (!error) return null

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start justify-between gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive',
        className,
      )}
      dir="rtl"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-destructive" />
        <span className="leading-relaxed">{error}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 text-destructive/70 transition-colors hover:bg-destructive/20 hover:text-destructive cursor-pointer"
          aria-label="סגור הודעת שגיאה"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

