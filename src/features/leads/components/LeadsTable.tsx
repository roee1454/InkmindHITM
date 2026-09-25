import React from 'react'
import { MessageSquare, ExternalLink } from '@/components/ui/icon'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import type { StaffRole } from '@/integrations/pocketbase/types'
import { canEditLead } from '../utils/permissions'
import { formatLeadDate } from '../utils/format'

import { SOURCE_LABELS } from '../types'
import type { LeadStage, UILead } from '../types'
import { LeadStatusSelect } from './LeadStatusSelect'
import { formatPhoneForDisplay } from '@/lib/phone'

interface LeadsTableProps {
  leads: UILead[]
  currentStaff: { id: string; role: StaffRole }
  updatingLeadId: string | null
  onStageChange: (lead: UILead, newStage: LeadStage) => void
}

interface LeadsTableRowProps {
  lead: UILead
  editable: boolean
  isUpdating: boolean
  onStageChange: (lead: UILead, newStage: LeadStage) => void
  onOpenChat: (conversationId: string | null) => void
}

const LeadsTableRow = React.memo<LeadsTableRowProps>(({
  lead,
  editable,
  isUpdating,
  onStageChange,
  onOpenChat,
}) => {
  const displayName = lead.name || 'לקוח ללא שם'
  const sourceLabel = (lead.source && SOURCE_LABELS[lead.source]) || lead.source || null

  return (
    <tr className="transition-colors hover:bg-muted/30">
      {/* Customer info */}
      <td className="px-6 py-4 align-middle">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-extrabold text-foreground">
              {displayName}
            </span>
            {sourceLabel && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-2xs font-bold text-muted-foreground">
                <MessageSquare className="size-3" />
                {sourceLabel}
              </span>
            )}
          </div>
          <div className="text-mini font-assistant text-muted-foreground dir-ltr text-right">
            {formatPhoneForDisplay(lead.phone)}
          </div>
        </div>
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
      <td className="px-6 py-4 align-middle text-sm text-muted-foreground">
        {formatLeadDate(lead.updatedAt)}
      </td>

      {/* Open Chat Action */}
      <td className="px-6 py-4 align-middle text-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!lead.conversationId}
          onClick={() => onOpenChat(lead.conversationId)}
          className="cursor-pointer gap-1.5 rounded-xl font-bold text-primary hover:bg-primary/10 hover:text-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>פתח שיחה</span>
          <ExternalLink className="size-3.5" />
        </Button>
      </td>
    </tr>
  )
})
LeadsTableRow.displayName = 'LeadsTableRow'

interface LeadsMobileCardProps {
  lead: UILead
  editable: boolean
  isUpdating: boolean
  onStageChange: (lead: UILead, newStage: LeadStage) => void
  onOpenChat: (conversationId: string | null) => void
}

const LeadsMobileCard = React.memo<LeadsMobileCardProps>(({
  lead,
  editable,
  isUpdating,
  onStageChange,
  onOpenChat,
}) => {
  const displayName = lead.name || 'לקוח ללא שם'
  const sourceLabel = (lead.source && SOURCE_LABELS[lead.source]) || lead.source || null

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs transition-shadow duration-150 active:shadow-xs">
      {/* Header row: Name/Phone + Source & Updated */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-base font-extrabold text-foreground">
            {displayName}
          </h4>
          <div className="flex items-center gap-2 text-mini text-muted-foreground">
            <span className="font-assistant dir-ltr">{formatPhoneForDisplay(lead.phone)}</span>
            <span>•</span>
            <span>{formatLeadDate(lead.updatedAt)}</span>
          </div>
        </div>

        {sourceLabel && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
            <MessageSquare className="size-3" />
            {sourceLabel}
          </span>
        )}
      </div>

      {/* Bottom row: Stage selector & Open Chat button */}
      <div className="flex items-center justify-between gap-2.5 pt-0.5 border-t border-border/40">
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
          onClick={() => onOpenChat(lead.conversationId)}
          className="h-9 cursor-pointer gap-1.5 rounded-xl border-border px-3.5 text-sm font-bold text-primary active:scale-[0.97] disabled:opacity-40"
        >
          <span>פתח שיחה</span>
          <ExternalLink className="size-3.5" />
        </Button>
      </div>
    </div>
  )
})
LeadsMobileCard.displayName = 'LeadsMobileCard'

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  currentStaff,
  updatingLeadId,
  onStageChange,
}) => {
  const navigate = useNavigate()

  const handleOpenChat = React.useCallback((conversationId: string | null) => {
    if (!conversationId) return
    navigate({
      to: '/dashboard/conversations',
      search: { chatId: conversationId },
    })
  }, [navigate])

  return (
    <>
      {/* Desktop view: Table inside clean bordered container */}
      <div className="hidden overflow-hidden rounded-3xl border border-border bg-card shadow-xs font-assistant md:block" dir="rtl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-sm font-bold text-muted-foreground">
                <th className="px-6 py-3.5">לקוח ופרטי קשר</th>
                <th className="px-6 py-3.5">שלב הליד</th>
                <th className="px-6 py-3.5">עודכן לאחרונה</th>
                <th className="px-6 py-3.5 text-center">שיחה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-sm">
              {leads.map((lead) => (
                <LeadsTableRow
                  key={lead.id}
                  lead={lead}
                  editable={canEditLead(currentStaff, lead.assignedStaffId)}
                  isUpdating={updatingLeadId === lead.id}
                  onStageChange={onStageChange}
                  onOpenChat={handleOpenChat}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile view: Distinct Individual Cards */}
      <div className="flex flex-col gap-3 font-assistant md:hidden" dir="rtl">
        {leads.map((lead) => (
          <LeadsMobileCard
            key={lead.id}
            lead={lead}
            editable={canEditLead(currentStaff, lead.assignedStaffId)}
            isUpdating={updatingLeadId === lead.id}
            onStageChange={onStageChange}
            onOpenChat={handleOpenChat}
          />
        ))}
      </div>
    </>
  )
}

export default LeadsTable
