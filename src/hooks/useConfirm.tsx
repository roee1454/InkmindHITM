import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'destructive' for delete/disconnect/disable-style actions; 'default' otherwise. */
  variant?: 'default' | 'destructive'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

interface PendingConfirm {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Mounted once at the dashboard layout root. Renders a single shared ConfirmDialog that any
 * descendant can trigger via useConfirm() — replaces this codebase's scattered window.confirm(...)
 * calls with a styled, RTL, pending-state-aware dialog matching the rest of the design system.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve })
    })
  }, [])

  const settle = (value: boolean) => {
    pending?.resolve(value)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && settle(false)}
        title={pending?.options.title ?? ''}
        description={pending?.options.description}
        tone={pending?.options.variant === 'destructive' ? 'destructive' : 'default'}
        confirmLabel={pending?.options.confirmLabel ?? 'אישור'}
        cancelLabel={pending?.options.cancelLabel}
        onConfirm={() => settle(true)}
      />
    </ConfirmContext.Provider>
  )
}

/** `if (await confirm({ title: '...', variant: 'destructive' })) mutate()` */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}
