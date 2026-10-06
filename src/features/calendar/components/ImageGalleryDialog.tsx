import React, { useState, useEffect } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { ChevronLeft, ChevronRight } from '@/components/ui/icon'

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
      size="lg"
      title={images.length > 1 ? `תמונה ${activeIndex + 1} מתוך ${images.length}` : 'תמונה'}
    >
      <div
        className="flex flex-col gap-3 outline-none select-none"
        tabIndex={-1}
        onKeyDown={(e) => {
          // RTL: the right arrow goes back, the left arrow forward — the same way the buttons sit.
          if (images.length < 2) return
          if (e.key === 'ArrowRight') setActiveIndex((i) => (i - 1 + images.length) % images.length)
          if (e.key === 'ArrowLeft') setActiveIndex((i) => (i + 1) % images.length)
        }}
      >
        <div className="relative flex aspect-square max-h-[min(28rem,55vh)] w-full items-center justify-center overflow-hidden rounded-lg bg-muted/40">
          <img src={images[activeIndex]} alt={`תמונה ${activeIndex + 1}`} className="max-h-full max-w-full object-contain" />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="התמונה הקודמת"
                className="absolute end-auto start-3 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card/90 text-foreground transition-colors hover:bg-muted"
              >
                <ChevronRight size={20} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="התמונה הבאה"
                className="absolute end-3 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card/90 text-foreground transition-colors hover:bg-muted"
              >
                <ChevronLeft size={20} />
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto py-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`תמונה ${idx + 1}`}
                aria-current={idx === activeIndex || undefined}
                className={`size-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-opacity ${
                  idx === activeIndex ? 'border-foreground' : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  )
}

export default ImageGalleryDialog
