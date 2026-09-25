import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

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
 * Mounted once at the dashboard layout root. Renders a single shared AlertDialog that any
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
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent dir="rtl" className="font-assistant text-right rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.options.title}</AlertDialogTitle>
            {pending?.options.description && (
              <AlertDialogDescription>{pending.options.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)} className="rounded-xl font-bold cursor-pointer">
              {pending?.options.cancelLabel ?? 'ביטול'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settle(true)}
              variant={pending?.options.variant === 'destructive' ? 'destructive' : 'default'}
              className="rounded-xl font-bold cursor-pointer"
            >
              {pending?.options.confirmLabel ?? 'אישור'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

/** `if (await confirm({ title: '...', variant: 'destructive' })) mutate()` */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}
