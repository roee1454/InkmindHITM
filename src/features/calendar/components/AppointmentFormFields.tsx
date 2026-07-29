import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { ApiGoogleConnection, AppointmentFormValues, AppointmentStatus } from '../types'
import { STATUS_LABELS } from '../types'
import { useWorkingHoursCheck } from '../use-working-hours-check'
import { getCustomers, createCustomer } from '@/features/customers/server/customers'
import type { Customer } from '@/features/customers/types'
import { SOURCE_LABELS } from '@/features/customers/types'

const NO_ARTIST = 'none'

interface StaffItem {
  id: string
  name: string
  avatar?: string
}

interface AppointmentFormFieldsProps {
  values: AppointmentFormValues
  onChange: (patch: Partial<AppointmentFormValues>) => void
  staff: StaffItem[]
  googleConnections: ApiGoogleConnection[]
  isEdit?: boolean
}

export const AppointmentFormFields: React.FC<AppointmentFormFieldsProps> = ({
  values,
  onChange,
  staff,
  googleConnections,
  isEdit = false,
}) => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [noCalendarArtistName, setNoCalendarArtistName] = useState<string | null>(null)

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustEmail, setNewCustEmail] = useState('')
  const [newCustSource, setNewCustSource] = useState('walk-in')
  const [newCustIsVip, setNewCustIsVip] = useState(false)
  const [newCustError, setNewCustError] = useState<string | null>(null)

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => getCustomers(),
  })

  React.useEffect(() => {
    if (!values.customerId && values.chatId && customers.length > 0) {
      const match = customers.find((c) => c.chatId === values.chatId)
      if (match) {
        onChange({
          customerId: match.id,
          leadName: match.name || '',
          leadPhone: match.phone || '',
        })
      }
    }
  }, [values.chatId, values.customerId, customers, onChange])

  const { fitsWorkingHours } = useWorkingHoursCheck(values.staffId, values.date, values.timeSlot, values.durationHours)

  const selectedCustomer = customers.find((c) => c.id === values.customerId)
  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm),
  )

  const createCustMutation = useMutation({
    mutationFn: (body: { name: string; phone: string; email: string; source: string; isVip: boolean }) =>
      createCustomer({
        data: {
          name: body.name || null,
          phone: body.phone,
          email: body.email || null,
          source: body.source === 'unknown' ? null : body.source,
          isVip: body.isVip,
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onChange({
        customerId: res.id,
        leadName: newCustName || 'לקוח',
        leadPhone: newCustPhone,
      })
      setIsAddCustomerOpen(false)
    },
    onError: (err: unknown) => {
      setNewCustError(err instanceof Error ? err.message : 'שגיאה ביצירת הלקוח')
    },
  })

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustPhone) {
      setNewCustError('מספר טלפון הוא שדה חובה')
      return
    }
    setNewCustError(null)
    createCustMutation.mutate({
      name: newCustName || 'לקוח',
      phone: newCustPhone,
      email: newCustEmail,
      source: newCustSource,
      isVip: newCustIsVip,
    })
  }

  return (
    <div className="space-y-4 font-assistant" dir="rtl">
      {/* 1. Customer Selection */}
      {isEdit ? (
        <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            פרטי לקוח (לא ניתן לשינוי)
          </span>
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-foreground">{values.leadName || 'לקוח ללא שם'}</span>
            <span className="text-muted-foreground dir-ltr font-mono">{values.leadPhone}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-xs font-semibold text-foreground">בחר לקוח מהמאגר *</label>
          <div className="relative">
            <Input
              type="text"
              placeholder="חפש לפי שם או טלפון…"
              value={
                isOpen
                  ? searchTerm
                  : selectedCustomer
                  ? `${selectedCustomer.name || 'לקוח ללא שם'} (${selectedCustomer.phone || ''})`
                  : ''
              }
              onFocus={() => {
                setIsOpen(true)
                setSearchTerm('')
              }}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 left-0 top-[52px] max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-xl p-1 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setNewCustName('')
                    setNewCustPhone('')
                    setNewCustEmail('')
                    setNewCustSource('walk-in')
                    setNewCustIsVip(false)
                    setNewCustError(null)
                    setIsAddCustomerOpen(true)
                  }}
                  className="w-full text-right px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1.5 border-b border-border/40 pb-2 mb-1 cursor-pointer"
                >
                  + לקוח מזדמן חדש
                </button>
                {filteredCustomers.length === 0 ? (
                  <div className="text-xs text-muted-foreground px-3 py-2">לא נמצאו לקוחות</div>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onChange({
                          customerId: c.id,
                          leadName: c.name || '',
                          leadPhone: c.phone || '',
                        })
                        setIsOpen(false)
                      }}
                      className={`w-full text-right px-3 py-1.5 text-xs rounded-lg flex flex-col gap-0.5 hover:bg-primary/10 cursor-pointer ${
                        values.customerId === c.id ? 'bg-primary/15' : ''
                      }`}
                    >
                      <span className="font-semibold text-foreground">{c.name || 'לקוח ללא שם'}</span>
                      <span className="text-[10px] text-muted-foreground dir-ltr font-mono">{c.phone}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. Schedule details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">תאריך *</label>
          <Input
            type="date"
            value={values.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">שעה *</label>
          <Input
            type="time"
            step="1800"
            value={values.timeSlot}
            onChange={(e) => onChange({ timeSlot: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5" dir="rtl">
          <label className="text-xs font-semibold text-foreground">מקעקע</label>
          <Select
            value={values.staffId ?? NO_ARTIST}
            onValueChange={(val) => {
              const staffId = val === NO_ARTIST ? null : val
              onChange({ staffId })
              const connection = googleConnections.find((c) => c.staffId === staffId)
              if (staffId && (!connection || connection.status === 'disconnected')) {
                setNoCalendarArtistName(staff.find((s) => s.id === staffId)?.name ?? null)
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="ללא שיוך" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={NO_ARTIST}>ללא שיוך</SelectItem>
              {staff.map((artist) => {
                const connection = googleConnections.find(
                  (c) => c.staffId === artist.id && c.status === 'connected',
                )
                const picture = connection?.googleAccountPicture || artist.avatar

                return (
                  <SelectItem key={artist.id} value={artist.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarImage src={picture ?? undefined} />
                        <AvatarFallback className="text-[9px] bg-muted">
                          {artist.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{artist.name}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">משך (שעות)</label>
          <Input
            type="number"
            step="0.5"
            min="0.5"
            max="12"
            value={values.durationHours}
            onChange={(e) => onChange({ durationHours: Number(e.target.value) })}
            dir="rtl"
            className="text-right"
          />
        </div>
      </div>

      {!fitsWorkingHours && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <TriangleAlert size={13} className="shrink-0" />
            מחוץ לשעות העבודה
          </div>
          <p className="text-[11px] text-muted-foreground">
            המועד שנבחר אינו בתוך שעות העבודה של האמן/ית שנבחר/ה.
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-foreground">אני מודע/ת שזה מחוץ לשעות העבודה — שריין בכל זאת</span>
            <Switch
              id="appointment-allow-exception"
              checked={values.allowException}
              onCheckedChange={(checked) => onChange({ allowException: checked })}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">תיאור קעקוע</label>
        <Input
          type="text"
          placeholder="פורטרט ריאליסטי"
          value={values.tattooDescription}
          onChange={(e) => onChange({ tattooDescription: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">מחיר (₪)</label>
          <Input
            type="number"
            min="0"
            value={values.priceIls ?? ''}
            onChange={(e) => onChange({ priceIls: e.target.value === '' ? null : Number(e.target.value) })}
            dir="rtl"
            className="text-right"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">מקדמה (₪)</label>
          <Input
            type="number"
            min="0"
            value={values.depositAmount ?? ''}
            onChange={(e) => onChange({ depositAmount: e.target.value === '' ? null : Number(e.target.value) })}
            dir="rtl"
            className="text-right"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5" dir="rtl">
        <label className="text-xs font-semibold text-foreground">סטטוס</label>
        <Select
          value={values.status}
          onValueChange={(val) => onChange({ status: val as AppointmentStatus })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-foreground">מקדמה שולמה</span>
          <span className="text-[10px] text-muted-foreground">סמן אם מקדמת התור שולמה</span>
        </div>
        <Switch
          id="appointment-deposit-paid"
          checked={values.depositPaid}
          onCheckedChange={(checked) => onChange({ depositPaid: checked })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-foreground">הערות</label>
        <Textarea
          rows={3}
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="min-h-[72px]"
        />
      </div>

      {/* Add Walk-In Customer Modal Prompt */}
      <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl text-right font-assistant" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת לקוח חדש</DialogTitle>
            <DialogDescription>
              הזן את פרטי הלקוח החדש במאגר.
            </DialogDescription>
          </DialogHeader>

          {newCustError && (
            <p className="text-xs font-semibold text-rose-400">{newCustError}</p>
          )}

          <form onSubmit={handleAddCustomerSubmit} className="space-y-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">שם מלא</label>
              <Input
                type="text"
                placeholder="למשל: דניאל חיים"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                מספר טלפון (חובה)
              </label>
              <Input
                type="text"
                placeholder="למשל: 0547654321"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">אימייל</label>
              <Input
                type="email"
                placeholder="client@email.com"
                value={newCustEmail}
                onChange={(e) => setNewCustEmail(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="flex flex-col gap-1.5" dir="rtl">
              <label className="text-xs font-semibold text-foreground">מקור הגעה</label>
              <Select value={newCustSource} onValueChange={setNewCustSource}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-foreground">לקוח VIP</span>
                <span className="text-[10px] text-muted-foreground">סמן לקוח זה כ-VIP</span>
              </div>
              <Switch checked={newCustIsVip} onCheckedChange={setNewCustIsVip} />
            </div>

            <Button
              type="submit"
              disabled={createCustMutation.isPending}
              className="w-full rounded-xl mt-2 font-bold cursor-pointer"
            >
              {createCustMutation.isPending ? 'יוצר לקוח…' : 'הוסף לקוח'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* OK-only warning dialog */}
      <Dialog open={noCalendarArtistName !== null} onOpenChange={(open) => !open && setNoCalendarArtistName(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl text-right font-assistant" dir="rtl">
          <DialogHeader>
            <DialogTitle>אין חיבור ליומן Google</DialogTitle>
            <DialogDescription>
              ל{noCalendarArtistName} אין חשבון Google Calendar מחובר. התור לא יסונכרן ליומן שלו/שלה.
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            onClick={() => setNoCalendarArtistName(null)}
            className="w-full rounded-xl font-bold cursor-pointer"
          >
            הבנתי
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AppointmentFormFields
