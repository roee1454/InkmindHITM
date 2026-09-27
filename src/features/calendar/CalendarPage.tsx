import React, { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Warning } from '@/components/ui/icon'
import { useIsMobile } from '#/hooks/useMediaQuery'
import { useConfirm } from '#/hooks/useConfirm'
import { CalendarGrid } from './components/CalendarGrid'
import { CalendarSkeleton } from './components/CalendarSkeleton'
import { CalendarToolbar } from './components/CalendarToolbar'
import { CreateAppointmentDialog } from './components/CreateAppointmentDialog'
import { EditAppointmentDialog } from './components/EditAppointmentDialog'
import { AppointmentListView } from './components/AppointmentListView'
import { useAppointmentMutations } from './hooks/use-appointment-mutations'
import { useCalendarData } from './hooks/use-calendar-data'
import { useCalendarUiStore } from './store/calendarUiStore'
import { addDays, addMonths, calendarTitle } from './utils/date-utils'
import { countByStatus, filterAppointments } from './utils/filter-appointments'
import { nextSessionValues, tattooAfterConsultationValues } from './utils/follow-up'
import { gridHourRange } from './utils/grid-hours'
import { effectiveViewMode, isGridMode } from './utils/view-mode'
import type { CalendarViewMode } from './utils/view-mode'
import type { ApiAppointment, ApiExternalBusyPeriod, AppointmentFormValues } from './types'
import type { QuoteToSend } from './components/BotQuoteBanner'

const DESKTOP_MODES: CalendarViewMode[] = ['day', 'week', 'month', 'list']
/** Seven ~40px columns don't fit a phone, so week and month aren't offered there. */
const MOBILE_MODES: CalendarViewMode[] = ['day', 'list']

/** Google busy periods aren't fetched yet; the grid already knows how to draw them. */
const BUSY_PERIODS: ApiExternalBusyPeriod[] = []

