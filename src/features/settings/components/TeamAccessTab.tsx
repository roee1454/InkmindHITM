import React, { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ChevronLeft, KeyRound, UserCog, Trash2, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getCurrentStaffInfo, getStaffList, addStaffMember, deleteStaffMember, getArtistProfiles } from '../server/settings'
import type { StaffMember, ApiArtistProfile, CurrentStaffInfo } from '../server/settings'
import { getGoogleCalendarConnections } from '@/features/calendar/server/appointments'
import type { ApiGoogleConnection } from '@/features/calendar/types'
import { SetPasswordForm } from './SetPasswordForm'
import { EditStaffInfoForm } from './EditStaffInfoForm'
import { ArtistProfileEditor } from './ArtistProfileEditor'
import { GoogleCalendarConnection } from './GoogleCalendarConnection'
import { SettingsTabSkeleton } from './SettingsTabSkeleton'
import { useConfirm } from '@/hooks/use-confirm'
import { useIsMobile } from '@/hooks/use-media-query'

const ROLE_LABELS: Record<string, string> = {
  owner: 'בעלים',
  admin: 'מנהל',
  staff: 'צוות',
}

const addStaffSchema = z.object({
  name: z.string().min(1, 'שדה חובה'),
  email: z.string().email('נא להזין אימייל תקין'),
  password: z.string().min(8, 'לפחות 8 תווים'),
  role: z.enum(['admin', 'staff']),
})

interface TeamAccessTabProps {
  selectedStaffId?: string
  onSelectStaff: (id: string | null) => void
}

function AddStaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
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
      onOpenChange(false)
    },
    onError: (err: Error) => addForm.setError('root', { message: err.message }),
  })

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="הוספת חבר צוות חדש"
      description="הזינו את פרטי המשתמש. הוא יוכל להתחבר למערכת עם האימייל והסיסמה שתגדירו."
    >
        <Form {...addForm}>
          <form onSubmit={addForm.handleSubmit((values) => addStaffMutation.mutate(values))} className="space-y-4">
            <FormField
              control={addForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold">שם מלא</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="לדוגמה: דניאל רז" />
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
                    <Input type="email" {...field} placeholder="daniel@studio.co.il" dir="ltr" />
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
                    <Input type="password" {...field} placeholder="לפחות 8 תווים" />
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
                      <SelectTrigger className="w-full">
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
            <button type="submit" disabled={addStaffMutation.isPending} className="btn-native">
              {addStaffMutation.isPending ? 'מוסיף…' : 'הוסף חבר צוות'}
            </button>
          </form>
        </Form>
    </ResponsiveDialog>
  )
}

