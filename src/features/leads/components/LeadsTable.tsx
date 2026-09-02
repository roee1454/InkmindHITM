import React from 'react'
import { MessageSquare, ExternalLink } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { StaffMember } from '@/features/settings/server/staff'
import type { StaffRecord } from '@/integrations/pocketbase/types'
import type { ApiGoogleConnection } from '@/features/calendar/types'
import { canEditLead } from '../lib/permissions'
import { formatLeadDate } from '../lib/format'
import { SOURCE_LABELS } from '../types'
import type { LeadStage, UILead } from '../types'
import { LeadStatusSelect } from './LeadStatusSelect'

function GoogleIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

interface LeadsTableProps {
  leads: UILead[]
  currentStaff: StaffRecord
  staffList: StaffMember[]
  googleConnections?: ApiGoogleConnection[]
  updatingLeadId: string | null
  onStageChange: (lead: UILead, newStage: LeadStage) => void
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  currentStaff,
  staffList,
  googleConnections = [],
  updatingLeadId,
  onStageChange,
}) => {
  const navigate = useNavigate()

  function getArtistInfo(staffId: string | null): {
    artist?: StaffMember
    picture?: string
    isGoogleConnected: boolean
  } {
    if (!staffId) return { isGoogleConnected: false }
    const artist = staffList.find((s) => s.id === staffId)
    const connection = googleConnections.find(
      (c) => c.staffId === staffId && c.status === 'connected',
    )
    const isGoogleConnected = !!connection
    const picture = connection?.googleAccountPicture || artist?.avatar
    return { artist, picture, isGoogleConnected }
  }

  function handleOpenChat(conversationId: string | null) {
    if (!conversationId) return
    navigate({
      to: '/dashboard/conversations',
      search: { chatId: conversationId },
    })
  }

  return (
    <>
      {/* Desktop view: Table inside clean bordered container */}
      <div className="hidden overflow-hidden rounded-3xl border border-border/80 bg-card shadow-xs font-assistant md:block" dir="rtl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[13px] font-bold text-muted-foreground">
                <th className="px-6 py-3.5">לקוח ופרטי קשר</th>
                <th className="px-6 py-3.5">מקעקע משויך</th>
                <th className="px-6 py-3.5">שלב הליד</th>
                <th className="px-6 py-3.5">עודכן לאחרונה</th>
                <th className="px-6 py-3.5 text-center">שיחה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-[14.5px]">
              {leads.map((lead) => {
                const { artist, picture, isGoogleConnected } = getArtistInfo(lead.assignedStaffId)
                const editable = canEditLead(currentStaff, lead.assignedStaffId)
                const displayName = lead.name || 'לקוח ללא שם'
                const initial = displayName.charAt(0)
                const sourceLabel = (lead.source && SOURCE_LABELS[lead.source]) || lead.source || null
                const isUpdating = updatingLeadId === lead.id

                return (
                  <tr
                    key={lead.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    {/* Customer info */}
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="avatar-native size-10 text-[15px]">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-extrabold text-foreground">
                              {displayName}
                            </span>
                            {sourceLabel && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                                <MessageSquare className="size-3" />
                                {sourceLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-mini font-mono text-muted-foreground dir-ltr text-right">
                            {lead.phone}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Artist */}
                    <td className="px-6 py-4 align-middle">
                      {artist ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarImage src={picture} />
                            <AvatarFallback className="bg-muted text-[10.5px] font-bold">
                              {artist.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-foreground">{artist.name}</span>
                          {isGoogleConnected && <GoogleIcon size={12} />}
                        </div>
                      ) : (
                        <span className="text-[13.5px] text-muted-foreground/70">לא משויך</span>
                      )}
                    </td>

                    {/* Stage Dropdown */}
                    <td className="px-6 py-4 align-middle">
                      <LeadStatusSelect
                        stage={lead.stage}
                        editable={editable}
                        isUpdating={isUpdating}
                        onStageChange={(newStage) => onStageChange(lead, newStage)}
                      />
                    </td>

                    {/* Last Updated */}
                    <td className="px-6 py-4 align-middle text-[13.5px] text-muted-foreground">
                      {formatLeadDate(lead.updatedAt)}
                    </td>

                    {/* Open Chat Action */}
                    <td className="px-6 py-4 align-middle text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!lead.conversationId}
                        onClick={() => handleOpenChat(lead.conversationId)}
                        className="cursor-pointer gap-1.5 rounded-xl font-bold text-primary hover:bg-primary/10 hover:text-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span>פתח שיחה</span>
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile view: Distinct Individual Cards */}
      <div className="flex flex-col gap-3 font-assistant md:hidden" dir="rtl">
        {leads.map((lead) => {
          const { artist, picture, isGoogleConnected } = getArtistInfo(lead.assignedStaffId)
          const editable = canEditLead(currentStaff, lead.assignedStaffId)
          const displayName = lead.name || 'לקוח ללא שם'
          const initial = displayName.charAt(0)
          const sourceLabel = (lead.source && SOURCE_LABELS[lead.source]) || lead.source || null
          const isUpdating = updatingLeadId === lead.id

          return (
            <div
              key={lead.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs transition-shadow duration-150 active:shadow-xs"
            >
              {/* Header row: Avatar + Name/Phone + Source */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="avatar-native size-11 shrink-0 text-base">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-base font-extrabold text-foreground">
                      {displayName}
                    </h4>
                    <div className="text-mini font-mono text-muted-foreground dir-ltr text-right">
                      {lead.phone}
                    </div>
                  </div>
                </div>

                {sourceLabel && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[11.5px] font-bold text-muted-foreground">
                    <MessageSquare className="size-3" />
                    {sourceLabel}
                  </span>
                )}
              </div>

              {/* Middle row: Artist & Updated Time strip */}
              <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-[12.5px]">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0 font-bold text-muted-foreground">מקעקע:</span>
                  {artist ? (
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Avatar className="size-5 shrink-0">
                        <AvatarImage src={picture} />
                        <AvatarFallback className="bg-muted text-micro font-bold">
                          {artist.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate font-bold text-foreground">{artist.name}</span>
                      {isGoogleConnected && <GoogleIcon size={12} />}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/70">לא משויך</span>
                  )}
                </div>

                <span className="shrink-0 text-muted-foreground">
                  עודכן: {formatLeadDate(lead.updatedAt)}
                </span>
              </div>

              {/* Bottom row: Stage selector & Open Chat button */}
              <div className="flex items-center justify-between gap-2.5 pt-0.5">
                <LeadStatusSelect
                  stage={lead.stage}
                  editable={editable}
                  isUpdating={isUpdating}
                  onStageChange={(newStage) => onStageChange(lead, newStage)}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!lead.conversationId}
                  onClick={() => handleOpenChat(lead.conversationId)}
                  className="h-9 cursor-pointer gap-1.5 rounded-xl border-border/80 px-3.5 text-[13px] font-bold text-primary active:scale-[0.97] disabled:opacity-40"
                >
                  <span>פתח שיחה</span>
                  <ExternalLink className="size-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default LeadsTable

