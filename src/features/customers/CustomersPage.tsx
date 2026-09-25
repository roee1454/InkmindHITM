import { CascadeDeleteDialog } from '@/features/database/components/CascadeDeleteDialog'
import React from 'react'
import { AlertCircle } from '@/components/ui/icon'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SearchInput } from '@/components/ui/search-input'
import { Pagination } from '@/components/ui/pagination'
import type { Customer, CustomerFormData } from './types'
import { createCustomer, updateCustomer } from './server/customers'
import { customersQueryOptions } from './utils/customers-query'
import { CustomersHeader } from './components/CustomersHeader'
import { CustomersSummary } from './components/CustomersSummary'
import type { LifecycleFilter } from './components/CustomersSummary'
import { CustomerCard } from './components/CustomerCard'
import { CustomersSkeleton } from './components/CustomersSkeleton'
import { CustomerDialog } from './components/CustomerDialog'
import { useCustomersUiStore } from './store/customersUiStore'
import { phoneMatchesQuery, toCanonicalE164Phone } from '@/lib/phone'

const ITEMS_PER_PAGE = 10

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [lifecycleFilter, setLifecycleFilter] = React.useState<LifecycleFilter>('all')
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null)

  const {
    searchQuery,
    currentPage,
    isCreating,
    editingCustomer,
    form,
    formError,
    setSearchQuery,
    setCurrentPage,
    setIsCreating,
    setEditingCustomer,
    updateFormField,
    setFormError,
    resetForm,
    openCreate,
    openEdit,
  } = useCustomersUiStore()

  const { data: customers = [], isLoading, error } = useQuery(customersQueryOptions())

  // The customer being edited was deleted elsewhere (another tab, a colleague, the realtime
  // feed): close the form instead of letting a save or delete run against a dead id.
  React.useEffect(() => {
    if (editingCustomer && !isLoading && !customers.some((c) => c.id === editingCustomer.id)) {
      setEditingCustomer(null)
    }
  }, [customers, editingCustomer, isLoading, setEditingCustomer])

  // The mobile top bar's "+" action navigates here with `?new=1` since it lives outside this
  // component's tree — pick it up once, then clear it so back-navigation doesn't reopen it.
  React.useEffect(() => {
    if ((location.search as Record<string, unknown>)?.new === '1') {
      openCreate()
      navigate({ to: '/dashboard/customers', search: {}, replace: true })
    }
  }, [location.search])

  const createCustomerMutation = useMutation({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
      setIsCreating(false)
      resetForm()
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : 'שגיאה ביצירת לקוח')
    },
  })

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CustomerFormData }) =>
      updateCustomer({
        data: {
          id,
          name: body.name || null,
          phone: toCanonicalE164Phone(body.phone),
          email: body.email || null,
          source: body.source === 'unknown' ? null : body.source,
          isVip: body.isVip,
          healthDeclarationSigned: body.healthDeclarationSigned,
          healthDeclarationDate: body.healthDeclarationDate,
          healthDeclarationUrl: body.healthDeclarationUrl,
          allergies: body.allergies,
          medicalNotes: body.medicalNotes,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
      setEditingCustomer(null)
      resetForm()
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : 'שגיאה בעדכון הלקוח')
    },
  })

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.phone) {
      setFormError('נא להזין מספר טלפון')
      return
    }
    createCustomerMutation.mutate(form)
  }

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCustomer) return
    if (!form.phone) {
      setFormError('נא להזין מספר טלפון')
      return
    }
    updateCustomerMutation.mutate({ id: editingCustomer.id, body: form })
  }

  // Global search filtering across ALL pages first
  const filteredCustomers = customers.filter((c) => {
    if (lifecycleFilter !== 'all' && c.lifecycle !== lifecycleFilter) return false
    const term = searchQuery.toLowerCase().trim()
    if (!term) return true
    const nameMatch = c.name?.toLowerCase().includes(term)
    const phoneMatch = phoneMatchesQuery(c.phone, term)
    const emailMatch = c.email?.toLowerCase().includes(term)
    return nameMatch || phoneMatch || emailMatch
  })

  // Pagination math
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1
  const safePage = Math.min(currentPage, totalPages)
  const paginatedCustomers = filteredCustomers.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  const totalCustomers = customers.length
  const totalSpend = customers.reduce((sum, c) => sum + c.totalSpend, 0)

  const handlePageChange = (page: number) => {
    React.startTransition(() => {
      setCurrentPage(page)
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[18px] font-assistant lg:gap-6" dir="rtl">
      <CustomersHeader totalCustomers={totalCustomers} totalSpend={totalSpend} onNewCustomer={openCreate} />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          <AlertCircle size={15} />
          {(error).message}
        </div>
      )}

      {/* Search field */}
      <SearchInput
        size="lg"
        variant="card"
        placeholder="חיפוש שם, טלפון או אימייל"
        value={searchQuery}
        onChange={setSearchQuery}
      />

      <CustomersSummary
        totalCustomers={filteredCustomers.length}
        filter={lifecycleFilter}
        onFilterChange={(next) => {
          setLifecycleFilter(next)
          setCurrentPage(1)
        }}
      />

      {isLoading && !customers.length ? (
        <CustomersSkeleton />
      ) : paginatedCustomers.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="card-native overflow-hidden">
            {paginatedCustomers.map((c) => (
              <CustomerCard key={c.id} customer={c} onEdit={openEdit} />
            ))}
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={filteredCustomers.length}
            itemsPerPage={ITEMS_PER_PAGE}
            itemLabel="לקוחות"
          />
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-border text-sm font-semibold text-muted-foreground">
          לא נמצאו לקוחות במאגר
        </div>
      )}

      <CustomerDialog
        mode="create"
        open={isCreating}
        onOpenChange={setIsCreating}
        form={form}
        onFormChange={updateFormField}
        formError={formError}
        onSubmit={submitCreate}
        isSaving={createCustomerMutation.isPending}
      />

      <CustomerDialog
        mode="edit"
        open={editingCustomer !== null}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        form={form}
        onFormChange={updateFormField}
        formError={formError}
        onSubmit={submitEdit}
        isSaving={updateCustomerMutation.isPending}
        onDelete={
          editingCustomer
            ? () => {
                const target = editingCustomer
                setEditingCustomer(null)
                setCustomerToDelete(target)
              }
            : undefined
        }
      />

      <CascadeDeleteDialog
        open={Boolean(customerToDelete)}
        onOpenChange={(open) => {
          if (!open) setCustomerToDelete(null)
        }}
        collection="customers"
        id={customerToDelete?.id || null}
        entityName={customerToDelete?.name || customerToDelete?.phone || 'לקוח'}
        onDeleted={() => {
          setCustomerToDelete(null)
          queryClient.invalidateQueries({ queryKey: ['customers'] })
        }}
      />
    </div>
  )
}

export default CustomersPage
