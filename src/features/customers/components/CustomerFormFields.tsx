import { IMInput } from '@/components/ui/input'
import { IMSelect, IMSelectContent, IMSelectItem, IMSelectTrigger, IMSelectValue } from '@/components/ui/select'
import { IMSwitch } from '@/components/ui/switch'
import { SOURCE_LABELS } from '../types'
import type { CustomerFormData } from '../types'

interface CustomerFormFieldsProps {
  form: CustomerFormData
  onFormChange: <K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => void
  /** Creating shows examples in the empty fields and marks the phone as required. */
  isCreate?: boolean
}

/** The customer's contact fields, shared by the new-customer dialog and the customer card. */
export function CustomerFormFields({ form, onFormChange, isCreate = false }: CustomerFormFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="form-label">שם מלא</label>
        <IMInput type="text" placeholder={isCreate ? 'למשל: דניאל חיים' : undefined} value={form.name} onChange={(e) => onFormChange('name', e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="form-label">מספר טלפון{isCreate ? ' (חובה)' : ''}</label>
        <IMInput type="text" placeholder={isCreate ? 'למשל: 0547654321' : undefined} value={form.phone} onChange={(e) => onFormChange('phone', e.target.value)} dir="ltr" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="form-label">אימייל</label>
        <IMInput type="email" placeholder={isCreate ? 'client@email.com' : undefined} value={form.email} onChange={(e) => onFormChange('email', e.target.value)} dir="ltr" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="form-label">מקור הגעה</label>
        <IMSelect value={form.source} onValueChange={(val) => onFormChange('source', val)}>
          <IMSelectTrigger className="h-12 rounded-2xl md:h-11">
            <IMSelectValue placeholder="בחר מקור הגעה" />
          </IMSelectTrigger>
          <IMSelectContent align="end" position="popper" dir="rtl">
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <IMSelectItem key={k} value={k}>
                {v}
              </IMSelectItem>
            ))}
          </IMSelectContent>
        </IMSelect>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-foreground">לקוח VIP</span>
          <span className="text-xs text-muted-foreground">סמן לקוח זה כ-VIP</span>
        </div>
        <IMSwitch checked={form.isVip} onCheckedChange={(v) => onFormChange('isVip', v)} />
      </div>
    </>
  )
}
