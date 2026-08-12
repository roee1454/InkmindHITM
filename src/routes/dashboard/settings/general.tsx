import { createFileRoute } from '@tanstack/react-router'
import { GeneralSettingsTab } from '@/features/settings/components/GeneralSettingsTab'

export const Route = createFileRoute('/dashboard/settings/general')({
  component: GeneralPage,
})

function GeneralPage() {
  return (
    <div className="flex flex-col gap-[18px] px-4 pt-5 pb-8 font-assistant lg:px-8 lg:pt-8" dir="rtl">
      <GeneralSettingsTab />
    </div>
  )
}
