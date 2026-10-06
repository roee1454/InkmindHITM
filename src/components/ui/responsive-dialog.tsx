import * as React from "react"
import { cn } from "#/lib/utils.ts"
import { useIsMobile } from "#/hooks/useMediaQuery"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog.tsx"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#/components/ui/sheet.tsx"

/**
 * What the dialog is for, not a pixel width (docs/dialogs-redesign.md):
 * sm — a confirmation; md — a short form (default); lg — a wizard or a list; xl — a work hub.
 */
export type DialogSize = "sm" | "md" | "lg" | "xl"

const DESKTOP_WIDTH: Record<DialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
}

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  /** The action bar, pinned under the scrolling body so the primary action never scrolls away.
   *  Order, in RTL: the primary action at the end (left), "ביטול" beside it, a secondary
   *  destructive action (ghost) alone at the start. A form's submit button goes here with
   *  `form="<form id>"` so Enter still submits. */
  footer?: React.ReactNode
  size?: DialogSize
  /** Renders inside DialogTrigger/SheetTrigger `asChild` — omit when the caller drives `open`
   *  externally (e.g. from a row click or a search-param). */
  trigger?: React.ReactNode
  contentClassName?: string
  bodyClassName?: string
  /** For dialogs that need an accessible title/description (Radix requires both) without a
   *  visible header row — image galleries and the like. Title/description are still rendered,
   *  just screen-reader-only. */
  hideHeader?: boolean
  /** The caller lays out the whole panel itself (header, scrolling body, footer), like the
   *  project panel: children render straight into the content, with no padding or scroll of ours. */
  bare?: boolean
}

/**
 * Dialog on desktop, bottom sheet on mobile — the single place this branch lives app-wide.
 *
 * Every dialog has the same three parts: a fixed header, a body that scrolls on its own, and a
 * fixed action bar. Before this, each dialog capped its own height (six different values) and let
 * everything scroll together, header and buttons included.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  trigger,
  contentClassName,
  bodyClassName,
  hideHeader,
  bare,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  const Title = isMobile ? SheetTitle : DialogTitle
  const Description = isMobile ? SheetDescription : DialogDescription
  const Header = isMobile ? SheetHeader : DialogHeader

  const srOnlyHeader = (
    <>
      <Title className="sr-only">{title}</Title>
      {description && <Description className="sr-only">{description}</Description>}
    </>
  )

  const anatomy = bare ? (
    <>
      {srOnlyHeader}
      {children}
    </>
  ) : (
    <>
      {hideHeader ? (
        srOnlyHeader
      ) : (
        <Header className="shrink-0 items-start gap-1 border-b-0 px-5 pt-2 pb-4 pe-12 text-right lg:px-6 lg:pt-6">
          <Title className="w-full text-right text-lg leading-snug text-balance">{title}</Title>
          {description && <Description className="w-full text-right text-sm leading-relaxed text-pretty">{description}</Description>}
        </Header>
      )}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 lg:px-6",
          hideHeader && "pt-2 lg:pt-6",
          footer ? "pb-5" : "pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] lg:pb-6",
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer && (
        <div className="flex shrink-0 items-center gap-2 border-t border-border px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:px-6 lg:pb-3">
          {footer}
        </div>
      )}
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
        <SheetContent className={cn("gap-0 p-0 pt-3 font-assistant", contentClassName)} dir="rtl">
          {anatomy}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          "max-h-[min(54rem,calc(100dvh-2rem))] gap-0 overflow-hidden p-0 text-right font-assistant",
          DESKTOP_WIDTH[size],
          contentClassName,
        )}
        dir="rtl"
      >
        {anatomy}
      </DialogContent>
    </Dialog>
  )
}

export default ResponsiveDialog

/**
 * The action bar's layout, so every dialog orders its buttons the same way: `children` are
 * packed at the end — pass "ביטול" first and the primary action last, which puts the primary on
 * the far left in RTL. `start` (a secondary destructive action, say) sits alone at the start; an
 * `error` takes that place while there is one, right beside the button that caused it.
 */
export function DialogActions({ start, error, children }: { start?: React.ReactNode; error?: string | null; children: React.ReactNode }) {
  return (
    <>
      {error ? (
        <p role="alert" className="min-w-0 flex-1 text-xs font-bold text-destructive">
          {error}
        </p>
      ) : (
        start
      )}
      <div className="ms-auto flex shrink-0 items-center gap-2">{children}</div>
    </>
  )
}

export { ResponsiveDialog as IMResponsiveDialog, DialogActions as IMDialogActions }
export type IMResponsiveDialogProps = ResponsiveDialogProps
