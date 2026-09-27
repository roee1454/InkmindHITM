import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from '@/components/ui/icon'
import type { StaffRecord, StaffRole } from '@/integrations/pocketbase/types'
import { phoneMatchesQuery } from '@/lib/phone'
import { useIsMobile } from '#/hooks/useMediaQuery'
import { useArtistAvatars } from '@/features/calendar/hooks/use-artist-avatars'
import { listPipeline } from './server/pipeline'
import { pipelineQueryKey } from './hooks/use-project-milestones'
import { ProjectPanel } from './components/ProjectPanel'
import { ProjectBoard } from './components/ProjectBoard'
import { ProjectCard } from './components/ProjectCard'
import { ProjectsToolbar } from './components/ProjectsToolbar'
import { PipelineMobileSwitch } from './components/PipelineMobileSwitch'
import { ProjectsSkeleton } from './components/ProjectsSkeleton'
import { useProjectsUiStore } from './store/projectsUiStore'
import { CLOSED_COLUMNS, OPEN_COLUMNS, groupByColumn, sortForColumn } from './utils/board'
import type { PipelineProject } from './types'

interface ProjectsPageProps {
  staff?: StaffRecord | { id: string; role: StaffRole; name?: string; email?: string }
}

const ALL_COLUMNS = [...OPEN_COLUMNS, ...CLOSED_COLUMNS]
const CLOSED_STAGES = new Set(CLOSED_COLUMNS.flatMap((c) => c.stages))

function matchesSearch(term: string, project: PipelineProject): boolean {
  if (!term) return true
  return Boolean(
    project.customerName?.toLowerCase().includes(term) ||
      project.title.toLowerCase().includes(term) ||
      phoneMatchesQuery(project.customerPhone, term),
  )
}

/**
 * The projects page (track-b B6.10): every piece of work, laid out by where it stands. A board on
 * desktop, one lane at a time on a phone. Customers who haven't started a project yet live on the
 * leads page; opening a card brings up the project panel with its timeline and lifecycle actions.
 */
export const ProjectsPage: React.FC<ProjectsPageProps> = ({ staff }) => {
  const { searchQuery, artistId, showClosed, mobileColumn, setSearchQuery, setArtistId, setShowClosed, setMobileColumn, resetFilters } =
    useProjectsUiStore()
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const artistAvatars = useArtistAvatars()

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
  const visible = projects.filter((p) => (artistId === 'all' || p.staffId === artistId) && matchesSearch(term, p))
  const closedCount = visible.filter((p) => CLOSED_STAGES.has(p.stage)).length
  const grouped = groupByColumn(visible, ALL_COLUMNS)
  const mobileColumns = ALL_COLUMNS.map((column) => ({ ...column, count: grouped.get(column.id)?.length ?? 0 }))

  const body = () => {
    if (query.isLoading) return <ProjectsSkeleton />
    if (projects.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 px-6 text-center">
          <p className="text-sm font-bold text-foreground">עדיין אין פרויקטים</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            פרויקט נפתח לבד כשלקוח מבקש לקבוע בשיחה, או כשקובעים לו תור ביומן. מכאן תראו איפה כל עבודה עומדת.
          </p>
        </div>
      )
    }
    if (visible.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
          <span>לא נמצאו פרויקטים התואמים את החיפוש</span>
          <button type="button" onClick={resetFilters} className="cursor-pointer font-bold text-primary hover:underline">
            אפס סינונים
          </button>
        </div>
      )
    }
    if (isMobile) {
      const lane = sortForColumn(grouped.get(mobileColumn) ?? [], now)
      return (
        <div className="flex h-full flex-col gap-2 overflow-y-auto p-4">
          {lane.length > 0 ? (
            lane.map((project) => (
              <ProjectCard
                key={project.projectId}
                project={project}
                now={now}
                avatarUrl={project.staffId ? artistAvatars[project.staffId] : null}
                onOpen={() => setOpenProjectId(project.projectId)}
              />
            ))
          ) : (
            <p className="py-10 text-center text-xs font-medium text-muted-foreground">אין כאן כרגע פרויקטים</p>
          )}
        </div>
      )
    }
    return (
      <ProjectBoard
        columns={showClosed ? CLOSED_COLUMNS : OPEN_COLUMNS}
        projects={visible}
        now={now}
        artistAvatars={artistAvatars}
        onOpenProject={(project) => setOpenProjectId(project.projectId)}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background font-assistant" dir="rtl">
      <div className="px-4 pt-3 lg:hidden">
        <PipelineMobileSwitch active="projects" />
      </div>

      <ProjectsToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        artists={isAdmin ? artists : []}
        artistId={artistId}
        onArtistChange={setArtistId}
        openCount={visible.length - closedCount}
        closedCount={closedCount}
        showClosed={showClosed}
        onShowClosedChange={setShowClosed}
        mobileColumns={mobileColumns}
        mobileColumn={mobileColumn}
        onMobileColumnChange={setMobileColumn}
      />

      {query.error && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          <AlertCircle size={15} className="shrink-0" />
          <span>{query.error.message || 'שגיאה בטעינת הפרויקטים'}</span>
        </div>
      )}

      <div className="min-h-0 flex-1">{body()}</div>

      <ProjectPanel projectId={openProjectId} onClose={() => setOpenProjectId(null)} />
    </div>
  )
}

export default ProjectsPage
