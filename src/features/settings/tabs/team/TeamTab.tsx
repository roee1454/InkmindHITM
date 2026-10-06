import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Plus } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useIsMobile } from '#/hooks/useMediaQuery'
import { getCurrentStaffInfo, getStaffList } from '@/features/settings/server/staff'
import type { CurrentStaffInfo, StaffMember } from '@/features/settings/server/staff'
import { SettingsPage, SettingsSection } from '@/features/settings/components/settings-layout'
import { MemberDetail } from './components/MemberDetail'
import { AddStaffDialog } from './components/AddStaffDialog'

const ROLE_LABELS: Record<string, string> = { owner: 'בעלים', admin: 'מנהל/ת', staff: 'צוות' }

export interface TeamTabProps {
  selectedStaffId?: string
  onSelectStaff: (id: string | null) => void
}

function StaffRow({ member, isSelf, selected, onSelect, showChevron }: { member: StaffMember; isSelf: boolean; selected: boolean; onSelect: () => void; showChevron: boolean }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 border-t border-border/70 px-4 py-3 text-start transition-colors first:border-t-0',
        selected ? 'bg-muted' : 'hover:bg-muted/50',
      )}
    >
      <span className="avatar-native size-9 text-sm">{member.name.charAt(0)}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-bold text-foreground">{member.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {member.invitePending ? 'ממתין להרשמה' : `${ROLE_LABELS[member.role] ?? member.role}${isSelf ? ' · את/ה' : ''}`}
        </span>
      </span>
      {showChevron && <ChevronLeft size={16} className="shrink-0 text-muted-foreground" />}
    </button>
  )
}

/**
 * The team: everyone on it, and one member's profile, hours, calendar and access. A list beside the
 * member on desktop; the list, then the member, on a phone. An artist who isn't an admin sees only
 * their own profile.
 */
export function TeamTab({ selectedStaffId, onSelectStaff }: TeamTabProps) {
  const isMobile = useIsMobile()
  const [addOpen, setAddOpen] = useState(false)
  const { data: currentStaff, isLoading: loadingMe } = useQuery<CurrentStaffInfo>({ queryKey: ['current-staff-info'], queryFn: () => getCurrentStaffInfo() })
  const { data: staff = [], isLoading: loadingStaff } = useQuery<StaffMember[]>({ queryKey: ['staff-list'], queryFn: () => getStaffList() })

  // Admins first, the viewer first within their group, then by name.
  const sortedStaff = useMemo(() => {
    const score = (m: StaffMember) => (m.isAdmin ? 0 : 2) + (m.id === currentStaff?.id ? 0 : 1)
    return [...staff].sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, 'he'))
  }, [staff, currentStaff?.id])

  if (loadingStaff || loadingMe) {
    return (
      <SettingsPage title="צוות">
        <Skeleton className="h-48 w-full rounded-xl" />
      </SettingsPage>
    )
  }

  if (!currentStaff?.isAdmin) {
    const me = sortedStaff.find((m) => m.id === currentStaff?.id)
    return <SettingsPage title="הפרופיל שלי">{me ? <MemberDetail member={me} currentStaff={currentStaff} /> : <Skeleton className="h-48 w-full rounded-xl" />}</SettingsPage>
  }

  const selectedMember = sortedStaff.find((m) => m.id === selectedStaffId)
  const activeMember = selectedMember ?? (isMobile ? undefined : sortedStaff[0])

  const list = (
    <SettingsSection
      title="חברי הצוות"
      description={`${staff.length} אנשים`}
      action={
        <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus size={14} />
          הזמנה
        </Button>
      }
    >
      {sortedStaff.map((member) => (
        <StaffRow
          key={member.id}
          member={member}
          isSelf={member.id === currentStaff.id}
          selected={!isMobile && activeMember?.id === member.id}
          onSelect={() => onSelectStaff(member.id)}
          showChevron={isMobile}
        />
      ))}
    </SettingsSection>
  )

  return (
    <SettingsPage title="צוות" description="מי בצוות, מתי כל אחד עובד, והגישה שלו." wide={!isMobile}>
      {isMobile ? (
        activeMember ? (
          <MemberDetail member={activeMember} currentStaff={currentStaff} onDeleted={() => onSelectStaff(null)} />
        ) : (
          list
        )
      ) : (
        <div className="grid grid-cols-[17rem_minmax(0,1fr)] items-start gap-8">
          <div className="sticky top-6">{list}</div>
          {activeMember ? (
            <MemberDetail key={activeMember.id} member={activeMember} currentStaff={currentStaff} onDeleted={() => onSelectStaff(null)} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">אין חברי צוות.</p>
          )}
        </div>
      )}
      <AddStaffDialog open={addOpen} onOpenChange={setAddOpen} />
    </SettingsPage>
  )
}

export default TeamTab
