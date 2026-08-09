import React from 'react'
import { Search, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { CustomerDialog } from './components/CustomerDialog'
import { useCustomersUiStore } from './store/customersUiStore'

const ITEMS_PER_PAGE = 9

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient()
  
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
  const returningCustomers = customers.filter((c) => c.visits >= 2).length
  const totalSpend = customers.reduce((sum, c) => sum + c.totalSpend, 0)
  const reviewsCount = customers.filter((c) => c.visits >= 1).length

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 md:space-y-6 text-right font-assistant py-3 md:py-6" dir="rtl">
      <CustomersHeader
        totalCustomers={totalCustomers}
        totalSpend={totalSpend}
        onNewCustomer={openCreate}
      />

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold px-4 py-3 rounded-xl">
          <AlertCircle size={15} />
          {(error as Error).message}
        </div>
      )}

      <CustomersSummary
        totalCustomers={totalCustomers}
        returningCustomers={returningCustomers}
        reviewsCount={reviewsCount}
      />

      {/* Search Bar */}
      <div className="relative">
        <Input
          type="text"
          placeholder="חיפוש בכל העמודים לפי שם, טלפון או אימייל…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pe-10 bg-white dark:bg-card text-foreground"
        />
        <Search size={16} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>

      {/* Grid of Customers */}
      {isLoading && !customers.length ? (
        <div className="h-44 flex items-center justify-center text-xs font-semibold text-muted-foreground">
          טוען לקוחות…
        </div>
      ) : paginatedCustomers.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCustomers.map((c, idx) => (
              <CustomerCard
                key={c.id}
                customer={c}
                colorIndex={(safePage - 1) * ITEMS_PER_PAGE + idx}
                onEdit={openEdit}
                onDelete={(id) => deleteCustomerMutation.mutate(id)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-border/60 pt-4 font-assistant text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground">
                מציג {((safePage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredCustomers.length)} מתוך {filteredCustomers.length} לקוחות
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
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
                      className={`h-7 w-7 cursor-pointer rounded-lg text-xs font-bold transition-colors active:scale-95 ${
                        pageNum === safePage
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
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
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
                >
                  הבא <ChevronLeft size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-44 flex items-center justify-center text-xs font-semibold text-muted-foreground border border-dashed border-border rounded-2xl">
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
      />
    </div>
  )
}

export default CustomersPage
