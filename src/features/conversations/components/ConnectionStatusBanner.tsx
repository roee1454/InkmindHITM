import { Link } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'

/** Shown in place of the inbox when WhatsApp credentials aren't configured yet, so an
 *  empty conversation list doesn't read as a bug. */
export function ConnectionStatusBanner() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center font-assistant shadow-sm">
        <TriangleAlert className="size-10 text-primary" />
        <h2 className="text-lg font-bold text-foreground">וואטסאפ עדיין לא מחובר</h2>
        <p className="text-sm text-muted-foreground">
          כדי לקבל ולשלוח הודעות, יש להזין את פרטי החיבור של WhatsApp Cloud API בהגדרות.
        </p>
        <Link
          to="/dashboard/settings"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          למעבר להגדרות
        </Link>
      </div>
    </div>
  )
}
