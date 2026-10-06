import { useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getAppointments } from '@/features/calendar/server/appointments'
import { useAppointmentMutations } from '@/features/calendar/hooks/use-appointment-mutations'
import { EditAppointmentSheet } from '@/features/calendar/components/EditAppointmentSheet'
import { useProjectFinance } from '@/features/payments/hooks/use-project-finance'
import { useProjectDetails } from '../hooks/use-project-details'
import { summarizeProject } from '../utils/panel'
import { draftFrom, isDraftDirty, parseDraft } from '../utils/project-draft'
import type { DraftField, ProjectDraft } from '../utils/project-draft'
import { MarkProjectLostDialog } from './MarkProjectLostDialog'
import { CreateAppointmentDialog } from '@/features/calendar/components/CreateAppointmentDialog'
import { useStaffDirectory } from '@/features/calendar/hooks/use-staff-directory'
import { nextSessionValues, tattooAfterConsultationValues } from '@/features/calendar/utils/follow-up'
import type { AppointmentFormValues } from '@/features/calendar/types'
import { projectBookingValues } from '../utils/booking'
import { ProjectPanelHeader } from './project-panel/ProjectPanelHeader'
import { ProjectFacts } from './project-panel/ProjectFacts'
import { ProjectSessions } from './project-panel/ProjectSessions'
import { ProjectPayments } from './project-panel/ProjectPayments'
import { ProjectEditFooter, ProjectLifecycleFooter } from './project-panel/ProjectPanelFooter'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

function errorText(error: unknown): string | null {
  return error instanceof Error ? error.message : null
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-5 px-5 py-6 lg:px-6">
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  )
}

/**
 * One tattoo piece, whole: where it stands, what it's worth and what's owed, every appointment in
 * it and every payment against it. Opened from the projects board, the calendar and the customer
 * card as an interactive Side Sheet (or bottom sheet on mobile).
 */
