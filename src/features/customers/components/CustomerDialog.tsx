import type React from 'react'
import { IMButton } from '@/components/ui/button'
import { IMDialogActions, IMResponsiveDialog } from '@/components/ui/responsive-dialog'
import type { CustomerFormData } from '../types'
import { CustomerFormFields } from './CustomerFormFields'

interface CustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: CustomerFormData
  onFormChange: <K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => void
  formError: string | null
  onSubmit: (e: React.FormEvent) => void
  isSaving: boolean
}

const FORM_ID = 'customer-create-form'

/**
 * Adding a customer — from the customers page and from the booking wizard alike. An existing
 * customer opens in the customer card (CustomerSheet) instead.
 */
export function CustomerDialog({ open, onOpenChange, form, onFormChange, formError, onSubmit, isSaving }: CustomerDialogProps) {
  return (
    <IMResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="לקוח חדש"
      footer={
        <IMDialogActions>
          <IMButton type="submit" form={FORM_ID} disabled={isSaving} className="min-w-28">
            {isSaving ? 'יוצר לקוח…' : 'הוספת לקוח'}
          </IMButton>
          <IMButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </IMButton>
        </IMDialogActions>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="form-stack">
        {formError && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {formError}
          </p>
        )}
        <CustomerFormFields form={form} onFormChange={onFormChange} isCreate />
      </form>
    </IMResponsiveDialog>
  )
}
