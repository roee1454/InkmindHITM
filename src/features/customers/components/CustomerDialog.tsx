import React from 'react'
import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SelectInput } from '@/components/ui/select-input'
import { Switch } from '@/components/ui/switch'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { SOURCE_LABELS, type CustomerFormData } from '../types'

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

  const title = isCreate ? 'הוספת לקוח חדש' : 'עריכת פרטי לקוח'
  const description = isCreate ? 'הזן את פרטי הלקוח החדש במאגר.' : 'עדכן את פרטי הלקוח במאגר.'

  const formBody = (
    <form onSubmit={onSubmit} className="form-stack mt-2">
      {formError && <p className="font-assistant text-[13px] font-bold text-destructive">{formError}</p>}

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
        <SelectInput value={form.source} onChange={(e) => onFormChange('source', e.target.value)}>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectInput>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-foreground">לקוח VIP</span>
          <span className="text-[12.5px] text-muted-foreground">סמן לקוח זה כ-VIP</span>
        </div>
        <Switch checked={form.isVip} onCheckedChange={(v) => onFormChange('isVip', v)} />
      </div>

      <button type="submit" disabled={isSaving} className="btn-native mt-2">
        {isCreate ? (isSaving ? 'יוצר לקוח…' : 'הוסף לקוח') : isSaving ? 'שומר שינויים…' : 'שמור שינויים'}
      </button>

      {!isCreate && onDelete && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm('האם אתה בטוח שברצונך למחוק לקוח זה?')) {
              onDelete()
            }
          }}
          className="flex w-full cursor-pointer items-center justify-center gap-2 text-[13.5px] font-bold text-destructive"
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
