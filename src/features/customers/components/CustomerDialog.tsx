import React, { useState } from 'react'
import { Trash2 } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { SOURCE_LABELS } from '../types'
import type { CustomerFormData } from '../types'
import { HealthDeclarationViewer } from '@/features/health-declaration/components/HealthDeclarationViewer'
import { HealthDeclarationDialog } from '@/features/health-declaration/components/HealthDeclarationDialog'

interface CustomerDialogProps {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  form: CustomerFormData
  onFormChange: <K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => void
  formError: string | null
  onSubmit: (e: React.FormEvent) => void
  isSaving: boolean
  onDelete?: () => void
}

export const CustomerDialog: React.FC<CustomerDialogProps> = ({
  mode,
  open,
  onOpenChange,
  form,
  onFormChange,
  formError,
  onSubmit,
  isSaving,
  onDelete,
}) => {
  const isCreate = mode === 'create'
  const [healthDialogOpen, setHealthDialogOpen] = useState(false)

  const title = isCreate ? 'הוספת לקוח חדש' : 'עריכת פרטי לקוח'
  const description = isCreate ? 'הזן את פרטי הלקוח החדש במאגר.' : 'עדכן את פרטי הלקוח במאגר.'

  const formBody = (
    <form onSubmit={onSubmit} className="form-stack mt-2">
      {formError && <p className="font-assistant text-sm font-bold text-destructive">{formError}</p>}

      <div className="flex flex-col gap-1.5">
        <label className="form-label">שם מלא</label>
        <Input
          type="text"
          placeholder={isCreate ? 'למשל: דניאל חיים' : undefined}
          value={form.name}
          onChange={(e) => onFormChange('name', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="form-label">מספר טלפון{isCreate ? ' (חובה)' : ''}</label>
        <Input
          type="text"
          placeholder={isCreate ? 'למשל: 0547654321' : undefined}
          value={form.phone}
          onChange={(e) => onFormChange('phone', e.target.value)}
          dir="ltr"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="form-label">אימייל</label>
        <Input
          type="email"
          placeholder={isCreate ? 'client@email.com' : undefined}
          value={form.email}
          onChange={(e) => onFormChange('email', e.target.value)}
          dir="ltr"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="form-label">מקור הגעה</label>
        <Select
          value={form.source}
          onValueChange={(val) => onFormChange('source', val)}
        >
          <SelectTrigger className="h-12 rounded-2xl md:h-11">
            <SelectValue placeholder="בחר מקור הגעה" />
          </SelectTrigger>
          <SelectContent align="end" position="popper" dir="rtl">
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-foreground">לקוח VIP</span>
          <span className="text-xs text-muted-foreground">סמן לקוח זה כ-VIP</span>
        </div>
        <Switch checked={form.isVip} onCheckedChange={(v) => onFormChange('isVip', v)} />
      </div>

      {!isCreate && (
        <>
          <HealthDeclarationViewer
            compact
            signed={form.healthDeclarationSigned}
            date={form.healthDeclarationDate}
            url={form.healthDeclarationUrl}
            medicalNotes={form.medicalNotes}
            answers={form.healthDeclarationAnswers}
            allergies={form.allergies}
            customerName={form.name}
            onOpenFull={() => setHealthDialogOpen(true)}
          />

          <HealthDeclarationDialog
            open={healthDialogOpen}
            onOpenChange={setHealthDialogOpen}
            signed={form.healthDeclarationSigned}
            date={form.healthDeclarationDate}
            url={form.healthDeclarationUrl}
            medicalNotes={form.medicalNotes}
            answers={form.healthDeclarationAnswers}
            allergies={form.allergies}
            customerName={form.name}
          />
        </>
      )}

      <button type="submit" disabled={isSaving} className="btn-native mt-2">
        {isCreate ? (isSaving ? 'יוצר לקוח…' : 'הוסף לקוח') : isSaving ? 'שומר שינויים…' : 'שמור שינויים'}
      </button>

      {!isCreate && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full cursor-pointer items-center justify-center gap-2 text-sm font-bold text-destructive"
        >
          <Trash2 size={15} />
          מחיקת לקוח
        </button>
      )}
    </form>
  )

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      {formBody}
    </ResponsiveDialog>
  )
}

export default CustomerDialog
