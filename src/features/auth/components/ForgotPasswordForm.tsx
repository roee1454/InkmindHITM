import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
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
import { requestStaffPasswordReset } from '@/features/auth/server/auth'
import { Mail, CheckCircle2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('נא להזין אימייל תקין'),
})

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => requestStaffPasswordReset({ data: values }),
    onSuccess: () => setSent(true),
  })

  if (sent) {
    return (
      <div className="form-stack gap-8 text-right font-assistant" dir="rtl">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[13px] font-semibold text-emerald-500">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>אם קיים חשבון עם כתובת האימייל הזו, נשלח אליו קישור לאיפוס הסיסמה.</span>
        </div>
        <Link to="/auth/login" className="text-center text-sm font-bold text-primary">
          חזרה להתחברות
        </Link>
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
        </div>

        <div className="flex flex-col gap-4">
          <button type="submit" className="btn-native" disabled={mutation.isPending}>
            {mutation.isPending ? 'שולח…' : 'שליחת קישור לאיפוס'}
          </button>
          <Link to="/auth/login" className="text-center text-sm font-bold text-primary">
            חזרה להתחברות
          </Link>
        </div>
      </form>
    </Form>
  )
}
