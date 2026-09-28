import type React from 'react'
import { useState } from 'react'
import { Trash2 } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { HealthDeclarationViewer } from '@/features/health-declaration/components/HealthDeclarationViewer'
import { HealthDeclarationDialog } from '@/features/health-declaration/components/HealthDeclarationDialog'
import type { CustomerFormData } from '../../types'
import { CustomerFormFields } from '../CustomerFormFields'

interface CustomerDetailsTabProps {
  form: CustomerFormData
  onFormChange: <K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => void
  formError: string | null
  onSubmit: (e: React.FormEvent) => void
  isSaving: boolean
  onDelete: () => void
}

/** The customer's contact details, health declaration, and — set apart at the bottom — deleting them. */
export function CustomerDetailsTab({ form, onFormChange, formError, onSubmit, isSaving, onDelete }: CustomerDetailsTabProps) {
  const [healthDialogOpen, setHealthDialogOpen] = useState(false)
  const health = {
    signed: form.healthDeclarationSigned,
    date: form.healthDeclarationDate,
    url: form.healthDeclarationUrl,
    medicalNotes: form.medicalNotes,
    answers: form.healthDeclarationAnswers,
    allergies: form.allergies,
    customerName: form.name,
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="form-stack">
        {formError && <p className="text-sm font-bold text-destructive">{formError}</p>}
        <CustomerFormFields form={form} onFormChange={onFormChange} />
        <HealthDeclarationViewer compact {...health} onOpenFull={() => setHealthDialogOpen(true)} />
        <HealthDeclarationDialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen} {...health} />
        <button type="submit" disabled={isSaving} className="btn-native">
          {isSaving ? 'שומר שינויים…' : 'שמירת שינויים'}
        </button>
      </form>

      <section aria-labelledby="customer-danger-zone" className="flex flex-col gap-2 border-t border-border pt-4">
        <h3 id="customer-danger-zone" className="text-sm font-extrabold text-destructive">
          אזור מסוכן
        </h3>
        <p className="text-xs text-muted-foreground">מחיקה של לקוח מוחקת איתו גם רשומות שקשורות אליו. לפני שמוחקים יוצג בדיוק מה יימחק.</p>
        <Button type="button" variant="outline" onClick={onDelete} className="self-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10">
          <Trash2 size={15} />
          מחיקת לקוח
        </Button>
      </section>
    </div>
  )
}
