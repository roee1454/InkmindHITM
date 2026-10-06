import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { TeamTab } from '@/features/settings/tabs/team/TeamTab'

const searchSchema = z.object({ staff: z.string().optional() })

export const Route = createFileRoute('/dashboard/settings/team')({
  validateSearch: searchSchema,
  component: TeamPage,
})

function TeamPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { staff: staffId } = Route.useSearch()
  return <TeamTab selectedStaffId={staffId} onSelectStaff={(id: string | null) => navigate({ search: id ? { staff: id } : {} })} />
}
