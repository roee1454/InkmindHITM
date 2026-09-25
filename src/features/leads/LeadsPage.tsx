import React, { useState } from 'react'
import { AlertCircle } from '@/components/ui/icon'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { StaffRecord, StaffRole } from '@/integrations/pocketbase/types'
import { listLeads, moveLead } from './server/leads'
import { STAGE_OPTIONS, type LeadStage, type UILead } from './types'
import { LeadsFilters } from './components/LeadsFilters'
import { LeadsTable } from './components/LeadsTable'
import { LeadsSkeleton } from './components/LeadsSkeleton'
import { useLeadsUiStore } from './store/leadsUiStore'
import { Pagination } from '@/components/ui/pagination'

import { phoneMatchesQuery } from '@/lib/phone'

const ITEMS_PER_PAGE = 10

interface LeadsPageProps {
  staff?: StaffRecord | { id: string; role: StaffRole; name?: string; email?: string }
}

export const LeadsPage: React.FC<LeadsPageProps> = ({ staff: initialStaff }) => {
  const queryClient = useQueryClient()
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const {
    searchQuery,
    selectedStage,
    currentPage,
    setSearchQuery,
    setSelectedStage,
    setCurrentPage,
  } = useLeadsUiStore()

  // Queries
  const leadsQuery = useQuery<UILead[]>({
    queryKey: ['leads'],
    queryFn: () => listLeads(),
    staleTime: 5 * 60 * 1000,
  })

  const leads = leadsQuery.data ?? []
  const staff = initialStaff || {
    id: '',
    role: 'staff',
    name: '',
    email: '',
  }

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
    ...(Object.fromEntries(STAGE_OPTIONS.map((opt: { stage: LeadStage; label: string }) => [opt.stage, 0])) as Record<LeadStage, number>),
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
      // Search query
      const term = searchQuery.toLowerCase().trim()
      if (term) {
        const nameMatch = lead.name?.toLowerCase().includes(term)
        const phoneMatch = phoneMatchesQuery(lead.phone, term)
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

  const handlePageChange = (page: number) => {
    React.startTransition(() => {
      setCurrentPage(page)
    })
  }

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
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          <span>{mutationError}</span>
        </div>
      )}

      {leadsQuery.error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          <span>{(leadsQuery.error).message || 'שגיאה בטעינת הלידים'}</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <LeadsFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedStage={selectedStage}
        onSelectedStageChange={setSelectedStage}
        stageCounts={stageCounts}
      />

      {/* Leads Table or Loading / Empty States */}
      {isLoading ? (
        <LeadsSkeleton />
      ) : paginatedLeads.length > 0 ? (
        <div className="flex flex-col gap-4">
          <LeadsTable
            leads={paginatedLeads}
            currentStaff={staff}
            updatingLeadId={updatingLeadId}
            onStageChange={handleStageChange}
          />

          {/* Pagination Controls */}
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={filteredLeads.length}
            itemsPerPage={ITEMS_PER_PAGE}
            itemLabel="לידים"
          />
        </div>
      ) : (
        <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-center text-sm font-semibold text-muted-foreground">
          <span>לא נמצאו לידים התואמים את החיפוש או הסינון</span>
          {(searchQuery || selectedStage !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSelectedStage('all')
              }}
              className="cursor-pointer text-sm font-bold text-primary hover:underline"
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
