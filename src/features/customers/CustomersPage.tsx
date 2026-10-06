import { CascadeDeleteDialog } from '@/features/database/components/CascadeDeleteDialog'
import React from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Plus } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import type { Customer } from './types'
import { CustomersToolbar } from './components/CustomersToolbar'
import { CustomerRow } from './components/CustomerRow'
import { CustomerDialog } from './components/CustomerDialog'
import { CustomerSheet } from './components/customer-sheet/CustomerSheet'
import { useCustomerMutations } from './hooks/use-customer-mutations'
import { useCustomersUiStore } from './store/customersUiStore'
import { CUSTOMERS_PER_PAGE, useCustomerList } from './hooks/use-customer-list'

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null)

  const {
    isCreating,
    selectedCustomer,
    form,
    formError,
    setSearchQuery,
    setIsCreating,
    setSelectedCustomer,
    updateFormField,
    setFormError,
    openCreate,
    openCustomerCard,
  } = useCustomersUiStore()
  const { create: createCustomerMutation, update: updateCustomerMutation } = useCustomerMutations()

  const list = useCustomerList()
  const { customers, isLoading, error } = list

  // The open customer was deleted elsewhere (another tab, a colleague, the realtime feed): close
  // the card instead of letting a save or delete run against a dead id.
  React.useEffect(() => {
    if (selectedCustomer && !isLoading && !customers.some((c) => c.id === selectedCustomer.id)) {
      setSelectedCustomer(null)
    }
  }, [customers, selectedCustomer, isLoading, setSelectedCustomer])

  // The card's header reads the list's copy, so a saved name or VIP flag shows without reopening.
  const cardCustomer = selectedCustomer ? (customers.find((c) => c.id === selectedCustomer.id) ?? selectedCustomer) : null

  // The mobile top bar's "+" action navigates here with `?new=1` since it lives outside this
  // component's tree — pick it up once, then clear it so back-navigation doesn't reopen it.
  React.useEffect(() => {
    if ((location.search as Record<string, unknown>)?.new === '1') {
      openCreate()
      navigate({ to: '/dashboard/customers', search: {}, replace: true })
    }
  }, [location.search])

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
    if (!selectedCustomer) return
    if (!form.phone) {
      setFormError('נא להזין מספר טלפון')
      return
    }
    updateCustomerMutation.mutate({ id: selectedCustomer.id, body: form })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 font-assistant lg:gap-5" dir="rtl">
      <div className="hidden items-center justify-between gap-3 lg:flex">
        <div className="page-head">
          <h1>מאגר לקוחות</h1>
          <p>כל מי שדיבר עם הסטודיו, ואיפה הוא עומד</p>
        </div>
        <Button onClick={openCreate} className="shrink-0 gap-1.5">
          <Plus size={16} /> לקוח חדש
        </Button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          <AlertCircle size={15} />
          {error.message}
        </div>
      )}

      <CustomersToolbar
        search={list.searchQuery}
        onSearchChange={setSearchQuery}
        filter={list.filter}
        onFilterChange={list.setFilter}
        counts={list.counts}
        total={list.searchedTotal}
        sort={list.sort}
        onSortChange={list.setSort}
      />

      {isLoading ? (
        <div className="card-native flex flex-col gap-4 p-4" aria-hidden>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          ))}
        </div>
      ) : list.rows.length > 0 ? (
        <div className="flex flex-col gap-4">
          <ul className="card-native overflow-hidden">
            {list.rows.map(({ customer, work }) => (
              <CustomerRow key={customer.id} customer={customer} work={work} onOpen={openCustomerCard} />
            ))}
          </ul>
          <Pagination
            currentPage={list.page}
            totalPages={list.totalPages}
            onPageChange={(page) => React.startTransition(() => list.setPage(page))}
            totalItems={list.matching}
            itemsPerPage={CUSTOMERS_PER_PAGE}
            itemLabel="לקוחות"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-bold text-foreground">{customers.length === 0 ? 'עדיין אין לקוחות' : 'אין לקוחות שמתאימים'}</p>
          <p className="text-sm text-muted-foreground">
            {customers.length === 0 ? 'לקוח נוצר כשהוא כותב לסטודיו בוואטסאפ, או כשמוסיפים אותו כאן.' : 'נסו חיפוש אחר או שלב אחר.'}
          </p>
        </div>
      )}

      <CustomerDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        form={form}
        onFormChange={updateFormField}
        formError={formError}
        onSubmit={submitCreate}
        isSaving={createCustomerMutation.isPending}
      />

      <CustomerSheet
        customer={cardCustomer}
        onClose={() => setSelectedCustomer(null)}
        form={form}
        onFormChange={updateFormField}
        formError={formError}
        onSubmit={submitEdit}
        isSaving={updateCustomerMutation.isPending}
        onDelete={() => {
          const target = selectedCustomer
          setSelectedCustomer(null)
          setCustomerToDelete(target)
        }}
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
