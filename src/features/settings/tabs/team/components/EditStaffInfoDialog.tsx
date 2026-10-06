import type React from 'react'
import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={`עריכת הפרטים של ${initial.name}`}
      footer={
        <DialogActions error={error}>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" form="staff-info-form" disabled={mutation.isPending} className="min-w-28">
            {mutation.isPending ? 'שומר…' : 'שמירה'}
          </Button>
        </DialogActions>
      }
    >
      <form id="staff-info-form" onSubmit={submit} className="form-stack">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="staff-name" className="form-label">
            שם מלא
          </label>
          <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="staff-email" className="form-label">
            אימייל
          </label>
          <Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="staff-phone" className="form-label">
            טלפון
          </label>
          <Input id="staff-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-1234567" dir="ltr" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="form-label">תפקיד</span>
          {role === 'owner' ? (
            <p className="text-sm text-muted-foreground">בעלים. את הבעלות לא מעבירים מכאן.</p>
          ) : (
            <Select value={editableRole} onValueChange={(v) => setEditableRole(v as 'admin' | 'staff')}>
              <SelectTrigger className="w-full" aria-label="תפקיד">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="staff">צוות / מקעקע/ת</SelectItem>
                <SelectItem value="admin">מנהל/ת מערכת</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </form>
    </ResponsiveDialog>
  )
}
