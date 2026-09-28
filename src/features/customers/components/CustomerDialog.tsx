import type React from 'react'
import { Button } from '@/components/ui/button'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
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
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="לקוח חדש"
      footer={
        <DialogActions>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSaving} className="min-w-28">
            {isSaving ? 'יוצר לקוח…' : 'הוספת לקוח'}
          </Button>
        </DialogActions>
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
    </ResponsiveDialog>
  )
}
