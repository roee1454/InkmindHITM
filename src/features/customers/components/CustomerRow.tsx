import { ChevronLeft, ShieldAlert, Star } from '@/components/ui/icon'
import { formatPhoneForDisplay } from '@/lib/phone'
import { formatIls } from '@/features/payments/utils/labels'
import { formatShortSlot } from '@/features/projects/utils/format'
import { extractMedicalAlerts } from '@/features/health-declaration/utils/health-alerts'
import { isHealthDeclarationValid } from '@/features/health-declaration/utils/validity'
import { SOURCE_LABELS } from '../types'
import type { Customer } from '../types'
import type { CustomerWork } from '../utils/customer-list'
import { cn } from '@/lib/utils'

/** What needs doing about the health declaration, if anything: a medical flag, or a signature past its validity. */
function healthNotice(customer: Customer): string | null {
  if (!customer.healthDeclarationSigned) return null
  const alerts = extractMedicalAlerts({ answers: customer.healthDeclarationAnswers, medicalNotes: customer.medicalNotes, allergies: customer.allergies })
  if (alerts.length > 0) return `הצהרת בריאות: ${alerts.length} דברים לשים לב אליהם`
  if (customer.healthDeclarationDate && !isHealthDeclarationValid(customer.healthDeclarationDate)) return 'הצהרת הבריאות פגה, צריך לחדש'
  return null
}

function whenLine(work: CustomerWork): string {
  if (work.nextAppointmentAt) return `הבא: ${formatShortSlot(work.nextAppointmentAt)}`
  if (work.lastSessionAt) return `אחרון: ${new Date(work.lastSessionAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' })}`
  return ''
}

export function CustomerRow({ customer, work, onOpen }: { customer: Customer; work: CustomerWork; onOpen: (customer: Customer) => void }) {
  const notice = healthNotice(customer)
  const detail = [formatPhoneForDisplay(customer.phone), customer.source && customer.source !== 'unknown' ? SOURCE_LABELS[customer.source] : ''].filter(Boolean).join(' · ')
  const when = whenLine(work)
  const sessions = work.sessionsDone > 0 ? (work.sessionsDone === 1 ? 'סשן אחד' : `${work.sessionsDone} סשנים`) : ''

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(customer)}
        className="grid w-full cursor-pointer grid-cols-1 items-center gap-x-4 gap-y-1 border-t border-border/70 px-4 py-3 text-start transition-colors duration-150 first:border-t-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-5 lg:grid-cols-[minmax(0,1fr)_15rem_8rem_auto]"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-bold text-foreground">{customer.name || 'לקוח ללא שם'}</span>
            {customer.isVip && <Star size={13} className="shrink-0 fill-warning text-warning" aria-label="VIP" />}
            {notice && <ShieldAlert size={14} className="shrink-0 text-warning" aria-label={notice} />}
          </span>
          <span className="truncate text-sm text-muted-foreground tabular-nums">
            {detail}
          </span>
        </span>

        <span className="flex items-center gap-2 text-sm text-muted-foreground lg:contents">
          <span className="lg:truncate">{[sessions, when].filter(Boolean).join(' · ') || <span className="lg:hidden">עוד לא הייתה פגישה</span>}</span>
          <span className={cn('ms-auto shrink-0 font-bold tabular-nums lg:ms-0 lg:justify-self-end', work.due > 0 ? 'text-warning' : 'invisible')}>
            {work.due > 0 ? `יתרה ${formatIls(work.due)}` : ''}
          </span>
        </span>

        <ChevronLeft size={16} className="hidden shrink-0 text-muted-foreground lg:block" />
      </button>
    </li>
  )
}
