import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import { getStaffList } from '@/features/settings/server/staff'
import type { StaffRecord } from '@/integrations/pocketbase/types'
import { listLeads, moveLead } from '../server/leads'
import { canEditLead } from '../lib/permissions'
import { COLUMNS } from '../types'
import type { LeadStage, UILead } from '../types'
import { LeadsHeader } from './LeadsHeader'
import { LeadColumn } from './LeadColumn'
import { LeadCard } from './LeadCard'
import { LeadsBoardSkeleton } from './LeadsBoardSkeleton'
import { useLeadsUiStore } from '../store/leadsUiStore'

// Ported verbatim from WAHA's board: edge auto-scroll while dragging, and click-and-drag-to-pan
// on empty board space. Neither uses a drag-and-drop library — WAHA's board never had one.
const EDGE_THRESHOLD = 120
const AUTOSCROLL_INTERVAL_MS = 16
const AUTOSCROLL_STEP_PX = 25
const PAN_MULTIPLIER = 1.5

interface LeadsBoardPageProps {
  staff: StaffRecord
}

export function LeadsBoardPage({ staff }: LeadsBoardPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const boardRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, scrollLeft: 0 })

  const {
    draggingId,
    dropTarget,
    isPanning,
    setDraggingId,
    setDropTarget,
    setIsPanning,
  } = useLeadsUiStore()

  const leadsQuery = useQuery({
    queryKey: ['leads'],
    queryFn: () => listLeads(),
    staleTime: 5 * 60 * 1000,
  })
  const staffQuery = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
    staleTime: 10 * 60 * 1000,
  })

  const leads = leadsQuery.data ?? []
  const staffList = (staffQuery.data ?? []) as unknown as StaffRecord[]

  function artistName(staffId: string | null): string {
    if (!staffId) return 'לא משויך'
    return staffList.find((s) => s.id === staffId)?.name ?? 'לא משויך'
  }

  const moveLeadMutation = useMutation({
    mutationFn: (vars: { lead: UILead; stage: LeadStage }) =>
      moveLead({ data: { customerId: vars.lead.id, stage: vars.stage } }),
    onMutate: async (vars) => {
      const previous = queryClient.getQueryData<UILead[]>(['leads'])
      queryClient.setQueryData<UILead[]>(['leads'], (current) =>
        (current ?? []).map((l) => (l.id === vars.lead.id ? { ...l, stage: vars.stage } : l)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['leads'], context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })

  function moveLeadTo(lead: UILead, stage: LeadStage) {
    if (lead.stage === stage) return
    moveLeadMutation.mutate({ lead, stage })
  }

  function stopAutoScroll() {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }

  function startAutoScroll(direction: 'left' | 'right') {
    if (scrollIntervalRef.current) return
    scrollIntervalRef.current = setInterval(() => {
      if (!boardRef.current) return
      boardRef.current.scrollLeft += direction === 'left' ? -AUTOSCROLL_STEP_PX : AUTOSCROLL_STEP_PX
    }, AUTOSCROLL_INTERVAL_MS)
  }

  function resetScrollState() {
    stopAutoScroll()
    isPanningRef.current = false
    setIsPanning(false)
  }

  function handleBoardDragOver(e: React.DragEvent) {
    if (!draggingId || !boardRef.current) return
    const rect = boardRef.current.getBoundingClientRect()
    const distanceFromLeft = e.clientX - rect.left
    const distanceFromRight = rect.right - e.clientX
    if (distanceFromLeft < EDGE_THRESHOLD) startAutoScroll('left')
    else if (distanceFromRight < EDGE_THRESHOLD) startAutoScroll('right')
    else stopAutoScroll()
  }

  function handleMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('.lead-card, button, input, select, a')) return
    if (!boardRef.current) return
    e.preventDefault() // don't let the browser start a native text/image drag-selection
    isPanningRef.current = true
    setIsPanning(true)
    panStartRef.current = { x: e.clientX, scrollLeft: boardRef.current.scrollLeft }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isPanningRef.current || !boardRef.current) return
    // Grab-to-pan: the board scrolls opposite to the cursor, as if you're grabbing the
    // canvas and dragging it — same formula in RTL and LTR, the browser's own scrollLeft
    // clamping (0 to -(scrollWidth-clientWidth) in RTL) handles the boundary correctly.
    const delta = (e.clientX - panStartRef.current.x) * PAN_MULTIPLIER
    boardRef.current.scrollLeft = panStartRef.current.scrollLeft - delta
  }

  function handleMouseUp() {
    isPanningRef.current = false
    setIsPanning(false)
  }

  const isInitialLoading = (!leadsQuery.data || !staffQuery.data) && (leadsQuery.isLoading || staffQuery.isLoading)

  if (isInitialLoading) {
    return (
      <div className="flex h-full flex-col gap-4">
        <LeadsHeader onRefresh={() => void leadsQuery.refetch()} />
        <LeadsBoardSkeleton />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <LeadsHeader onRefresh={() => void leadsQuery.refetch()} />

      {moveLeadMutation.isError ? (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {moveLeadMutation.error instanceof Error
            ? moveLeadMutation.error.message
            : 'עדכון השלב נכשל.'}
        </div>
      ) : null}

      <div
        ref={boardRef}
        onDragOver={handleBoardDragOver}
        onDragStart={(e) => {
          // Only cancel a *stray* native drag (e.g. selecting text/an image while panning) —
          // preventDefault() on a bubbled dragstart from a card would cancel its real
          // drag-and-drop, since this handler sits on an ancestor of every .lead-card.
          if (!(e.target as HTMLElement).closest('.lead-card')) e.preventDefault()
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex flex-1 gap-4 overflow-x-auto px-1 pb-2 select-none ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.stage === col.stage)
          return (
            <LeadColumn
              key={col.stage}
              label={col.label}
              color={col.color}
              count={colLeads.length}
              isDropTarget={dropTarget === col.stage}
              onDragOver={(e) => {
                e.preventDefault()
                setDropTarget(col.stage)
              }}
              onDragLeave={() => setDropTarget(dropTarget === col.stage ? null : dropTarget)}
              onDrop={(e) => {
                e.preventDefault()
                setDropTarget(null)
                const lead = leads.find((l) => l.id === draggingId)
                if (lead) moveLeadTo(lead, col.stage)
                setDraggingId(null)
                resetScrollState()
              }}
            >
              {colLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  editable={canEditLead(staff, lead.assignedStaffId)}
                  artistName={artistName(lead.assignedStaffId)}
                  isDragging={draggingId === lead.id}
                  onDragStart={() => setDraggingId(lead.id)}
                  onDragEnd={() => {
                    setDraggingId(null)
                    resetScrollState()
                  }}
                  onOpenChat={() => {
                    if (!lead.conversationId) return
                    navigate({
                      to: '/dashboard/conversations',
                      search: { chatId: lead.conversationId },
                    })
                  }}
                />
              ))}
            </LeadColumn>
          )
        })}
      </div>
    </div>
  )
}