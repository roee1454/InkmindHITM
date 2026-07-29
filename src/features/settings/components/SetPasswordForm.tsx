import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setStaffPassword } from '../server/settings'

interface SetPasswordFormProps {
  staffId: string
  onDone: () => void
}

export const SetPasswordForm: React.FC<SetPasswordFormProps> = ({ staffId, onDone }) => {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const setPasswordMutation = useMutation({
    mutationFn: () => setStaffPassword({ data: { staffId, password } }),
    onSuccess: () => {
      onDone()
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בקביעת הסיסמה')
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות')
      return
    }
    setError(null)
    setPasswordMutation.mutate()
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-4">
      {error && <p className="font-assistant text-xs font-semibold text-destructive">{error}</p>}
      <div className="flex flex-col gap-3">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה חדשה"
          dir="ltr"
        />
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="אימות סיסמה"
          dir="ltr"
        />
        <Button
          type="submit"
          disabled={setPasswordMutation.isPending}
          className="mt-2 w-full"
        >
          {setPasswordMutation.isPending ? 'שומר…' : 'שמור סיסמה'}
        </Button>
      </div>
    </form>
  )
}
export default SetPasswordForm
