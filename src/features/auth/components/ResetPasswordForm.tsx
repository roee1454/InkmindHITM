import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { confirmStaffPasswordReset } from '@/features/auth/server/auth'
import { Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'

const schema = z
  .object({
    password: z.string().min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים'),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'הסיסמאות אינן תואמות',
    path: ['passwordConfirm'],
  })

interface ResetPasswordFormProps {
  token?: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', passwordConfirm: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      confirmStaffPasswordReset({ data: { token: token ?? '', ...values } }),
    onSuccess: () => navigate({ to: '/auth/login' }),
    onError: (err: Error) => form.setError('root', { message: err.message }),
  })

  if (!token) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-[13px] font-semibold text-destructive"
        dir="rtl"
      >
        <AlertCircle size={15} className="shrink-0" />
        <span>הקישור אינו תקין. יש לבקש איפוס סיסמה חדש מדף ההתחברות.</span>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="form-stack gap-8 text-right font-assistant"
        dir="rtl"
      >
        <div className="form-stack">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">סיסמה חדשה</FormLabel>
                <FormControl>
                  <div className="flex h-14 w-full items-center gap-2.5 rounded-[18px] border border-input/80 bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Lock className="size-[18px] shrink-0 text-muted-foreground" />
                    <Input
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="passwordConfirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">אימות סיסמה</FormLabel>
                <FormControl>
                  <div className="flex h-14 w-full items-center gap-2.5 rounded-[18px] border border-input/80 bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Lock className="size-[18px] shrink-0 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      dir="ltr"
                      className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {form.formState.errors.root && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-[13px] font-semibold text-destructive">
            <AlertCircle size={15} className="shrink-0" />
            <span>{form.formState.errors.root.message}</span>
          </div>
        )}

        <button type="submit" className="btn-native" disabled={mutation.isPending}>
          {mutation.isPending ? 'מעדכן…' : 'עדכון סיסמה'}
        </button>
      </form>
    </Form>
  )
}
