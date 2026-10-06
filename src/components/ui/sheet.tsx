import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { IMOverlayClose } from "@/components/ui/dialog"
import { useDragToDismiss } from "@/hooks/useDragToDismiss"
import { cn } from "@/lib/utils"

/**
 * A panel that slides in from an edge, for a form or detail view that keeps the page in context:
 * bottom on phones (with a drag handle), the side on desktop. One sheet at a time — a sheet never
 * opens another sheet. Built on the same Radix Dialog as IMDialog.
 *
 * `side` is *physical*, to match the physical `inset-y-0 right-0` positioning: mixing a logical
 * animation (tw-animate-css also ships `slide-in-from-start/end`) with physical offsets would desync
 * the two. The document is `dir="rtl"` (`__root.tsx`), so `left` is the inline end.
 */
export function IMSheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

export function IMSheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

export interface IMSheetContentProps extends React.ComponentProps<typeof SheetPrimitive.Content> {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}

export function IMSheetContent({
  className,
  children,
  side = "bottom",
  showCloseButton = true,
  ...props
}: IMSheetContentProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const dismissRef = React.useRef<HTMLButtonElement>(null)
  const dragHandlers = useDragToDismiss({ panelRef, overlayRef, onDismiss: () => dismissRef.current?.click() })

  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        ref={overlayRef}
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-black/45 fill-mode-both data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <SheetPrimitive.Content
        ref={panelRef}
        data-slot="sheet-content"
        tabIndex={-1}
        onOpenAutoFocus={(e) => {
          // Don't let Radix focus the first focusable element — if that's a text input, it pops
          // the on-screen keyboard on mount. Focus the panel itself.
          e.preventDefault()
          ;(e.currentTarget as HTMLElement | null)?.focus()
        }}
        className={cn(
          // `fill-mode-both` matters: the panel's resting transform is the enter keyframe's *start*
          // (fully off-screen), so if the animation is skipped or interrupted — background tab,
          // frozen compositor — the drawer would be unreachable. Holding the final frame makes that
          // safe. `outline-none`: onOpenAutoFocus focuses the panel itself, not a keyboard user.
          "fixed z-50 flex flex-col gap-4 bg-card text-card-foreground shadow-lg outline-none fill-mode-both data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-300",
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
        {showCloseButton && <IMOverlayClose />}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

/** The title and one muted line, over a hairline. */
export function IMSheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col items-start gap-0.5 border-b border-border p-5 pe-12 text-start", className)}
      {...props}
    />
  )
}

/** Pinned under the body; on phones the primary action is `lg`, full width. */
export function IMSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 border-t border-border p-5", className)}
      {...props}
    />
  )
}

/** The `title` text role (17/700). */
export function IMSheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg font-bold text-foreground", className)}
      {...props}
    />
  )
}

/** The `body-sm` role, muted. */
export function IMSheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm font-medium text-muted-foreground", className)}
      {...props}
    />
  )
}
