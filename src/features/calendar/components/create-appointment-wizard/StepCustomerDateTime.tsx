import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { HourPicker } from '@/components/ui/hour-picker'
import type { AppointmentFormValues } from '../../types'
import { getCustomers } from '@/features/customers/server/customers'
import type { Customer } from '@/features/customers/types'
import { AddCustomerDialog } from './AddCustomerDialog'

interface StepCustomerDateTimeProps {
  values: AppointmentFormValues
  onChange: (patch: Partial<AppointmentFormValues>) => void
}

export const StepCustomerDateTime: React.FC<StepCustomerDateTimeProps> = ({ values, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)

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

  const selectedCustomer = customers.find((c) => c.id === values.customerId)
  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm),
  )

  return (
    <div className="space-y-4 font-assistant" dir="rtl">
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
                    <span className="text-micro text-muted-foreground dir-ltr font-mono">{c.phone}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">תאריך *</label>
          <DatePicker value={values.date} onChange={(ymd) => onChange({ date: ymd })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">שעה *</label>
          <HourPicker value={values.timeSlot} onChange={(time) => onChange({ timeSlot: time })} />
        </div>
      </div>

      <AddCustomerDialog
        open={isAddCustomerOpen}
        onOpenChange={setIsAddCustomerOpen}
        onCreated={(customer) =>
          onChange({
            customerId: customer.id,
            leadName: customer.name || 'לקוח',
            leadPhone: customer.phone || '',
          })
        }
      />
    </div>
  )
}

export default StepCustomerDateTime
