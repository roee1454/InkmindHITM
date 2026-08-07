import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarHeart, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getHebcalHolidays, addStudioClosure } from '../server/settings'
import type { HebcalHoliday } from '@/integrations/hebcal/hebcal.server'

interface AddClosureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddClosureDialog({ open, onOpenChange }: AddClosureDialogProps) {
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set())

  const [customDate, setCustomDate] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [customRecurring, setCustomRecurring] = useState(false)

  const holidaysQuery = useQuery<HebcalHoliday[]>({
    queryKey: ['hebcal-holidays', year],
    queryFn: () => getHebcalHolidays({ data: { year } }),
    enabled: open,
  })

  const toggleHoliday = (title: string) => {
    setSelectedTitles((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  const selectedHolidays = useMemo(
    () => (holidaysQuery.data ?? []).filter((h) => selectedTitles.has(h.title)),
    [holidaysQuery.data, selectedTitles],
  )

  const addHolidaysMutation = useMutation({
    mutationFn: async () => {
      for (const holiday of selectedHolidays) {
        await addStudioClosure({
          data: { date: holiday.date, reason: holiday.hebrew || holiday.title, isRecurring: true, source: 'hebcal' },
        })
      }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-lg max-h-[85vh] overflow-y-auto font-assistant text-right">
        <DialogHeader>
          <DialogTitle>הוספת ימי סגירה</DialogTitle>
          <DialogDescription>
            בחרו חגים מהלוח היהודי לסגירה קבועה מדי שנה, או הוסיפו תאריך מותאם אישית.
          </DialogDescription>
        </DialogHeader>

        {/* Hebcal holiday picker */}
        <div className="space-y-3 border-b border-border/60 pb-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles size={14} className="text-primary" />
              חגים ומועדים יהודיים
            </div>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || currentYear)}
              className="w-24 rounded-xl text-xs"
              dir="ltr"
            />
          </div>

          {holidaysQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">טוען חגים…</p>
          ) : holidaysQuery.isError ? (
            <p className="text-xs font-semibold text-destructive">שגיאה בטעינת החגים מ-Hebcal.com</p>
          ) : (
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {(holidaysQuery.data ?? []).map((holiday) => (
                <label
                  key={`${holiday.title}-${holiday.date}`}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/60"
                >
                  <Checkbox
                    checked={selectedTitles.has(holiday.title)}
                    onCheckedChange={() => toggleHoliday(holiday.title)}
                  />
                  <span className="font-semibold text-foreground">{holiday.hebrew || holiday.title}</span>
                  <span className="text-[10px] text-muted-foreground" dir="ltr">
                    {holiday.date}
                  </span>
                </label>
              ))}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            נתוני חגים מסופקים על ידי{' '}
            <a href="https://www.hebcal.com" target="_blank" rel="noreferrer" className="underline">
              Hebcal.com
            </a>
            . חגים שנבחרו יתווספו כסגירה קבועה מדי שנה (לצמיתות).
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
              <label className="text-[11px] font-bold text-muted-foreground">תאריך</label>
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-40 bg-white text-foreground border-input"
              />
            </div>
            <div className="min-w-[140px] flex-1 space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground">סיבה (אופציונלי)</label>
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="יום נישואין"
                className="bg-white text-foreground border-input"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">סגור כל שנה</span>
              <span className="text-[10px] text-muted-foreground">
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
      </DialogContent>
    </Dialog>
  )
}

export default AddClosureDialog
