import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { Copy, Check } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
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
      title={createdInvite ? `ההזמנה ל${createdInvite.name} מוכנה` : 'הזמנת איש צוות'}
      description={
        createdInvite
          ? `נשלח מייל ל-${createdInvite.email} (אם שרת הדואר מוגדר). אפשר גם לשלוח את הקישור ישירות.`
          : 'העובד יקבל קישור אישי, ובו יקבע סיסמה, שעות עבודה ויחבר יומן.'
      }
      footer={
        createdInvite ? (
          <DialogActions>
            <Button type="button" onClick={handleClose} className="min-w-28">
              סיום
            </Button>
          </DialogActions>
        ) : (
          <DialogActions error={addForm.formState.errors.root?.message ?? null}>
            <Button type="button" variant="ghost" onClick={handleClose}>
              ביטול
            </Button>
            <Button type="submit" form="add-staff-form" disabled={addStaffMutation.isPending} className="min-w-28">
              {addStaffMutation.isPending ? 'יוצר הזמנה…' : 'שליחת הזמנה'}
            </Button>
          </DialogActions>
        )
      }
    >
      {createdInvite ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-link" className="form-label">
            קישור ההזמנה
          </label>
          <div className="flex items-center gap-2">
            <Input id="invite-link" readOnly dir="ltr" value={createdInvite.inviteLink} className="min-w-0 flex-1 text-sm text-muted-foreground" />
            <Button type="button" variant="outline" onClick={() => copyLink(createdInvite.inviteLink)} className="shrink-0 gap-1.5">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'הועתק' : 'העתקה'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">בקישור העובד בוחר סיסמה, ממלא פרופיל, קובע שעות ומחבר יומן Google.</p>
        </div>
      ) : (
        <Form {...addForm}>
          <form id="add-staff-form" onSubmit={addForm.handleSubmit((values) => addStaffMutation.mutate(values))} className="form-stack">
            <FormField
              control={addForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="form-label">שם מלא</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="לדוגמה: רועי לוי" />
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
                  <FormLabel className="form-label">אימייל</FormLabel>
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
                  <FormLabel className="form-label">תפקיד</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent dir="rtl">
                      <SelectItem value="staff">צוות / מקעקע/ת — התורים והלידים שלו</SelectItem>
                      <SelectItem value="admin">מנהל/ת — גישה מלאה, כולל הגדרות</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      )}
    </ResponsiveDialog>
  )
}
