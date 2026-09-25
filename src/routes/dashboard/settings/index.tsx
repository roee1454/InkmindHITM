import { createFileRoute } from '@tanstack/react-router'
import { getCurrentSession } from '@/features/auth/server/auth'
import { SettingsMenu } from '@/features/settings/components/SettingsMenu'

export const Route = createFileRoute('/dashboard/settings/')({
  loader: () => getCurrentSession(),
  component: SettingsRouteComponent,
})

function SettingsRouteComponent() {
  const session = Route.useLoaderData()
  return <SettingsMenu staff={session?.staff} />
}
