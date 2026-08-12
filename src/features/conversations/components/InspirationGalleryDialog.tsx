import { useState } from 'react'
import { Image as ImageIcon, ReceiptText } from 'lucide-react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ImageGalleryDialog } from '@/features/calendar/components/ImageGalleryDialog'

export interface ReceiptEntry {
  url: string
  timestamp: string
}

interface InspirationGalleryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inspirationImages: string[]
  receipts: ReceiptEntry[]
}

/** The conversation ⋮ menu's dialog — customer reference images and payment receipts for this
 *  conversation, in two tabs. Generalizes calendar's `ImageGalleryDialog` (reused here as the
 *  tap-to-zoom lightbox for either tab) instead of building a second lightbox. */
export function InspirationGalleryDialog({
  open,
  onOpenChange,
  inspirationImages,
  receipts,
}: InspirationGalleryDialogProps) {
  const [zoom, setZoom] = useState<{ images: string[]; index: number } | null>(null)

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title="גלריית שיחה"
        description="תמונות השראה ואסמכתות תשלום עבור השיחה"
        contentClassName="sm:max-w-lg"
      >
          <Tabs defaultValue="images" dir="rtl">
            <TabsList>
              <TabsTrigger value="images">
                <ImageIcon size={15} />
                תמונות השראה
              </TabsTrigger>
              <TabsTrigger value="receipts">
                <ReceiptText size={15} />
                אסמכתות
              </TabsTrigger>
            </TabsList>

            <TabsContent value="images" className="pt-3">
              {inspirationImages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">אין תמונות השראה בשיחה הזאת</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {inspirationImages.map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setZoom({ images: inspirationImages, index: idx })}
                      className="aspect-square cursor-pointer overflow-hidden rounded-2xl border border-border/80 bg-muted"
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="receipts" className="pt-3">
              {receipts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">אין אסמכתות בשיחה הזאת</p>
              ) : (
                <div className="card-native overflow-hidden">
                  {receipts.map((receipt, idx) => (
                    <button
                      key={receipt.url}
                      type="button"
                      onClick={() => setZoom({ images: receipts.map((r) => r.url), index: idx })}
                      className="row-native w-full cursor-pointer"
                    >
                      <div className="size-11 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted">
                        <img src={receipt.url} alt="" className="h-full w-full object-cover" />
                      </div>
                      <span className="flex-1 text-start text-[13.5px] font-medium text-muted-foreground">
                        {new Date(receipt.timestamp).toLocaleString('he-IL', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
      </ResponsiveDialog>

      <ImageGalleryDialog
        images={zoom?.images ?? []}
        initialIndex={zoom?.index ?? 0}
        open={zoom !== null}
        onOpenChange={(open) => !open && setZoom(null)}
      />
    </>
  )
}

export default InspirationGalleryDialog
