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
import { login } from '@/features/auth/server/auth'
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'

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
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="form-stack gap-8 text-right font-assistant"
        dir="rtl"
      >
        <div className="form-stack">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">כתובת אימייל</FormLabel>
                <FormControl>
                  <div className="flex h-14 w-full items-center gap-2.5 rounded-[18px] border border-input/80 bg-card px-4 shadow-xs outline-none transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Mail className="size-[18px] shrink-0 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@studio.com"
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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">סיסמה</FormLabel>
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
        </div>

        {form.formState.errors.root && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-[13px] font-semibold text-destructive">
            <AlertCircle size={15} className="shrink-0" />
            <span>{form.formState.errors.root.message}</span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button type="submit" className="btn-native" disabled={mutation.isPending}>
            {mutation.isPending ? 'מתחבר למערכת…' : 'התחברות למערכת'}
          </button>
          <a href="#" className="text-center text-sm font-bold text-primary">
            שכחתי סיסמה
          </a>
        </div>
      </form>
    </Form>
  )
}
