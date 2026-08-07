import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Trash2, UserPlus, User, Edit3, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { ArtistProfileEditor } from '@/features/settings/components/ArtistProfileEditor'
import { GoogleCalendarConnection } from '@/features/settings/components/GoogleCalendarConnection'
import { addStaffMember, deleteStaffMember, getStaffList } from '@/features/settings/server/staff'
import { getArtistProfiles } from '@/features/settings/server/profiles'
import type { ApiArtistProfile } from '@/features/settings/server/profiles'

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

interface StaffManagerProps {
  currentStaffId: string
}

type ActivePanel = 'profile' | 'calendar' | null

export function StaffManager({ currentStaffId }: StaffManagerProps) {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  // Track which panel is open per member id
  const [openPanels, setOpenPanels] = useState<Record<string, ActivePanel>>({})

  const togglePanel = (memberId: string, panel: ActivePanel) => {
    setOpenPanels((prev) => ({
      ...prev,
      [memberId]: prev[memberId] === panel ? null : panel,
    }))
  }

  const staffQuery = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
  })

  const profilesQuery = useQuery<ApiArtistProfile[]>({
    queryKey: ['artist-profiles'],
    queryFn: () => getArtistProfiles(),
  })

  const form = useForm<z.infer<typeof addStaffSchema>>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: { name: '', email: '', password: '', role: 'staff' },
  })

  const addMutation = useMutation({
    mutationFn: (values: z.infer<typeof addStaffSchema>) => addStaffMember({ data: values }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff-list'] }),
        queryClient.invalidateQueries({ queryKey: ['artist-profiles'] }),
      ])
      form.reset()
      setAddOpen(false)
    },
    onError: (err: Error) => form.setError('root', { message: err.message }),
  })

  const removeMutation = useMutation({
    mutationFn: (staffId: string) => deleteStaffMember({ data: { id: staffId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      queryClient.invalidateQueries({ queryKey: ['artist-profiles'] })
    },
  })

  const profiles = profilesQuery.data ?? []

  return (
    <div className="space-y-3 font-assistant text-right" dir="rtl">
      {/* Staff Cards List */}
      {(staffQuery.data ?? []).map((member) => {
        const profile = profiles.find((p) => p.staffId === member.id)
        const isSelf = member.id === currentStaffId
        const activePanel = openPanels[member.id] ?? null

        return (
          <div
            key={member.id}
            className={`rounded-2xl border bg-card shadow-xs transition-all ${
              isSelf ? 'border-primary/40 bg-primary/5' : 'border-border/80'
            }`}
          >
            {/* Card Header Row */}
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                  {member.name ? member.name.slice(0, 2) : <User size={16} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-sm">{member.name}</span>
                    <Badge variant="outline" className="text-[10px] rounded-full">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                    {isSelf && (
                      <Badge variant="secondary" className="text-[10px] rounded-full">
                        את/ה
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{member.email}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant={activePanel === 'profile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => togglePanel(member.id, 'profile')}
                  className="rounded-xl text-xs font-semibold cursor-pointer gap-1.5"
                >
                  <Edit3 size={13} />
                  <span className="hidden sm:inline">פרופיל ושעות</span>
                  {activePanel === 'profile' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </Button>

                <Button
                  variant={activePanel === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => togglePanel(member.id, 'calendar')}
                  className="rounded-xl text-xs font-semibold cursor-pointer gap-1.5"
                >
                  <Calendar size={13} className="text-blue-500" />
                  <span className="hidden sm:inline">Google</span>
                  {activePanel === 'calendar' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </Button>

                {!isSelf && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.confirm(`האם למחוק את חבר הצוות ${member.name}?`)) {
                        removeMutation.mutate(member.id)
                      }
                    }}
                    className="size-8 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer rounded-xl"
                    title="הסר חבר צוות"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>

            {/* Expandable: Profile + Hours Editor */}
            {activePanel === 'profile' && (
              <div className="border-t border-border/50 px-4 pb-4 pt-3">
                <ArtistProfileEditor
                  staffId={member.id}
                  profile={profile}
                  onSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ['artist-profiles'] })
                  }}
                />
              </div>
            )}

            {/* Expandable: Google Calendar */}
            {activePanel === 'calendar' && (
              <div className="border-t border-border/50 px-4 pb-4 pt-3">
                <GoogleCalendarConnection
                  staffId={member.id}
                  staffName={member.name}
                  staffRole={member.role}
                  isSelf={isSelf}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Add Staff Button */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-5 text-sm font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary"
      >
        <UserPlus size={16} />
        <span>הוספת איש צוות נוסף</span>
      </button>

      {/* Add Staff Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>הוספת חבר צוות חדש</DialogTitle>
            <DialogDescription>
              הזינו את פרטי המשתמש. הוא יוכל להתחבר למערכת עם האימייל והסיסמה שתגדירו.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => addMutation.mutate(values))} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
                control={form.control}
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
                control={form.control}
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
              {form.formState.errors.root && (
                <p className="text-xs font-semibold text-rose-500">{form.formState.errors.root.message}</p>
              )}
              <Button type="submit" className="w-full rounded-xl font-bold cursor-pointer" disabled={addMutation.isPending}>
                {addMutation.isPending ? 'מוסיף...' : 'הוסף חבר צוות'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
