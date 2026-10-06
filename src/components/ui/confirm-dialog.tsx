import type * as React from "react"

import { IMButton } from "@/components/ui/button"
import { IMDialogActions, IMResponsiveDialog } from "@/components/ui/responsive-dialog"

export interface IMConfirmDetail {
  label: string
  value: React.ReactNode
}

export interface IMConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** A question or the task ("מחיקת התור"). */
  title: string
  /** One sentence: what happens, and whether it can be undone. */
  description?: React.ReactNode
  /** What the action touches, as label/value lines — the record staff are about to lose, say. */
  details?: IMConfirmDetail[]
  /** A specific verb ("מחיקת התור"), never "אישור". */
  confirmLabel: string
  /** Shown on the button while `isPending`; defaults to the confirm label. */
  pendingLabel?: string
  /** `destructive` only for what can't be taken back (delete, overwrite). */
  variant?: "primary" | "destructive"
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
 * The one way the app asks "are you sure?": the sentence says what happens, the details say what it
 * happens to (in a `surface-2` key/value block, never a nested card), and the button says the action.
 */
export function IMConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  confirmLabel,
  pendingLabel,
  variant = "primary",
  isPending = false,
  confirmDisabled = false,
  hideConfirm = false,
  error,
  onConfirm,
  children,
  cancelLabel = "ביטול",
}: IMConfirmDialogProps) {
  return (
    <IMResponsiveDialog
      open={open}
      onOpenChange={(next) => !isPending && onOpenChange(next)}
      size="sm"
      title={title}
      description={description}
      footer={
        <IMDialogActions error={error}>
          <IMButton type="button" variant="ghost" disabled={isPending} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </IMButton>
          {!hideConfirm && (
            <IMButton
              type="button"
              variant={variant}
              loading={isPending}
              disabled={confirmDisabled}
              onClick={onConfirm}
              className="min-w-28"
            >
              {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
            </IMButton>
          )}
        </IMDialogActions>
      }
    >
      {details && details.length > 0 && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-md bg-surface-2 px-4 py-3 text-sm">
          {details.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="font-medium text-muted-foreground">{detail.label}</dt>
              <dd className="min-w-0 truncate font-bold text-foreground">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </IMResponsiveDialog>
  )
}
