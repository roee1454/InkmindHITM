import { useState } from 'react'
import { Check, ChevronLeft, Copy } from '@/components/ui/icon'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { StaffMember, CurrentStaffInfo } from '@/features/settings/server/settings'
import { resendStaffInvite } from '@/features/settings/server/settings'
import { Button } from '@/components/ui/button'
import { CascadeDeleteDialog } from '@/features/database/components/CascadeDeleteDialog'
import { SettingsRow, SettingsSection } from '@/features/settings/components/settings-layout'
import { GoogleCalendarConnection } from './GoogleCalendarConnection'
import { EditStaffInfoDialog } from './EditStaffInfoDialog'
import { SetPasswordDialog } from './SetPasswordDialog'
import { MemberProfileSection } from './MemberProfileSection'
import { MemberHoursSection } from './MemberHoursSection'

const ROLE_LABELS: Record<string, string> = { owner: 'בעלים', admin: 'מנהל/ת', staff: 'צוות' }

export interface MemberDetailProps {
  member: StaffMember
  currentStaff: CurrentStaffInfo | undefined
  onDeleted?: () => void
}

/** A row that opens a dialog: the label, and a chevron where the control would be. */
function DialogRowTrigger({ label, hint }: { label: string; hint?: string }) {
  return (
    <button type="button" className="w-full cursor-pointer border-t border-border/70 text-start transition-colors first:border-t-0 hover:bg-muted/40 [&>div]:border-t-0">
      <SettingsRow label={label} hint={hint}>
        <div className="flex justify-end">
          <ChevronLeft size={18} className="text-muted-foreground" />
        </div>
      </SettingsRow>
    </button>
  )
}

/**
 * One team member: who they are, their profile and hours (saved with the page's bar), their
 * calendar and access, and — set apart — removing them. It used to be an accordion of three cards
 * inside a card.
 */
export function MemberDetail({ member, currentStaff, onDeleted }: MemberDetailProps) {
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isSelf = currentStaff?.id === member.id
  const isAdmin = Boolean(currentStaff?.isAdmin)
  const canEdit = isAdmin || isSelf
  const refreshStaff = () => queryClient.invalidateQueries({ queryKey: ['staff-list'] })

  const copyInvite = (link: string) => {
    void navigator.clipboard.writeText(link)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 2500)
  }

  const resend = useMutation({
    mutationFn: (staffId: string) => resendStaffInvite({ data: { staffId } }),
    onSuccess: (res) => {
      refreshStaff()
      if (res?.inviteLink) copyInvite(`${window.location.origin}${res.inviteLink}`)
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1 px-1">
        <h2 className="text-xl font-extrabold tracking-tight text-foreground">{member.name}</h2>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>{member.invitePending ? 'ממתין להרשמה' : `${ROLE_LABELS[member.role] ?? member.role}${isSelf ? ' · החשבון שלך' : ''}`}</span>
          <span aria-hidden>·</span>
          <span dir="ltr">{member.email}</span>
        </p>
      </header>

      {member.invitePending && (
        <SettingsSection title="ההזמנה" description="העובד עוד לא הפעיל את החשבון. הקישור תקף 7 ימים.">
          <SettingsRow label="קישור ההזמנה" hint="שולחים לעובד בוואטסאפ או במייל.">
            <div className="flex flex-wrap justify-end gap-2">
              {member.inviteToken && (
                <Button type="button" variant="outline" size="sm" onClick={() => copyInvite(`${window.location.origin}/invite?token=${member.inviteToken}`)} className="gap-1.5">
                  {copiedInvite ? <Check size={14} /> : <Copy size={14} />}
                  {copiedInvite ? 'הועתק' : 'העתקה'}
                </Button>
              )}
              {isAdmin && (
                <Button type="button" variant="ghost" size="sm" disabled={resend.isPending} onClick={() => resend.mutate(member.id)}>
                  {resend.isPending ? 'מחדש…' : 'קישור חדש'}
                </Button>
              )}
            </div>
          </SettingsRow>
        </SettingsSection>
      )}

      <MemberProfileSection member={member} readOnly={!canEdit} />
      <MemberHoursSection staffId={member.id} readOnly={!canEdit} />

      <SettingsSection title="יומן וגישה">
        <GoogleCalendarConnection staffId={member.id} />
        {isAdmin && (
          <>
            <EditStaffInfoDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              staffId={member.id}
              name={member.name}
              email={member.email}
              phone={member.phone}
              role={member.role as 'owner' | 'admin' | 'staff'}
              onSaved={() => {
                refreshStaff()
                setEditOpen(false)
              }}
              trigger={<DialogRowTrigger label="שם, אימייל ותפקיד" />}
            />
            <SetPasswordDialog
              open={pwOpen}
              onOpenChange={setPwOpen}
              staffId={member.id}
              name={member.name}
              hasPassword={member.hasPassword}
              onSaved={() => {
                refreshStaff()
                setPwOpen(false)
              }}
              trigger={<DialogRowTrigger label={member.hasPassword ? 'איפוס סיסמה' : 'קביעת סיסמה'} hint={member.hasPassword ? undefined : 'עוד אין סיסמה.'} />}
            />
          </>
        )}
      </SettingsSection>

      {isAdmin && !isSelf && (
        <SettingsSection title="הסרה מהצוות" tone="danger">
          <SettingsRow label={`הסרת ${member.name}`} hint="לפני ההסרה יוצג בדיוק מה משויך אליו/ה ומה יקרה לזה.">
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                הסרה
              </Button>
            </div>
          </SettingsRow>
          <CascadeDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            collection="staff"
            id={member.id}
            entityName={member.name}
            onDeleted={() => {
              refreshStaff()
              onDeleted?.()
            }}
          />
        </SettingsSection>
      )}
    </div>
  )
}
