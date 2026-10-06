import type { LedgerAppointment, LedgerPayment, ProjectBalance } from '@/features/payments/types'
import type { ProjectStage } from '@/features/projects/types'
import { PROJECT_STAGE_LABELS } from '@/features/projects/utils/labels'
import { healingGapLabel } from '@/features/calendar/utils/price-quote-message'
import type { DepositApplication, TouchUpRule } from '@/lib/project-policy'
import { minutesToTime, toYmd } from '@/lib/date-utils'
import { balanceLine, depositCreditLine, LEDGER_NUMBERS_ONLY_RULE, NO_FINAL_PRICE_RULE } from '@/lib/customer-finance-wording'

/**
 * What the bot knows about the project it's talking about: where the work stands, how much of it
 * the artist expects, the price, the money, and when the next session is or should be. Everything
 * here was decided or recorded by staff — the bot reads it to the customer and never decides it
 * (the number of sessions and the end of the work are the artist's call).
 */
export interface ProjectContextSource {
  title: string
  stage: ProjectStage
  estimatedSessions: number | null
  quoteMin: number | null
  quoteMax: number | null
  appointments: LedgerAppointment[]
  payments: LedgerPayment[]
  balance: ProjectBalance
  healingPeriodDays: number
  touchUp: TouchUpRule
  depositApplication: DepositApplication
}

export interface ProjectPromptContext {
  title: string
  stageLabel: string
  sessionsDone: number
  estimatedSessions: number | null
  quote: { min: number; max: number } | null
  depositPaid: number
  balance: { due: number; credit: number }
  nextBooked: { date: string; timeSlot: string } | null
  /** Between sessions with nothing booked: from when the next session is recommended. */
  nextSessionFrom: string | null
  healingGap: string
  touchUp: TouchUpRule
  depositApplication: DepositApplication
  /** A consultation is done and no session yet: the next booking is the tattoo itself. */
  afterConsultation: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

function localSlot(iso: string): { date: string; timeSlot: string } {
  const d = new Date(iso)
  return { date: toYmd(d), timeSlot: minutesToTime(d.getHours() * 60 + d.getMinutes()) }
}

export function toProjectPromptContext(source: ProjectContextSource, now: Date): ProjectPromptContext {
  const sessions = source.appointments.filter((a) => a.kind === 'session' && a.status === 'completed')
  const lastSession = sessions.map((a) => new Date(a.startTime).getTime()).sort((a, b) => b - a)[0]
  const next = source.appointments
    .filter((a) => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.startTime).getTime() > now.getTime())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]
  const waitingForNext = source.stage === 'in_progress' && !next && lastSession !== undefined

  return {
    title: source.title,
    stageLabel: PROJECT_STAGE_LABELS[source.stage],
    sessionsDone: sessions.length,
    estimatedSessions: source.estimatedSessions,
    quote: source.quoteMin && source.quoteMax ? { min: source.quoteMin, max: source.quoteMax } : null,
    depositPaid: source.payments.filter((p) => p.kind === 'deposit' && p.status === 'verified').reduce((sum, p) => sum + p.amount, 0),
    balance: { due: source.balance.due, credit: source.balance.credit },
    nextBooked: next ? localSlot(next.startTime) : null,
    nextSessionFrom: waitingForNext ? toYmd(new Date(lastSession + source.healingPeriodDays * DAY_MS)) : null,
    healingGap: healingGapLabel(source.healingPeriodDays),
    touchUp: source.touchUp,
    depositApplication: source.depositApplication,
    afterConsultation: sessions.length === 0 && source.appointments.some((a) => a.kind === 'consultation' && a.status === 'completed'),
  }
}

function scopeLine(ctx: ProjectPromptContext): string {
  if (ctx.estimatedSessions === null) {
    return `- היקף: הושלמו ${ctx.sessionsDone} סשנים. האמן עוד לא קבע כמה מפגשים העבודה תדרוש: אל תנחש, ואמור שהאמן יעדכן.`
  }
  if (ctx.estimatedSessions <= 1) return '- היקף: עבודה של מפגש אחד (לפי הערכת האמן).'
  return `- היקף: הושלמו ${ctx.sessionsDone} סשנים מתוך כ-${ctx.estimatedSessions} (הערכת האמן).`
}

function nextSessionLine(ctx: ProjectPromptContext, today: string): string | null {
  if (ctx.nextBooked) return `- הסשן הבא כבר נקבע: ${ctx.nextBooked.date} בשעה ${ctx.nextBooked.timeSlot}. אל תציע לקבוע אותו שוב.`
  if (!ctx.nextSessionFrom) return null
  return ctx.nextSessionFrom <= today
    ? `- הסשן הבא: עוד לא נקבע, וההחלמה המומלצת (${ctx.healingGap}) כבר עברה. אפשר לקבוע.`
    : `- הסשן הבא: עוד לא נקבע. מומלץ לקבוע מ-${ctx.nextSessionFrom} והלאה, אחרי החלמה של ${ctx.healingGap}.`
}

function touchUpLine(rule: TouchUpRule): string | null {
  if (rule.kind === 'free_within_days') return `- טאץ'-אפ: ללא עלות עד ${rule.days} ימים מסיום העבודה.`
  if (rule.kind === 'charged') return "- טאץ'-אפ: בתשלום."
  return null
}

export function buildProjectContextBlock(ctx: ProjectPromptContext | null, now: Date): string {
  if (!ctx) return ''
  const perSession = ctx.estimatedSessions !== null && ctx.estimatedSessions > 1
  const balance = balanceLine(ctx.balance)
  const lines = [
    `- עבודה: "${ctx.title}" (שלב: ${ctx.stageLabel})`,
    ctx.afterConsultation
      ? "- הלקוח כבר עבר פגישת ייעוץ בפרויקט הזה. המסלול הוא סשן קעקוע: אל תציע ייעוץ נוסף אלא אם הלקוח ביקש במפורש. כשהוא רוצה לקבוע, קרא ל-'choose_booking_track' עם tattoo."
      : null,
    scopeLine(ctx),
    nextSessionLine(ctx, toYmd(now)),
    ctx.quote ? `- מחיר משוער${perSession ? ' לכל מפגש' : ''}: ₪${ctx.quote.min.toLocaleString()}–${ctx.quote.max.toLocaleString()}.` : null,
    ctx.depositPaid > 0 ? `- ${depositCreditLine(ctx.depositPaid, ctx.depositApplication)}` : null,
    balance ? `- ${balance}` : null,
    touchUpLine(ctx.touchUp),
  ].filter((line): line is string => Boolean(line))

  return [
    '',
    '',
    '<project_context>',
    '[הפרויקט של הלקוח: הנתונים נקבעו ונרשמו על ידי הצוות]',
    ...lines,
    'כללים:',
    '- מספר המפגשים וסיום העבודה נקבעים על ידי האמן בלבד. אל תבטיח מספר מפגשים אחר ואל תקבע שהעבודה הסתיימה.',
    `- ${NO_FINAL_PRICE_RULE}`,
    `- ${LEDGER_NUMBERS_ONLY_RULE}`,
    '</project_context>',
  ].join('\n')
}
