import React, { useEffect, useState } from 'react'
import { Pagination } from '@/components/ui/pagination'
import { AppointmentTable } from './AppointmentTable'
import type { ApiAppointment, AppointmentStatus } from '../types'

const ITEMS_PER_PAGE = 10

interface AppointmentListViewProps {
  appointments: ApiAppointment[]
  /** Shown in the empty state so a fruitless search says so, instead of "no appointments". */
  searchQuery: string
  onEdit: (appointment: ApiAppointment) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: AppointmentStatus) => void
}

/** The calendar's `list` mode: every appointment matching the filters, newest first. */
export function AppointmentListView({ appointments, searchQuery, onEdit, onDelete, onStatusChange }: AppointmentListViewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  useEffect(() => {
    setCurrentPage(1)
  }, [appointments.length, searchQuery])

  const totalPages = Math.ceil(appointments.length / ITEMS_PER_PAGE) || 1
  const page = Math.min(Math.max(1, currentPage), totalPages)
  const pageSlice = appointments.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  if (appointments.length === 0) {
    return (
      <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border text-sm font-semibold text-muted-foreground">
        {searchQuery.trim() ? `לא נמצאו תורים התואמים לחיפוש "${searchQuery}"` : 'אין תורים שעונים לסינון שנבחר'}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <AppointmentTable appointments={pageSlice} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(next) => React.startTransition(() => setCurrentPage(next))}
        totalItems={appointments.length}
        itemsPerPage={ITEMS_PER_PAGE}
        itemLabel="תורים"
      />
    </div>
  )
}
