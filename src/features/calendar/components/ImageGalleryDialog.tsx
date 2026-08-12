import React, { useState, useEffect } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageGalleryDialogProps {
  images: string[]
  initialIndex?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ImageGalleryDialog: React.FC<ImageGalleryDialogProps> = ({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex)

  useEffect(() => {
    if (open) setActiveIndex(initialIndex)
  }, [open, initialIndex])

  if (images.length === 0) return null

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveIndex((prev) => (prev + 1) % images.length)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="גלריית תמונות"
      description="תצוגת תמונות התייחסות לתור"
      hideHeader
      contentClassName="sm:max-w-2xl items-center outline-none select-none max-h-[95vh] overflow-y-auto"
    >
      <div className="text-xs font-bold text-muted-foreground mb-3 select-none">
        תמונה {activeIndex + 1} מתוך {images.length}
      </div>

      <div
        className="w-full aspect-square flex items-center justify-center bg-muted/30 border border-border rounded-xl overflow-hidden relative group"
        style={{ maxHeight: 'min(380px, 45vh)' }}
      >
        <img
          src={images[activeIndex]}
          alt="Reference Preview"
          className="max-w-full max-h-full object-contain select-none"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-card/90 border border-border hover:bg-muted text-foreground p-2.5 rounded-full transition cursor-pointer z-10 shadow-sm"
            >
              <ChevronRight size={22} />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-card/90 border border-border hover:bg-muted text-foreground p-2.5 rounded-full transition cursor-pointer z-10 shadow-sm"
            >
              <ChevronLeft size={22} />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto max-w-full mt-4 py-2 px-2 bg-muted/30 border border-border rounded-xl">
          {images.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 cursor-pointer transition-all shrink-0 ${
                idx === activeIndex
                  ? 'border-primary scale-105 shadow-sm'
                  : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover select-none" />
            </div>
          ))}
        </div>
      )}
    </ResponsiveDialog>
  )
}

export default ImageGalleryDialog
