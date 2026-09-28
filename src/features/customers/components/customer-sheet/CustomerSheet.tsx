import type React from 'react'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MessageSquare, Star } from '@/components/ui/icon'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '#/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { formatPhoneForDisplay } from '@/lib/phone'
import { formatIls } from '@/features/payments/utils/labels'
import { ProjectPanel } from '@/features/projects/components/ProjectPanel'
import { CUSTOMER_LIFECYCLE_LABELS, CUSTOMER_LIFECYCLE_TONE } from '../../utils/lifecycle'
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

function initials(name: string | null): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return words.length ? words.slice(0, 2).map((w) => w[0]).join('') : '?'
}

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
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

  return (
    <Sheet open={selected !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'left'}
        dir="rtl"
        className={cn('gap-0 p-0', isMobile ? 'h-[92svh] pt-3 pb-0' : 'w-full sm:max-w-lg')}
      >
        {customer && (
          <>
            <header className="flex items-start gap-3 px-5 pt-4 pb-4 pe-12">
              <span className="avatar-native">{initials(customer.name)}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <SheetTitle className="truncate text-lg">{customer.name || 'לקוח ללא שם'}</SheetTitle>
                  {customer.isVip && <Star size={14} className="shrink-0 fill-warning text-warning" aria-label="VIP" />}
                  <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-2xs font-bold', CUSTOMER_LIFECYCLE_TONE[customer.lifecycle])}>
                    {CUSTOMER_LIFECYCLE_LABELS[customer.lifecycle]}
                  </span>
                </div>
                <SheetDescription dir="ltr" className="self-start text-sm tabular-nums">
                  {formatPhoneForDisplay(customer.phone)}
                </SheetDescription>
                {due > 0 && <span className="text-xs font-bold text-warning">יתרה פתוחה {formatIls(due)}</span>}
              </div>
              {data?.conversationId && (
                <button
                  type="button"
                  onClick={() => navigate({ to: '/dashboard/conversations', search: { chatId: data.conversationId! } })}
                  className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-bold text-foreground transition-colors duration-150 hover:bg-muted"
                >
                  <MessageSquare size={15} />
                  לשיחה
                </button>
              )}
            </header>

            <Tabs key={customer.id} defaultValue="projects" dir="rtl" className="min-h-0 flex-1 gap-0">
              <div className="px-5 pb-3">
                <TabsList>
                  <TabsTrigger value="projects">פרויקטים{data ? ` · ${data.projects.length}` : ''}</TabsTrigger>
                  <TabsTrigger value="payments">כספים</TabsTrigger>
                  <TabsTrigger value="details">פרטים</TabsTrigger>
                </TabsList>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
                <TabsContent value="projects">
                  {data ? <CustomerProjectsTab projects={data.projects} now={new Date()} onOpenProject={setOpenProjectId} /> : (loading ?? failed)}
                </TabsContent>
                <TabsContent value="payments">{data ? <CustomerPaymentsTab overview={data} /> : (loading ?? failed)}</TabsContent>
                <TabsContent value="details">
                  <CustomerDetailsTab {...details} />
                </TabsContent>
              </div>
            </Tabs>

            <ProjectPanel projectId={openProjectId} onClose={() => setOpenProjectId(null)} />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
