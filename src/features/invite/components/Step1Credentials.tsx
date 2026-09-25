import React from 'react'
import { Input } from '@/components/ui/input'
import { Lock, Phone, Eye, EyeOff, AlertCircle } from '@/components/ui/icon'
import { useInviteUiStore } from '../store/inviteUiStore'
import { useInviteMutations } from '../hooks/useInviteMutations'

export function Step1Credentials() {
  const staffName = useInviteUiStore((s) => s.staffName)
  const password = useInviteUiStore((s) => s.password)
  const setPassword = useInviteUiStore((s) => s.setPassword)
  const passwordConfirm = useInviteUiStore((s) => s.passwordConfirm)
  const setPasswordConfirm = useInviteUiStore((s) => s.setPasswordConfirm)
  const phone = useInviteUiStore((s) => s.phone)
  const setPhone = useInviteUiStore((s) => s.setPhone)
  const showPassword = useInviteUiStore((s) => s.showPassword)
  const setShowPassword = useInviteUiStore((s) => s.setShowPassword)
  const showPasswordConfirm = useInviteUiStore((s) => s.showPasswordConfirm)
  const setShowPasswordConfirm = useInviteUiStore((s) => s.setShowPasswordConfirm)
  const step1Errors = useInviteUiStore((s) => s.step1Errors)
  const setStep1Errors = useInviteUiStore((s) => s.setStep1Errors)
  const step1RootError = useInviteUiStore((s) => s.step1RootError)
  const setStep1RootError = useInviteUiStore((s) => s.setStep1RootError)

  const { acceptInviteMutation } = useInviteMutations()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep1RootError(null)
    const errors: Record<string, string> = {}
    if (password.length < 8) errors.password = 'הסיסמה חייבת להכיל לפחות 8 תווים'
    if (password !== passwordConfirm) errors.passwordConfirm = 'הסיסמאות אינן תואמות'
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 9 || cleanPhone.length > 12) errors.phone = 'נא להזין מספר טלפון תקין'

    if (Object.keys(errors).length > 0) {
      setStep1Errors(errors)
      return
    }
    setStep1Errors({})
    acceptInviteMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-3xl">ברוך הבא לצוות, {staffName}!</h1>
        <p className="step-hint">
          הגדר את הסיסמה האישית שלך ומספר טלפון פנימי ליצירת קשר עם הסטודיו.
        </p>
      </div>

      {step1RootError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          <span>{step1RootError}</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Phone */}
        <div className="flex flex-col gap-1.5 text-start">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-foreground">מספר טלפון פנימי *</label>
            <span className="text-2xs font-semibold text-primary">פנימי בלבד — אינו מוצג ללקוחות</span>
          </div>
          <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <Phone className="size-[18px] shrink-0 text-muted-foreground" />
            <Input
              type="tel"
              dir="ltr"
              autoFocus
              placeholder="050-1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
            />
          </div>
          {step1Errors.phone && <p className="text-xs font-bold text-destructive">{step1Errors.phone}</p>}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-bold text-foreground">סיסמה חדשה (לפחות 8 תווים) *</label>
          <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <Lock className="size-[18px] shrink-0 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="לפחות 8 תווים"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="tap-target -me-2 shrink-0 text-muted-foreground cursor-pointer"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {step1Errors.password && <p className="text-xs font-bold text-destructive">{step1Errors.password}</p>}
        </div>

        {/* Password Confirm */}
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-bold text-foreground">אימות סיסמה *</label>
          <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <Lock className="size-[18px] shrink-0 text-muted-foreground" />
            <Input
              type={showPasswordConfirm ? 'text' : 'password'}
              placeholder="הזן שוב את הסיסמה"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
              className="tap-target -me-2 shrink-0 text-muted-foreground cursor-pointer"
            >
              {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {step1Errors.passwordConfirm && (
            <p className="text-xs font-bold text-destructive">{step1Errors.passwordConfirm}</p>
          )}
        </div>
      </div>

      <div className="flex-1" />
      <div className="step-footer">
        <button
          type="submit"
          disabled={acceptInviteMutation.isPending}
          className="btn-native cursor-pointer"
        >
          {acceptInviteMutation.isPending ? 'מאמת ומחבר…' : 'המשך להגדרת פרופיל אמן'}
        </button>
      </div>
    </form>
  )
}

