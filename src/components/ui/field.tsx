import * as React from "react"
import { Slot } from "radix-ui"

import { AlertCircle } from "@/components/ui/icon"
import { IMLabel } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface IMFieldProps extends Omit<React.ComponentProps<"div">, "children" | "id"> {
  /** Always visible — a placeholder is an example value, never the label. */
  label: React.ReactNode
  /** The one control: IMInput, IMTextarea, IMSelectTrigger, IMDatePicker… It receives `id`,
   *  `aria-describedby` and `aria-invalid`, so don't give it an `id` of its own. */
  children: React.ReactElement
  /** One line under the control, `body-sm` muted. Hidden while there is an error. */
  help?: React.ReactNode
  /** Replaces the help line and marks the control invalid. Say how to fix it. */
  error?: React.ReactNode
  /** Adds a muted marker to the label and `aria-required` to the control. */
  required?: boolean
  /** The control's id, when something else needs to know it; generated otherwise. */
  id?: string
}

/**
 * Label + control + help or error, with the ids wired: the label points at the control and the
 * control is described by whichever line is showing. The react-hook-form counterpart is IMFormItem.
 */
export function IMField({ label, help, error, required, id, className, children, ...props }: IMFieldProps) {
  const generatedId = React.useId()
  const controlId = id ?? generatedId
  const helpId = `${controlId}-help`
  const errorId = `${controlId}-error`
  const invalid = error !== undefined && error !== null && error !== false && error !== ""
  const describedBy = invalid ? errorId : help ? helpId : undefined

  return (
    <div data-slot="field" data-invalid={invalid || undefined} className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props}>
      <IMLabel htmlFor={controlId}>
        {label}
        {required && (
          <span aria-hidden className="font-semibold text-muted-foreground">
            *
          </span>
        )}
      </IMLabel>
      <Slot.Root
        id={controlId}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
      >
        {children}
      </Slot.Root>
      {invalid ? (
        <p id={errorId} data-slot="field-error" className="flex items-center gap-1.5 ps-1 text-sm font-bold text-destructive">
          {/* Phase 1b: <IMIcon name="warning-circle" size="sm" /> */}
          <AlertCircle aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      ) : (
        help && (
          <p id={helpId} data-slot="field-help" className="ps-1 text-sm font-medium text-muted-foreground">
            {help}
          </p>
        )
      )}
    </div>
  )
}
