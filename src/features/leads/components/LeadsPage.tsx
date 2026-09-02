import React, { useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStaffList, getCurrentStaffInfo } from '@/features/settings/server/staff'
import type { StaffMember, CurrentStaffInfo } from '@/features/settings/server/staff'
import type { StaffRecord } from '@/integrations/pocketbase/types'
import { getGoogleCalendarConnections } from '@/features/calendar/server/appointments'
import type { ApiGoogleConnection } from '@/features/calendar/types'
import { listLeads, moveLead } from '../server/leads'
import type { LeadStage, UILead } from '../types'
import { LeadsFilters } from './LeadsFilters'
import { LeadsTable } from './LeadsTable'
import { LeadsSkeleton } from './LeadsSkeleton'
import { useLeadsUiStore } from '../store/leadsUiStore'

const ITEMS_PER_PAGE = 10

interface LeadsPageProps {
  staff?: StaffRecord
}

export const LeadsPage: React.FC<LeadsPageProps> = ({ staff: initialStaff }) => {
  const queryClient = useQueryClient()
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const {
    searchQuery,
    selectedStage,
    selectedArtist,
    currentPage,
    setSearchQuery,
    setSelectedStage,
    setSelectedArtist,
    setCurrentPage,
  } = useLeadsUiStore()

  // Queries
  const leadsQuery = useQuery<UILead[]>({
    queryKey: ['leads'],
    queryFn: () => listLeads(),
    staleTime: 5 * 60 * 1000,
  })

  const staffQuery = useQuery<StaffMember[]>({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
    staleTime: 10 * 60 * 1000,
  })

  const currentStaffQuery = useQuery<CurrentStaffInfo>({
    queryKey: ['currentStaff'],
    queryFn: () => getCurrentStaffInfo(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: googleConnections = [] } = useQuery<ApiGoogleConnection[]>({
    queryKey: ['google-calendar-connections'],
    queryFn: () => getGoogleCalendarConnections(),
    staleTime: 5 * 60 * 1000,
  })

  const leads = leadsQuery.data ?? []
  const staffList = staffQuery.data ?? []
  const staff =
    initialStaff ??
    ((currentStaffQuery.data as unknown as StaffRecord) || {
      id: '',
      role: 'staff',
      name: '',
      email: '',
    })

  // Optimistic Lead Move Mutation
  const moveLeadMutation = useMutation({
    mutationFn: (vars: { lead: UILead; stage: LeadStage }) =>
      moveLead({ data: { customerId: vars.lead.id, stage: vars.stage } }),
    onMutate: async (vars) => {
      setUpdatingLeadId(vars.lead.id)
      setMutationError(null)
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      const previous = queryClient.getQueryData<UILead[]>(['leads'])
      queryClient.setQueryData<UILead[]>(['leads'], (current) =>
        (current ?? []).map((l) => (l.id === vars.lead.id ? { ...l, stage: vars.stage } : l)),
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['leads'], context.previous)
      }
      setMutationError(err instanceof Error ? err.message : 'עדכון השלב נכשל.')
    },
    onSettled: () => {
      setUpdatingLeadId(null)
      void queryClient.invalidateQueries({ queryKey: ['leads'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })

  function handleStageChange(lead: UILead, newStage: LeadStage) {
    if (lead.stage === newStage) return
    moveLeadMutation.mutate({ lead, stage: newStage })
  }

  // Calculate dynamic stage counts across all leads (independent of filters)
  const stageCounts: Record<LeadStage | 'all', number> = {
    all: leads.length,
    new: 0,
    intake: 0,
    awaiting_price: 0,
    awaiting_payment: 0,
    booked: 0,
    expired: 0,
  }

  for (const lead of leads) {
    if (lead.stage in stageCounts) {
      stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1
    }
  }

  // Filter leads
  const filteredLeads = leads
    .filter((lead) => {
      // Stage filter
      if (selectedStage !== 'all' && lead.stage !== selectedStage) {
        return false
      }
      // Artist filter
      if (selectedArtist !== 'all' && lead.assignedStaffId !== selectedArtist) {
        return false
      }
      // Search query
      const term = searchQuery.toLowerCase().trim()
      if (term) {
        const nameMatch = lead.name?.toLowerCase().includes(term)
        const phoneMatch = lead.phone?.includes(term)
        return nameMatch || phoneMatch
      }
      return true
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  // Pagination calculation
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE) || 1
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const paginatedLeads = filteredLeads.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  )

  const isLoading = leadsQuery.isLoading && !leads.length

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[18px] font-assistant lg:gap-6" dir="rtl">
      {/* PC View Only Title */}
      <div className="hidden items-center justify-between gap-3 lg:flex" dir="rtl">
        <div className="page-head">
          <h1>לידים פוטנציאליים</h1>
          <p>ניהול ומעקב אחר לידים ושלבי התקדמות</p>
        </div>
      </div>

      {mutationError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] font-semibold text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          <span>{mutationError}</span>
        </div>
      )}

      {leadsQuery.error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] font-semibold text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          <span>{(leadsQuery.error as Error).message || 'שגיאה בטעינת הלידים'}</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <LeadsFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedStage={selectedStage}
        onSelectedStageChange={setSelectedStage}
        selectedArtist={selectedArtist}
        onSelectedArtistChange={setSelectedArtist}
        stageCounts={stageCounts}
        staffList={staffList}
        googleConnections={googleConnections}
      />

      {/* Leads Table or Loading / Empty States */}
      {isLoading ? (
        <LeadsSkeleton />
      ) : paginatedLeads.length > 0 ? (
        <div className="flex flex-col gap-4">
          <LeadsTable
            leads={paginatedLeads}
            currentStaff={staff as StaffRecord}
            staffList={staffList}
            googleConnections={googleConnections}
            updatingLeadId={updatingLeadId}
            onStageChange={handleStageChange}
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-border/60 pt-4 font-assistant text-[13px] sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground text-center sm:text-start">
                מציג {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(safePage * ITEMS_PER_PAGE, filteredLeads.length)} מתוך{' '}
                {filteredLeads.length} לידים
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-border/80 bg-card px-3.5 text-[13.5px] font-bold text-foreground transition-all duration-100 active:scale-95 active:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                >
                  <ChevronRight size={15} /> הקודם
                </button>

                <span className="font-bold text-muted-foreground sm:hidden">
                  עמוד {safePage} מתוך {totalPages}
                </span>

                <div className="hidden items-center gap-1 sm:flex">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-7.5 w-7.5 cursor-pointer rounded-lg text-[13px] font-bold transition-transform duration-150 ease-native active:scale-95 ${
                        pageNum === safePage
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border/80 bg-card text-muted-foreground active:bg-muted'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-border/80 bg-card px-3.5 text-[13.5px] font-bold text-foreground transition-all duration-100 active:scale-95 active:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                >
                  הבא <ChevronLeft size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-center text-sm font-semibold text-muted-foreground">
          <span>לא נמצאו לידים התואמים את החיפוש או הסינון</span>
          {(searchQuery || selectedStage !== 'all' || selectedArtist !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSelectedStage('all')
                setSelectedArtist('all')
              }}
              className="cursor-pointer text-[13px] font-bold text-primary hover:underline"
            >
              אפס סינונים
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default LeadsPage
