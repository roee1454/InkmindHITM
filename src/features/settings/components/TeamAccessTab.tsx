import React, { useMemo } from 'react'
import { User, Plus, Trash2, Eye, Edit3 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  createStaffMember,
  deleteStaffMember,
  getArtistProfiles,
  type StaffMember,
  type ApiArtistProfile,
  type CurrentStaffInfo,
} from '../server/settings'
import { SetPasswordForm } from './SetPasswordForm'
import { ArtistProfileEditor } from './ArtistProfileEditor'
import { useSettingsUiStore } from '../store/settingsUiStore'

export const TeamAccessTab: React.FC = () => {
  const queryClient = useQueryClient()
  const {
    newStaffName,
    teamError: error,
    setNewStaffName,
    setTeamError: setError,
  } = useSettingsUiStore()

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

  const createStaffMutation = useMutation({
    mutationFn: (name: string) => createStaffMember({ data: { name } }),
    onSuccess: () => {
      setNewStaffName('')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת חבר צוות')
    },
  })

  const deleteStaffMutation = useMutation({
    mutationFn: (id: string) => deleteStaffMember({ data: { id } }),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת חבר צוות')
    },
  })

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStaffName.trim()) {
      setError('השם חובה')
      return
    }
    createStaffMutation.mutate(newStaffName.trim())
  }

  const hasProfile = (memberId: string) => profiles.some((p) => p.staffId === memberId)

  return (
    <div className="grid grid-cols-1 gap-6 font-assistant text-right lg:grid-cols-12" dir="rtl">
      <div className="space-y-1 lg:col-span-5">
        <h3 className="text-sm md:text-base font-bold text-foreground">צוות והרשאות גישה</h3>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          {currentStaff?.isAdmin
            ? 'כמנהל/ת, ניתן לקבוע/לאפס סיסמה ולערוך פרופיל ושעות עבודה לכל חבר צוות.'
            : 'רשימת חברי הצוות. ניתן לצפות בפרופיל של כל חבר צוות. רק מנהל/ת או בעל/ת הפרופיל יכולים לבצע שינויים.'}
        </p>
      </div>

      <div className="space-y-4 lg:col-span-7">
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-400">
            {error}
          </div>
        )}

        {loadingStaff ? (
          <p className="text-xs font-semibold text-muted-foreground">טוען רשימת צוות…</p>
        ) : (
          <div className="space-y-2.5">
            {sortedStaff.map((member) => {
              const isSelf = currentStaff?.id === member.id
              const canEdit = Boolean(currentStaff?.isAdmin || isSelf)

              return (
                <div
                  key={member.id}
                  className={`flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-3.5 shadow-sm transition-colors md:flex-row md:items-center ${
                    isSelf ? 'border-primary/40 bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <User size={14} className="text-primary" />
                      {member.name}
                      {isSelf && (
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          את/ה
                        </span>
                      )}
                      {member.isAdmin && (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                          מנהל
                        </span>
                      )}
                      {!member.hasPassword && (
                        <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                          אין סיסמה
                        </span>
                      )}
                      {hasProfile(member.id) ? (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          יש פרופיל
                        </span>
                      ) : (
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          אין פרופיל
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant={canEdit ? 'outline' : 'ghost'} size="sm">
                          {canEdit ? (
                            <>
                              <Edit3 size={13} className="ml-1.5" /> ערוך פרופיל
                            </>
                          ) : (
                            <>
                              <Eye size={13} className="ml-1.5" /> הצג פרופיל
                            </>
                          )}
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
                          <Button variant="ghost" size="sm" className="text-primary">
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

                    {currentStaff?.isAdmin && currentStaff?.id !== member.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            window.confirm(
                              `האם אתה בטוח שברצונך למחוק את חבר הצוות ${member.name}? פעולה זו תמחוק את הפרופיל שלו ותנתק אותו מהמערכת.`,
                            )
                          ) {
                            deleteStaffMutation.mutate(member.id)
                          }
                        }}
                        className="cursor-pointer text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                        title="מחק חבר צוות"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {currentStaff?.isAdmin && (
          <form
            onSubmit={handleCreateStaff}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end shadow-sm"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">שם חבר צוות חדש</label>
              <Input
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="לדוגמה: סתיו"
                className="bg-white text-foreground border-input"
              />
            </div>
            <Button type="submit" className="flex items-center gap-1">
              <Plus size={14} /> הוסף לצוות
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default TeamAccessTab
