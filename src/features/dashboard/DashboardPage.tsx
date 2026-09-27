import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MetricsSummary } from '@/features/dashboard/components/MetricsSummary'
import { RecentLeadsCard } from '@/features/dashboard/components/RecentLeadsCard'
import { CloseAppointmentsCard } from '@/features/dashboard/components/CloseAppointmentsCard'
import { AlertBanners } from '@/features/dashboard/components/AlertBanners'
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton'
import { getDashboardData } from '@/features/dashboard/server/dashboard'
import { SetupChecklist, useSetupChecklist } from '@/features/onboarding/components/SetupChecklist'
import { HEBREW_DAYS_LONG } from '@/lib/date-utils'

interface DashboardHomePageProps {
  staffName?: string
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

export function DashboardHomePage({ staffName = 'אורח' }: DashboardHomePageProps) {
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
  const receiptApprovalCount = dashboardData?.receiptApprovalCount ?? 0
  const recentLeads = dashboardData?.recentLeads ?? []
  const closeAppointments = dashboardData?.closeAppointments ?? []

  const { items: checklistItems, isLoading: checklistLoading, cardDismissed } = useSetupChecklist()
  const checklistIncomplete = !checklistLoading && !cardDismissed && checklistItems.some((i) => !i.done)

  const dayName = HEBREW_DAYS_LONG[today.getDay()] || ''

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 font-assistant lg:gap-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="page-head">
          <h1>
            {getGreeting()}, {staffName}
          </h1>
          <p className="flex items-center gap-1.5">
            <span>{dayName}</span>
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
          {/* What needs a human comes before what only reports (track-b B6.9). */}
          <AlertBanners
            receiptApprovalCount={receiptApprovalCount}
            awaitingPriceCount={awaitingPriceCount}
            onOpenConversations={() => navigate({ to: '/dashboard/conversations' })}
          />

          <MetricsSummary
            appointmentsTodayCount={appointmentsTodayCount}
            newLeadsCount={newLeadsCount}
            totalLeads={totalActiveLeads}
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

export default DashboardHomePage

