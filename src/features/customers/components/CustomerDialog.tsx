import type React from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
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

/** Adding a customer. An existing customer opens in the customer card (CustomerSheet) instead. */
export function CustomerDialog({ open, onOpenChange, form, onFormChange, formError, onSubmit, isSaving }: CustomerDialogProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="הוספת לקוח חדש" description="הזן את פרטי הלקוח החדש במאגר.">
      <form onSubmit={onSubmit} className="form-stack mt-2">
        {formError && <p className="font-assistant text-sm font-bold text-destructive">{formError}</p>}
        <CustomerFormFields form={form} onFormChange={onFormChange} isCreate />
        <button type="submit" disabled={isSaving} className="btn-native mt-2">
          {isSaving ? 'יוצר לקוח…' : 'הוסף לקוח'}
        </button>
      </form>
    </ResponsiveDialog>
  )
}
