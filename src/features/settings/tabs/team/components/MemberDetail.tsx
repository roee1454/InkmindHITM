import React, { useState } from 'react'
import {
  User,
  Clock,
  KeyRound,
  ChevronLeft,
  Mail,
  Check,
  Copy,
  UserCog,
  Trash2,
} from '@/components/ui/icon'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { StaffMember, ApiArtistProfile, CurrentStaffInfo } from '@/features/settings/server/settings'
import { getWorkingHours, resendStaffInvite } from '@/features/settings/server/settings'
import type { ApiGoogleConnection } from '@/features/calendar/types'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { ArtistProfileEditor } from './ArtistProfileEditor'
import { GoogleCalendarConnection } from './GoogleCalendarConnection'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { EditStaffInfoForm } from './EditStaffInfoForm'
import { SetPasswordForm } from './SetPasswordForm'
import { summarizeWorkingHours } from '../utils/summarizeWorkingHours'
import { Button } from '@/components/ui/button'
import { CascadeDeleteDialog } from '@/features/database/components/CascadeDeleteDialog'

export interface MemberDetailProps {
  member: StaffMember
  currentStaff: CurrentStaffInfo | undefined
  googleConnections: ApiGoogleConnection[]
  onDeleted?: () => void
}

export const MemberDetail: React.FC<MemberDetailProps> = ({
  member,
  currentStaff,
  googleConnections,
  onDeleted,
}) => {
  const queryClient = useQueryClient()

  const [editOpen, setEditOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const { data: memberHours } = useQuery({
    queryKey: ['working-hours', member.id],
    queryFn: () => getWorkingHours({ data: { staffId: member.id } }),
  })

  const resendMutation = useMutation({
    mutationFn: (staffId: string) => resendStaffInvite({ data: { staffId } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      if (res?.inviteLink) {
        navigator.clipboard.writeText(`${window.location.origin}${res.inviteLink}`)
        setCopiedInvite(true)
        setTimeout(() => setCopiedInvite(false), 2500)
      }
    },
  })

  const handleDelete = () => {
    setIsDeleteDialogOpen(true)
  }

  const isSelf = currentStaff?.id === member.id
  const canEdit = Boolean(currentStaff?.isAdmin || isSelf)
  const profile: ApiArtistProfile = {
    id: member.id,
    staffId: member.id,
    portfolioUrl: member.portfolioUrl,
    bio: member.bio,
    artistName: member.name,
  }

  const googleConnection = googleConnections.find(
    (c) => c.staffId === member.id && c.status === 'connected',
  )
  const isConnected = Boolean(googleConnection)
  const googlePicture = googleConnection?.googleAccountPicture
  const hoursSummary = summarizeWorkingHours(memberHours)

  return (
    <div className="flex flex-col gap-5 font-assistant" dir="rtl">
      {/* Member Header */}
      <div className="flex flex-col gap-0.5 border-b border-border pb-4">
        <h2 className="text-xl font-black text-foreground">{member.name}</h2>
        <span dir="ltr" className="text-xs text-muted-foreground font-medium text-end">
          {member.email}
        </span>
      </div>

      {/* Pending Invite Notice */}
      {member.invitePending && (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 flex flex-col gap-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Mail size={16} className="text-muted-foreground" />
              <span>הזמנה ממתינה לקליטה ע״י העובד</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-muted/50 px-2 py-0.5 text-2xs font-medium text-muted-foreground">
              ממתין להרשמה
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            העובד טרם הפעיל את החשבון וטרם קבע סיסמה. קישור ההזמנה תקף ל-7 ימים.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {member.inviteToken && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/invite?token=${member.inviteToken}`,
                  )
                  setCopiedInvite(true)
                  setTimeout(() => setCopiedInvite(false), 2500)
                }}
                className="gap-1.5 font-bold cursor-pointer"
              >
                {copiedInvite ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedInvite ? 'הקישור הועתק!' : 'העתקת קישור הזמנה'}</span>
              </Button>
            )}
            {currentStaff?.isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={resendMutation.isPending}
                onClick={() => resendMutation.mutate(member.id)}
                className="font-bold cursor-pointer"
              >
                {resendMutation.isPending ? 'מחדש…' : 'חידוש והעתקה חוזרת'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 3 Collapsible Sections using Radix Accordion */}
      <Accordion key={member.id} type="multiple" defaultValue={['profile']} className="flex flex-col gap-3">
        {/* Section 1: Profile */}
        <AccordionItem value="profile">
          <AccordionTrigger className="p-4 hover:bg-muted/30">
            <div className="flex items-center gap-2.5">
              <User size={18} className="text-muted-foreground" />
              <span className="font-bold text-sm text-foreground">פרופיל</span>
            </div>
            <span className="text-xs text-muted-foreground me-2">portfolio + bio</span>
          </AccordionTrigger>
          <AccordionContent className="border-t border-border p-4 bg-background/50">
            <ArtistProfileEditor
              staffId={member.id}
              profile={profile}
              onSaved={() => {
                queryClient.invalidateQueries({ queryKey: ['staff-list'] })
              }}
              readOnly={!canEdit}
              activeTab="profile"
              hideTabSelector
              bare
            />
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Working Hours */}
        <AccordionItem value="hours">
          <AccordionTrigger className="p-4 hover:bg-muted/30">
            <div className="flex items-center gap-2.5">
              <Clock size={18} className="text-muted-foreground" />
              <span className="font-bold text-sm text-foreground">שעות עבודה</span>
            </div>
            <span className="text-xs text-muted-foreground me-2">{hoursSummary}</span>
          </AccordionTrigger>
          <AccordionContent className="border-t border-border p-4 bg-background/50">
            <ArtistProfileEditor
              staffId={member.id}
              profile={profile}
              onSaved={() => {
                queryClient.invalidateQueries({ queryKey: ['staff-list'] })
              }}
              readOnly={!canEdit}
              activeTab="hours"
              hideTabSelector
              bare
            />
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Access */}
        <AccordionItem value="access">
          <AccordionTrigger className="p-4 hover:bg-muted/30">
            <div className="flex items-center gap-2.5">
              <KeyRound size={18} className="text-muted-foreground" />
              <span className="font-bold text-sm text-foreground">גישה</span>
            </div>
            <div className="flex items-center gap-1.5 me-2">
              {isConnected && googlePicture && (
                <img
                  src={googlePicture}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-4.5 rounded-full object-cover border border-border"
                />
              )}
              <span
                className={`text-xs font-semibold ${
                  isConnected
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                }`}
              >
                {isConnected ? 'יומן מחובר' : 'אין יומן מחובר'}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="border-t border-border p-4 bg-background/50 flex flex-col gap-4">
            <GoogleCalendarConnection staffId={member.id} />

              {currentStaff?.isAdmin && (
                <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                  <ResponsiveDialog
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    title={`עריכת פרטי ${member.name}`}
                    description="עדכון שם, אימייל ותפקיד במערכת."
                    contentClassName="sm:max-w-md"
                    trigger={
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors cursor-pointer text-right"
                      >
                        <span className="flex items-center gap-2.5 text-sm font-bold text-foreground">
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
                      initialPhone={member.phone}
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
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors cursor-pointer text-right"
                      >
                        <span className="flex items-center gap-2.5 text-sm font-bold text-foreground">
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
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                    <span>מחיקת חבר צוות</span>
                  </button>

                  <CascadeDeleteDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                    collection="staff"
                    id={member.id}
                    entityName={member.name}
                    onDeleted={() => {
                      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
                      onDeleted?.()
                    }}
                  />
                </div>
              )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
