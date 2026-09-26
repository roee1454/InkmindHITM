import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from '@/components/ui/icon'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { phoneMatchesQuery } from '@/lib/phone'
import { listPipeline } from '@/features/projects/server/pipeline'
import { pipelineQueryKey } from '@/features/projects/hooks/use-project-milestones'
import { PipelineMobileSwitch } from '@/features/projects/components/PipelineMobileSwitch'
import { LeadsWithoutProjectList } from './components/LeadsWithoutProjectList'
import { LeadsSkeleton } from './components/LeadsSkeleton'
import { useLeadsUiStore } from './store/leadsUiStore'

const ITEMS_PER_PAGE = 12

function matchesSearch(term: string, name: string | null, phone: string): boolean {
  if (!term) return true
  return Boolean(name?.toLowerCase().includes(term) || phoneMatchesQuery(phone, term))
}

/**
 * Customers who talked to the studio but never asked to book (track-b B6.7): no project,
 * nothing in the funnel yet. The projects pipeline itself lives on its own page
 * (`/dashboard/projects`) — this page answers one question only: who's still worth following up.
 */
export const LeadsPage: React.FC = () => {
  const { searchQuery, currentPage, setSearchQuery, setCurrentPage } = useLeadsUiStore()

  const query = useQuery({ queryKey: pipelineQueryKey, queryFn: () => listPipeline(), staleTime: 30_000, refetchOnWindowFocus: true })
  const leads = query.data?.leadsWithoutProject ?? []

  const term = searchQuery.toLowerCase().trim()
  const filtered = useMemo(() => leads.filter((l) => matchesSearch(term, l.name, l.phone)), [leads, term])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1
  const page = Math.min(Math.max(1, currentPage), totalPages)
  const pageSlice = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[18px] font-assistant lg:gap-6" dir="rtl">
      <div className="page-head hidden lg:flex">
        <h1>לידים</h1>
        <p>לקוחות שדיברו איתנו ועדיין לא ביקשו לקבוע</p>
      </div>

      <PipelineMobileSwitch active="leads" />

      {query.error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          <span>{query.error.message || 'שגיאה בטעינת הלידים'}</span>
        </div>
      )}

      <SearchInput size="lg" variant="card" placeholder="חיפוש לפי שם או טלפון..." value={searchQuery} onChange={setSearchQuery} />

      {query.isLoading ? (
        <LeadsSkeleton />
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-4">
          <LeadsWithoutProjectList leads={pageSlice} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={(next) => React.startTransition(() => setCurrentPage(next))} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} itemLabel="לידים" />
        </div>
      ) : (
        <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-center text-sm font-semibold text-muted-foreground">
          <span>{term ? 'לא נמצאו לידים התואמים את החיפוש' : 'אין כרגע לידים ללא פרויקט'}</span>
          {term && (
            <button type="button" onClick={() => setSearchQuery('')} className="cursor-pointer text-sm font-bold text-primary hover:underline">
              נקה חיפוש
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default LeadsPage
