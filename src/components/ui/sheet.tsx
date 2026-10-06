"use client"

import * as React from "react"
import { XIcon } from '@/components/ui/icon'
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "#/lib/utils.ts"
import { useDragToDismiss } from "#/hooks/useDragToDismiss"

/**
 * Slide-over panel, built on the same Radix Dialog primitive as `dialog.tsx`.
 *
 * `side` is *physical* to match the physical `inset-y-0 right-0` positioning — mixing a
 * logical animation (tw-animate-css does also ship `slide-in-from-start/end`) with physical
 * offsets would desync the two. The document is hardcoded `dir="rtl"` in `__root.tsx`, so
 * `side="right"` is the start edge in this app.
 */
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/45 fill-mode-both data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "bottom",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const dismissRef = React.useRef<HTMLButtonElement>(null)
  const dragHandlers = useDragToDismiss({ panelRef, overlayRef, onDismiss: () => dismissRef.current?.click() })

  return (
    <SheetPortal>
      <SheetOverlay ref={overlayRef} />
      <SheetPrimitive.Content
        ref={panelRef}
        data-slot="sheet-content"
        tabIndex={-1}
        onOpenAutoFocus={(e) => {
          // Don't let Radix auto-focus the first focusable element — if that's a text input, it
          // pops the mobile on-screen keyboard immediately on mount. Focus the panel itself.
          e.preventDefault()
          ;(e.currentTarget as HTMLElement | null)?.focus()
        }}
        className={cn(
          // `fill-mode-both` matters here: the panel's un-animated resting transform is the
          // enter keyframe's *start* (fully off-screen), so if the animation is ever skipped
          // or interrupted — background tab, frozen compositor, a UA that disables animation
          // — the drawer would be unreachable. Holding the final frame makes that safe.
          //
          // `outline-none` — `onOpenAutoFocus` below focuses this element itself (not a
          // keyboard interaction), which would otherwise leave the browser's default focus
          // ring drawn around the whole panel.
          "fixed z-50 flex flex-col gap-4 bg-card font-assistant shadow-lg outline-none fill-mode-both data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-300",
          side === "right" &&
            "inset-y-0 right-0 h-svh w-[85vw] max-w-sm rounded-e-xl border-e border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          side === "left" &&
            "inset-y-0 left-0 h-svh w-[85vw] max-w-sm rounded-s-xl border-s border-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[92svh] rounded-t-xl border-t border-border px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          side === "top" &&
            "inset-x-0 top-0 h-auto rounded-b-xl border-b border-border data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          className
        )}
        {...props}
      >
        {side === "bottom" && (
          <>
            {/* The grabber follows the finger (useDragToDismiss). Its `::before` widens the touch
                target to ~200×30px without moving the bar or the layout under it; `sticky` keeps it
                reachable when the panel itself is the scroll container. */}
            <div
              aria-hidden
              className="sticky top-0 z-10 mx-auto h-1.5 w-10 shrink-0 cursor-grab touch-none rounded-full bg-foreground/15 transition-colors duration-150 before:absolute before:-inset-x-20 before:-inset-y-3 before:content-[''] data-[dragging]:cursor-grabbing data-[dragging]:bg-foreground/30"
              {...dragHandlers}
            />
            {/* Closing goes through Radix like any other close, so every caller's `onOpenChange` runs. */}
            <SheetPrimitive.Close ref={dismissRef} tabIndex={-1} aria-hidden className="hidden" />
          </>
        )}
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="absolute end-4 top-4 cursor-pointer rounded-xs text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">סגירה</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 border-b border-border p-5 font-assistant text-right items-start pe-8", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 border-t border-border p-5", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-assistant text-base leading-none font-extrabold text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("font-assistant text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  Sheet as IMSheet,
  SheetClose,
  SheetClose as IMSheetClose,
  SheetContent,
  SheetContent as IMSheetContent,
  SheetDescription,
  SheetDescription as IMSheetDescription,
  SheetFooter,
  SheetFooter as IMSheetFooter,
  SheetHeader,
  SheetHeader as IMSheetHeader,
  SheetOverlay,
  SheetOverlay as IMSheetOverlay,
  SheetPortal,
  SheetPortal as IMSheetPortal,
  SheetTitle,
  SheetTitle as IMSheetTitle,
  SheetTrigger,
  SheetTrigger as IMSheetTrigger,
}
