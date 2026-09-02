import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { createCustomer } from '@/features/customers/server/customers'
import { SOURCE_LABELS } from '@/features/customers/types'

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

export const AddCustomerDialog: React.FC<AddCustomerDialogProps> = ({ open, onOpenChange, onCreated }) => {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('walk-in')
  const [isVip, setIsVip] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setName('')
    setPhone('')
    setEmail('')
    setSource('walk-in')
    setIsVip(false)
    setError(null)
  }

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
      onCreated({ id: res.id, name: name || 'לקוח', phone })
      resetForm()
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הלקוח')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) {
      setError('מספר טלפון הוא שדה חובה')
      return
    }
    setError(null)
    createCustMutation.mutate({ name: name || 'לקוח', phone, email, source, isVip })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm()
        onOpenChange(next)
      }}
      title="הוספת לקוח חדש"
      description="הזן את פרטי הלקוח החדש במאגר."
    >
      {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">שם מלא</label>
          <Input
            type="text"
            placeholder="למשל: דניאל חיים"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">מספר טלפון (חובה)</label>
          <Input
            type="text"
            placeholder="למשל: 0547654321"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">אימייל</label>
          <Input
            type="email"
            placeholder="client@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="flex flex-col gap-1.5" dir="rtl">
          <label className="text-xs font-semibold text-foreground">מקור הגעה</label>
          <Select value={source} onValueChange={setSource}>
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
            <span className="text-micro text-muted-foreground">סמן לקוח זה כ-VIP</span>
          </div>
          <Switch checked={isVip} onCheckedChange={setIsVip} />
        </div>

        <Button
          type="submit"
          disabled={createCustMutation.isPending}
          className="w-full rounded-xl mt-2 font-bold cursor-pointer"
        >
          {createCustMutation.isPending ? 'יוצר לקוח…' : 'הוסף לקוח'}
        </Button>
      </form>
    </ResponsiveDialog>
  )
}

export default AddCustomerDialog
