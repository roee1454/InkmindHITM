import React from 'react'
import { Button } from '@/components/ui/button'
import { Check, Loader2, Save } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export interface SectionSaveButtonProps {
  onClick?: () => void
  type?: 'button' | 'submit'
  isPending?: boolean
  saved?: boolean
  label?: string
  pendingLabel?: string
  savedLabel?: string
  disabled?: boolean
  className?: string
  size?: 'default' | 'sm' | 'lg'
}

export const SectionSaveButton: React.FC<SectionSaveButtonProps> = ({
  onClick,
  type = 'button',
  isPending = false,
  saved = false,
  label = 'שמירת שינויים',
  pendingLabel = 'שומר…',
  savedLabel = 'נשמר!',
  disabled = false,
  className,
  size = 'default',
}) => {
  if (saved) {
    return (
      <Button
        type="button"
        disabled
        size={size}
        className={cn(
          'gap-1.5 border border-success/40 bg-success/15 font-bold text-success hover:bg-success/15',
          className,
        )}
      >
        <Check size={15} className="shrink-0" />
        <span>{savedLabel}</span>
      </Button>
    )
  }

  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled || isPending}
      size={size}
      className={cn('gap-1.5 font-bold', className)}
    >
      {isPending ? (
        <>
          <Loader2 size={15} className="animate-spin shrink-0" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        <>
          <Save size={15} className="shrink-0" />
          <span>{label}</span>
        </>
      )}
    </Button>
  )
}

