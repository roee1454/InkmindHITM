import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from '@/components/ui/icon'
import { Pagination } from '@/components/ui/pagination'
import type { StaffRecord, StaffRole } from '@/integrations/pocketbase/types'
import { phoneMatchesQuery } from '@/lib/phone'
import { listPipeline } from './server/pipeline'
import { pipelineQueryKey, useProjectMilestones } from './hooks/use-project-milestones'
import { MarkProjectLostDialog } from './components/MarkProjectLostDialog'
import { ProjectPanel } from './components/ProjectPanel'
import { PipelineFilters } from './components/PipelineFilters'
import { PipelineList } from './components/PipelineList'
import { PipelineMobileSwitch } from './components/PipelineMobileSwitch'
import { ProjectsSkeleton } from './components/ProjectsSkeleton'
import { useProjectsUiStore } from './store/projectsUiStore'
import { countByFilter, matchesStage } from './utils/pipeline-filter'
import type { PipelineProject } from './types'

const ITEMS_PER_PAGE = 12

interface ProjectsPageProps {
  staff?: StaffRecord | { id: string; role: StaffRole; name?: string; email?: string }
}

function matchesSearch(term: string, name: string | null, phone: string, extra = ''): boolean {
  if (!term) return true
  return Boolean(name?.toLowerCase().includes(term) || extra.toLowerCase().includes(term) || phoneMatchesQuery(phone, term))
}

/**
 * The projects pipeline (track-b B6.7): every piece of work and the stage it's in. Stages are
 * derived from what happened, so there's nothing to drag — staff only mark a project lost,
 * reopen it, or open it. Split from the old combined leads/projects board: customers who haven't
 * started a project yet live on the leads page (`/dashboard/leads`), not here.
 */
export const ProjectsPage: React.FC<ProjectsPageProps> = ({ staff }) => {
  const { searchQuery, filter, artistId, currentPage, setSearchQuery, setFilter, setArtistId, setCurrentPage, resetFilters } = useProjectsUiStore()
  const { reopen } = useProjectMilestones()
  const [losing, setLosing] = useState<PipelineProject | null>(null)
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)

  const query = useQuery({ queryKey: pipelineQueryKey, queryFn: () => listPipeline(), staleTime: 30_000, refetchOnWindowFocus: true })
  const now = useMemo(() => new Date(), [query.dataUpdatedAt])
  const projects = query.data?.projects ?? []
  const isAdmin = staff?.role === 'owner' || staff?.role === 'admin'

  const artists = useMemo(() => {
    const byId = new Map<string, string>()
    for (const p of projects) if (p.staffId && p.staffName) byId.set(p.staffId, p.staffName)
    return [...byId].map(([id, name]) => ({ id, name }))
  }, [projects])

  const term = searchQuery.toLowerCase().trim()
  const byArtist = projects.filter((p) => artistId === 'all' || p.staffId === artistId)
  const searched = byArtist.filter((p) => matchesSearch(term, p.customerName, p.customerPhone, p.title))
  const counts = countByFilter(searched)

  const visibleProjects = searched.filter((p) => matchesStage(p, filter))
  const totalPages = Math.ceil(visibleProjects.length / ITEMS_PER_PAGE) || 1
  const page = Math.min(Math.max(1, currentPage), totalPages)
  const pageSlice = visibleProjects.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[18px] font-assistant lg:gap-6" dir="rtl">
      <div className="page-head hidden lg:flex">
        <h1>פרויקטים</h1>
        <p>כל עבודה והשלב שלה, מהפנייה הראשונה ועד סיום הפרויקט</p>
      </div>

      <PipelineMobileSwitch active="projects" />

      {query.error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          <span>{query.error.message || 'שגיאה בטעינת הפרויקטים'}</span>
        </div>
      )}

      <PipelineFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        artists={isAdmin ? artists : []}
        artistId={artistId}
        onArtistChange={setArtistId}
      />

      {query.isLoading ? (
        <ProjectsSkeleton />
      ) : visibleProjects.length > 0 ? (
        <div className="flex flex-col gap-4">
          <PipelineList
            projects={pageSlice}
            now={now}
            onMarkLost={setLosing}
            onReopen={(p) => reopen.mutate(p.projectId)}
            onOpenProject={(p) => setOpenProjectId(p.projectId)}
          />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={(next) => React.startTransition(() => setCurrentPage(next))} totalItems={visibleProjects.length} itemsPerPage={ITEMS_PER_PAGE} itemLabel="פרויקטים" />
        </div>
      ) : (
        <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-center text-sm font-semibold text-muted-foreground">
          <span>{term || artistId !== 'all' ? 'לא נמצאו פרויקטים התואמים את החיפוש' : 'אין כרגע פרויקטים בשלב הזה'}</span>
          {(term || artistId !== 'all' || filter !== 'open') && (
            <button type="button" onClick={resetFilters} className="cursor-pointer text-sm font-bold text-primary hover:underline">
              אפס סינונים
            </button>
          )}
        </div>
      )}

      {losing && <MarkProjectLostDialog projectId={losing.projectId} projectTitle={losing.title} open onOpenChange={(open) => !open && setLosing(null)} />}
      <ProjectPanel projectId={openProjectId} onClose={() => setOpenProjectId(null)} />
    </div>
  )
}

export default ProjectsPage
