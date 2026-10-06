import { useState } from 'react'
import { HealthDeclarationSummary } from '@/features/health-declaration/components/HealthDeclarationSummary'
import { HealthDeclarationDialog } from '@/features/health-declaration/components/HealthDeclarationDialog'
import type { ApiAppointment, AppointmentFormValues } from '../../types'

interface AppointmentDocumentsTabProps {
  values: AppointmentFormValues
  appointment?: ApiAppointment | null
  onOpenGallery?: (images: string[], index: number) => void
}

/** What the customer sent: inspiration images, the deposit receipt, the health declaration. */
export function AppointmentDocumentsTab({ values, appointment, onOpenGallery }: AppointmentDocumentsTabProps) {
  const [healthDialogOpen, setHealthDialogOpen] = useState(false)
  const refImages = appointment?.referenceImages ?? values.referenceImages ?? []

  return (
    <div className="flex flex-col gap-4">
    <section aria-labelledby="doc-references" className="flex flex-col gap-2">
      <h4 id="doc-references" className="flex items-center justify-between text-sm font-bold text-foreground">
        תמונות השראה
        <span className="text-xs font-medium text-muted-foreground">{refImages.length > 0 ? `${refImages.length} תמונות` : ''}</span>
      </h4>
      {refImages.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto py-1" dir="rtl">
          {refImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onOpenGallery?.(refImages, idx)}
              className="relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-muted transition-opacity hover:opacity-85"
              title={`תמונה ${idx + 1}`}
            >
              <img src={img} alt={`השראה ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">הלקוח לא שלח תמונות השראה.</p>
      )}
    </section>

    <section aria-labelledby="doc-receipt" className="flex flex-col gap-2 border-t border-border pt-4">
      <h4 id="doc-receipt" className="text-sm font-bold text-foreground">
        אסמכתת מקדמה
      </h4>
      {(appointment?.paymentReceiptUrl || values.paymentReceiptUrl) ? (
        <button
          type="button"
          onClick={() => onOpenGallery?.([(appointment?.paymentReceiptUrl || values.paymentReceiptUrl)!], 0)}
          className="flex cursor-pointer items-center gap-3 rounded-lg text-start transition-opacity hover:opacity-85"
        >
          <img src={(appointment?.paymentReceiptUrl || values.paymentReceiptUrl)!} alt="אסמכתה" className="size-12 shrink-0 rounded-lg border border-border bg-muted object-cover" />
          <span className="flex flex-col">
            <span className="text-sm font-bold text-foreground">התקבלה בוואטסאפ</span>
            <span className="text-xs text-muted-foreground">לחיצה לצפייה</span>
          </span>
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">עדיין לא התקבלה אסמכתה.</p>
      )}
    </section>

    <section aria-label="הצהרת בריאות" className="border-t border-border pt-4">
    {/* Card 3: Health Declaration with Medical Alerts & Full Q&A */}
    <HealthDeclarationSummary
      signed={appointment?.healthDeclarationSigned || values.healthDeclarationSigned}
      date={appointment?.healthDeclarationDate || values.healthDeclarationDate}
      medicalNotes={appointment?.medicalNotes || values.medicalNotes}
      answers={appointment?.healthDeclarationAnswers || values.healthDeclarationAnswers}
      allergies={appointment?.allergies || values.allergies}
      onOpenFull={() => setHealthDialogOpen(true)}
    />

    </section>

    <HealthDeclarationDialog
      open={healthDialogOpen}
      onOpenChange={setHealthDialogOpen}
      signed={appointment?.healthDeclarationSigned || values.healthDeclarationSigned}
      date={appointment?.healthDeclarationDate || values.healthDeclarationDate}
      url={appointment?.healthDeclarationFileUrl || values.healthDeclarationFileUrl}
      medicalNotes={appointment?.medicalNotes || values.medicalNotes}
      answers={appointment?.healthDeclarationAnswers || values.healthDeclarationAnswers}
      allergies={appointment?.allergies || values.allergies}
      customerName={values.leadName}
    />
    </div>
  )
}
