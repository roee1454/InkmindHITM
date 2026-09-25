import { useState } from 'react'
import { Plus, Loader2, User, Phone, ArrowLeft } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { SearchInput } from '@/components/ui/search-input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Customer } from '@/features/customers/types'
import { formatPhoneForDisplay, toCanonicalE164Phone } from '@/lib/phone'

export interface NewContactData {
  name: string
  phone: string
}

interface NewConversationRecipientStepProps {
  query: string
  onQueryChange: (q: string) => void
  filteredCustomers: Customer[]
  isLoading: boolean
  onSelectCustomer: (customer: Customer) => void
  onSelectNewContact: (contact: NewContactData) => void
}

export function NewConversationRecipientStep({
  query,
  onQueryChange,
  filteredCustomers,
  isLoading,
  onSelectCustomer,
  onSelectNewContact,
}: NewConversationRecipientStepProps) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSwitchToNewWithPrefill = (prefill: string) => {
    const trimmed = prefill.trim()
    const isPhoneLike = /^\+?[\d\s\-()]+$/.test(trimmed)
    setNewName(isPhoneLike ? '' : trimmed)
    setNewPhone(isPhoneLike ? trimmed : '')
    setMode('new')
    setValidationError(null)
  }

  const handleCreateContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = newName.trim()
    const trimmedPhone = newPhone.trim()

    if (trimmedName.length < 2) {
      setValidationError('נא להזין שם מלא תקין (לפחות 2 אותיות).')
      return
    }
    if (/^\+?[\d\s\-()]+$/.test(trimmedName)) {
      setValidationError('שם הלקוח/ה אינו יכול להיות מספר טלפון.')
      return
    }
    const digits = toCanonicalE164Phone(trimmedPhone).replace(/\D/g, '')
    if (digits.length < 9) {
      setValidationError('נא להזין מספר טלפון נייד תקין לקבלת וואטסאפ.')
      return
    }

    setValidationError(null)
    onSelectNewContact({ name: trimmedName, phone: trimmedPhone })
  }

  return (
    <div className="flex flex-col gap-3 font-assistant" dir="rtl">
      {/* Mode Switcher */}
      <div className="grid grid-cols-2 rounded-lg bg-muted/60 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode('existing')
            setValidationError(null)
          }}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-all cursor-pointer',
            mode === 'existing'
              ? 'bg-card text-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <User className="size-3.5" />
          <span>לקוח/ה קיים/ת</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('new')
            setValidationError(null)
          }}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-all cursor-pointer',
            mode === 'new'
              ? 'bg-card text-foreground shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Plus className="size-3.5" />
          <span>איש קשר חדש</span>
        </button>
      </div>

      {mode === 'existing' ? (
        <div className="flex flex-col gap-3">
          <SearchInput
            size="sm"
            variant="card"
            className="h-9 text-xs"
            placeholder="חיפוש לקוח/ה לפי שם או טלפון…"
            value={query}
            onChange={onQueryChange}
            autoFocus
          />

          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-card p-1.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <Loader2 className="size-5 animate-spin me-2 text-primary" />
                <span>טוען לקוחות…</span>
              </div>
            ) : filteredCustomers.length > 0 ? (
              <>
                {filteredCustomers.map((customer) => {
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => onSelectCustomer(customer)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg p-2.5 text-start transition-colors hover:bg-accent/60 cursor-pointer"
                    >
                      <div className="flex flex-1 flex-col min-w-0">
                        <span className="truncate text-sm font-bold text-foreground">
                          {customer.name || 'ללא שם'}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatPhoneForDisplay(customer.phone)}
                        </span>
                      </div>
                      <span className="shrink-0 text-2xs font-semibold text-muted-foreground rounded bg-muted/50 px-2 py-0.5">
                        לקוח/ה
                      </span>
                    </button>
                  )
                })}

                {query.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => handleSwitchToNewWithPrefill(query)}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border p-2 pt-2.5 text-xs font-semibold text-primary hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <Plus className="size-3.5" />
                    <span>לא מצאתם? הוספת איש קשר חדש עם הפרטים האלה</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2 px-3">
                <p className="text-xs text-muted-foreground">
                  {query.trim() ? 'לא נמצא לקוח/ה תואם/ת בחיפוש' : 'הקלידו שם או מספר טלפון לחיפוש'}
                </p>
                {query.trim().length >= 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSwitchToNewWithPrefill(query)}
                    className="text-xs gap-1.5 mt-1"
                  >
                    <Plus className="size-3.5 text-primary" />
                    <span>הוספת איש קשר חדש: &quot;{query.trim()}&quot;</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreateContactSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-name" className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-primary" />
              <span>שם מלא של הלקוח/ה *</span>
            </Label>
            <Input
              id="contact-name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setValidationError(null)
              }}
              placeholder="למשל: דניאל כהן"
              className="h-9 text-xs"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-phone" className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Phone className="size-3.5 text-primary" />
              <span>מספר טלפון (WhatsApp) *</span>
            </Label>
            <Input
              id="contact-phone"
              type="tel"
              value={newPhone}
              onChange={(e) => {
                setNewPhone(e.target.value)
                setValidationError(null)
              }}
              placeholder="050-1234567"
              className="h-9 text-xs text-left tabular-nums"
              dir="ltr"
            />
          </div>

          <p className="text-2xs text-muted-foreground leading-relaxed">
            ייווצר כרטיס לקוח/ה עם השם והטלפון המפורשים, ושם הלקוח/ה ישובץ אוטומטית בתבנית השיחה.
          </p>

          {validationError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-2xs font-semibold text-destructive">
              {validationError}
            </div>
          )}

          <Button
            type="submit"
            size="sm"
            className="w-full mt-1 font-bold gap-1.5 cursor-pointer bg-primary hover:bg-primary/90"
          >
            <span>המשך לבחירת תבנית</span>
            <ArrowLeft className="size-3.5" />
          </Button>
        </form>
      )}
    </div>
  )
}
