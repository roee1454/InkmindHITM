import React, { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Plus, Trash2, Eye, Edit3, UserCog } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  getCurrentStaffInfo,
  getStaffList,
  addStaffMember,
  deleteStaffMember,
  getArtistProfiles,
} from '../server/settings'
import type { StaffMember, ApiArtistProfile, CurrentStaffInfo } from '../server/settings'
import { SetPasswordForm } from './SetPasswordForm'
import { EditStaffInfoForm } from './EditStaffInfoForm'
import { ArtistProfileEditor } from './ArtistProfileEditor'
import { GoogleCalendarConnection } from './GoogleCalendarConnection'
import { useConfirm } from '@/hooks/use-confirm'

const addStaffSchema = z.object({
  name: z.string().min(1, 'שדה חובה'),
  email: z.string().email('נא להזין אימייל תקין'),
  password: z.string().min(8, 'לפחות 8 תווים'),
  role: z.enum(['admin', 'staff']),
})

export const TeamAccessTab: React.FC = () => {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [addOpen, setAddOpen] = useState(false)

  const { data: currentStaff } = useQuery<CurrentStaffInfo>({
    queryKey: ['current-staff-info'],
    queryFn: () => getCurrentStaffInfo(),
  })

  const { data: staff = [], isLoading: loadingStaff } = useQuery<StaffMember[]>({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
  })

  const { data: profiles = [], refetch: refetchProfiles } = useQuery<ApiArtistProfile[]>({
    queryKey: ['artist-profiles'],
    queryFn: () => getArtistProfiles(),
  })

  const sortedStaff = useMemo(() => {
    return [...staff].sort((a, b) => {
      const getScore = (m: StaffMember) => {
        if (m.isAdmin) {
          return m.id === currentStaff?.id ? 0 : 1
        }
        if (m.id === currentStaff?.id) {
          return 2
        }
        return 3
      }
      const scoreA = getScore(a)
      const scoreB = getScore(b)
      if (scoreA !== scoreB) return scoreA - scoreB
      return a.name.localeCompare(b.name, 'he')
    })
  }, [staff, currentStaff?.id])

  const addForm = useForm<z.infer<typeof addStaffSchema>>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: { name: '', email: '', password: '', role: 'staff' },
  })

  const addStaffMutation = useMutation({
    mutationFn: (values: z.infer<typeof addStaffSchema>) => addStaffMember({ data: values }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff-list'] }),
        queryClient.invalidateQueries({ queryKey: ['artist-profiles'] }),
      ])
      addForm.reset()
      setAddOpen(false)
    },
    onError: (err: Error) => addForm.setError('root', { message: err.message }),
  })

  const deleteStaffMutation = useMutation({
    mutationFn: (id: string) => deleteStaffMember({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      queryClient.invalidateQueries({ queryKey: ['artist-profiles'] })
    },
  })

  const hasProfile = (memberId: string) => profiles.some((p) => p.staffId === memberId)

  const handleDelete = async (member: StaffMember) => {
    const ok = await confirm({
      title: 'מחיקת חבר צוות',
      description: `הפעולה תמחק את ${member.name} לצמיתות, כולל הפרופיל שלו/שלה, ותנתק אותו/ה מהמערכת. לא ניתן לבטל.`,
      confirmLabel: 'מחק',
      variant: 'destructive',
    })
    if (ok) deleteStaffMutation.mutate(member.id)
  }

  return (
    <div className="space-y-4 font-assistant text-right" dir="rtl">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">צוות והרשאות גישה</h3>
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          {currentStaff?.isAdmin
            ? 'כמנהל/ת, ניתן לערוך פרטים, לקבוע/לאפס סיסמה, לערוך פרופיל ושעות עבודה, ולחבר/לנתק יומן Google לכל חבר צוות.'
            : 'רשימת חברי הצוות. ניתן לצפות בפרופיל של כל חבר צוות. רק מנהל/ת או בעל/ת הפרופיל יכולים לבצע שינויים.'}
        </p>
      </div>

      {loadingStaff ? (
        <p className="text-xs font-semibold text-muted-foreground">טוען רשימת צוות…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {sortedStaff.map((member) => {
            const isSelf = currentStaff?.id === member.id
            const canEdit = Boolean(currentStaff?.isAdmin || isSelf)

            return (
              <div
                key={member.id}
                className={`space-y-4 rounded-2xl border bg-card p-5 shadow-sm transition-colors ${
                  isSelf ? 'border-primary/40 bg-primary/5' : 'border-border'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                      {member.name ? member.name.slice(0, 2) : <User size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">{member.name}</span>
                        {isSelf && (
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-micro font-bold text-primary">
                            את/ה
                          </span>
                        )}
                        {member.isAdmin && (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-micro font-bold text-amber-400">
                            מנהל
                          </span>
                        )}
                        {!member.hasPassword && (
                          <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-micro font-semibold text-rose-400">
                            אין סיסמה
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{member.email}</span>
                    </div>
                  </div>

                  {currentStaff?.isAdmin && !isSelf && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(member)}
                      className="size-8 shrink-0 cursor-pointer text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                      title="מחק חבר צוות"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>

                {/* Action row — all visible, no expand/collapse */}
                <div className="flex flex-wrap items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant={canEdit ? 'outline' : 'ghost'} size="sm" className="rounded-xl text-xs font-semibold cursor-pointer gap-1.5">
                        {canEdit ? <Edit3 size={13} /> : <Eye size={13} />}
                        {canEdit ? 'פרופיל ושעות' : 'הצג פרופיל'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
                      <DialogHeader>
                        <DialogTitle>
                          {canEdit ? `עריכת פרופיל - ${member.name}` : `פרופיל - ${member.name}`}
                        </DialogTitle>
                        <DialogDescription>
                          {canEdit
                            ? `עדכן סגנונות, קישור לתיק עבודות, תיאור ושעות פעילות עבור ${member.name}.`
                            : `צפייה בפרטי הפרופיל ושעות הפעילות של ${member.name}.`}
                        </DialogDescription>
                      </DialogHeader>
                      <ArtistProfileEditor
                        staffId={member.id}
                        profile={profiles.find((p) => p.staffId === member.id)}
                        onSaved={() => {
                          void refetchProfiles()
                        }}
                        readOnly={!canEdit}
                      />
                    </DialogContent>
                  </Dialog>

                  {currentStaff?.isAdmin && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold cursor-pointer gap-1.5">
                          <UserCog size={13} />
                          עריכת פרטים
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md" dir="rtl">
                        <DialogHeader>
                          <DialogTitle>עריכת פרטי {member.name}</DialogTitle>
                          <DialogDescription>עדכון שם, אימייל ותפקיד במערכת.</DialogDescription>
                        </DialogHeader>
                        <EditStaffInfoForm
                          staffId={member.id}
                          initialName={member.name}
                          initialEmail={member.email}
                          role={member.role as 'owner' | 'admin' | 'staff'}
                          onDone={() => {
                            queryClient.invalidateQueries({ queryKey: ['staff-list'] })
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  )}

                  {currentStaff?.isAdmin && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold cursor-pointer text-primary">
                          {member.hasPassword ? 'אפס סיסמה' : 'קבע סיסמה'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md" dir="rtl">
                        <DialogHeader>
                          <DialogTitle>
                            {member.hasPassword ? 'איפוס סיסמה' : 'קביעת סיסמה'} עבור {member.name}
                          </DialogTitle>
                          <DialogDescription>
                            הזן סיסמה חדשה. המשתמש יוכל להשתמש בה כדי להתחבר למערכת.
                          </DialogDescription>
                        </DialogHeader>
                        <SetPasswordForm
                          staffId={member.id}
                          onDone={() => {
                            queryClient.invalidateQueries({ queryKey: ['staff-list'] })
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {/* Google Calendar — always inline, no toggle */}
                <div className="border-t border-border/50 pt-4">
                  <GoogleCalendarConnection
                    staffId={member.id}
                    staffName={member.name}
                    staffRole={member.role}
                    isSelf={isSelf}
                  />
                </div>

                {!hasProfile(member.id) && (
                  <span className="inline-block rounded-full border border-border bg-muted px-2 py-0.5 text-micro font-semibold text-muted-foreground">
                    אין פרופיל אמן
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {currentStaff?.isAdmin && (
        <>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-5 text-sm font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary"
          >
            <Plus size={16} />
            <span>הוספת חבר צוות</span>
          </button>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent dir="rtl" className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>הוספת חבר צוות חדש</DialogTitle>
                <DialogDescription>
                  הזינו את פרטי המשתמש. הוא יוכל להתחבר למערכת עם האימייל והסיסמה שתגדירו.
                </DialogDescription>
              </DialogHeader>

              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit((values) => addStaffMutation.mutate(values))} className="space-y-4">
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">שם מלא</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="לדוגמה: דניאל רז" className="rounded-xl" />
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
                        <FormLabel className="text-xs font-bold">כתובת אימייל</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} placeholder="daniel@studio.co.il" dir="ltr" className="rounded-xl text-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">סיסמה ראשונית</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} placeholder="לפחות 8 תווים" dir="ltr" className="rounded-xl text-xs" />
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
                        <FormLabel className="text-xs font-bold">תפקיד במערכת</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent dir="rtl">
                            <SelectItem value="staff">צוות / מקעקע/ת</SelectItem>
                            <SelectItem value="admin">מנהל/ת מערכת</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {addForm.formState.errors.root && (
                    <p className="text-xs font-semibold text-rose-500">{addForm.formState.errors.root.message}</p>
                  )}
                  <Button type="submit" className="w-full rounded-xl font-bold cursor-pointer" disabled={addStaffMutation.isPending}>
                    {addStaffMutation.isPending ? 'מוסיף...' : 'הוסף חבר צוות'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default TeamAccessTab
