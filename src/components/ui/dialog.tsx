import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { IMIcon } from "@/components/ui/icon"
import { IM_TYPE_ROLES } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

/**
 * The centred-dialog primitive that IMResponsiveDialog and IMConfirmDialog are built on. Features
 * don't import it (lint): a dialog that is a sheet on phones is IMResponsiveDialog.
 */
export function IMDialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

export function IMDialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

export interface IMDialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean
}

export function IMDialogContent({ className, children, showCloseButton = true, ...props }: IMDialogContentProps) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-black/50 fill-mode-both data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:fade-in-0"
      />
      {/* tw-animate-css's enter/exit keyframes set `transform` directly (translate3d + scale3d),
          which overwrites any static translate utility on the same element — a
          `-translate-x-1/2 -translate-y-1/2` centring would lose its offset mid-animation and jump.
          A flex wrapper centres instead, so the animated element's `transform` only carries the zoom. */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <DialogPrimitive.Content
          data-slot="dialog-content"
          tabIndex={-1}
          className={cn(
            "pointer-events-auto relative flex w-full max-w-110 flex-col gap-4 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none fill-mode-both data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}
          onOpenAutoFocus={(e) => {
            // Don't let Radix focus the first focusable element — if that's a text input, it pops
            // the on-screen keyboard on mount. Focus the panel itself.
            e.preventDefault()
            ;(e.currentTarget as HTMLElement | null)?.focus()
          }}
          {...props}
        >
          {children}
          {showCloseButton && <IMOverlayClose />}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  )
}

/** The close button at the inline-end corner, shared by IMDialogContent and IMSheetContent (both Radix Dialog). */
export function IMOverlayClose() {
  return (
    <DialogPrimitive.Close
      data-slot="overlay-close"
      className="absolute end-4 top-4 grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none transition-colors duration-100 hover:bg-surface-2 hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/35 disabled:pointer-events-none"
    >
      <IMIcon name="close" size="sm" />
      <span className="sr-only">סגירה</span>
    </DialogPrimitive.Close>
  )
}

export function IMDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col items-start gap-1 pe-10 text-start", className)}
      {...props}
    />
  )
}

/** The `title` text role (17/700): a question or a task ("למחוק את התור?", "תור חדש"). */
export function IMDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(IM_TYPE_ROLES.title, "text-foreground", className)}
      {...props}
    />
  )
}

/** The `body-sm` role, muted: what happens. */
export function IMDialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(IM_TYPE_ROLES["body-sm"], "text-muted-foreground", className)}
      {...props}
    />
  )
}
