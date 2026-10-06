import type React from 'react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCustomer } from '@/features/customers/server/customers'
import { CustomerDialog } from '@/features/customers/components/CustomerDialog'
import type { CustomerFormData } from '@/features/customers/types'
import { queryKeys } from '@/lib/query-keys'
import { toCanonicalE164Phone } from '@/lib/phone'

interface CreatedCustomer {
  id: string
  name: string
  phone: string
}

interface AddCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (customer: CreatedCustomer) => void
}

// A walk-in booked from the calendar most likely came in through the door.
const EMPTY: CustomerFormData = { name: '', phone: '', email: '', source: 'walk-in', isVip: false }

/** The booking wizard's "new customer": the customers page's dialog, with its own state and save. */
export function AddCustomerDialog({ open, onOpenChange, onCreated }: AddCustomerDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CustomerFormData>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setForm(EMPTY)
    setError(null)
    onOpenChange(false)
  }

  const create = useMutation({
    mutationFn: (body: CustomerFormData) =>
      createCustomer({
        data: {
          name: body.name || null,
          phone: toCanonicalE164Phone(body.phone),
          email: body.email || null,
          source: body.source === 'unknown' ? null : body.source,
          isVip: body.isVip,
        },
      }),
    onSuccess: (res, body) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers })
      onCreated({ id: res.id, name: body.name || 'לקוח', phone: toCanonicalE164Phone(body.phone) })
      close()
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'שגיאה ביצירת הלקוח'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.phone) return setError('מספר טלפון הוא שדה חובה')
    setError(null)
    create.mutate(form)
  }

  return (
    <CustomerDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      form={form}
      onFormChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))}
      formError={error}
      onSubmit={submit}
      isSaving={create.isPending}
    />
  )
}
