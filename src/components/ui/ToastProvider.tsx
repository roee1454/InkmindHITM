import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle, ChevronLeft, Info, X } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export type ToastType = 'info' | 'warning' | 'error' | 'success'

export interface ToastItem {
  id: string
  title: string
  message: string
  type: ToastType
  duration: number
  onClick?: () => void
}

interface ToastContextType {
  toast: (title: string, message: string, type?: ToastType, duration?: number, onClick?: () => void) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

/** More than this and they stop being read; the oldest goes first. */
const MAX_VISIBLE = 3
const EXIT_MS = 160

const ICONS: Record<ToastType, typeof Info> = { info: Info, success: CheckCircle, warning: AlertTriangle, error: AlertCircle }
const TONES: Record<ToastType, string> = {
  info: 'text-muted-foreground',
  success: 'text-status-done',
  warning: 'text-warning',
  error: 'text-destructive',
}

function Toast({ item, leaving, onDismiss }: { item: ToastItem; leaving: boolean; onDismiss: (id: string) => void }) {
  const Icon = ICONS[item.type]
  const remaining = useRef(item.duration)
  const startedAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Pausable: a toast someone is reading (hovered or focused) doesn't disappear under them.
  const resume = useCallback(() => {
    startedAt.current = Date.now()
    timer.current = setTimeout(() => onDismiss(item.id), remaining.current)
  }, [item.id, onDismiss])
  const pause = () => {
    clearTimeout(timer.current)
    remaining.current = Math.max(800, remaining.current - (Date.now() - startedAt.current))
  }

  useEffect(() => {
    resume()
    return () => clearTimeout(timer.current)
  }, [resume])

  const clickable = Boolean(item.onClick)
  const open = () => {
    item.onClick?.()
    onDismiss(item.id)
  }

  return (
    <div
      role={item.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className={cn(
        'pointer-events-auto relative flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3.5 font-assistant shadow-lg',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200',
        leaving && 'motion-safe:animate-out motion-safe:fade-out motion-safe:zoom-out-95 motion-safe:duration-150',
      )}
    >
      <Icon size={18} className={cn('mt-0.5 shrink-0', TONES[item.type])} />
      {clickable ? (
        <button type="button" onClick={open} className="-m-1 flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 rounded-md p-1 text-start transition-colors hover:bg-muted/50">
          <span className="flex items-center gap-1 text-sm font-bold text-foreground">
            <span className="min-w-0 truncate">{item.title}</span>
            <ChevronLeft size={14} className="shrink-0 text-muted-foreground" />
          </span>
          {item.message && <span className="line-clamp-2 text-sm text-muted-foreground">{item.message}</span>}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-bold text-foreground">{item.title}</span>
          {item.message && <span className="line-clamp-2 text-sm text-muted-foreground">{item.message}</span>}
        </div>
      )}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="סגירת ההודעה"
        className="-me-1 -mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X size={15} />
      </button>
    </div>
  )
}

/**
 * Transient feedback: what just happened, in one line, out of the way. A solid surface with the
 * overlay shadow and the status colour on the icon only — it used to be a tinted, blurred card
 * that scaled with a hover and vanished mid-read.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set())

  const dismiss = useCallback((id: string) => {
    setLeaving((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      setLeaving((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, EXIT_MS)
  }, [])

  const toast = useCallback((title: string, message: string, type: ToastType = 'info', duration = 4500, onClick?: () => void) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, title, message, type, duration, onClick }].slice(-MAX_VISIBLE))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Phone: at the top, under the notch, newest first. Desktop: the bottom corner at the end of
          the reading direction (left, in RTL), newest nearest the corner. Above dialogs (z-50). */}
      <section
        aria-label="הודעות"
        dir="rtl"
        className="pointer-events-none fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-[60] flex flex-col-reverse gap-2 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:end-6 sm:w-96 sm:flex-col"
      >
        {toasts.map((t) => (
          <Toast key={t.id} item={t} leaving={leaving.has(t.id)} onDismiss={dismiss} />
        ))}
      </section>
    </ToastContext.Provider>
  )
}

export { ToastProvider as IMToastProvider, useToast as useIMToast }
