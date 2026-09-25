import React, { useMemo, useState } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import {
  Edit3,
  Trash2,
  CalendarDays,
  Repeat,
  Plus,
} from '@/components/ui/icon'
import type { ClosureGroup } from '../utils/closureSorting'

export interface AllClosuresDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: ClosureGroup[]
  onEditGroup: (group: ClosureGroup) => void
  onDeleteGroup: (group: ClosureGroup) => void
  onAddNew: () => void
}

export const AllClosuresDialog: React.FC<AllClosuresDialogProps> = ({
  open,
  onOpenChange,
  groups,
  onEditGroup,
  onDeleteGroup,
  onAddNew,
}) => {
  const [search, setSearch] = useState('')

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(
      (g) =>
        g.reason.toLowerCase().includes(q) ||
        g.dates.some((d) => d.includes(q)),
    )
  }, [groups, search])

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`כל המועדים וימי הסגירה (${groups.length})`}
      description="צפייה, חיפוש, עריכה ומחיקה של ימי חופשה וסגירת הסטודיו."
    >
      <div className="flex flex-col gap-3.5 py-1 font-assistant" dir="rtl">
        {/* Search & Add Bar */}
        <div className="flex items-center gap-2">
          <SearchInput
            size="sm"
            variant="card"
            containerClassName="flex-1"
            className="h-9 text-xs"
            placeholder="חיפוש מועד או תאריך (למשל: פסח, 2026-10)..."
            value={search}
            onChange={setSearch}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onOpenChange(false)
              onAddNew()
            }}
            className="gap-1 font-bold shrink-0 h-9"
          >
            <Plus size={14} />
            <span>הוספה</span>
          </Button>
        </div>

        {/* Closures Scrollable List */}
        <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-border bg-card divide-y divide-border">
          {filteredGroups.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
              {search.trim() ? 'לא נמצאו מועדים התואמים לחיפוש' : 'אין ימי סגירה שמורים'}
            </div>
          ) : (
            filteredGroups.map((g) => {
              const years = new Set(g.dates.map((d) => d.slice(0, 4)))
              return (
                <div
                  key={g.key}
                  className="flex items-center justify-between p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1 pl-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">
                        {g.reason}
                      </span>
                      {g.isRecurring && (
                        <span className="pill gap-1 bg-primary/10 text-primary">
                          <Repeat size={10} /> לצמיתות
                        </span>
                      )}
                      {g.source === 'hebcal' ? (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-semibold text-muted-foreground">
                          חג
                        </span>
                      ) : (
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">
                          התאמה אישית
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium tabular-nums" dir="ltr">
                      {g.dates.length > 1 ? (
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} /> {years.size} שנים ({g.dates.length} ימים)
                        </span>
                      ) : (
                        <span>{g.dates[0]}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditGroup(g)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                      title="עריכת מועד"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteGroup(g)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                      title="מחיקת מועד"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-between items-center px-1 text-2xs text-muted-foreground">
          <span>
            מציג {filteredGroups.length} מתוך {groups.length} מועדים
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-7"
          >
            סגור
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}

