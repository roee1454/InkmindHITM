import React, { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkingHoursWindow } from '@/lib/working-hours'
import type {
  ApiAppointment,
  ApiExternalBusyPeriod,
  ApiGoogleConnection,
  AppointmentFormValues,
  AppointmentStatus,
} from './types'
import { CreateAppointmentDialog } from './components/CreateAppointmentDialog'
import { EditAppointmentDialog } from './components/EditAppointmentDialog'
import { AppointmentTable } from './components/AppointmentTable'
import { CalendarHeader } from './components/CalendarHeader'
import { CalendarFilters } from './components/CalendarFilters'
import { CalendarGrid } from './components/CalendarGrid'
import { toYmd } from './date-utils'
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getGoogleCalendarConnections,
  sendPriceQuoteToCustomer,
} from './server/appointments'
import { getCurrentStaffInfo, getStaffList, type StaffMember, type CurrentStaffInfo } from '@/features/settings/server/staff'
import { getWorkingHours } from '@/features/settings/server/profiles'
import { useCalendarUiStore } from './store/calendarUiStore'
import { useIsMobile } from '@/hooks/use-media-query'

export const CalendarPage: React.FC = () => {
  const queryClient = useQueryClient()
  const {
    viewMode,
    calendarMode,
    anchorDate,
    selectedStatus,
    selectedArtist,
    hasInitializedDefaultArtist,
    isCreating,
    createSlot,
    editingAppointment,
    formError,
    setViewMode,
    setCalendarMode,
    setAnchorDate,
    setSelectedStatus,
    setSelectedArtist,
    setHasInitializedDefaultArtist,
    setIsCreating,
    setCreateSlot,
    setEditingAppointment,
    setFormError,
    openCreate,
    openEdit,
  } = useCalendarUiStore()

  // Derived, not written back to the store: seven ~40px day columns are unusable on a phone,
  // so `week` renders as `day` there. Keeping the stored value untouched means rotating a
  // phone — or opening the same persisted store on a desktop — never strands a `day` mode
  // where a week was intended.
  const isMobile = useIsMobile()
  const effectiveCalendarMode = isMobile ? 'day' : calendarMode
  const effectiveViewMode = isMobile ? 'calendar' : viewMode

  const { data: currentStaff } = useQuery<CurrentStaffInfo>({
    queryKey: ['currentStaff'],
    queryFn: () => getCurrentStaffInfo(),
  })

  // Set filter to current logged-in staff on initial entry
  useEffect(() => {
    if (currentStaff?.id && !hasInitializedDefaultArtist) {
      setSelectedArtist(currentStaff.id)
      setHasInitializedDefaultArtist(true)
    }
  }, [currentStaff, hasInitializedDefaultArtist])

  const {
    data: appointments = [],
    isLoading: loadingAppointments,
    error: appointmentsError,
  } = useQuery<ApiAppointment[]>({
    queryKey: ['appointments'],
    queryFn: () => getAppointments(),
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: staff = [],
    isLoading: loadingStaff,
    error: staffError,
  } = useQuery<StaffMember[]>({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: googleConnections = [] } = useQuery<ApiGoogleConnection[]>({
    queryKey: ['google-calendar-connections'],
    queryFn: () => getGoogleCalendarConnections(),
    staleTime: 5 * 60 * 1000,
  })

  const busyPeriods: ApiExternalBusyPeriod[] = []

  const { data: selectedArtistWorkingHours = [] } = useQuery<WorkingHoursWindow[]>({
    queryKey: ['working-hours', selectedArtist],
    queryFn: () => getWorkingHours({ data: { staffId: selectedArtist } }),
    enabled: selectedArtist !== 'all',
  })

  // Mutations
  const createAppointmentMutation = useMutation({
    mutationFn: (body: AppointmentFormValues) =>
      createAppointment({
        data: {
          customerId: body.customerId,
          chatId: body.chatId,
          leadName: body.leadName,
          leadPhone: body.leadPhone,
          date: body.date,
          timeSlot: body.timeSlot,
          staffId: body.staffId,
          durationHours: body.durationHours,
          tattooDescription: body.tattooDescription,
          priceIls: body.priceIls,
          status: body.status,
          depositPaid: body.depositPaid,
          notes: body.notes,
          allowException: body.allowException,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
      setIsCreating(false)
      setCreateSlot(null)
      setFormError(null)
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : 'שגיאה ביצירת התור')
    },
  })

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AppointmentFormValues> }) =>
      updateAppointment({
        data: {
          id,
          customerId: body.customerId,
          chatId: body.chatId,
          leadName: body.leadName,
          leadPhone: body.leadPhone,
          date: body.date,
          timeSlot: body.timeSlot,
          staffId: body.staffId,
          durationHours: body.durationHours,
          tattooDescription: body.tattooDescription,
          priceIls: body.priceIls,
          status: body.status,
          depositPaid: body.depositPaid,
          notes: body.notes,
          allowException: body.allowException,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
      setEditingAppointment(null)
      setFormError(null)
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : 'שגיאה בעדכון התור')
    },
  })

  const deleteAppointmentMutation = useMutation({
    mutationFn: (id: string) => deleteAppointment({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
    },
  })

  const sendQuoteMutation = useMutation({
    mutationFn: (body: { appointmentId: string; priceIls: number; depositAmount: number }) =>
      sendPriceQuoteToCustomer({ data: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setEditingAppointment(null)
      setFormError(null)
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : 'שליחת הצעת המחיר נכשלה')
    },
  })

  const loading = loadingAppointments || loadingStaff
  const error = (appointmentsError as Error)?.message || (staffError as Error)?.message || null

  const handleCreateSave = (data: AppointmentFormValues) => {
    createAppointmentMutation.mutate(data)
  }

  const handleEditSave = (data: AppointmentFormValues) => {
    if (!editingAppointment) return
    updateAppointmentMutation.mutate({ id: editingAppointment.id, body: data })
  }

  const handleStatusChange = (id: string, status: AppointmentStatus) => {
    updateAppointmentMutation.mutate({ id, body: { status } })
  }

  const handleDelete = (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את התור הזה?')) {
      deleteAppointmentMutation.mutate(id)
    }
  }

  const handleSendQuote = (priceIls: number, depositAmount: number) => {
    if (!editingAppointment) return
    sendQuoteMutation.mutate({ appointmentId: editingAppointment.id, priceIls, depositAmount })
  }



  const filterCounts = {
    all: appointments.length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    no_show: appointments.filter((a) => a.status === 'no_show').length,
  }

  const filteredAppointments = appointments
    .filter((a) => selectedArtist === 'all' || a.staffId === selectedArtist)
    .filter((a) => selectedStatus === 'all' || a.status === selectedStatus)
    .sort((a, b) => `${b.date}${b.timeSlot}`.localeCompare(`${a.date}${a.timeSlot}`))

  const filteredBusyPeriods = busyPeriods.filter((b) => selectedArtist === 'all' || b.staffId === selectedArtist)

  const artistAvatars: Record<string, string> = {}
  for (const conn of googleConnections) {
    if (conn.status === 'connected' && conn.googleAccountPicture) {
      artistAvatars[conn.staffId] = conn.googleAccountPicture
    }
  }
  for (const member of staff) {
    if (member.avatar && !artistAvatars[member.id]) {
      artistAvatars[member.id] = member.avatar
    }
  }

  const todayString = toYmd(new Date())
  const todayCount = appointments.filter((a) => a.date === todayString && a.status !== 'cancelled').length
  const upcomingCount = appointments.filter((a) => a.status === 'confirmed' && a.date >= todayString).length

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 md:space-y-6 text-right font-assistant py-3 md:py-6" dir="rtl">
      <CalendarHeader
        todayCount={todayCount}
        upcomingCount={upcomingCount}
        onNewAppointment={() => openCreate()}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold px-4 py-3 rounded-xl">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Filters Toolbar */}
      <CalendarFilters
        selectedStatus={selectedStatus}
        onSelectedStatusChange={setSelectedStatus}
        selectedArtist={selectedArtist}
        onSelectedArtistChange={setSelectedArtist}
        filterCounts={filterCounts}
        staff={staff}
        googleConnections={googleConnections}
      />

      {loading && !appointments.length ? (
        <div className="h-44 flex items-center justify-center text-xs text-muted-foreground font-semibold">
          טוען תורים…
        </div>
      ) : effectiveViewMode === 'calendar' ? (
        <div className="space-y-4">
          <CalendarGrid
            mode={effectiveCalendarMode}
            onModeChange={setCalendarMode}
            anchorDate={anchorDate}
            onAnchorDateChange={setAnchorDate}
            appointments={filteredAppointments}
            busyPeriods={filteredBusyPeriods}
            artistAvatars={artistAvatars}
            workingHours={selectedArtist !== 'all' ? selectedArtistWorkingHours : null}
            onSelectAppointment={openEdit}
            onSelectSlot={(date, timeSlot) => openCreate({ date, timeSlot })}
          />
        </div>
      ) : (
        <>
          {filteredAppointments.length > 0 ? (
            <AppointmentTable
              appointments={filteredAppointments}
              onEdit={openEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground font-semibold border border-dashed border-border rounded-2xl">
              אין תורים שעונים לסינון שנבחר
            </div>
          )}
        </>
      )}

      <CreateAppointmentDialog
        open={isCreating}
        onOpenChange={(open) => {
          setIsCreating(open)
          if (!open) setCreateSlot(null)
        }}
        staff={staff}
        googleConnections={googleConnections}
        initialDate={createSlot?.date}
        initialTimeSlot={createSlot?.timeSlot}
        onSave={handleCreateSave}
        isSaving={createAppointmentMutation.isPending}
        error={formError}
      />

      <EditAppointmentDialog
        appointment={editingAppointment}
        onOpenChange={(open) => !open && setEditingAppointment(null)}
        staff={staff}
        googleConnections={googleConnections}
        onSave={handleEditSave}
        isSaving={updateAppointmentMutation.isPending}
        error={formError}
        onSendQuote={handleSendQuote}
        isSendingQuote={sendQuoteMutation.isPending}
      />
    </div>
  )
}

export default CalendarPage
