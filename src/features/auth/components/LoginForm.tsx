import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { IMInput } from '@/components/ui/input'
import {
  IMForm,
  IMFormControl,
  IMFormField,
  IMFormItem,
  IMFormLabel,
  IMFormMessage,
} from '@/components/ui/form'
import { login } from '@/features/auth/server/auth'
import { Mail, Lock, AlertCircle, Eye, EyeOff } from '@/components/ui/icon'

const schema = z.object({
  email: z.string().email('נא להזין אימייל תקין'),
  password: z.string().min(1, 'שדה חובה'),
})

export function LoginForm() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => login({ data: values }),
    onSuccess: () => navigate({ to: '/' }),
    onError: (err: Error) => form.setError('root', { message: err.message }),
  })

  return (
    <IMForm {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="form-stack gap-8 text-right font-assistant"
        dir="rtl"
      >
        <div className="form-stack">
          <IMFormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <IMFormItem>
                <IMFormLabel className="form-label">כתובת אימייל</IMFormLabel>
                <IMFormControl>
                  <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Mail className="size-[18px] shrink-0 text-muted-foreground" />
                    <IMInput
                      type="email"
                      placeholder="name@studio.com"
                      dir="ltr"
                      className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
                      {...field}
                    />
                  </div>
                </IMFormControl>
                <IMFormMessage />
              </IMFormItem>
            )}
          />

          <IMFormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <IMFormItem>
                <IMFormLabel className="form-label">סיסמה</IMFormLabel>
                <IMFormControl>
                  <div className="flex h-14 w-full items-center gap-2.5 rounded-2xl border border-input bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Lock className="size-[18px] shrink-0 text-muted-foreground" />
                    <IMInput
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      dir="ltr"
                      className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="tap-target -me-2 shrink-0 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </IMFormControl>
                <IMFormMessage />
              </IMFormItem>
            )}
          />
        </div>

        {form.formState.errors.root && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
            <AlertCircle size={15} className="shrink-0" />
            <span>{form.formState.errors.root.message}</span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button type="submit" className="btn-native" disabled={mutation.isPending}>
            {mutation.isPending ? 'מתחבר למערכת…' : 'התחברות למערכת'}
          </button>
          <Link to="/auth/forgot-password" className="text-center text-sm font-bold text-primary">
            שכחתי סיסמה
          </Link>
        </div>
      </form>
    </IMForm>
  )
}
