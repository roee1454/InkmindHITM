import { createFileRoute, useNavigate, getRouteApi } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MetricsSummary } from '@/features/dashboard/components/MetricsSummary'
import { RecentLeadsCard } from '@/features/dashboard/components/RecentLeadsCard'
import { CloseAppointmentsCard } from '@/features/dashboard/components/CloseAppointmentsCard'
import { AlertBanners } from '@/features/dashboard/components/AlertBanners'
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton'
import { getDashboardData } from '@/features/dashboard/server/dashboard'
import { SetupChecklist, useSetupChecklist } from '@/features/onboarding/components/SetupChecklist'

const dashboardRoute = getRouteApi('/dashboard')

export const Route = createFileRoute('/dashboard/')({
  component: DashboardHome,
})

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

function getHebrewDayName(d: Date) {
  return HEBREW_DAYS[d.getDay()]
}

function getFormattedDate(d: Date) {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'בוקר טוב'
  if (hour >= 12 && hour < 17) return 'צהריים טובים'
  return 'ערב טוב'
}

function DashboardHome() {
  const session = dashboardRoute.useLoaderData()
  const navigate = useNavigate()
  const today = new Date()

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: () => getDashboardData(),
    staleTime: 30000,
  })

  const appointmentsTodayCount = dashboardData?.appointmentsTodayCount ?? 0
  const newLeadsCount = dashboardData?.newLeadsCount ?? 0
  const totalActiveLeads = dashboardData?.totalActiveLeads ?? 0
  const awaitingPriceCount = dashboardData?.awaitingPriceCount ?? 0
  const recentLeads = dashboardData?.recentLeads ?? []
  const closeAppointments = dashboardData?.closeAppointments ?? []

  const { items: checklistItems, isLoading: checklistLoading, cardDismissed } = useSetupChecklist()
  const checklistIncomplete = !checklistLoading && !cardDismissed && checklistItems.some((i) => !i.done)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 font-assistant lg:gap-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 sm:items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {getGreeting()}, {session?.staff.name || 'אורח'}
          </h1>
          <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground sm:text-sm">
            <span>יום {getHebrewDayName(today)}</span>
            <span>•</span>
            <span>{getFormattedDate(today)}</span>
            {!isLoading && (
              <>
                <span>•</span>
                <span className="font-extrabold text-primary">
                  {appointmentsTodayCount === 0
                    ? 'אין תורים להיום'
                    : appointmentsTodayCount === 1
                      ? 'תור אחד היום'
                      : `${appointmentsTodayCount} תורים היום`}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {checklistIncomplete && <SetupChecklist maxRows={3} showFooterLink />}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <MetricsSummary
            appointmentsTodayCount={appointmentsTodayCount}
            newLeadsCount={newLeadsCount}
            totalLeads={totalActiveLeads}
          />

          <AlertBanners
            receiptApprovalCount={0}
            awaitingPriceCount={awaitingPriceCount}
            onNavigateToLeads={() => navigate({ to: '/dashboard/leads' })}
          />

          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2 lg:gap-6">
            <RecentLeadsCard
              leads={recentLeads}
              onViewAll={() => navigate({ to: '/dashboard/leads' })}
              onLeadClick={() => navigate({ to: '/dashboard/conversations' })}
            />
            <CloseAppointmentsCard
              appointments={closeAppointments}
              onViewAll={() => navigate({ to: '/dashboard/calendar' })}
            />
          </div>
        </>
      )}
    </div>
  )
}
