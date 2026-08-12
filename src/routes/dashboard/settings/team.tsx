import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { TeamAccessTab } from '@/features/settings/components/TeamAccessTab'

const searchSchema = z.object({ staff: z.string().optional() })

export const Route = createFileRoute('/dashboard/settings/team')({
  validateSearch: searchSchema,
  component: TeamPage,
})

function TeamPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { staff: staffId } = Route.useSearch()

  return (
    <div className="flex flex-col gap-[18px] px-4 pt-5 pb-8 font-assistant lg:px-8 lg:pt-8" dir="rtl">
      <TeamAccessTab
        selectedStaffId={staffId}
        onSelectStaff={(id) => navigate({ search: id ? { staff: id } : {} })}
      />
    </div>
  )
}
