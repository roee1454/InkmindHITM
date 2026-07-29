import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { bootstrapAdmin } from '@/features/auth/server/auth'
import { ensureSettings } from '@/features/onboarding/server/onboarding'
import { Mail, Lock, User, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'שדה חובה'),
  email: z.string().email('נא להזין אימייל תקין'),
  password: z.string().min(8, 'לפחות 8 תווים'),
})

export function SetupForm() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      await bootstrapAdmin({ data: values })
      await ensureSettings()
    },
    onSuccess: () => navigate({ to: '/onboarding/whatsapp' }),
    onError: (err: Error) => form.setError('root', { message: err.message }),
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="space-y-4 text-right font-assistant"
        dir="rtl"
      >
        {/* Full Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold text-foreground">שם מלא</FormLabel>
              <FormControl>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                    <User size={16} />
                  </div>
                  <Input
                    placeholder="ישראל ישראלי"
                    className="h-11 rounded-xl pr-10 text-sm"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold text-foreground">כתובת אימייל</FormLabel>
              <FormControl>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                    <Mail size={16} />
                  </div>
                  <Input
                    type="email"
                    placeholder="name@studio.com"
                    dir="ltr"
                    className="h-11 rounded-xl pr-10 text-xs font-mono"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold text-foreground">סיסמה</FormLabel>
              <FormControl>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                    <Lock size={16} />
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="לפחות 8 תווים"
                    dir="ltr"
                    className="h-11 rounded-xl px-10 text-xs font-mono"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage className="text-[11px]" />
              <p className="text-[11px] text-muted-foreground">
                הסיסמה חייבת להכיל לפחות 8 תווים. מומלץ לשמור אותה במקום בטוח.
              </p>
            </FormItem>
          )}
        />

        {/* Root Error */}
        {form.formState.errors.root && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
            <AlertCircle size={15} className="shrink-0" />
            <span>{form.formState.errors.root.message}</span>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="h-11 w-full rounded-xl font-bold cursor-pointer gap-2 text-sm shadow-md transition-all hover:scale-[1.01]"
          disabled={mutation.isPending}
        >
          <span>{mutation.isPending ? 'יוצר חשבון…' : 'יצירת חשבון והמשך לאשף'}</span>
          <ArrowLeft size={16} />
        </Button>
      </form>
    </Form>
  )
}
