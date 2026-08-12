import React from 'react'
import { Search, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import type { Customer, CustomerFormData } from './types'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './server/customers'
import { CustomersHeader } from './components/CustomersHeader'
import { CustomersSummary } from './components/CustomersSummary'
import { CustomerCard } from './components/CustomerCard'
import { CustomersSkeleton } from './components/CustomersSkeleton'
import { CustomerDialog } from './components/CustomerDialog'
import { useCustomersUiStore } from './store/customersUiStore'

const ITEMS_PER_PAGE = 9

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [returningOnly, setReturningOnly] = React.useState(false)

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

  const { data: customers = [], isLoading, error } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => getCustomers(),
    staleTime: 5 * 60 * 1000,
  })

  // The mobile top bar's "+" action navigates here with `?new=1` since it lives outside this
  // component's tree — pick it up once, then clear it so back-navigation doesn't reopen it.
  React.useEffect(() => {
    if ((location.search as Record<string, unknown>)?.new === '1') {
      openCreate()
      navigate({ to: '/dashboard/customers', search: {}, replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const createCustomerMutation = useMutation({
    mutationFn: (body: CustomerFormData) =>
      createCustomer({
        data: {
          name: body.name || null,
          phone: body.phone,
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
          phone: body.phone,
          email: body.email || null,
          source: body.source === 'unknown' ? null : body.source,
          isVip: body.isVip,
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

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
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
    if (returningOnly && c.visits < 2) return false
    const term = searchQuery.toLowerCase().trim()
    if (!term) return true
    const nameMatch = c.name?.toLowerCase().includes(term)
    const phoneMatch = c.phone?.includes(term)
    const emailMatch = c.email?.toLowerCase().includes(term)
    return nameMatch || phoneMatch || emailMatch
  })

  // Pagination math
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1
  const safePage = Math.min(currentPage, totalPages)
  const paginatedCustomers = filteredCustomers.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  const totalCustomers = customers.length
  const totalSpend = customers.reduce((sum, c) => sum + c.totalSpend, 0)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[18px] font-assistant lg:gap-6" dir="rtl">
      <CustomersHeader totalCustomers={totalCustomers} totalSpend={totalSpend} onNewCustomer={openCreate} />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] font-semibold text-destructive">
          <AlertCircle size={15} />
          {(error as Error).message}
        </div>
      )}

      {/* Search field */}
      <div className="flex h-13 w-full items-center gap-2.5 rounded-2xl border border-input/80 bg-card px-4 shadow-xs transition-all duration-150 ease-native focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <Search size={18} className="shrink-0 text-muted-foreground" />
        <Input
          type="text"
          placeholder="חיפוש שם, טלפון או אימייל"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-full w-full border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:ring-0"
        />
      </div>

      <CustomersSummary
        totalCustomers={filteredCustomers.length}
        returningOnly={returningOnly}
        onToggleReturning={() => {
          setReturningOnly((v) => !v)
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
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-border/60 pt-4 font-assistant text-[13px] sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground">
                מציג {((safePage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredCustomers.length)} מתוך {filteredCustomers.length} לקוחות
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="flex cursor-pointer items-center gap-1 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-foreground transition-colors duration-100 active:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={14} /> הקודם
                </button>

                {/* The number strip grows without bound — one 28px button per page overflows a
                    375px viewport at ~9 pages. Below sm it collapses to a text indicator. */}
                <span className="font-bold text-muted-foreground sm:hidden">
                  עמוד {safePage} מתוך {totalPages}
                </span>
                <div className="hidden items-center gap-1 sm:flex">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-7 w-7 cursor-pointer rounded-lg text-[13px] font-bold transition-transform duration-150 ease-native active:scale-95 ${
                        pageNum === safePage
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border/80 bg-card text-muted-foreground active:bg-muted'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="flex cursor-pointer items-center gap-1 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-foreground transition-colors duration-100 active:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  הבא <ChevronLeft size={14} />
                </button>
              </div>
            </div>
          )}
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
                deleteCustomerMutation.mutate(editingCustomer.id)
                setEditingCustomer(null)
              }
            : undefined
        }
      />
    </div>
  )
}

export default CustomersPage
