import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarHeart, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { getHebcalHolidays, addStudioClosure } from '../server/closures'
import type { HebcalHoliday } from '@/integrations/hebcal/hebcal.server'

interface AddClosureDialogProps {
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

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="הוספת ימי סגירה"
      description="בחרו חגים מהלוח היהודי לסגירה קבועה מדי שנה, או הוסיפו תאריך מותאם אישית."
      contentClassName="sm:max-w-lg max-h-[85vh] overflow-y-auto"
    >
      {/* Hebcal holiday picker */}
        <div className="space-y-3 border-b border-border/60 pb-5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Sparkles size={14} className="text-primary" />
            חגים ומועדים יהודיים
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">כלול גם מועדים קטנים וצומות</span>
              <span className="text-micro text-muted-foreground">כבוי = חגים מרכזיים בלבד</span>
            </div>
            <Switch checked={includeMinor} onCheckedChange={setIncludeMinor} />
          </label>

          {holidaysQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">טוען חגים…</p>
          ) : holidaysQuery.isError ? (
            <p className="text-xs font-semibold text-destructive">שגיאה בטעינת החגים מ-Hebcal.com</p>
          ) : (
            <>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold text-foreground">
                <Checkbox checked={allSelected} onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))} />
                בחר הכל
              </label>
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {groupedHolidays.map((holiday) => (
                  <label
                    key={holiday.title}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={selectedTitles.has(holiday.title)}
                      onCheckedChange={() => toggleHoliday(holiday.title)}
                    />
                    <span className="flex-1 font-semibold text-foreground">{holiday.hebrew}</span>
                    <span className="text-micro text-muted-foreground">כל שנה</span>
                  </label>
                ))}
              </div>
            </>
          )}

          <p className="text-micro text-muted-foreground">
            נתוני חגים מסופקים על ידי{' '}
            <a href="https://www.hebcal.com" target="_blank" rel="noreferrer" className="underline">
              Hebcal.com
            </a>
            . חגים שנבחרו יתווספו כסגירה קבועה בכל שנה, לפי התאריך היהודי המדויק בעשור הקרוב.
          </p>

          <Button
            type="button"
            onClick={() => addHolidaysMutation.mutate()}
            disabled={selectedTitles.size === 0 || addHolidaysMutation.isPending}
            className="w-full rounded-xl font-bold cursor-pointer"
          >
            {addHolidaysMutation.isPending
              ? 'מוסיף…'
              : `הוסף ${selectedTitles.size > 0 ? selectedTitles.size : ''} חגים נבחרים לצמיתות`}
          </Button>
        </div>

        {/* Custom date */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <CalendarHeart size={14} className="text-primary" />
            תאריך מותאם אישית
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-mini font-bold text-muted-foreground">תאריך</label>
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="min-w-[140px] flex-1 space-y-1">
              <label className="text-mini font-bold text-muted-foreground">סיבה (אופציונלי)</label>
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="יום נישואין"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">סגור כל שנה</span>
              <span className="text-micro text-muted-foreground">
                כבוי = סגירה חד-פעמית בתאריך זה בלבד
              </span>
            </div>
            <Switch checked={customRecurring} onCheckedChange={setCustomRecurring} />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => addCustomMutation.mutate()}
            disabled={!customDate || addCustomMutation.isPending}
            className="w-full rounded-xl font-bold cursor-pointer"
          >
            {addCustomMutation.isPending ? 'מוסיף…' : 'הוסף תאריך'}
          </Button>
        </div>
    </ResponsiveDialog>
  )
}

export default AddClosureDialog
