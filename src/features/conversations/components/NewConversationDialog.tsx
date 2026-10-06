import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send } from '@/components/ui/icon'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/ToastProvider'
import { customersQueryOptions } from '@/features/customers/utils/customers-query'
import type { Customer } from '@/features/customers/types'
import {
  listApprovedTemplates,
  startConversationWithTemplate,
} from '../server/messages'
import type { UIMetaTemplate } from '@/integrations/whatsapp-cloud-api/types'
import { shouldExcludeTemplate } from '../utils/templates'
import { formatPhoneForDisplay, phoneMatchesQuery } from '@/lib/phone'
import { NewConversationRecipientStep } from './NewConversationRecipientStep'
import { NewConversationTemplateStep } from './NewConversationTemplateStep'
import type { SelectedRecipient } from './NewConversationTemplateStep'

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectConversation: (conversationId: string) => void
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onSelectConversation,
}: NewConversationDialogProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [step, setStep] = useState<'recipient' | 'template'>('recipient')
  const [recipientQuery, setRecipientQuery] = useState('')
  const [selectedRecipient, setSelectedRecipient] = useState<SelectedRecipient | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [paramValues, setParamValues] = useState<string[]>([])
  const [botContinuation, setBotContinuation] = useState(true)

  useEffect(() => {
    if (open) {
      setStep('recipient')
      setRecipientQuery('')
      setSelectedRecipient(null)
      setSelectedTemplateId('')
      setParamValues([])
      setBotContinuation(true)
    }
  }, [open])

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    ...customersQueryOptions(),
    enabled: open,
  })

  const { data: templatesData, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['approved-whatsapp-templates'],
    queryFn: () => listApprovedTemplates(),
    enabled: open && step === 'template',
    staleTime: 60_000,
  })

  const rawTemplates = templatesData?.templates ?? []
  const templates = useMemo(
    () => rawTemplates.filter((t) => !shouldExcludeTemplate(t)),
    [rawTemplates],
  )

  useEffect(() => {
    if (templates.length > 0 && (!selectedTemplateId || !templates.some((t) => t.id === selectedTemplateId))) {
      setSelectedTemplateId(templates[0]!.id)
    }
  }, [templates, selectedTemplateId])

  const currentTemplate: UIMetaTemplate | undefined =
    templates.find((t) => t.id === selectedTemplateId) || templates[0]

  useEffect(() => {
    if (!currentTemplate) {
      setParamValues([])
      return
    }
    const initial = currentTemplate.params.map((_, idx) => {
      if (idx === 0 && selectedRecipient?.name) {
        return selectedRecipient.name
      }
      return ''
    })
    setParamValues(initial)
  }, [selectedTemplateId, selectedRecipient, currentTemplate])

  const filteredCustomers = useMemo(() => {
    const q = recipientQuery.trim().toLowerCase()
    if (!q) return customers.slice(0, 8)
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        phoneMatchesQuery(c.phone, q),
    ).slice(0, 8)
  }, [customers, recipientQuery])

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedRecipient({
      customerId: customer.id,
      name: customer.name || formatPhoneForDisplay(customer.phone),
      phone: customer.phone || '',
    })
    setStep('template')
  }

  const handleSelectNewContact = (contact: { name: string; phone: string }) => {
    setSelectedRecipient({
      name: contact.name,
      phone: contact.phone,
      isNew: true,
    })
    setStep('template')
  }

  const renderPreview = (tpl: UIMetaTemplate | undefined, values: string[]): string => {
    if (!tpl) return ''
    let preview = tpl.bodyText
    tpl.params.forEach((p, idx) => {
      const val = values[idx]?.trim() || `{{${p.index}}}`
      const regex = new RegExp(`\\{\\{${p.index}\\}\\}`, 'g')
      preview = preview.replace(regex, val)
    })
    return preview
  }

  const previewText = renderPreview(currentTemplate, paramValues)

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRecipient || !currentTemplate) {
        throw new Error('חסרים פרטי נמען או תבנית.')
      }
      return startConversationWithTemplate({
        data: {
          customerId: selectedRecipient.customerId,
          phone: selectedRecipient.phone,
          customerName: selectedRecipient.name,
          templateName: currentTemplate.name,
          languageCode: currentTemplate.language,
          parameters: currentTemplate.params.map((_, i) => paramValues[i] || ''),
          renderedBody: previewText,
          initialStatus: botContinuation ? 'bot_active' : 'staff_handling',
        },
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', res.conversationId] })
      toast('התבנית נשלחה והשיחה נפתחה בהצלחה!', '', 'success')
      onOpenChange(false)
      onSelectConversation(res.conversationId)
    },
    onError: (err: Error) => {
      toast('שליחת השיחה נכשלה', err.message || 'אירעה שגיאה', 'error')
    },
  })

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="שיחה חדשה"
      description={step === 'recipient' ? 'עם מי? לקוח קיים או מספר חדש.' : 'השיחה נפתחת בתבנית מאושרת, כי ללקוח שלא כתב לאחרונה אי אפשר לכתוב חופשי.'}
      footer={
        step === 'template' ? (
          <DialogActions
            start={
              <Button type="button" variant="ghost" onClick={() => setStep('recipient')} disabled={sendMutation.isPending}>
                חזרה
              </Button>
            }
          >
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={sendMutation.isPending}>
              ביטול
            </Button>
            {templates.length > 0 && (
              <Button type="button" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate()} className="min-w-28 gap-1.5">
                {sendMutation.isPending ? (
                  'שולח…'
                ) : (
                  <>
                    <Send className="size-3.5 rotate-180" />
                    שליחה ופתיחת שיחה
                  </>
                )}
              </Button>
            )}
          </DialogActions>
        ) : undefined
      }
    >
      {step === 'recipient' ? (
        <NewConversationRecipientStep
          query={recipientQuery}
          onQueryChange={setRecipientQuery}
          filteredCustomers={filteredCustomers}
          isLoading={isLoadingCustomers}
          onSelectCustomer={handleSelectCustomer}
          onSelectNewContact={handleSelectNewContact}
        />
      ) : (
        selectedRecipient && (
          <NewConversationTemplateStep
            selectedRecipient={selectedRecipient}
            onBackToRecipient={() => setStep('recipient')}
            templates={templates}
            isLoadingTemplates={isLoadingTemplates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplateId={setSelectedTemplateId}
            paramValues={paramValues}
            onParamChange={(idx, val) => setParamValues((p) => p.map((v, i) => (i === idx ? val : v)))}
            previewText={previewText}
            botContinuation={botContinuation}
            onBotContinuationChange={setBotContinuation}
          />
        )
      )}
    </ResponsiveDialog>
  )
}
