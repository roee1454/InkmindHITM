import * as React from "react"

import { IMButton } from "@/components/ui/button"
import { IMIcon } from "@/components/ui/icon"
import type { IMIconName, IMIconTone } from "@/components/ui/icon"
import { IMSubtitle, IMText } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

/** Sets the leading icon only — the surface stays `card`. `default` is news; the rest report an outcome. */
export type IMToastTone = "default" | "success" | "warning" | "destructive"

export interface IMToastAction {
  /** A verb ("ביטול השליחה"). */
  label: string
  onClick: () => void
}

export interface IMToastOptions {
  tone?: IMToastTone
  /** Past tense for an outcome ("הפרטים נשמרו"); for an error, what failed. */
  title: string
  /** One or two lines; for an error, what to do. */
  description?: string
  /** One follow-up action, as a link under the text. */
  action?: IMToastAction
  /** ms before it goes; paused while hovered or focused. Default 4500. */
  duration?: number
  /** Makes the whole toast a link (open the thing it reports). */
  onClick?: () => void
}

interface ToastContextValue {
  show: (options: IMToastOptions) => void
}

interface ToastItem extends IMToastOptions {
  id: string
  tone: IMToastTone
  duration: number
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

/**
 * `useIMToast().show({ tone, title, description?, action?, duration?, onClick? })` — a short,
 * self-dismissing report of something that just happened. Never for something the user must act
 * on: that's a dialog or an inline message.
 */
export function useIMToast(): ToastContextValue {
  const context = React.useContext(ToastContext)
  if (!context) throw new Error("useIMToast must be used within IMToastProvider")
  return context
}

/** More than this and they stop being read; the oldest goes first. */
const MAX_VISIBLE = 3
const EXIT_MS = 160
const DEFAULT_DURATION = 4500

const ICONS: Record<IMToastTone, { name: IMIconName; tone: IMIconTone }> = {
  default: { name: "info", tone: "muted" },
  success: { name: "check-circle", tone: "success" },
  warning: { name: "warning", tone: "warning" },
  destructive: { name: "warning-circle", tone: "destructive" },
}

function Toast({ item, leaving, onDismiss }: { item: ToastItem; leaving: boolean; onDismiss: (id: string) => void }) {
  const icon = ICONS[item.tone]
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
      <span className="flex items-center gap-1">
        <IMSubtitle as="span" className="min-w-0 truncate">
          {item.title}
        </IMSubtitle>
        {item.onClick && <IMIcon name="chevron-end" size="sm" tone="muted" />}
      </span>
      {item.description && (
        <IMText as="span" variant="body-sm" tone="muted" className="line-clamp-2">
          {item.description}
        </IMText>
      )}
    </>
  )

  return (
    <div
      role={item.tone === "destructive" ? "alert" : "status"}
      data-slot="toast"
      data-tone={item.tone}
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
      <IMIcon name={icon.name} tone={icon.tone} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        {item.onClick ? (
          <button
            type="button"
            onClick={() => {
              item.onClick?.()
              onDismiss(item.id)
            }}
            className="-m-1 flex w-full min-w-0 cursor-pointer flex-col gap-0.5 rounded-md p-1 text-start outline-none transition-colors hover:bg-surface-2/60 focus-visible:ring-4 focus-visible:ring-ring/35"
          >
            {text}
          </button>
        ) : (
          text
        )}
        {item.action && (
          <IMButton
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              item.action?.onClick()
              onDismiss(item.id)
            }}
            className="mt-1"
          >
            {item.action.label}
          </IMButton>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="סגירת ההודעה"
        className="-me-1 -mt-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/35"
      >
        <IMIcon name="close" size="sm" />
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

  const show = React.useCallback((options: IMToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    const item: ToastItem = { ...options, id, tone: options.tone ?? "default", duration: options.duration ?? DEFAULT_DURATION }
    setToasts((prev) => [...prev, item].slice(-MAX_VISIBLE))
  }, [])

  const value = React.useMemo(() => ({ show }), [show])

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
