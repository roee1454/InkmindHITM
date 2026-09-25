import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Copy, Check, Mail } from '@/components/ui/icon'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { addStaffMember, addStaffSchema } from '@/features/settings/server/settings'

export interface AddStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AddStaffDialog: React.FC<AddStaffDialogProps> = ({ open, onOpenChange }) => {
  const queryClient = useQueryClient()
  const [createdInvite, setCreatedInvite] = useState<{ name: string; email: string; inviteLink: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const addForm = useForm({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'staff' as const,
    },
  })

  const addStaffMutation = useMutation({
    mutationFn: (values: z.infer<typeof addStaffSchema>) => addStaffMember({ data: values }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      addForm.reset()
      if (res?.inviteLink) {
        setCreatedInvite({
          name: res.name,
          email: res.email,
          inviteLink: res.inviteLink,
        })
      } else {
        onOpenChange(false)
      }
    },
    onError: (err: Error) => addForm.setError('root', { message: err.message }),
  })

  const handleClose = () => {
    setCreatedInvite(null)
    setCopied(false)
    addForm.reset()
    onOpenChange(false)
  }

  const copyLink = (link: string) => {
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${link}` : link
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
        else onOpenChange(true)
      }}
      title={createdInvite ? 'ההזמנה נוצרה בהצלחה!' : 'הזמנת איש צוות ומקעקע חדש'}
      description={
        createdInvite
          ? 'קישור ההזמנה מוכן לשיתוף. נשלח גם מייל אוטומטי אם שרת הדואר מוגדר.'
          : 'הזן שם מלא ואימייל בלבד. העובד יקבל קישור אישי להשלמת תהליך הקליטה (סיסמה, שעות פעילות וחיבור יומן).'
      }
    >
      {createdInvite ? (
        <div className="flex flex-col gap-4 py-2 font-assistant" dir="rtl">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <Mail size={18} className="text-primary" />
              <span>
                הזמנה עבור {createdInvite.name} ({createdInvite.email})
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              העובד יוכל לבחור סיסמה, להגדיר מספר טלפון פנימי, למלא פרופיל, לקבוע שעות ולחבר יומן גוגל.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">
              קישור הזמנה ישיר (להעתקה לוואטסאפ/טלגרם):
            </label>
            <div className="flex h-12 w-full items-center gap-2 rounded-xl border border-input bg-card px-3 shadow-xs">
              <input
                readOnly
                dir="ltr"
                value={createdInvite.inviteLink}
                className="w-full bg-transparent text-xs text-muted-foreground outline-none font-medium"
              />
              <button
                type="button"
                onClick={() => copyLink(createdInvite.inviteLink)}
                className="flex items-center gap-1 shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-all cursor-pointer hover:bg-primary/90"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'הועתק!' : 'העתק'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="btn-native mt-2 w-full cursor-pointer"
          >
            סיום וסגירה
          </button>
        </div>
      ) : (
        <Form {...addForm}>
          <form
            onSubmit={addForm.handleSubmit((values) => addStaffMutation.mutate(values))}
            className="space-y-4 px-1 py-1 font-assistant"
            dir="rtl"
          >
            <FormField
              control={addForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold">שם מלא *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="לדוגמה: רועי לוי" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={addForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold">כתובת אימייל *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} placeholder="artist@studio.co.il" dir="ltr" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={addForm.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold">תפקיד והרשאה במערכת *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent dir="rtl">
                      <SelectItem value="staff">צוות / מקעקע/ת (גישה לתורים ולידים אישיים)</SelectItem>
                      <SelectItem value="admin">מנהל/ת מערכת (גישה מלאה להגדרות ולכל הסטודיו)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {addForm.formState.errors.root && (
              <p className="text-xs font-semibold text-destructive">{addForm.formState.errors.root.message}</p>
            )}

            <button
              type="submit"
              disabled={addStaffMutation.isPending}
              className="btn-native w-full cursor-pointer mt-2"
            >
              {addStaffMutation.isPending ? 'יוצר הזמנה…' : 'יצירת הזמנה ושליחת מייל'}
            </button>
          </form>
        </Form>
      )}
    </ResponsiveDialog>
  )
}

