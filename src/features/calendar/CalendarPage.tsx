import React, { useEffect, useMemo, useState } from 'react'
import { Warning, Search } from '@/components/ui/icon'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import { Button } from '@/components/ui/button'
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
import { CalendarSkeleton } from './components/CalendarSkeleton'
import { toYmd, isSameMonth, visibleDays } from './utils/date-utils'
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getGoogleCalendarConnections,
  sendPriceQuoteToCustomer,
} from './server/appointments'
import { phoneMatchesQuery, toCanonicalE164Phone } from '@/lib/phone'
import { getCurrentStaffInfo, getStaffList   } from '@/features/settings/server/staff'
import type {StaffMember, CurrentStaffInfo} from '@/features/settings/server/staff';
import { getWorkingHours } from '@/features/settings/server/profiles'
import { useCalendarUiStore } from './store/calendarUiStore'
import { useIsMobile } from '#/hooks/useMediaQuery'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/ToastProvider'

const ITEMS_PER_PAGE = 10

export const CalendarPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    viewMode,
    calendarMode,
    anchorDate,
    selectedStatus,
    selectedArtist,
    hasInitializedDefaultArtist,
    searchQuery,
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
    setSearchQuery,
    setIsCreating,
    setCreateSlot,
    setEditingAppointment,
    setFormError,
    openCreate,
    openEdit,
  } = useCalendarUiStore()

  const [createInitialValues, setCreateInitialValues] = useState<Partial<AppointmentFormValues> | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedArtist, selectedStatus, searchQuery])

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

  const handleContinueToTattoo = (sketch: ApiAppointment) => {
    if (sketch.status !== 'completed') {
      updateAppointmentMutation.mutate({ id: sketch.id, body: { status: 'completed' } })
    }
    setEditingAppointment(null)
    setCreateInitialValues({
      // Same project as the consultation: the session is its follow-up, not a new piece of work.
      projectId: sketch.projectId,
      customerId: sketch.customerId,
      chatId: sketch.chatId,
      leadName: sketch.leadName ?? '',
      leadPhone: sketch.leadPhone ?? '',
      type: 'tattoo',
      staffId: sketch.staffId,
      durationMinutes: 180,
      tattooDescription: sketch.style ?? '',
      notes: sketch.hasDeposit && sketch.depositAmount ? `שולמה מקדמת סקיצה בסך ₪${sketch.depositAmount} לקיזוז` : '',
      status: 'pending',
      priceMinIls: null,
      priceMaxIls: null,
      depositAmount: sketch.hasDeposit ? sketch.depositAmount : null,
      depositPaid: false,
    })
    setIsCreating(true)
  }

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

  // The mobile top bar's "+" action navigates here with `?new=1` since it lives outside this
  // component's tree — pick it up once, then clear it so back-navigation doesn't reopen it.
  useEffect(() => {
    const search = location.search as Record<string, unknown> | undefined
    if (search?.new === '1') {
      const fromSketchId = search.fromSketchId as string | undefined
      if (fromSketchId && appointments.length > 0) {
        const sketch = appointments.find((a) => a.id === fromSketchId)
        if (sketch) {
          handleContinueToTattoo(sketch)
          navigate({ to: '/dashboard/calendar', search: {}, replace: true })
          return
        }
      }
      openCreate()
      navigate({ to: '/dashboard/calendar', search: {}, replace: true })
    }
  }, [location.search, appointments])

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
          projectId: body.projectId ?? null,
          customerId: body.customerId,
          chatId: body.chatId,
          leadName: body.leadName,
          leadPhone: body.leadPhone ? toCanonicalE164Phone(body.leadPhone) : '',
          date: body.date,
          timeSlot: body.timeSlot,
          staffId: body.staffId,
          type: body.type,
          durationMinutes: body.durationMinutes,
          tattooDescription: body.tattooDescription,
          priceMinIls: body.priceMinIls,
          priceMaxIls: body.priceMaxIls,
          depositAmount: body.depositAmount,
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
      setCreateInitialValues(null)
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
          leadPhone: body.leadPhone !== undefined ? (body.leadPhone ? toCanonicalE164Phone(body.leadPhone) : '') : undefined,
          date: body.date,
          timeSlot: body.timeSlot,
          staffId: body.staffId,
          durationMinutes: body.durationMinutes,
          tattooDescription: body.tattooDescription,
          priceMinIls: body.priceMinIls,
          priceMaxIls: body.priceMaxIls,
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
      setFormError(formatDatabaseError(err, 'שגיאה בעדכון התור'))
    },
  })

  const deleteAppointmentMutation = useMutation({
    mutationFn: (id: string) => deleteAppointment({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
      setEditingAppointment(null)
      toast('התור נמחק', 'התור וכל הנתונים המקושרים הוסרו בהצלחה.', 'success')
    },
    onError: (err: unknown) => {
      toast('שגיאה במחיקת התור', formatDatabaseError(err, 'מחיקת התור נכשלה.'), 'error')
    },
  })

  const sendQuoteMutation = useMutation({
    mutationFn: (body: { appointmentId: string; priceMinIls: number; priceMaxIls: number; depositAmount: number; durationMinutes: number }) =>
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

  const handleSendQuote = (priceMinIls: number, priceMaxIls: number, depositAmount: number, durationMinutes: number) => {
    if (!editingAppointment) return
    sendQuoteMutation.mutate({ appointmentId: editingAppointment.id, priceMinIls, priceMaxIls, depositAmount, durationMinutes })
  }



  const filterCounts = {
    all: appointments.length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    no_show: appointments.filter((a) => a.status === 'no_show').length,
  }

  const query = searchQuery.trim().toLowerCase()

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((a) => selectedArtist === 'all' || a.staffId === selectedArtist)
      .filter((a) => selectedStatus === 'all' || a.status === selectedStatus)
      .filter((a) => {
        if (!query) return true
        const leadName = (a.leadName || '').toLowerCase()
        const style = (a.style || '').toLowerCase()
        const staffName = (a.staffName || '').toLowerCase()
        const notes = (a.notes || '').toLowerCase()
        const date = (a.date || '').toLowerCase()
        const timeSlot = (a.timeSlot || '').toLowerCase()
        const typeHebrew = a.type === 'sketch' ? 'סקיצה ייעוץ' : 'קעקוע'
        return (
          leadName.includes(query) ||
          phoneMatchesQuery(a.leadPhone, query) ||
          style.includes(query) ||
          staffName.includes(query) ||
          notes.includes(query) ||
          date.includes(query) ||
          timeSlot.includes(query) ||
          typeHebrew.includes(query)
        )
      })
      .sort((a, b) => `${b.date}${b.timeSlot}`.localeCompare(`${a.date}${a.timeSlot}`))
  }, [appointments, selectedArtist, selectedStatus, query])

  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE)
  const safePage = Math.min(Math.max(1, currentPage), totalPages || 1)
  const paginatedAppointments = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE
    return filteredAppointments.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredAppointments, safePage])

  // Detect matches that fall outside current calendar date view
  const outsideMatches = useMemo(() => {
    if (!query || filteredAppointments.length === 0 || effectiveViewMode !== 'calendar') return []
    const currentYmd = toYmd(anchorDate)

    return filteredAppointments.filter((a) => {
      if (effectiveCalendarMode === 'day') {
        return a.date !== currentYmd
      }
      if (effectiveCalendarMode === 'week') {
        const days = visibleDays(anchorDate, 7).map(toYmd)
        return !days.includes(a.date)
      }
      // month view
      const [y, m, d] = a.date.split('-').map(Number)
      if (!y || !m || !d) return false
      return !isSameMonth(new Date(y, m - 1, d), anchorDate)
    })
  }, [query, filteredAppointments, effectiveViewMode, effectiveCalendarMode, anchorDate])

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

  const handleViewModeChange = (mode: 'calendar' | 'table') => {
    React.startTransition(() => {
      setViewMode(mode)
    })
  }

  const handleCalendarModeChange = (mode: 'day' | 'week' | 'month') => {
    React.startTransition(() => {
      setCalendarMode(mode)
    })
  }

  const handlePageChange = (page: number) => {
    React.startTransition(() => {
      setCurrentPage(page)
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[18px] font-assistant lg:gap-6" dir="rtl">
      <CalendarHeader
        todayCount={todayCount}
        upcomingCount={upcomingCount}
        onNewAppointment={() => openCreate()}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          <Warning size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Filters Toolbar */}
      <CalendarFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onSelectedStatusChange={setSelectedStatus}
        selectedArtist={selectedArtist}
        onSelectedArtistChange={setSelectedArtist}
        filterCounts={filterCounts}
        staff={staff}
        googleConnections={googleConnections}
        appointments={appointments}
        onSelectAppointment={openEdit}
        onJumpToDate={(date) => setAnchorDate(date)}
      />

      {/* Outside matches hint when search is active in calendar view */}
      {query && outsideMatches.length > 0 && effectiveViewMode === 'calendar' && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-primary/25 bg-primary/5 text-xs font-assistant animate-in fade-in">
          <span className="text-muted-foreground font-medium">
            נמצאו {outsideMatches.length} {outsideMatches.length === 1 ? 'פגישה' : 'פגישות'} בתאריכים אחרים:
          </span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {outsideMatches.slice(0, 5).map((appt) => {
              const [y, m, d] = appt.date.split('-').map(Number)
              return (
                <button
                  key={appt.id}
                  type="button"
                  onClick={() => {
                    if (y && m && d) setAnchorDate(new Date(y, m - 1, d))
                    openEdit(appt)
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border hover:border-primary/50 text-foreground font-bold hover:text-primary transition-all cursor-pointer shadow-xs text-xs"
                >
                  <span>{appt.leadName || 'פגישה'}</span>
                  <span className="font-assistant text-muted-foreground text-micro">
                    ({appt.date.split('-').reverse().slice(0, 2).join('/')})
                  </span>
                </button>
              )
            })}
            {outsideMatches.length > 5 && (
              <span className="text-muted-foreground text-micro">ועוד {outsideMatches.length - 5}...</span>
            )}
          </div>
        </div>
      )}

      {/* Empty search state in calendar view */}
      {query && filteredAppointments.length === 0 && effectiveViewMode === 'calendar' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card/60 text-sm font-assistant">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search size={16} className="text-primary shrink-0" />
            <span>
              לא נמצאו פגישות התואמות לחיפוש &quot;<strong className="text-foreground">{searchQuery}</strong>&quot;
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="font-bold rounded-xl cursor-pointer"
          >
            נקה חיפוש
          </Button>
        </div>
      )}

      {loading && !appointments.length ? (
        <CalendarSkeleton />
      ) : effectiveViewMode === 'calendar' ? (
        <div className="flex flex-col gap-4">
          <CalendarGrid
            mode={effectiveCalendarMode}
            onModeChange={handleCalendarModeChange}
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
        <div className="flex flex-col gap-4">
          {filteredAppointments.length > 0 ? (
            <>
              <AppointmentTable
                appointments={paginatedAppointments}
                onEdit={openEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={filteredAppointments.length}
                itemsPerPage={ITEMS_PER_PAGE}
                itemLabel="תורים"
              />
            </>
          ) : (
            <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm font-semibold text-muted-foreground">
              {query ? (
                <>
                  <span>לא נמצאו תורים התואמים לחיפוש &quot;{searchQuery}&quot;</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="font-bold rounded-xl mt-1 cursor-pointer"
                  >
                    נקה חיפוש
                  </Button>
                </>
              ) : (
                <span>אין תורים שעונים לסינון שנבחר</span>
              )}
            </div>
          )}
        </div>
      )}

      <CreateAppointmentDialog
        open={isCreating}
        onOpenChange={(open) => {
          setIsCreating(open)
          if (!open) {
            setCreateSlot(null)
            setCreateInitialValues(null)
          }
        }}
        staff={staff}
        googleConnections={googleConnections}
        initialDate={createSlot?.date}
        initialTimeSlot={createSlot?.timeSlot}
        initialValues={createInitialValues}
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
        onDelete={(id) => deleteAppointmentMutation.mutate(id)}
        isDeleting={deleteAppointmentMutation.isPending}
        onContinueToTattoo={handleContinueToTattoo}
        currentStaff={currentStaff}
        projectAppointments={
          editingAppointment?.projectId ? appointments.filter((a) => a.projectId === editingAppointment.projectId) : []
        }
      />
    </div>
  )
}

export default CalendarPage
