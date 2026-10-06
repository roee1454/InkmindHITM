import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/ToastProvider'
import { queryKeys } from '@/lib/query-keys'
import { toCanonicalE164Phone } from '@/lib/phone'
import { createCustomer, updateCustomer } from '../server/customers'
import { useCustomersUiStore } from '../store/customersUiStore'
import type { CustomerFormData } from '../types'

function contactFields(body: CustomerFormData) {
  return {
    name: body.name || null,
    phone: toCanonicalE164Phone(body.phone),
    email: body.email || null,
    source: body.source === 'unknown' ? null : body.source,
    isVip: body.isVip,
  }
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

/** Creating a customer, and saving the details tab of an open customer card. */
export function useCustomerMutations() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { setIsCreating, resetForm, setFormError } = useCustomersUiStore()

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.customers }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline }),
    ])

  const create = useMutation({
    mutationFn: (body: CustomerFormData) => createCustomer({ data: contactFields(body) }),
    onSuccess: () => {
      setIsCreating(false)
      resetForm()
      return refresh()
    },
    onError: (err: unknown) => setFormError(errorText(err, 'שגיאה ביצירת לקוח')),
  })

  // The card stays open after a save — it's where the customer's projects and money live, so
  // closing it would throw away the context the save was made in.
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CustomerFormData }) =>
      updateCustomer({
        data: {
          id,
          ...contactFields(body),
          healthDeclarationSigned: body.healthDeclarationSigned,
          healthDeclarationDate: body.healthDeclarationDate,
          healthDeclarationUrl: body.healthDeclarationUrl,
          allergies: body.allergies,
          medicalNotes: body.medicalNotes,
        },
      }),
    onSuccess: () => {
      setFormError(null)
      toast('הפרטים נשמרו', '', 'success')
      return refresh()
    },
    onError: (err: unknown) => setFormError(errorText(err, 'שגיאה בעדכון הלקוח')),
  })

  return { create, update }
}
