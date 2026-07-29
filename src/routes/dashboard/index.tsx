import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getCurrentSession } from '@/features/auth/server/auth'
import { MetricsSummary } from '@/features/dashboard/components/MetricsSummary'
import { RecentLeadsCard } from '@/features/dashboard/components/RecentLeadsCard'
import { CloseAppointmentsCard } from '@/features/dashboard/components/CloseAppointmentsCard'
import { AlertBanners } from '@/features/dashboard/components/AlertBanners'
import { getDashboardData } from '@/features/dashboard/server/dashboard'

export const Route = createFileRoute('/dashboard/')({
  loader: () => getCurrentSession(),
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
  const session = Route.useLoaderData()
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 font-assistant py-6" dir="rtl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {getGreeting()}, {session?.staff.name || 'אורח'} 👋
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {getHebrewDayName(today)}, {getFormattedDate(today)} — {isLoading ? 'טוען…' : `${appointmentsTodayCount} תורים היום`}
        </p>
      </div>

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
    </div>
  )
}