export function ProjectPanel({
  projectId,
  onClose,
  onSelectAppointment,
}: {
  projectId: string | null
  onClose: () => void
  onSelectAppointment?: (appointmentId: string) => void
}) {
  const isMobile = useIsMobile()
  const { details, update, move, attach, book } = useProjectDetails(projectId)
  const directory = useStaffDirectory()
  const finance = useProjectFinance(projectId)
  const apptMutations = useAppointmentMutations()
  const [draft, setDraft] = useState<ProjectDraft | null>(null)
  const [invalid, setInvalid] = useState<{ field: DraftField; message: string } | null>(null)
  const [losing, setLosing] = useState(false)
  const [booking, setBooking] = useState(false)
  const [internalSelectedApptId, setInternalSelectedApptId] = useState<string | null>(null)
  const [customBookingValues, setCustomBookingValues] = useState<Partial<AppointmentFormValues> | null>(null)

  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments,
    queryFn: () => getAppointments(),
    enabled: Boolean(internalSelectedApptId),
  })
  const internalSelectedAppt = internalSelectedApptId
    ? (appointmentsQuery.data?.find((a) => a.id === internalSelectedApptId) ?? null)
    : null

  const project = details.data
  const now = new Date()
  const summary = project ? summarizeProject(project, finance.data, now) : null
  // Stable per project: the wizard resets its fields whenever `initialValues` changes identity, so a
  // fresh object on every render (any refetch) would wipe what staff are typing.
  const bookingValues = useMemo(() => (project ? projectBookingValues(project) : null), [project])
  const effectiveBookingValues = customBookingValues ?? bookingValues

  const stopEditing = () => {
    setDraft(null)
    setInvalid(null)
    update.reset()
  }
  const changeDraft = (field: DraftField, value: string) => {
    setDraft((current) => current && { ...current, [field]: value })
    if (invalid?.field === field) setInvalid(null)
  }
  const save = () => {
    if (!draft) return
    const result = parseDraft(draft)
    if (!result.ok) return setInvalid({ field: result.field, message: result.message })
    update.mutate(result.values, { onSuccess: stopEditing })
  }
  const edit = draft ? { draft, invalidField: invalid?.field ?? null, onDraftChange: changeDraft } : null

  const handleSelectAppointment = (appointmentId: string) => {
    if (onSelectAppointment) {
      onSelectAppointment(appointmentId)
    } else {
      setInternalSelectedApptId(appointmentId)
    }
  }

  return (
    <>
      <Sheet
        open={Boolean(projectId)}
        onOpenChange={(open) => {
          if (open) return
          stopEditing()
          onClose()
        }}
      >
        <SheetContent
          side={isMobile ? 'bottom' : 'left'}
          dir="rtl"
          className={cn(
            'gap-0 p-0 font-assistant outline-none bg-background shadow-2xl flex flex-col',
            isMobile
              ? 'max-h-[92svh] rounded-t-2xl border-t border-border'
              : 'h-svh w-full sm:max-w-xl md:max-w-2xl lg:max-w-[40rem] xl:max-w-[44rem] border-s border-border',
          )}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{project ? project.title || 'פרויקט' : 'פרויקט'}</SheetTitle>
            <SheetDescription>{project ? project.customer.name || 'לקוח ללא שם' : 'פרטי פרויקט'}</SheetDescription>
          </SheetHeader>

          {details.isLoading && <PanelSkeleton />}
          {details.isError && !project && (
            <p className="m-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{errorText(details.error) ?? 'טעינת הפרויקט נכשלה.'}</p>
          )}
      {project && summary && (
        <>
          <form
            aria-label={draft ? 'עריכת פרטי הפרויקט' : undefined}
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault()
              save()
            }}
            onKeyDown={(event) => {
              // Esc while editing cancels the edit; it shouldn't also close the whole panel.
              if (event.key !== 'Escape' || !draft) return
              event.stopPropagation()
              stopEditing()
            }}
          >
            <ProjectPanelHeader
              project={project}
              now={now}
              draft={draft}
              invalidField={invalid?.field ?? null}
              onDraftChange={changeDraft}
              onEdit={() => setDraft(draftFrom(project))}
            />

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="flex flex-col gap-6 px-5 pt-5 pb-6 lg:px-6">
                <ProjectFacts project={project} summary={summary} finance={finance.data} edit={edit} />

                <Tabs dir='rtl' defaultValue="sessions" className="w-full gap-4">
                  <TabsList className="h-10 rounded-xl bg-muted/60 p-1">
                    <TabsTrigger value="sessions" className="gap-2 text-xs font-bold data-[state=active]:bg-card">
                      <span>תורים וסשנים</span>
                      <span className="rounded-full bg-muted-foreground/15 px-2 py-0.5 text-2xs font-bold text-foreground">
                        {summary.appointments.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="gap-2 text-xs font-bold data-[state=active]:bg-card">
                      <span>תשלומים ופיננסים</span>
                      <span className="rounded-full bg-muted-foreground/15 px-2 py-0.5 text-2xs font-bold text-foreground">
                        {finance.data?.payments.length ?? 0}
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="sessions" className="mt-0 focus-visible:outline-none">
                    <ProjectSessions
                      appointments={summary.appointments}
                      project={project}
                      isMoving={move.isPending}
                      onMove={(appointmentId, target) => move.mutate({ appointmentId, target })}
                      isAttaching={attach.isPending}
                      onAttach={(appointmentId) => attach.mutate(appointmentId)}
                      onBook={() => {
                        book.reset()
                        setCustomBookingValues(null)
                        setBooking(true)
                      }}
                      onSelectAppointment={handleSelectAppointment}
                    />
                  </TabsContent>

                  <TabsContent value="payments" className="mt-0 focus-visible:outline-none">
                    <ProjectPayments
                      finance={finance.data}
                      isLoading={finance.isLoading}
                      error={errorText(finance.error)}
                      appointments={summary.appointments}
                      onSelectAppointment={handleSelectAppointment}
                    />
                  </TabsContent>
                </Tabs>
                {(move.error || attach.error) && (
                  <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{errorText(move.error ?? attach.error)}</p>
                )}
              </div>
            </div>

            {draft ? (
              <ProjectEditFooter
                error={invalid?.message ?? errorText(update.error)}
                canSave={isDraftDirty(draft, project)}
                isSaving={update.isPending}
                onCancel={stopEditing}
              />
            ) : (
              project.canManage && <ProjectLifecycleFooter project={project} onMarkLost={() => setLosing(true)} />
            )}
          </form>
          {/* Outside the form: these portal out of the DOM, but their events would still bubble through the React tree into this form. */}
          {losing && <MarkProjectLostDialog projectId={project.id} projectTitle={project.title} open onOpenChange={setLosing} />}
          {/* The calendar's booking wizard, started inside this project: customer, artist and piece filled in. */}
          <CreateAppointmentDialog
            open={booking}
            onOpenChange={(open) => {
              setBooking(open)
              if (!open) setCustomBookingValues(null)
            }}
            staff={directory.staff.data ?? []}
            googleConnections={directory.googleConnections.data ?? []}
            initialValues={effectiveBookingValues}
            onSave={(values) =>
              book.mutate(values, {
                onSuccess: () => {
                  setBooking(false)
                  setCustomBookingValues(null)
                },
              })
            }
            isSaving={book.isPending}
            error={errorText(book.error)}
          />
        </>
      )}
        </SheetContent>
      </Sheet>

      {internalSelectedAppt && (
        <EditAppointmentSheet
          appointment={internalSelectedAppt}
          onOpenChange={(open) => {
            if (!open) setInternalSelectedApptId(null)
          }}
          staff={directory.staff.data ?? []}
          googleConnections={directory.googleConnections.data ?? []}
          onSave={(values) =>
            apptMutations.update.mutate(
              { id: internalSelectedAppt.id, body: values },
              { onSuccess: () => setInternalSelectedApptId(null) },
            )
          }
          isSaving={apptMutations.update.isPending}
          error={errorText(apptMutations.update.error)}
          onSendQuote={(quote) =>
            apptMutations.sendQuote.mutate({ appointmentId: internalSelectedAppt.id, ...quote })
          }
          isSendingQuote={apptMutations.sendQuote.isPending}
          onDelete={(id) =>
            apptMutations.remove.mutate(id, {
              onSuccess: () => setInternalSelectedApptId(null),
            })
          }
          isDeleting={apptMutations.remove.isPending}
          onScheduleNextSession={(session) => {
            setInternalSelectedApptId(null)
            book.reset()
            setCustomBookingValues(nextSessionValues(session))
            setBooking(true)
          }}
          onContinueToTattoo={(consultation) => {
            setInternalSelectedApptId(null)
            book.reset()
            setCustomBookingValues(tattooAfterConsultationValues(consultation))
            setBooking(true)
          }}
        />
      )}
    </>
  )
}
