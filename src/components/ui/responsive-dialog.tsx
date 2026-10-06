import * as React from "react"

import {
  IMDialog,
  IMDialogContent,
  IMDialogDescription,
  IMDialogHeader,
  IMDialogTitle,
  IMDialogTrigger,
} from "@/components/ui/dialog"
import {
  IMSheet,
  IMSheetContent,
  IMSheetDescription,
  IMSheetHeader,
  IMSheetTitle,
  IMSheetTrigger,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

/**
 * What the dialog is for, not a pixel width (docs/dialogs-redesign.md):
 * sm — a confirmation; md — a short form (default); lg — a wizard or a list; xl — a work hub.
 */
type IMDialogSize = "sm" | "md" | "lg" | "xl"

const DESKTOP_WIDTH: Record<IMDialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
}

export interface IMResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  /** The action bar, pinned under the scrolling body so the primary action never scrolls away.
   *  Lay it out with IMDialogActions. A form's submit button goes here with `form="<form id>"`
   *  so Enter still submits. */
  footer?: React.ReactNode
  size?: IMDialogSize
  /** Renders inside the dialog/sheet trigger `asChild` — omit when the caller drives `open`
   *  externally (e.g. from a row click or a search-param). */
  trigger?: React.ReactNode
  contentClassName?: string
  bodyClassName?: string
  /** For dialogs that need an accessible title/description (Radix requires both) without a
   *  visible header row — image galleries and the like. They're still rendered, screen-reader-only. */
  hideHeader?: boolean
  /** The caller lays out the whole panel itself (header, scrolling body, footer), like the
   *  project panel: children render straight into the content, with no padding or scroll of ours. */
  bare?: boolean
}

/**
 * The dialog features use: centred on desktop, a bottom sheet on phones — the single place this
 * branch lives app-wide. Every dialog has the same three parts: a fixed header, a body that scrolls
 * on its own, and a fixed action bar.
 */
export function IMResponsiveDialog({
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
}: IMResponsiveDialogProps) {
  const isMobile = useIsMobile()
  const Title = isMobile ? IMSheetTitle : IMDialogTitle
  const Description = isMobile ? IMSheetDescription : IMDialogDescription
  const Header = isMobile ? IMSheetHeader : IMDialogHeader

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
        <Header className="shrink-0 gap-1 border-b-0 px-5 pt-2 pb-4 pe-12 lg:px-6 lg:pt-6">
          <Title className="w-full text-balance">{title}</Title>
          {description && <Description className="w-full text-pretty">{description}</Description>}
        </Header>
      )}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 lg:px-6",
          hideHeader && "pt-2 lg:pt-6",
          footer ? "pb-5" : "pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] lg:pb-6",
          bodyClassName
        )}
      >
        {children}
      </div>
      {footer && (
        <div className="flex shrink-0 items-center gap-2 border-t border-border px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:px-6 lg:pb-4">
          {footer}
        </div>
      )}
    </>
  )

  if (isMobile) {
    return (
      <IMSheet open={open} onOpenChange={onOpenChange}>
        {trigger && <IMSheetTrigger asChild>{trigger}</IMSheetTrigger>}
        <IMSheetContent className={cn("gap-0 p-0 pt-3", contentClassName)} dir="rtl">
          {anatomy}
        </IMSheetContent>
      </IMSheet>
    )
  }

  return (
    <IMDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <IMDialogTrigger asChild>{trigger}</IMDialogTrigger>}
      <IMDialogContent
        className={cn(
          "max-h-[min(54rem,calc(100dvh-2rem))] gap-0 overflow-hidden p-0",
          DESKTOP_WIDTH[size],
          contentClassName
        )}
        dir="rtl"
      >
        {anatomy}
      </IMDialogContent>
    </IMDialog>
  )
}

export interface IMDialogActionsProps {
  /** A secondary action (a ghost "delete", say) alone at the inline start. */
  start?: React.ReactNode
  /** Takes the start slot while there is one, right beside the button that caused it. */
  error?: string | null
  children: React.ReactNode
}

/**
 * The action bar's layout, so every dialog orders its buttons the same way: `children` are packed
 * at the inline end — pass "ביטול" first and the primary action last, which puts the primary at
 * the far end in RTL.
 */
export function IMDialogActions({ start, error, children }: IMDialogActionsProps) {
  return (
    <>
      {error ? (
        <p role="alert" className="min-w-0 flex-1 text-sm font-bold text-destructive">
          {error}
        </p>
      ) : (
        start
      )}
      <div className="ms-auto flex shrink-0 items-center gap-2">{children}</div>
    </>
  )
}
