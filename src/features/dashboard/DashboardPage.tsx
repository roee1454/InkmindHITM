import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle } from '@/components/ui/icon'
import { SetupChecklist, useSetupChecklist } from '@/features/onboarding/components/SetupChecklist'
import { ProjectPanel } from '@/features/projects/components/ProjectPanel'
import { useConversationsUiStore } from '@/features/conversations/store/conversationsUiStore'
import { useDashboardHome } from './hooks/use-dashboard-home'
import { NeedsYouCard } from './components/NeedsYouCard'
import { TodayCard } from './components/TodayCard'
import { PipelineStrip } from './components/PipelineStrip'

function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return 'בוקר טוב'
  if (hour >= 12 && hour < 17) return 'צהריים טובים'
  return 'ערב טוב'
}

/**
 * The home screen answers one question: what's waiting on me, and what's on today (docs/screens-
 * redesign.md, H). What needs a person comes first; where the pipeline stands closes the page.
 */
export function DashboardHomePage({ staffName }: { staffName?: string }) {
  const navigate = useNavigate()
  const setConversationFilter = useConversationsUiStore((s) => s.setStatusFilter)
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const now = new Date()
  const home = useDashboardHome(now)

  const { items: checklistItems, isLoading: checklistLoading, cardDismissed } = useSetupChecklist()
  const checklistIncomplete = !checklistLoading && !cardDismissed && checklistItems.some((i) => !i.done)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 font-assistant lg:gap-8" dir="rtl">
      <div className="page-head">
        <h1>{staffName ? `${greeting(now.getHours())}, ${staffName}` : greeting(now.getHours())}</h1>
        <p>{now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {checklistIncomplete && <SetupChecklist maxRows={3} showFooterLink />}

      {home.error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          חלק מהנתונים לא נטענו. רעננו את הדף כדי לנסות שוב.
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8">
        <NeedsYouCard
          waiting={home.waiting}
          projectNeeds={home.projectNeeds}
          isLoading={home.loading.needs}
          onOpenConversation={(chatId) => navigate({ to: '/dashboard/conversations', search: { chatId } })}
          onOpenProject={setOpenProjectId}
          onAllConversations={() => {
            setConversationFilter('escalated')
            void navigate({ to: '/dashboard/conversations' })
          }}
          onAllProjects={() => navigate({ to: '/dashboard/projects' })}
        />
        <TodayCard
          appointments={home.today}
          next={home.next}
          isLoading={home.loading.today}
          now={now}
          onOpen={(appointment) => (appointment.projectId ? setOpenProjectId(appointment.projectId) : navigate({ to: '/dashboard/calendar' }))}
        />
      </div>

      <PipelineStrip stages={home.stages} isLoading={home.loading.stages} />

      <ProjectPanel projectId={openProjectId} onClose={() => setOpenProjectId(null)} />
    </div>
  )
}
