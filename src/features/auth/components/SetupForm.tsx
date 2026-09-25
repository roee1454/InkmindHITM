import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { bootstrapAdmin } from '@/features/auth/server/auth'
import { ensureSettings } from '@/features/onboarding/server/onboarding'
import { Mail, Lock, User, Phone, AlertCircle, Eye, EyeOff } from '@/components/ui/icon'
import { OnboardingStepShell } from '@/components/OnboardingStepShell'

const step1Schema = z.object({
  name: z.string().trim().min(1, 'נא להזין שם מלא'),
  email: z.string().trim().email('נא להזין כתובת אימייל תקינה'),
})

const step2Schema = z.object({
  phone: z
    .string()
    .trim()
    .min(9, 'נא להזין מספר טלפון תקין')
    .refine((val) => {
      const clean = val.replace(/\D/g, '')
      return clean.length >= 9 && clean.length <= 12
    }, 'נא להזין מספר טלפון תקין'),
})

const step3Schema = z
  .object({
    password: z.string().min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים'),
    passwordConfirm: z.string().min(8, 'אימות הסיסמה חייב להכיל לפחות 8 תווים'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'הסיסמאות אינן תואמות',
    path: ['passwordConfirm'],
  })

export function SetupForm() {
  const navigate = useNavigate()
  const [subStep, setSubStep] = useState<1 | 2 | 3>(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [rootError, setRootError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      await bootstrapAdmin({
        data: {
          name: formValues.name.trim(),
          email: formValues.email.trim(),
          phone: formValues.phone.trim(),
          password: formValues.password,
        },
      })
      await ensureSettings()
    },
    onSuccess: () => navigate({ to: '/onboarding/profile-links' }),
    onError: (err: Error) => setRootError(err.message),
  })

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setRootError(null)
    const result = step1Schema.safeParse({ name: formValues.name, email: formValues.email })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setSubStep(2)
  }

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setRootError(null)
    const result = step2Schema.safeParse({ phone: formValues.phone })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setSubStep(3)
  }

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setRootError(null)
    const result = step3Schema.safeParse({
      password: formValues.password,
      passwordConfirm: formValues.passwordConfirm,
    })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    mutation.mutate()
  }

  return (
    <OnboardingStepShell
      stepNumber={subStep}
      onBack={subStep > 1 ? () => setSubStep((s) => (s - 1) as 1 | 2) : undefined}
    >
      {rootError && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          <span>{rootError}</span>
        </div>
      )}

      {/* Sub-step 1: Name and Primary Email */}
      {subStep === 1 && (
        <form onSubmit={handleNextFromStep1} className="step-body">
          <div className="flex flex-col gap-2">
            <h1 className="step-question text-3xl">מה השם וכתובת המייל שלך?</h1>
            <p className="step-hint">
              נשתמש בפרטים אלו עבור חשבון המנהל הראשי שלך במערכת.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-start">
              <label className="text-sm font-bold text-foreground">שם מלא *</label>
              <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <User className="size-[18px] shrink-0 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="ישראל ישראלי"
                  value={formValues.name}
                  onChange={(e) => setFormValues((v) => ({ ...v, name: e.target.value }))}
                  className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
                />
              </div>
              {errors.name && <p className="text-xs font-bold text-destructive">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-1.5 text-start">
              <label className="text-sm font-bold text-foreground">כתובת מייל ראשית *</label>
              <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <Mail className="size-[18px] shrink-0 text-muted-foreground" />
                <Input
                  type="email"
                  dir="ltr"
                  placeholder="name@studio.com"
                  value={formValues.email}
                  onChange={(e) => setFormValues((v) => ({ ...v, email: e.target.value }))}
                  className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
                />
              </div>
              {errors.email && <p className="text-xs font-bold text-destructive">{errors.email}</p>}
            </div>
          </div>

          <div className="flex-1" />
          <div className="step-footer">
            <button type="submit" className="btn-native">
              המשך למספר טלפון
            </button>
          </div>
        </form>
      )}

      {/* Sub-step 2: Phone number */}
      {subStep === 2 && (
        <form onSubmit={handleNextFromStep2} className="step-body">
          <div className="flex flex-col gap-2">
            <h1 className="step-question text-3xl">מספר טלפון פנימי</h1>
            <p className="step-hint">
              ישמש עבור התראות מערכת פנימיות והתקשרות סטודיו. אינו מוצג ללקוחות הקצה.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-start">
              <label className="text-sm font-bold text-foreground">מספר טלפון *</label>
              <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <Phone className="size-[18px] shrink-0 text-muted-foreground" />
                <Input
                  type="tel"
                  dir="ltr"
                  autoFocus
                  placeholder="050-1234567"
                  value={formValues.phone}
                  onChange={(e) => setFormValues((v) => ({ ...v, phone: e.target.value }))}
                  className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
                />
              </div>
              {errors.phone && <p className="text-xs font-bold text-destructive">{errors.phone}</p>}
            </div>
          </div>

          <div className="flex-1" />
          <div className="step-footer">
            <button type="submit" className="btn-native">
              המשך לקביעת סיסמה
            </button>
          </div>
        </form>
      )}

      {/* Sub-step 3: Password */}
      {subStep === 3 && (
        <form onSubmit={handleFinalSubmit} className="step-body">
          <div className="flex flex-col gap-2">
            <h1 className="step-question text-3xl">סיסמה לצורך כניסה לממשק</h1>
            <p className="step-hint">
              בחר סיסמה מאובטחת בת 8 תווים לפחות כדי להיכנס למערכת.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-start">
              <label className="text-sm font-bold text-foreground">סיסמה *</label>
              <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <Lock className="size-[18px] shrink-0 text-muted-foreground" />
                <Input
                  autoFocus
                  type={showPassword ? 'text' : 'password'}
                  placeholder="לפחות 8 תווים"
                  value={formValues.password}
                  onChange={(e) => setFormValues((v) => ({ ...v, password: e.target.value }))}
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

            <div className="flex flex-col gap-1.5 text-start">
              <label className="text-sm font-bold text-foreground">אימות סיסמה *</label>
              <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <Lock className="size-[18px] shrink-0 text-muted-foreground" />
                <Input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  placeholder="הזן שוב את הסיסמה"
                  value={formValues.passwordConfirm}
                  onChange={(e) => setFormValues((v) => ({ ...v, passwordConfirm: e.target.value }))}
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
      )}
    </OnboardingStepShell>
  )
}
