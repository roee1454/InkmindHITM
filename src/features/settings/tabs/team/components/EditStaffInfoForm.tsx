import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateStaffMember } from '@/features/settings/server/settings'

export interface EditStaffInfoFormProps {
  staffId: string
  initialName: string
  initialEmail: string
  initialPhone?: string
  /** Owner role is fixed here on purpose — reassigning ownership isn't a casual edit-form action. */
  role: 'owner' | 'admin' | 'staff'
  onDone: () => void
}

export const EditStaffInfoForm: React.FC<EditStaffInfoFormProps> = ({
  staffId,
  initialName,
  initialEmail,
  initialPhone = '',
  role,
  onDone,
}) => {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [phone, setPhone] = useState(initialPhone)
  const [editableRole, setEditableRole] = useState<'admin' | 'staff'>(role === 'admin' ? 'admin' : 'staff')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      updateStaffMember({
        data: {
          id: staffId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role: role === 'owner' ? 'owner' : editableRole,
        },
      }),
    onSuccess: () => onDone(),
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'שגיאה בעדכון הפרטים'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('שם מלא הוא שדה חובה')
      return
    }
    if (!email.trim()) {
      setError('אימייל הוא שדה חובה')
      return
    }
    setError(null)
    mutation.mutate()
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-4 font-assistant" dir="rtl">
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-foreground">שם מלא</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-foreground">כתובת אימייל</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
          className="rounded-xl text-xs"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-foreground">מספר טלפון</label>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="050-1234567"
          dir="ltr"
          className="rounded-xl text-xs"
        />
      </div>
      <div className="flex flex-col gap-1.5" dir="rtl">
        <label className="text-xs font-bold text-foreground">תפקיד במערכת</label>
        {role === 'owner' ? (
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
            בעלים (לא ניתן לשינוי כאן)
          </div>
        ) : (
          <Select value={editableRole} onValueChange={(v) => setEditableRole(v as 'admin' | 'staff')}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="staff">צוות / מקעקע/ת</SelectItem>
              <SelectItem value="admin">מנהל/ת מערכת</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <Button type="submit" disabled={mutation.isPending} className="mt-2 w-full rounded-xl font-bold cursor-pointer">
        {mutation.isPending ? 'שומר…' : 'שמור שינויים'}
      </Button>
    </form>
  )
}

export default EditStaffInfoForm

