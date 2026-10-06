import type React from 'react'
import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { IMButton } from '@/components/ui/button'
import { IMInput } from '@/components/ui/input'
import { IMDialogActions, IMResponsiveDialog } from '@/components/ui/responsive-dialog'
import { IMSelect, IMSelectContent, IMSelectItem, IMSelectTrigger, IMSelectValue } from '@/components/ui/select'
import { updateStaffMember } from '@/features/settings/server/settings'

interface EditStaffInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  staffId: string
  name: string
  email: string
  phone?: string
  /** Owner role is fixed here on purpose — reassigning ownership isn't a casual edit-form action. */
  role: 'owner' | 'admin' | 'staff'
  onSaved: () => void
}

/** A team member's name, email, phone and role. */
export function EditStaffInfoDialog({ open, onOpenChange, trigger, staffId, role, onSaved, ...initial }: EditStaffInfoDialogProps) {
  const [name, setName] = useState(initial.name)
  const [email, setEmail] = useState(initial.email)
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [editableRole, setEditableRole] = useState<'admin' | 'staff'>(role === 'admin' ? 'admin' : 'staff')
  const [error, setError] = useState<string | null>(null)

  // Each opening starts from the saved values, not from an abandoned edit.
  useEffect(() => {
    if (!open) return
    setName(initial.name)
    setEmail(initial.email)
    setPhone(initial.phone ?? '')
    setEditableRole(role === 'admin' ? 'admin' : 'staff')
    setError(null)
  }, [open])

  const mutation = useMutation({
    mutationFn: () =>
      updateStaffMember({ data: { id: staffId, name: name.trim(), email: email.trim(), phone: phone.trim(), role: role === 'owner' ? 'owner' : editableRole } }),
    onSuccess: onSaved,
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'שגיאה בעדכון הפרטים'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('חסר שם.')
    if (!email.trim()) return setError('חסר אימייל.')
    setError(null)
    mutation.mutate()
  }

  return (
    <IMResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={`עריכת הפרטים של ${initial.name}`}
      footer={
        <IMDialogActions error={error}>
          <IMButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </IMButton>
          <IMButton type="submit" form="staff-info-form" disabled={mutation.isPending} className="min-w-28">
            {mutation.isPending ? 'שומר…' : 'שמירה'}
          </IMButton>
        </IMDialogActions>
      }
    >
      <form id="staff-info-form" onSubmit={submit} className="form-stack">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="staff-name" className="form-label">
            שם מלא
          </label>
          <IMInput id="staff-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="staff-email" className="form-label">
            אימייל
          </label>
          <IMInput id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="staff-phone" className="form-label">
            טלפון
          </label>
          <IMInput id="staff-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-1234567" dir="ltr" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="form-label">תפקיד</span>
          {role === 'owner' ? (
            <p className="text-sm text-muted-foreground">בעלים. את הבעלות לא מעבירים מכאן.</p>
          ) : (
            <IMSelect value={editableRole} onValueChange={(v) => setEditableRole(v as 'admin' | 'staff')}>
              <IMSelectTrigger className="w-full" aria-label="תפקיד">
                <IMSelectValue />
              </IMSelectTrigger>
              <IMSelectContent dir="rtl">
                <IMSelectItem value="staff">צוות / מקעקע/ת</IMSelectItem>
                <IMSelectItem value="admin">מנהל/ת מערכת</IMSelectItem>
              </IMSelectContent>
            </IMSelect>
          )}
        </div>
      </form>
    </IMResponsiveDialog>
  )
}
