import { useNavigate } from '@tanstack/react-router'
import { AlertCircle } from '@/components/ui/icon'
import type { InviteTokenStatus } from '../types'

interface InviteInvalidTokenProps {
  reason?: InviteTokenStatus
}

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'קישור ההזמנה לא נמצא או שאינו תקין.',
  already_accepted: 'הזמנה זו כבר מומשה בעבר. נא להתחבר למערכת עם הסיסמה שלך.',
  expired: 'פג תוקף קישור ההזמנה (תוקף ההזמנה הינו 7 ימים). פנה למנהל הסטודיו לקבלת קישור חדש.',
  missing_token: 'לא סופק מזהה הזמנה תקין בקישור.',
}

export function InviteInvalidToken({ reason }: InviteInvalidTokenProps) {
  const navigate = useNavigate()
  const message = ERROR_MESSAGES[reason || 'not_found'] || 'קישור ההזמנה אינו תקף.'

  return (
    <div className="step-shell font-assistant" dir="rtl">
      <div className="step-body justify-center items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive mb-2">
          <AlertCircle size={28} />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">קישור ההזמנה אינו תקין</h1>
        <p className="text-sm font-medium text-muted-foreground max-w-sm">{message}</p>
        <button
          type="button"
          onClick={() => navigate({ to: '/auth/login' })}
          className="btn-native mt-4 w-full md:w-full max-w-xs cursor-pointer"
        >
          מעבר לדף ההתחברות
        </button>
      </div>
    </div>
  )
}

