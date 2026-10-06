import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { bootstrapAdmin } from '@/features/auth/server/auth'
import { ensureSettings } from '@/features/onboarding/server/onboarding'
import { Mail, Lock, User, Phone, AlertCircle, Eye, EyeOff } from '@/components/ui/icon'
import { useOnboardingUiStore } from '../store/onboardingUiStore'

const adminFormSchema = z
  .object({
    name: z.string().trim().min(1, 'נא להזין שם מלא'),
    email: z.string().trim().email('נא להזין כתובת אימייל תקינה'),
    phone: z
      .string()
      .trim()
      .min(9, 'נא להזין מספר טלפון תקין')
      .refine((val) => {
        const clean = val.replace(/\D/g, '')
        return clean.length >= 9 && clean.length <= 12
      }, 'נא להזין מספר טלפון תקין'),
    password: z.string().min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים'),
    passwordConfirm: z.string().min(8, 'אימות הסיסמה חייב להכיל לפחות 8 תווים'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'הסיסמאות אינן תואמות',
    path: ['passwordConfirm'],
  })

export function AdminStep() {
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  const adminName = useOnboardingUiStore((s) => s.adminName)
  const adminEmail = useOnboardingUiStore((s) => s.adminEmail)
  const adminPhone = useOnboardingUiStore((s) => s.adminPhone)
  const adminPassword = useOnboardingUiStore((s) => s.adminPassword)
  const adminPasswordConfirm = useOnboardingUiStore((s) => s.adminPasswordConfirm)
  const errors = useOnboardingUiStore((s) => s.adminErrors)
  const rootError = useOnboardingUiStore((s) => s.adminRootError)

  const setAdminName = useOnboardingUiStore((s) => s.setAdminName)
  const setAdminEmail = useOnboardingUiStore((s) => s.setAdminEmail)
  const setAdminPhone = useOnboardingUiStore((s) => s.setAdminPhone)
  const setAdminPassword = useOnboardingUiStore((s) => s.setAdminPassword)
  const setAdminPasswordConfirm = useOnboardingUiStore((s) => s.setAdminPasswordConfirm)
  const setAdminErrors = useOnboardingUiStore((s) => s.setAdminErrors)
  const setAdminRootError = useOnboardingUiStore((s) => s.setAdminRootError)
  const setCurrentStep = useOnboardingUiStore((s) => s.setCurrentStep)

  const mutation = useMutation({
    mutationFn: async () => {
      await bootstrapAdmin({
        data: {
          name: adminName.trim(),
          email: adminEmail.trim(),
          phone: adminPhone.trim(),
          password: adminPassword,
        },
      })
      await ensureSettings()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['current-session'] })
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      // An absolute step, not "next": once the session exists the page's own effect already moves
      // a logged-in user from step 2 to 3, and a relative step on top of that skips the portfolio.
      setCurrentStep(3)
    },
    onError: (err: Error) => setAdminRootError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAdminRootError(null)

    const result = adminFormSchema.safeParse({
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      password: adminPassword,
      passwordConfirm: adminPasswordConfirm,
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message
      }
      setAdminErrors(fieldErrors)
      return
    }

    setAdminErrors({})
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-3xl">יצירת חשבון מנהל ראשי</h1>
        <p className="step-hint">
          נשתמש בפרטים אלו עבור חשבון המנהל הראשי שלך והכניסה למערכת.
        </p>
      </div>

      {rootError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          <span>{rootError}</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-bold text-foreground">שם מלא *</label>
          <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <User className="size-[18px] shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="ישראל ישראלי"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
            />
          </div>
          {errors.name && <p className="text-xs font-bold text-destructive">{errors.name}</p>}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-bold text-foreground">כתובת מייל ראשית *</label>
          <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <Mail className="size-[18px] shrink-0 text-muted-foreground" />
            <Input
              type="email"
              dir="ltr"
              placeholder="name@studio.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
            />
          </div>
          {errors.email && <p className="text-xs font-bold text-destructive">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-bold text-foreground">מספר טלפון פנימי *</label>
          <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <Phone className="size-[18px] shrink-0 text-muted-foreground" />
            <Input
              type="tel"
              dir="ltr"
              placeholder="050-1234567"
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            ישמש עבור התראות מערכת והתקשרות סטודיו. אינו מוצג ללקוחות הקצה.
          </span>
          {errors.phone && <p className="text-xs font-bold text-destructive">{errors.phone}</p>}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-bold text-foreground">סיסמה *</label>
          <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <Lock className="size-[18px] shrink-0 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="לפחות 8 תווים"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
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
          {errors.password && <p className="text-xs font-bold text-destructive">{errors.password}</p>}
        </div>

        {/* Password Confirm */}
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-bold text-foreground">אימות סיסמה *</label>
          <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <Lock className="size-[18px] shrink-0 text-muted-foreground" />
            <Input
              type={showPasswordConfirm ? 'text' : 'password'}
              placeholder="הזן שוב את הסיסמה"
              value={adminPasswordConfirm}
              onChange={(e) => setAdminPasswordConfirm(e.target.value)}
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
          {errors.passwordConfirm && (
            <p className="text-xs font-bold text-destructive">{errors.passwordConfirm}</p>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <div className="step-footer">
        <button type="submit" className="btn-native" disabled={mutation.isPending}>
          {mutation.isPending ? 'יוצר חשבון…' : 'יצירת חשבון והמשך להגדרת פרופיל'}
        </button>
      </div>
    </form>
  )
}

