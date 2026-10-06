import type React from 'react'
import { useState } from 'react'
import { Trash2 } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { HealthDeclarationSummary } from '@/features/health-declaration/components/HealthDeclarationSummary'
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
        <div className="border-t border-border pt-4">
        <HealthDeclarationSummary {...health} onOpenFull={() => setHealthDialogOpen(true)} />
        </div>
        <HealthDeclarationDialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen} {...health} />
        <Button type="submit" disabled={isSaving} className="w-full sm:w-auto sm:self-start">
          {isSaving ? 'שומר…' : 'שמירה'}
        </Button>
      </form>

      <section aria-labelledby="customer-danger-zone" className="flex flex-col gap-2 border-t border-border pt-5">
        <h3 id="customer-danger-zone" className="text-sm font-bold text-foreground">
          מחיקת הלקוח
        </h3>
        <p className="text-sm text-muted-foreground">מוחקת איתו גם את הפרויקטים, התורים והשיחות שלו. לפני המחיקה יוצג בדיוק מה יימחק.</p>
        <Button type="button" variant="outline" onClick={onDelete} className="self-start gap-2 text-destructive">
          <Trash2 size={15} />
          מחיקת לקוח
        </Button>
      </section>
    </div>
  )
}
