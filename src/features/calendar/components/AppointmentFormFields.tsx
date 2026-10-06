import { Calendar, Coins, Paperclip } from '@/components/ui/icon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ApiAppointment, ApiGoogleConnection, AppointmentFormValues } from '../types'
import type { QuoteToSend } from './BotQuoteBanner'
import { AppointmentDetailsTab } from './appointment-form/AppointmentDetailsTab'
import { AppointmentPricingTab } from './appointment-form/AppointmentPricingTab'
import { AppointmentDocumentsTab } from './appointment-form/AppointmentDocumentsTab'

interface AppointmentFormFieldsProps {
  values: AppointmentFormValues
  onChange: (patch: Partial<AppointmentFormValues>) => void
  staff: { id: string; name: string; avatar?: string }[]
  googleConnections: ApiGoogleConnection[]
  appointment?: ApiAppointment | null
  onSendQuote?: (quote: QuoteToSend) => void
  isSendingQuote?: boolean
  onOpenGallery?: (images: string[], index: number) => void
  isEdit?: boolean
  readOnly?: boolean
}

/**
 * The appointment dialog's body: three tabs, one per question — when and with whom, how much and
 * where it stands, what the customer sent. Each tab is its own component (dialogs D4); this file is
 * only the switch between them.
 */
export function AppointmentFormFields({
  values,
  onChange,
  staff,
  googleConnections,
  appointment,
  onSendQuote,
  isSendingQuote = false,
  onOpenGallery,
  isEdit = false,
  readOnly = false,
}: AppointmentFormFieldsProps) {
  const hasImages = (appointment?.referenceImages ?? values.referenceImages ?? []).length > 0
  const hasReceipt = Boolean(appointment?.paymentReceiptUrl ?? values.paymentReceiptUrl)
  const hasHealth = Boolean(
    (appointment?.healthDeclarationSigned ?? values.healthDeclarationSigned) || (appointment?.healthDeclarationFileUrl ?? values.healthDeclarationFileUrl),
  )
  const docCount = Number(hasImages) + Number(hasReceipt) + Number(hasHealth)

  return (
    <Tabs defaultValue="details" dir="rtl" className="gap-4">
      <TabsList className="grid grid-cols-3">
        <TabsTrigger value="details" className="gap-1.5">
          <Calendar size={14} className="shrink-0" />
          פרטים
        </TabsTrigger>
        <TabsTrigger value="pricing" className="gap-1.5">
          <Coins size={14} className="shrink-0" />
          מחיר וסטטוס
        </TabsTrigger>
        <TabsTrigger value="documents" className="gap-1.5">
          <Paperclip size={14} className="shrink-0" />
          מסמכים
          {docCount > 0 && <span className="text-xs font-bold text-muted-foreground tabular-nums">· {docCount}</span>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details">
        <AppointmentDetailsTab values={values} onChange={onChange} staff={staff} googleConnections={googleConnections} readOnly={readOnly} />
      </TabsContent>
      <TabsContent value="pricing">
        <AppointmentPricingTab
          values={values}
          onChange={onChange}
          appointment={appointment}
          isEdit={isEdit}
          readOnly={readOnly}
          onSendQuote={onSendQuote}
          isSendingQuote={isSendingQuote}
        />
      </TabsContent>
      <TabsContent value="documents">
        <AppointmentDocumentsTab values={values} appointment={appointment} onOpenGallery={onOpenGallery} />
      </TabsContent>
    </Tabs>
  )
}

export default AppointmentFormFields
