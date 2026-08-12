import * as React from "react"
import { cn } from "#/lib/utils.ts"
import { useIsMobile } from "#/hooks/use-media-query.ts"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog.tsx"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#/components/ui/sheet.tsx"

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  /** Rendered inside DialogFooter/SheetFooter. Most call sites put their action buttons inside
   *  `children` instead (matching how forms already look in this app) — this is for the rare
   *  case that wants a visually separated footer. */
  footer?: React.ReactNode
  /** Renders inside DialogTrigger/SheetTrigger `asChild` — omit when the caller drives `open`
   *  externally (e.g. from a row click or a search-param). */
  trigger?: React.ReactNode
  contentClassName?: string
  /** For dialogs that need an accessible title/description (Radix requires both) without a
   *  visible header row — image galleries and the like. Title/description are still rendered,
   *  just screen-reader-only. */
  hideHeader?: boolean
}

/**
 * Dialog on desktop, bottom sheet on mobile — the single place this branch lives app-wide.
 * Extracted from `CustomerDialog.tsx`'s original hand-rolled version of the same pattern.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  trigger,
  contentClassName,
  hideHeader,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
        <SheetContent className={cn("font-assistant", contentClassName)} dir="rtl">
          {hideHeader ? (
            <>
              <SheetTitle className="sr-only">{title}</SheetTitle>
              {description && <SheetDescription className="sr-only">{description}</SheetDescription>}
            </>
          ) : (
            <SheetHeader className="border-b-0 px-0 pb-0">
              <SheetTitle>{title}</SheetTitle>
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
          )}
          {children}
          {footer && <SheetFooter className="border-t-0 px-0 pb-0">{footer}</SheetFooter>}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn("text-right font-assistant sm:max-w-md", contentClassName)} dir="rtl">
        {hideHeader ? (
          <>
            <DialogTitle className="sr-only">{title}</DialogTitle>
            {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
          </>
        ) : (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

export default ResponsiveDialog
