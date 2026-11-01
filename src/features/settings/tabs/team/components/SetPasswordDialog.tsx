import type React from 'react'
import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { IMButton } from '@/components/ui/button'
import { IMInput } from '@/components/ui/input'
import { IMDialogActions, IMResponsiveDialog } from '@/components/ui/responsive-dialog'
import { setStaffPassword } from '@/features/settings/server/settings'

interface SetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  staffId: string
  name: string
  /** Reset rather than set: the member already has a password. */
  hasPassword: boolean
  onSaved: () => void
}

const MIN_LENGTH = 6

/** Setting or resetting a team member's password; they log in with it from then on. */
export function SetPasswordDialog({ open, onOpenChange, trigger, staffId, name, hasPassword, onSaved }: SetPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Never keep a typed password around between openings.
  useEffect(() => {
    if (open) return
    setPassword('')
    setConfirm('')
    setError(null)
  }, [open])

  const mutation = useMutation({
    mutationFn: () => setStaffPassword({ data: { staffId, password } }),
    onSuccess: onSaved,
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'שגיאה בקביעת הסיסמה'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_LENGTH) return setError(`לפחות ${MIN_LENGTH} תווים.`)
    if (password !== confirm) return setError('הסיסמאות לא תואמות.')
    setError(null)
    mutation.mutate()
  }

  return (
    <IMResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      size="sm"
      title={hasPassword ? `איפוס הסיסמה של ${name}` : `סיסמה ל${name}`}
      description={hasPassword ? 'הסיסמה הקודמת תפסיק לעבוד.' : undefined}
      footer={
        <IMDialogActions error={error}>
          <IMButton type="submit" form="set-password-form" disabled={mutation.isPending} className="min-w-28">
            {mutation.isPending ? 'שומר…' : hasPassword ? 'איפוס' : 'קביעת סיסמה'}
          </IMButton>
          <IMButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </IMButton>
        </IMDialogActions>
      }
    >
      <form id="set-password-form" onSubmit={submit} className="form-stack">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-password" className="form-label">
            סיסמה חדשה
          </label>
          <IMInput id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
          <p className="text-xs text-muted-foreground">לפחות {MIN_LENGTH} תווים.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-password" className="form-label">
            אימות
          </label>
          <IMInput id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} dir="ltr" />
        </div>
      </form>
    </IMResponsiveDialog>
  )
}
