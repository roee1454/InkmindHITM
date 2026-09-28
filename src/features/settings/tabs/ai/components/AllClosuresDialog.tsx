import React, { useMemo, useState } from 'react'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
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
      size="lg"
      title="ימי סגירה"
      description={`${groups.length} מועדים שבהם הבוט לא מציע תורים.`}
      footer={
        <DialogActions
          start={
            <span className="text-xs text-muted-foreground">
              {filteredGroups.length === groups.length ? `${groups.length} מועדים` : `${filteredGroups.length} מתוך ${groups.length}`}
            </span>
          }
        >
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false)
              onAddNew()
            }}
            className="gap-1.5"
          >
            <Plus size={14} />
            הוספה
          </Button>
        </DialogActions>
      }
    >
      <div className="flex flex-col gap-3">
        <SearchInput size="sm" variant="card" placeholder="חיפוש לפי שם או תאריך (פסח, 2026-10)…" value={search} onChange={setSearch} />

        <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
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

      </div>
    </ResponsiveDialog>
  )
}

