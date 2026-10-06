import * as React from "react"
import { Slot } from "radix-ui"
import { Controller, FormProvider, useFormContext, useFormState } from "react-hook-form"
import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form"

import { IMLabel } from "@/components/ui/label"
import type { IMLabelProps } from "@/components/ui/label"
import { IMText } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

/**
 * react-hook-form bindings: `IMForm` provides the form, `IMFormField` one controlled field, and
 * `IMFormItem` lays out label + control + help/message with ids wired. A field without
 * react-hook-form is an IMField.
 */
export const IMForm = FormProvider

const FormFieldContext = React.createContext<{ name: string } | null>(null)
const FormItemContext = React.createContext<{ id: string } | null>(null)

export function IMFormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

function useFormField() {
  const field = React.useContext(FormFieldContext)
  const item = React.useContext(FormItemContext)
  if (!field || !item) throw new Error("IMForm parts must sit inside <IMFormField> and <IMFormItem>")

  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: field.name })
  const fieldState = getFieldState(field.name, formState)

  return {
    name: field.name,
    formItemId: `${item.id}-form-item`,
    formDescriptionId: `${item.id}-form-item-description`,
    formMessageId: `${item.id}-form-item-message`,
    ...fieldState,
  }
}

export function IMFormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId()
  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props} />
    </FormItemContext.Provider>
  )
}

export function IMFormLabel({ className, ...props }: IMLabelProps) {
  const { error, formItemId } = useFormField()
  return (
    <IMLabel
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

export function IMFormControl(props: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={!!error}
      {...props}
    />
  )
}

/** Help text under the control: the `body-sm` role, muted. */
export function IMFormDescription({ className, ...props }: Omit<React.HTMLAttributes<HTMLParagraphElement>, "dir">) {
  const { formDescriptionId } = useFormField()
  return (
    <IMText
      data-slot="form-description"
      id={formDescriptionId}
      variant="body-sm"
      tone="muted"
      className={cn("ps-1", className)}
      {...props}
    />
  )
}

/** The field's error, or `children` when there is none. Says how to fix it. */
export function IMFormMessage({ className, children, ...props }: Omit<React.HTMLAttributes<HTMLParagraphElement>, "dir">) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error.message ?? "") : children
  if (!body) return null

  return (
    <IMText
      data-slot="form-message"
      id={formMessageId}
      variant="label"
      tone="destructive"
      className={cn("ps-1", className)}
      {...props}
    >
      {body}
    </IMText>
  )
}
