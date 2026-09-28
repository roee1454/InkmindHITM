import type React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * A field that edits a value where it's shown, sized to the panel instead of a full-height form
 * input. 16px text on a phone (anything smaller makes iOS zoom in on focus), 14px from `md`.
 */
export function PanelInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input className={cn('h-9 rounded-lg px-2.5 text-base shadow-none md:h-9 md:text-sm', className)} {...props} />
}