export const TeamAccessTab: React.FC<TeamAccessTabProps> = ({ selectedStaffId, onSelectStaff }) => {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const isMobile = useIsMobile()
  const [addOpen, setAddOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<'profile' | 'hours' | 'access'>('profile')

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

  const { data: googleConnections = [] } = useQuery<ApiGoogleConnection[]>({
    queryKey: ['google-calendar-connections'],
    queryFn: () => getGoogleCalendarConnections(),
  })

  const sortedStaff = useMemo(() => {
    return [...staff].sort((a, b) => {
      const getScore = (m: StaffMember) => {
        if (m.isAdmin) return m.id === currentStaff?.id ? 0 : 1
        if (m.id === currentStaff?.id) return 2
        return 3
      }
      const scoreA = getScore(a)
      const scoreB = getScore(b)
      if (scoreA !== scoreB) return scoreA - scoreB
      return a.name.localeCompare(b.name, 'he')
    })
  }, [staff, currentStaff?.id])

  const deleteStaffMutation = useMutation({
    mutationFn: (id: string) => deleteStaffMember({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      queryClient.invalidateQueries({ queryKey: ['artist-profiles'] })
      onSelectStaff(null)
    },
  })

  const handleDelete = async (member: StaffMember) => {
    const ok = await confirm({
      title: 'מחיקת חבר צוות',
      description: `הפעולה תמחק את ${member.name} לצמיתות, כולל הפרופיל שלו/שלה, ותנתק אותו/ה מהמערכת. לא ניתן לבטל.`,
      confirmLabel: 'מחק',
      variant: 'destructive',
    })
    if (ok) deleteStaffMutation.mutate(member.id)
  }

  const isConnected = (staffId: string) => googleConnections.some((c) => c.staffId === staffId && c.status === 'connected')
  const connectedCount = googleConnections.filter((c) => c.status === 'connected').length
  const selectedMember = sortedStaff.find((m) => m.id === selectedStaffId)

  const selectMember = (id: string) => {
    setDetailTab('profile')
    onSelectStaff(id)
  }

  function MemberDetail({ member }: { member: StaffMember }) {
    const isSelf = currentStaff?.id === member.id
    const canEdit = Boolean(currentStaff?.isAdmin || isSelf)
    const profile = profiles.find((p) => p.staffId === member.id)
    const [editOpen, setEditOpen] = useState(false)
    const [pwOpen, setPwOpen] = useState(false)

    return (
      <div className="flex flex-col gap-5" dir="rtl">
        <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as typeof detailTab)} dir="rtl">
          <TabsList>
            <TabsTrigger value="profile">פרופיל</TabsTrigger>
            <TabsTrigger value="hours">שעות</TabsTrigger>
            <TabsTrigger value="access">גישה</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="pt-1">
            <ArtistProfileEditor
              staffId={member.id}
              profile={profile}
              onSaved={() => void refetchProfiles()}
              readOnly={!canEdit}
              activeTab="profile"
              hideTabSelector
              bare
              stickyFooter={isMobile}
            />
          </TabsContent>

          <TabsContent value="hours" className="pt-1">
            <ArtistProfileEditor
              staffId={member.id}
              profile={profile}
              onSaved={() => void refetchProfiles()}
              readOnly={!canEdit}
              activeTab="hours"
              hideTabSelector
              bare
              stickyFooter={isMobile}
            />
          </TabsContent>

          <TabsContent value="access" className="flex flex-col gap-5 pt-1" dir="rtl">
            <GoogleCalendarConnection staffId={member.id} />

            {currentStaff?.isAdmin && (
              <div className="card-native overflow-hidden">
                <ResponsiveDialog
                  open={editOpen}
                  onOpenChange={setEditOpen}
                  title={`עריכת פרטי ${member.name}`}
                  description="עדכון שם, אימייל ותפקיד במערכת."
                  contentClassName="sm:max-w-md"
                  trigger={
                    <button type="button" className="row-native w-full cursor-pointer justify-between">
                      <span className="flex items-center gap-2.5 text-[15px] font-bold text-foreground">
                        <UserCog size={17} className="text-muted-foreground" />
                        עריכת פרטים
                      </span>
                      <ChevronLeft size={18} className="text-muted-foreground" />
                    </button>
                  }
                >
                  <EditStaffInfoForm
                    staffId={member.id}
                    initialName={member.name}
                    initialEmail={member.email}
                    role={member.role as 'owner' | 'admin' | 'staff'}
                    onDone={() => {
                      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
                      setEditOpen(false)
                    }}
                  />
                </ResponsiveDialog>

                <ResponsiveDialog
                  open={pwOpen}
                  onOpenChange={setPwOpen}
                  title={`${member.hasPassword ? 'איפוס סיסמה' : 'קביעת סיסמה'} עבור ${member.name}`}
                  description="הזן סיסמה חדשה. המשתמש יוכל להשתמש בה כדי להתחבר למערכת."
                  contentClassName="sm:max-w-md"
                  trigger={
                    <button type="button" className="row-native w-full cursor-pointer justify-between">
                      <span className="flex items-center gap-2.5 text-[15px] font-bold text-foreground">
                        <KeyRound size={17} className="text-muted-foreground" />
                        {member.hasPassword ? 'איפוס סיסמה' : 'קביעת סיסמה'}
                      </span>
                      <ChevronLeft size={18} className="text-muted-foreground" />
                    </button>
                  }
                >
                  <SetPasswordForm
                    staffId={member.id}
                    onDone={() => {
                      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
                      setPwOpen(false)
                    }}
                  />
                </ResponsiveDialog>
              </div>
            )}

            {currentStaff?.isAdmin && !isSelf && (
              <button
                type="button"
                onClick={() => handleDelete(member)}
                disabled={deleteStaffMutation.isPending}
                className="btn-native-ghost h-12 !w-full text-destructive md:!w-auto"
              >
                <Trash2 size={16} />
                {deleteStaffMutation.isPending ? 'מוחק…' : 'מחיקת חבר צוות'}
              </button>
            )}
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  if (loadingStaff) {
    return <SettingsTabSkeleton fields={0} />
  }

  // ---- Mobile: list <-> detail, one screen at a time (search-param driven) ----
  if (isMobile) {
    if (selectedMember) {
      return (
        <div className="pb-28 font-assistant" dir="rtl">
          <MemberDetail member={selectedMember} />
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-[18px] font-assistant" dir="rtl">
        <p className="px-1 text-sm font-medium text-muted-foreground">
          {sortedStaff.length} חברי צוות · {connectedCount} יומן{connectedCount === 1 ? '' : 'ים'} מחובר
        </p>

        <div className="card-native overflow-hidden">
          {sortedStaff.map((member) => {
            const isSelf = currentStaff?.id === member.id
            const connected = isConnected(member.id)
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => selectMember(member.id)}
                className="row-native w-full cursor-pointer justify-between text-start"
              >
                <div className="avatar-native size-[46px] shrink-0 text-[15px]">
                  {member.name ? member.name.slice(0, 2) : '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15.5px] font-extrabold text-foreground">{member.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`pill ${isSelf ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {isSelf ? 'את/ה' : ROLE_LABELS[member.role] ?? member.role}
                    </span>
                    <span className={`pill ${connected ? 'bg-emerald-500/12 text-emerald-600' : 'bg-amber-500/12 text-amber-600'}`}>
                      {connected ? 'יומן מחובר' : 'אין יומן'}
                    </span>
                  </div>
                </div>
                <ChevronLeft size={18} className="shrink-0 text-muted-foreground" />
              </button>
            )
          })}
        </div>

        {currentStaff?.isAdmin && (
          <>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-[15px] font-bold text-muted-foreground transition-all active:border-primary active:text-primary"
            >
              <Plus size={16} />
              הוספת חבר צוות
            </button>
            <AddStaffDialog open={addOpen} onOpenChange={setAddOpen} />
          </>
        )}
      </div>
    )
  }

  // ---- Desktop: header row + two-column body (214px member list · flex detail card) ----
  const activeMember = selectedMember ?? sortedStaff[0]

  return (
    <div className="flex flex-col gap-6 font-assistant" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-extrabold tracking-tight text-foreground">צוות והרשאות</h1>
          <p className="text-[13.5px] font-medium text-muted-foreground">
            {sortedStaff.length} חברי צוות · {connectedCount} יומן{connectedCount === 1 ? '' : 'ים'} מחובר
          </p>
        </div>
        {currentStaff?.isAdmin && (
          <button type="button" onClick={() => setAddOpen(true)} className="btn-native h-10 !w-auto px-4 text-[14px]">
            <Plus size={16} />
            חבר צוות
          </button>
        )}
      </div>

      <div className="flex items-start gap-5">
        <div className="flex w-[214px] shrink-0 flex-col gap-2">
          {sortedStaff.map((member) => {
            const isSelf = currentStaff?.id === member.id
            const selected = activeMember?.id === member.id
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => selectMember(member.id)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-2xl p-3 text-start transition-all duration-150 ${
                  selected ? 'bg-primary shadow-sm' : 'border border-border/80 bg-card shadow-xs'
                }`}
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                    selected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {member.name ? member.name.slice(0, 2) : '?'}
                </div>
                <div className="min-w-0">
                  <div className={`truncate text-[14px] font-extrabold ${selected ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {member.name}
                  </div>
                  <div className={`truncate text-[11.5px] ${selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {ROLE_LABELS[member.role] ?? member.role}
                    {isSelf ? ' · את/ה' : ''}
                  </div>
                </div>
              </button>
            )
          })}

          {currentStaff?.isAdmin && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex h-16 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-[13px] font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary"
            >
              <Plus size={14} />
              הוספה
            </button>
          )}
        </div>

        <div className="card-native min-w-0 flex-1 p-5">
          {activeMember ? (
            <MemberDetail member={activeMember} />
          ) : (
            <p className="text-xs text-muted-foreground">אין עדיין חברי צוות.</p>
          )}
          <p className="mt-5 border-t border-border/60 pt-3.5 text-[12.5px] text-muted-foreground">
            <Save size={12} className="me-1 inline" />
            כל השדות אופציונליים
          </p>
        </div>
      </div>

      <AddStaffDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

export default TeamAccessTab
