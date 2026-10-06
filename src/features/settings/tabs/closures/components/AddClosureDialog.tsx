import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getHebcalHolidays, addStudioClosure } from '@/features/settings/server/closures'
import type { HebcalHoliday } from '@/integrations/hebcal/hebcal.server'

export interface AddClosureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface GroupedHoliday {
  title: string
  hebrew: string
  years: number
}

export function AddClosureDialog({ open, onOpenChange }: AddClosureDialogProps) {
  const queryClient = useQueryClient()
  const [includeMinor, setIncludeMinor] = useState(false)
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set())

  const [customDate, setCustomDate] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [customRecurring, setCustomRecurring] = useState(false)
  const [tab, setTab] = useState<'holidays' | 'custom'>('holidays')

  const holidaysQuery = useQuery<HebcalHoliday[]>({
    queryKey: ['hebcal-holidays', includeMinor],
    queryFn: () => getHebcalHolidays({ data: { includeMinor } }),
    enabled: open,
  })

  // Each entry in holidaysQuery.data is one specific year's occurrence — group by title for the
  // picker so "יום כיפור" is one row, not one row per year.
  const groupedHolidays = useMemo<GroupedHoliday[]>(() => {
    const map = new Map<string, GroupedHoliday>()
    for (const h of holidaysQuery.data ?? []) {
      const existing = map.get(h.title)
      if (existing) existing.years += 1
      else map.set(h.title, { title: h.title, hebrew: h.hebrew || h.title, years: 1 })
    }
    return Array.from(map.values())
  }, [holidaysQuery.data])

  const toggleHoliday = (title: string) => {
    setSelectedTitles((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  const allSelected = groupedHolidays.length > 0 && groupedHolidays.every((h) => selectedTitles.has(h.title))
  const toggleSelectAll = (checked: boolean) => {
    setSelectedTitles(checked ? new Set(groupedHolidays.map((h) => h.title)) : new Set())
  }

  const selectedHolidays = useMemo(
    () => (holidaysQuery.data ?? []).filter((h) => selectedTitles.has(h.title)),
    [holidaysQuery.data, selectedTitles],
  )

  const addHolidaysMutation = useMutation({
    mutationFn: async () => {
      // One closure per (holiday, year) pair — the actual dated occurrence, not a synthetic
      // month/day-matching "recurring" flag that would be wrong for Hebrew lunisolar holidays.
      await Promise.all(
        selectedHolidays.map((holiday) =>
          addStudioClosure({
            data: { date: holiday.date, reason: holiday.hebrew || holiday.title, isRecurring: false, source: 'hebcal' },
          }),
        ),
      )
    },
    onSuccess: () => {
      setSelectedTitles(new Set())
      queryClient.invalidateQueries({ queryKey: ['studio-closures'] })
    },
  })

  const addCustomMutation = useMutation({
    mutationFn: () =>
      addStudioClosure({
        data: { date: customDate, reason: customReason, isRecurring: customRecurring, source: 'manual' },
      }),
    onSuccess: () => {
      setCustomDate('')
      setCustomReason('')
      setCustomRecurring(false)
      queryClient.invalidateQueries({ queryKey: ['studio-closures'] })
    },
  })

  const addingHolidays = tab === 'holidays'
  const isPending = addHolidaysMutation.isPending || addCustomMutation.isPending
  const mutationError = (addingHolidays ? addHolidaysMutation.error : addCustomMutation.error)

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="ימי סגירה"
      description="בימים האלה הבוט לא מציע תורים."
      footer={
        <DialogActions error={mutationError?.message ?? null}>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            סגירה
          </Button>
          {addingHolidays ? (
            <Button type="button" onClick={() => addHolidaysMutation.mutate()} disabled={selectedTitles.size === 0 || isPending} className="min-w-28">
              {addHolidaysMutation.isPending ? 'מוסיף…' : selectedTitles.size > 0 ? `הוספת ${selectedTitles.size} חגים` : 'הוספת חגים'}
            </Button>
          ) : (
            <Button type="button" onClick={() => addCustomMutation.mutate()} disabled={!customDate || isPending} className="min-w-28">
              {addCustomMutation.isPending ? 'מוסיף…' : 'הוספת התאריך'}
            </Button>
          )}
        </DialogActions>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'holidays' | 'custom')} dir="rtl" className="gap-4">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="holidays">חגים</TabsTrigger>
          <TabsTrigger value="custom">תאריך מסוים</TabsTrigger>
        </TabsList>

        <TabsContent value="holidays" className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-sm font-bold text-foreground">גם מועדים קטנים וצומות</span>
              <span className="text-xs text-muted-foreground">אחרת רק החגים המרכזיים</span>
            </span>
            <Switch checked={includeMinor} onCheckedChange={setIncludeMinor} />
          </label>

          {holidaysQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">טוען חגים…</p>
          ) : holidaysQuery.isError ? (
            <p className="text-sm font-bold text-destructive">לא הצלחנו לטעון חגים מ-Hebcal.</p>
          ) : (
            <div className="flex flex-col overflow-hidden rounded-lg border border-border">
              <label className="flex cursor-pointer items-center gap-2.5 border-b border-border bg-muted/40 px-3 py-2 text-sm font-bold text-foreground">
                <Checkbox checked={allSelected} onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))} />
                הכל
              </label>
              <div className="max-h-60 overflow-y-auto">
                {groupedHolidays.map((holiday) => (
                  <label key={holiday.title} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50">
                    <Checkbox checked={selectedTitles.has(holiday.title)} onCheckedChange={() => toggleHoliday(holiday.title)} />
                    <span className="flex-1 font-medium text-foreground">{holiday.hebrew}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            חג שנבחר נסגר בכל שנה בעשור הקרוב, לפי התאריך העברי. נתוני החגים מ-
            <a href="https://www.hebcal.com" target="_blank" rel="noreferrer" className="underline">
              Hebcal
            </a>
            .
          </p>
        </TabsContent>

        <TabsContent value="custom" className="form-stack">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="closure-custom-date" className="form-label">
                תאריך
              </label>
              <Input id="closure-custom-date" type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="w-40" dir="ltr" />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="closure-custom-reason" className="form-label">
                סיבה <span className="font-medium text-muted-foreground">(לא חובה)</span>
              </label>
              <Input id="closure-custom-reason" value={customReason} onChange={(e) => setCustomReason(e.target.value)} placeholder="למשל: שיפוצים" />
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-sm font-bold text-foreground">לסגור כל שנה</span>
              <span className="text-xs text-muted-foreground">אחרת רק בתאריך הזה</span>
            </span>
            <Switch checked={customRecurring} onCheckedChange={setCustomRecurring} />
          </label>
        </TabsContent>
      </Tabs>
    </ResponsiveDialog>
  )
}

export default AddClosureDialog