export const CalendarPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const {
    mode,
    anchorDate,
    selectedStatus,
    selectedArtist,
    hasInitializedDefaultArtist,
    searchQuery,
    isCreating,
    createSlot,
    createInitialValues,
    editingAppointment,
    formError,
    setMode,
    setAnchorDate,
    setSelectedStatus,
    setSelectedArtist,
    setHasInitializedDefaultArtist,
    setSearchQuery,
    setEditingAppointment,
    openCreate,
    closeCreate,
    openEdit,
  } = useCalendarUiStore()

  const { currentStaff, appointments, staff, googleConnections, workingHours, artistAvatars, isLoading, error } =
    useCalendarData(selectedArtist)
  const { create, update, remove, sendQuote, setStatus } = useAppointmentMutations()
  const confirm = useConfirm()

  const deleteWithConfirm = async (id: string) => {
    const confirmed = await confirm({
      title: 'למחוק את התור?',
      description: 'התור וכל הנתונים המקושרים אליו יוסרו.',
      confirmLabel: 'מחיקה',
      variant: 'destructive',
    })
    if (confirmed) remove.mutate(id)
  }

  // Derived, never written back: rotating a phone must not strand a `day` mode where a week was meant.
  const viewMode = effectiveViewMode(mode, isMobile)
  const hourRange = useMemo(() => gridHourRange(workingHours), [workingHours])

  const byArtist = useMemo(
    () => appointments.filter((a) => selectedArtist === 'all' || a.staffId === selectedArtist),
    [appointments, selectedArtist],
  )
  const statusCounts = useMemo(() => countByStatus(byArtist), [byArtist])
  // Narrows the day view's resource columns the same way the artist filter narrows everything else.
  const gridStaff = useMemo(
    () => (selectedArtist === 'all' ? staff : staff.filter((s) => s.id === selectedArtist)),
    [staff, selectedArtist],
  )
  const visible = useMemo(
    () => filterAppointments(appointments, { artistId: selectedArtist, status: selectedStatus, query: searchQuery }),
    [appointments, selectedArtist, selectedStatus, searchQuery],
  )

  const startTattooAfterConsultation = (sketch: ApiAppointment) => {
    if (sketch.status !== 'completed') update.mutate({ id: sketch.id, body: { status: 'completed' } })
    setEditingAppointment(null)
    openCreate({ initialValues: tattooAfterConsultationValues(sketch) })
  }

  // Set the filter to the logged-in artist on first entry.
  useEffect(() => {
    if (currentStaff?.id && !hasInitializedDefaultArtist) {
      setSelectedArtist(currentStaff.id)
      setHasInitializedDefaultArtist(true)
    }
  }, [currentStaff, hasInitializedDefaultArtist])

  // The mobile top bar's "+" navigates here with `?new=1` since it lives outside this tree —
  // pick it up once, then clear it so back-navigation doesn't reopen the dialog.
  useEffect(() => {
    const search = location.search as Record<string, unknown> | undefined
    if (search?.new !== '1') return
    const fromSketchId = search.fromSketchId as string | undefined
    const sketch = fromSketchId ? appointments.find((a) => a.id === fromSketchId) : undefined
    if (fromSketchId && !sketch) return
    if (sketch) startTattooAfterConsultation(sketch)
    else openCreate()
    navigate({ to: '/dashboard/calendar', search: {}, replace: true })
  }, [location.search, appointments])

  const step = (direction: 1 | -1) => {
    if (isMobile || viewMode === 'day') return setAnchorDate(addDays(anchorDate, direction))
    if (viewMode === 'week') return setAnchorDate(addDays(anchorDate, 7 * direction))
    setAnchorDate(addMonths(anchorDate, direction))
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background font-assistant" dir="rtl">
      <CalendarToolbar
        title={calendarTitle(viewMode, anchorDate)}
        mode={viewMode}
        availableModes={isMobile ? MOBILE_MODES : DESKTOP_MODES}
        onModeChange={setMode}
        showNav={isGridMode(viewMode)}
        onStep={step}
        onToday={() => setAnchorDate(new Date())}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        appointments={appointments}
        onSelectAppointment={openEdit}
        onJumpToDate={setAnchorDate}
        selectedArtist={selectedArtist}
        onSelectedArtistChange={setSelectedArtist}
        staff={staff}
        googleConnections={googleConnections}
        selectedStatus={selectedStatus}
        onSelectedStatusChange={setSelectedStatus}
        statusCounts={statusCounts}
        onNewAppointment={() => openCreate()}
      />

      {error && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          <Warning size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {isLoading && appointments.length === 0 ? (
        <CalendarSkeleton />
      ) : viewMode === 'list' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:px-4">
          <AppointmentListView
            appointments={visible}
            searchQuery={searchQuery}
            onEdit={openEdit}
            onDelete={deleteWithConfirm}
            onStatusChange={setStatus}
          />
        </div>
      ) : (
        <CalendarGrid
          mode={viewMode}
          anchorDate={anchorDate}
          onAnchorDateChange={setAnchorDate}
          appointments={visible}
          busyPeriods={BUSY_PERIODS}
          staff={gridStaff}
          artistAvatars={artistAvatars}
          workingHours={workingHours}
          hourRange={hourRange}
          onSelectAppointment={openEdit}
          onSelectSlot={(date, timeSlot, staffId) => openCreate({ slot: { date, timeSlot }, initialValues: staffId ? { staffId } : undefined })}
        />
      )}

      <CreateAppointmentDialog
        open={isCreating}
        onOpenChange={(open) => !open && closeCreate()}
        staff={staff}
        googleConnections={googleConnections}
        initialDate={createSlot?.date}
        initialTimeSlot={createSlot?.timeSlot}
        initialValues={createInitialValues}
        onSave={(data: AppointmentFormValues) => create.mutate(data)}
        isSaving={create.isPending}
        error={formError}
      />

      <EditAppointmentDialog
        appointment={editingAppointment}
        onOpenChange={(open) => !open && setEditingAppointment(null)}
        staff={staff}
        googleConnections={googleConnections}
        onSave={(data: AppointmentFormValues) =>
          editingAppointment && update.mutate({ id: editingAppointment.id, body: data })
        }
        isSaving={update.isPending}
        error={formError}
        onSendQuote={(quote: QuoteToSend) =>
          editingAppointment && sendQuote.mutate({ appointmentId: editingAppointment.id, ...quote })
        }
        isSendingQuote={sendQuote.isPending}
        onDelete={(id) => remove.mutate(id)}
        isDeleting={remove.isPending}
        onContinueToTattoo={startTattooAfterConsultation}
        onScheduleNextSession={(session) => {
          setEditingAppointment(null)
          openCreate({ initialValues: nextSessionValues(session) })
        }}
        currentStaff={currentStaff}
        projectAppointments={
          editingAppointment?.projectId ? appointments.filter((a) => a.projectId === editingAppointment.projectId) : []
        }
      />
    </div>
  )
}

export default CalendarPage
