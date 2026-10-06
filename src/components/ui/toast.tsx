import * as React from "react"

import { AlertCircle, AlertTriangle, CheckCircle, ChevronLeft, Info, X } from "@/components/ui/icon"
import { IM_TONES } from "@/components/ui/tones"
import { cn } from "@/lib/utils"

/** Sets the leading icon only — the surface stays `card`. */
export type IMToastType = "info" | "warning" | "error" | "success"

interface ToastItem {
  id: string
  title: string
  message: string
  type: IMToastType
  duration: number
  onClick?: () => void
}

interface ToastContextValue {
  toast: (title: string, message: string, type?: IMToastType, duration?: number, onClick?: () => void) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

/**
 * `toast(title, message, type?, duration?, onClick?)` — a short, self-dismissing report of something
 * that just happened. Title in past tense for outcomes ("הפרטים נשמרו"); errors say what failed and
 * what to do. Never for something the user must act on: that's a dialog or an inline message.
 */
export function useIMToast(): ToastContextValue {
  const context = React.useContext(ToastContext)
  if (!context) throw new Error("useIMToast must be used within IMToastProvider")
  return context
}

/** More than this and they stop being read; the oldest goes first. */
const MAX_VISIBLE = 3
const EXIT_MS = 160

// Phase 1b: IMIcon names — info, check-circle, warning, warning-circle.
const ICONS: Record<IMToastType, typeof Info> = { info: Info, success: CheckCircle, warning: AlertTriangle, error: AlertCircle }
const TONES: Record<IMToastType, string> = {
  info: IM_TONES.muted,
  success: IM_TONES.success,
  warning: IM_TONES.warning,
  error: IM_TONES.destructive,
}

function Toast({ item, leaving, onDismiss }: { item: ToastItem; leaving: boolean; onDismiss: (id: string) => void }) {
  const Icon = ICONS[item.type]
  const remaining = React.useRef(item.duration)
  const startedAt = React.useRef(0)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Pausable: a toast someone is reading (hovered or focused) doesn't disappear under them.
  const resume = React.useCallback(() => {
    startedAt.current = Date.now()
    timer.current = setTimeout(() => onDismiss(item.id), remaining.current)
  }, [item.id, onDismiss])
  const pause = () => {
    clearTimeout(timer.current)
    remaining.current = Math.max(800, remaining.current - (Date.now() - startedAt.current))
  }

  React.useEffect(() => {
    resume()
    return () => clearTimeout(timer.current)
  }, [resume])

  const text = (
    <>
      <span className="flex items-center gap-1 text-sm font-bold text-foreground">
        <span className="min-w-0 truncate">{item.title}</span>
        {item.onClick && <ChevronLeft aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />}
      </span>
      {item.message && <span className="line-clamp-2 text-sm font-medium text-muted-foreground">{item.message}</span>}
    </>
  )

  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200",
        leaving && "motion-safe:animate-out motion-safe:fade-out motion-safe:zoom-out-95 motion-safe:duration-150"
      )}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", TONES[item.type])} />
      {item.onClick ? (
        <button
          type="button"
          onClick={() => {
            item.onClick?.()
            onDismiss(item.id)
          }}
          className="-m-1 flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 rounded-md p-1 text-start outline-none transition-colors hover:bg-surface-2/60 focus-visible:ring-4 focus-visible:ring-ring/35"
        >
          {text}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">{text}</div>
      )}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="סגירת ההודעה"
        className="-me-1 -mt-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/35"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}

/**
 * Mounted once at the root. A solid surface with the overlay shadow and the status colour on the
 * icon only. Phone: at the top, under the notch, newest first. Desktop: the bottom corner at the
 * end of the reading direction (left, in RTL), newest nearest the corner. Above dialogs (z-50).
 */
export function IMToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const [leaving, setLeaving] = React.useState<ReadonlySet<string>>(new Set())

  const dismiss = React.useCallback((id: string) => {
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

  const toast = React.useCallback(
    (title: string, message: string, type: IMToastType = "info", duration = 4500, onClick?: () => void) => {
      const id = Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev, { id, title, message, type, duration, onClick }].slice(-MAX_VISIBLE))
    },
    []
  )

  const value = React.useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section
        aria-label="הודעות"
        dir="rtl"
        className="pointer-events-none fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-60 flex flex-col-reverse gap-2 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:end-6 sm:w-96 sm:flex-col"
      >
        {toasts.map((t) => (
          <Toast key={t.id} item={t} leaving={leaving.has(t.id)} onDismiss={dismiss} />
        ))}
      </section>
    </ToastContext.Provider>
  )
}
