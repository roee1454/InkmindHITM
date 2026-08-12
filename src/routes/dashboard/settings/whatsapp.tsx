import { createFileRoute } from '@tanstack/react-router'
import { WhatsAppDiagnostics } from '@/features/settings/components/WhatsAppDiagnostics'

/** Reachable only from the setup checklist — WhatsApp credentials live in server env, there's
 *  nothing to configure in-UI, so it isn't one of the 7 main settings rows. Read-only status. */
export const Route = createFileRoute('/dashboard/settings/whatsapp')({
  component: WhatsAppPage,
})

function WhatsAppPage() {
  return (
    <div className="flex flex-col gap-[18px] px-4 pt-5 pb-8 font-assistant lg:px-8 lg:pt-8" dir="rtl">
      <WhatsAppDiagnostics />
    </div>
  )
}
