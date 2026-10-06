import { useEffect, useMemo, useRef, useState } from 'react'
import { Needle, PencilLine } from '@/components/ui/icon'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/lib/utils'
import { formatPhoneForDisplay } from '@/lib/phone'
import { formatDayTitle, fromYmd } from '../utils/date-utils'
import { matchesQuery } from '../utils/filter-appointments'
import { STATUS_LABELS, STATUS_STYLES } from '../types'
import type { ApiAppointment } from '../types'

const MAX_RESULTS = 6

interface CalendarSearchProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  appointments: ApiAppointment[]
  onSelectAppointment: (appointment: ApiAppointment) => void
  onJumpToDate: (date: Date) => void
  className?: string
}

/**
 * Search across every appointment, with instant results that jump the grid to the match's date
 * and open it. This is the only way the calendar surfaces matches outside the visible range —
 * the separate "found N on other dates" strip it replaced (track-b B6.8) was a second mechanism
 * for the same job.
 */
export function CalendarSearch({
  searchQuery,
  onSearchQueryChange,
  appointments,
  onSelectAppointment,
  onJumpToDate,
  className,
}: CalendarSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const query = searchQuery.trim().toLowerCase()
  const results = useMemo(
    () => (query ? appointments.filter((a) => matchesQuery(a, query)).slice(0, MAX_RESULTS) : []),
    [query, appointments],
  )

  const select = (appointment: ApiAppointment) => {
    setIsOpen(false)
    onJumpToDate(fromYmd(appointment.date))
    onSelectAppointment(appointment)
  }

  return (
    <SearchInput
      containerRef={containerRef}
      containerClassName={className}
      size="default"
      variant="card"
      placeholder="חיפוש לפי לקוח, טלפון, קעקוע או מקעקע..."
      value={searchQuery}
      onChange={onSearchQueryChange}
      onImmediateChange={(value) => setIsOpen(Boolean(value.trim()))}
      onFocus={() => setIsOpen(Boolean(searchQuery.trim()))}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setIsOpen(false)
      }}
      onClear={() => setIsOpen(false)}
    >
      {isOpen && query.length > 0 && (
        <div className="absolute start-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs font-medium text-muted-foreground">
              לא נמצאו פגישות התואמות ל-&quot;<span className="font-bold text-foreground">{searchQuery}</span>&quot;
            </div>
          ) : (
            <div className="max-h-[340px] divide-y divide-border/50 overflow-y-auto">
              {results.map((appointment) => {
                const isSketch = appointment.type === 'sketch'
                return (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => select(appointment)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 p-3 text-right transition-colors active:bg-muted/80 hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-lg border',
                          isSketch ? 'border-accent-ink/20 bg-accent-ink/10 text-accent-ink' : 'border-border bg-muted text-foreground',
                        )}
                      >
                        {isSketch ? <PencilLine size={15} /> : <Needle size={15} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-extrabold text-foreground">
                            {appointment.leadName || 'לקוח ללא שם'}
                          </span>
                          {appointment.leadPhone && (
                            <span dir="ltr" className="text-2xs text-muted-foreground">
                              {formatPhoneForDisplay(appointment.leadPhone)}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {appointment.style || (isSketch ? 'פגישת ייעוץ' : 'סשן קעקוע')}
                          {appointment.staffName && ` · ${appointment.staffName}`}
                        </span>
                      </span>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-lg border border-border bg-muted/60 px-2 py-0.5 text-xs font-bold tabular-nums text-foreground">
                        {formatDayTitle(fromYmd(appointment.date))} · {appointment.timeSlot}
                      </span>
                      <span className={cn('rounded-lg border px-2 py-0.5 text-2xs font-bold', STATUS_STYLES[appointment.status])}>
                        {STATUS_LABELS[appointment.status]}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </SearchInput>
  )
}
