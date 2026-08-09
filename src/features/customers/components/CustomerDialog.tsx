import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SelectInput } from '@/components/ui/select-input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
}) => {
  const isCreate = mode === 'create'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl text-right font-assistant" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'הוספת לקוח חדש' : 'עריכת פרטי לקוח'}</DialogTitle>
          <DialogDescription>
            {isCreate ? 'הזן את פרטי הלקוח החדש במאגר.' : 'עדכן את פרטי הלקוח במאגר.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <p className="text-xs font-semibold text-rose-400 font-assistant">{formError}</p>
        )}

        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">שם מלא</label>
            <Input
              type="text"
              placeholder={isCreate ? 'למשל: דניאל חיים' : undefined}
              value={form.name}
              onChange={(e) => onFormChange('name', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              מספר טלפון{isCreate ? ' (חובה)' : ''}
            </label>
            <Input
              type="text"
              placeholder={isCreate ? 'למשל: 0547654321' : undefined}
              value={form.phone}
              onChange={(e) => onFormChange('phone', e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">אימייל</label>
            <Input
              type="email"
              placeholder={isCreate ? 'client@email.com' : undefined}
              value={form.email}
              onChange={(e) => onFormChange('email', e.target.value)}
              dir="ltr"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">מקור הגעה</label>
            <SelectInput
              value={form.source}
              onChange={(e) => onFormChange('source', e.target.value)}
            >
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </SelectInput>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">לקוח VIP</span>
              <span className="text-micro text-muted-foreground">סמן לקוח זה כ-VIP</span>
            </div>
            <Switch checked={form.isVip} onCheckedChange={(v) => onFormChange('isVip', v)} />
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl mt-2 font-bold cursor-pointer"
          >
            {isCreate
              ? isSaving
                ? 'יוצר לקוח…'
                : 'הוסף לקוח'
              : isSaving
                ? 'שומר שינויים…'
                : 'שמור שינויים'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CustomerDialog
