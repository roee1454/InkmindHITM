import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'

export type ToastType = 'info' | 'warning' | 'error' | 'success'

export interface ToastItem {
  id: string
  title: string
  message: string
  type: ToastType
  duration?: number
  onClick?: () => void
}

interface ToastContextType {
  toast: (title: string, message: string, type?: ToastType, duration?: number, onClick?: () => void) => void
  toasts: ToastItem[]
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((title: string, message: string, type: ToastType = 'info', duration = 4000, onClick?: () => void) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, title, message, type, duration, onClick }])
    setTimeout(() => removeToast(id), duration)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      {/* Toast Portal/Container */}
      {/* `start`, not `left` — the document is RTL. Below `sm` the stack spans the viewport
          with a 1rem inset rather than `w-full` + a fixed edge offset, which used to overflow
          by 16px on any screen narrower than 448px. */}
      <div
        className="pointer-events-none fixed inset-x-4 z-[9999] flex flex-col gap-3 sm:inset-x-auto sm:start-4 sm:w-full sm:max-w-md"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        dir="rtl"
      >
        {toasts.map((t) => {
          let bgClass = 'bg-card border-border/80'
          let icon = <Info className="text-primary shrink-0" size={22} />
          if (t.type === 'success') {
            bgClass = 'bg-success/10 border-success/20'
            icon = <CheckCircle className="text-success shrink-0" size={22} />
          } else if (t.type === 'error') {
            bgClass = 'bg-destructive/10 border-destructive/20'
            icon = <AlertCircle className="text-destructive shrink-0" size={22} />
          } else if (t.type === 'warning') {
            bgClass = 'bg-warning/10 border-warning/20'
            icon = <AlertTriangle className="text-warning shrink-0" size={22} />
          }

          return (
            <div
              key={t.id}
              onClick={t.onClick}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg animate-in slide-in-from-top fade-in duration-300 ease-native backdrop-blur-md transition-all sm:gap-4 sm:p-5 ${t.onClick ? 'cursor-pointer active:scale-[0.99]' : ''} ${bgClass}`}
            >
              {icon}
              <div className="flex-1 min-w-0 font-assistant">
                <div className="text-base font-bold text-foreground">{t.title}</div>
                <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{t.message}</div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeToast(t.id)
                }}
                className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer outline-none"
              >
                <X size={18} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
