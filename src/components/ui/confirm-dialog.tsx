import type * as React from "react"
import { Loader2 } from "#/components/ui/icon"
import { Button } from "#/components/ui/button"
import { DialogActions, ResponsiveDialog } from "#/components/ui/responsive-dialog"

export interface ConfirmDetail {
  label: string
  value: React.ReactNode
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** One sentence: what happens, and whether it can be undone. */
  description?: React.ReactNode
  /** What the action touches, as label/value lines — the record staff are about to lose, say. */
  details?: ConfirmDetail[]
  confirmLabel: string
  /** Shown on the button while `isPending`; defaults to the confirm label. */
  pendingLabel?: string
  /** Destructive only for what can't be taken back (delete, overwrite); otherwise the default fill. */
  tone?: "default" | "destructive"
  isPending?: boolean
  /** Not yet decidable — say, while checking what a delete would take with it. */
  confirmDisabled?: boolean
  /** Nothing left to confirm (the record is already gone): only the close button remains. */
  hideConfirm?: boolean
  error?: string | null
  onConfirm: () => void
  /** Anything the decision needs beyond the details — a checkbox, a warning. Rare. */
  children?: React.ReactNode
  cancelLabel?: string
}

/**
 * The one way the app asks "are you sure?" (dialogs D2). It replaces four hand-built confirmations,
 * each with its own warning box, info box and button layout: here the sentence says what happens,
 * the details list says what it happens to, and the button says the action, in its tone.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  confirmLabel,
  pendingLabel,
  tone = "default",
  isPending = false,
  confirmDisabled = false,
  hideConfirm = false,
  error,
  onConfirm,
  children,
  cancelLabel = "ביטול",
}: ConfirmDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !isPending && onOpenChange(next)}
      size="sm"
      title={title}
      description={description}
      footer={
        <DialogActions error={error}>
          <Button type="button" variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          {!hideConfirm && (
            <Button
              type="button"
              variant={tone === "destructive" ? "destructive" : "default"}
              disabled={isPending || confirmDisabled}
              onClick={onConfirm}
              className="min-w-28 gap-2"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
            </Button>
          )}
        </DialogActions>
      }
    >
      {details && details.length > 0 && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          {details.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-muted-foreground">{detail.label}</dt>
              <dd className="min-w-0 truncate font-bold text-foreground">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </ResponsiveDialog>
  )
}
