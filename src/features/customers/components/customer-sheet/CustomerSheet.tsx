import type React from 'react'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MessageSquare, Star } from '@/components/ui/icon'
import { IMSheet, IMSheetContent, IMSheetDescription, IMSheetTitle } from '@/components/ui/sheet'
import { IMTabs, IMTabsContent, IMTabsList, IMTabsTrigger } from '@/components/ui/tabs'
import { IMSkeleton } from '@/components/ui/skeleton'
import { IMButton } from '@/components/ui/button'
import { IMStatusLabel } from '@/components/ui/status-label'
import { useIsMobile } from '#/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { formatPhoneForDisplay } from '@/lib/phone'
import { formatIls } from '@/features/payments/utils/labels'
import { ProjectPanel } from '@/features/projects/components/ProjectPanel'
import { CUSTOMER_LIFECYCLE_LABELS, CUSTOMER_LIFECYCLE_ROLE } from '../../utils/lifecycle'
import { useCustomerOverview } from '../../hooks/use-customer-overview'
import type { Customer, CustomerFormData } from '../../types'
import { CustomerProjectsTab } from './CustomerProjectsTab'
import { CustomerPaymentsTab } from './CustomerPaymentsTab'
import { CustomerDetailsTab } from './CustomerDetailsTab'

interface CustomerSheetProps {
  customer: Customer | null
  onClose: () => void
  form: CustomerFormData
  onFormChange: <K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => void
  formError: string | null
  onSubmit: (e: React.FormEvent) => void
  isSaving: boolean
  onDelete: () => void
}

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <IMSkeleton className="h-14 w-full rounded-lg" />
      <IMSkeleton className="h-14 w-full rounded-lg" />
    </div>
  )
}

/**
 * The customer card (track-b B8.1): who they are, every piece they've had with the studio, and
 * where the money stands. A side panel on desktop so the list stays in view; a tall bottom sheet on
 * a phone. Replaces the old edit dialog, which showed contact fields and nothing else.
 */
export function CustomerSheet({ customer: selected, onClose, ...details }: CustomerSheetProps) {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  // Keep showing the last customer after `selected` clears, so the sheet slides out with its
  // content instead of emptying first.
  const [customer, setCustomer] = useState(selected)
  if (selected && selected !== customer) setCustomer(selected)
  const overview = useCustomerOverview(customer?.id ?? null)
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const data = overview.data
  const due = data?.totals.due ?? 0

  // A failed background refetch keeps the last good data on screen; the error only shows when
  // there's nothing else to show.
  const loading = overview.isLoading ? <TabSkeleton /> : null
  const failed = overview.isError ? (
    <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
      {overview.error instanceof Error ? overview.error.message : 'טעינת הכרטיס נכשלה.'}
    </p>
  ) : null

  const triggerClass =
    'h-10 flex-none rounded-none border-b-2 border-transparent px-0 font-bold shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none'

  return (
    <IMSheet open={selected !== null} onOpenChange={(open) => !open && onClose()}>
      <IMSheetContent
        side={isMobile ? 'bottom' : 'left'}
        dir="rtl"
        className={cn('gap-0 p-0', isMobile ? 'h-[92svh] pt-3 pb-0' : 'w-full sm:max-w-lg')}
      >
        {customer && (
          <>
            <header className="flex flex-col gap-3 px-5 pt-4 pb-4 pe-12">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <IMSheetTitle className="truncate text-xl">{customer.name || 'לקוח ללא שם'}</IMSheetTitle>
                  {customer.isVip && <Star size={15} className="shrink-0 fill-warning text-warning" aria-label="VIP" />}
                </div>
                <IMSheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <IMStatusLabel role={CUSTOMER_LIFECYCLE_ROLE[customer.lifecycle]}>{CUSTOMER_LIFECYCLE_LABELS[customer.lifecycle]}</IMStatusLabel>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">{formatPhoneForDisplay(customer.phone)}</span>
                </IMSheetDescription>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                {data ? (
                  <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <Fact label="שולם" value={formatIls(data.totals.paid)} />
                    <Fact label="יתרה" value={formatIls(due)} tone={due > 0 ? 'text-warning' : undefined} />
                    {data.totals.credit > 0 && <Fact label="זיכוי" value={formatIls(data.totals.credit)} />}
                  </dl>
                ) : (
                  <IMSkeleton className="h-5 w-40" />
                )}
                {data?.conversationId && (
                  <IMButton
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: '/dashboard/conversations', search: { chatId: data.conversationId! } })}
                    className="h-9 gap-1.5 px-3"
                  >
                    <MessageSquare size={15} />
                    לשיחה
                  </IMButton>
                )}
              </div>
            </header>

            <IMTabs key={customer.id} defaultValue="projects" dir="rtl" className="min-h-0 flex-1 gap-0">
              <IMTabsList className="h-auto justify-start gap-5 rounded-none border-b border-border bg-transparent p-0 px-5">
                <IMTabsTrigger value="projects" className={triggerClass}>
                  פרויקטים{data ? ` · ${data.projects.length}` : ''}
                </IMTabsTrigger>
                <IMTabsTrigger value="payments" className={triggerClass}>
                  תשלומים
                </IMTabsTrigger>
                <IMTabsTrigger value="details" className={triggerClass}>
                  פרטים
                </IMTabsTrigger>
              </IMTabsList>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
                <IMTabsContent value="projects">
                  {data ? <CustomerProjectsTab projects={data.projects} now={new Date()} onOpenProject={setOpenProjectId} /> : (loading ?? failed)}
                </IMTabsContent>
                <IMTabsContent value="payments">{data ? <CustomerPaymentsTab overview={data} /> : (loading ?? failed)}</IMTabsContent>
                <IMTabsContent value="details">
                  <CustomerDetailsTab {...details} />
                </IMTabsContent>
              </div>
            </IMTabs>

            <ProjectPanel projectId={openProjectId} onClose={() => setOpenProjectId(null)} />
          </>
        )}
      </IMSheetContent>
    </IMSheet>
  )
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('font-bold tabular-nums text-foreground', tone)}>{value}</dd>
    </div>
  )
}
