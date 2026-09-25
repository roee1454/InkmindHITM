import React, { useMemo, useState } from 'react'
import { Plus, ChevronLeft, ArrowLeft, Mail } from '@/components/ui/icon'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { getCurrentStaffInfo, getStaffList } from '@/features/settings/server/settings'
import type { StaffMember, CurrentStaffInfo } from '@/features/settings/server/settings'
import { getGoogleCalendarConnections } from '@/features/calendar/server/appointments'
import type { ApiGoogleConnection } from '@/features/calendar/types'
import { SettingsTabSkeleton } from '@/features/settings/components/SettingsTabSkeleton'
import { useIsMobile } from '#/hooks/useMediaQuery'
import { AddStaffDialog } from './components/AddStaffDialog'
import { MemberDetail } from './components/MemberDetail'

const ROLE_LABELS: Record<string, string> = {
  owner: 'בעלים',
  admin: 'מנהל',
  staff: 'צוות',
}

export interface TeamTabProps {
  selectedStaffId?: string
  onSelectStaff: (id: string | null) => void
}

export const TeamTab: React.FC<TeamTabProps> = ({
  selectedStaffId,
  onSelectStaff,
}) => {
  const isMobile = useIsMobile()
  const [addOpen, setAddOpen] = useState(false)

  const { data: currentStaff, isLoading: loadingCurrentStaff } = useQuery<CurrentStaffInfo>({
    queryKey: ['current-staff-info'],
    queryFn: () => getCurrentStaffInfo(),
  })

  const { data: staff = [], isLoading: loadingStaff } = useQuery<StaffMember[]>({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
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

  const selectedMember = sortedStaff.find((m) => m.id === selectedStaffId)
  const activeMember = selectedMember ?? sortedStaff[0]

  if (loadingStaff || loadingCurrentStaff) {
    return <SettingsTabSkeleton fields={0} />
  }

  // Non-admin staff members are scoped directly to their own profile
  if (!currentStaff?.isAdmin) {
    const myMember = sortedStaff.find((m) => m.id === currentStaff?.id)
    if (!myMember) {
      return <SettingsTabSkeleton fields={0} />
    }
    return (
      <div className="flex max-w-2xl flex-col gap-6 font-assistant pb-16" dir="rtl">
        <div className="page-head hidden lg:flex">
          <h1>הפרופיל שלי</h1>
          <p>פרטי הפרופיל, תיק עבודות ושעות פעילות</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <MemberDetail
            member={myMember}
            currentStaff={currentStaff}
            googleConnections={googleConnections}
          />
        </div>
      </div>
    )
  }

  // ---- Mobile View ----
  if (isMobile) {
    if (selectedMember) {
      return (
        <div className="flex flex-col gap-5 px-4 pt-4 pb-20 font-assistant" dir="rtl">
          <button
            type="button"
            onClick={() => onSelectStaff(null)}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft size={16} />
            <span>חזרה לרשימת הצוות</span>
          </button>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <MemberDetail
              member={selectedMember}
              currentStaff={currentStaff}
              googleConnections={googleConnections}
              onDeleted={() => onSelectStaff(null)}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4 px-4 pt-4 pb-20 font-assistant" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-foreground">צוות</h1>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="gap-1 font-bold"
          >
            <Plus size={15} />
            <span>חבר צוות</span>
          </Button>
        </div>

        <div className="flex flex-col gap-2.5">
          {sortedStaff.map((member) => {
            const isSelf = currentStaff?.id === member.id
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onSelectStaff(member.id)}
                className={`flex items-center justify-between rounded-xl border p-3.5 text-right shadow-2xs transition-colors cursor-pointer ${
                  member.invitePending
                    ? 'border-dashed border-border bg-card/60 hover:bg-muted/30'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm font-bold text-foreground">{member.name}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {member.invitePending ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                        <Mail size={11} />
                        ממתין להרשמה
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {`${ROLE_LABELS[member.role] ?? member.role}${isSelf ? ' · את/ה' : ''}`}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowLeft size={16} className="text-muted-foreground shrink-0" />
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <Plus size={15} />
          <span>+ הוספה</span>
        </button>

        <AddStaffDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    )
  }

  // ---- Desktop View ----
  return (
    <div className="flex flex-col gap-6 font-assistant pb-16 max-w-5xl" dir="rtl">
      {/* Page Header with Action */}
      <div className="flex items-center justify-between">
        <div className="page-head">
          <h1>צוות</h1>
          <p>ניהול חברי צוות, שעות פעילות והרשאות</p>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Right Column (Staff List) */}
        <div className="col-span-4 flex flex-col gap-2.5">
          {sortedStaff.map((member) => {
            const isSelf = currentStaff?.id === member.id
            const selected = activeMember?.id === member.id
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onSelectStaff(member.id)}
                className={`w-full flex items-center justify-between rounded-xl border p-3 text-right transition-all cursor-pointer ${
                  member.invitePending ? 'border-dashed' : 'border-solid'
                } ${
                  selected
                    ? 'bg-primary/10 border-primary shadow-xs'
                    : member.invitePending
                      ? 'bg-card/60 border-border hover:bg-muted/30'
                      : 'bg-card border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-sm font-bold text-foreground">
                    {member.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {member.invitePending ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                        <Mail size={11} />
                        ממתין להרשמה
                      </span>
                    ) : (
                      <span className="truncate text-xs text-muted-foreground">
                        {`${ROLE_LABELS[member.role] ?? member.role}${isSelf ? ' · את/ה' : ''}`}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Plus size={14} />
            <span>הוספה</span>
          </button>
        </div>

        {/* Left Column (Member Detail Card) */}
        <div className="col-span-8 rounded-2xl border border-border bg-card p-6 shadow-xs">
          {activeMember ? (
            <MemberDetail
              member={activeMember}
              currentStaff={currentStaff}
              googleConnections={googleConnections}
              onDeleted={() => onSelectStaff(null)}
            />
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center">אין חברי צוות במערכת.</p>
          )}
        </div>
      </div>

      <AddStaffDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

export default TeamTab
