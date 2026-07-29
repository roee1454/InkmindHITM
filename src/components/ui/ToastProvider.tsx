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
      <div className="fixed top-4 left-4 z-[9999] flex flex-col gap-3 w-full max-w-md pointer-events-none" dir="rtl">
        {toasts.map((t) => {
          let bgClass = 'bg-card border-border'
          let icon = <Info className="text-blue-500 shrink-0" size={22} />
          if (t.type === 'success') {
            bgClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-50'
            icon = <CheckCircle className="text-emerald-500 shrink-0" size={22} />
          } else if (t.type === 'error') {
            bgClass = 'bg-rose-500/10 border-rose-500/20 text-rose-950 dark:text-rose-50'
            icon = <AlertCircle className="text-rose-500 shrink-0" size={22} />
          } else if (t.type === 'warning') {
            bgClass = 'bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-50'
            icon = <AlertTriangle className="text-amber-500 shrink-0" size={22} />
          }

          return (
            <div
              key={t.id}
              onClick={t.onClick}
              className={`flex items-start gap-4 rounded-2xl border p-5 shadow-xl animate-slide-in backdrop-blur-md transition-all duration-300 pointer-events-auto ${t.onClick ? 'cursor-pointer hover:scale-[1.01] hover:brightness-[0.98] active:scale-[0.99]' : ''} ${bgClass}`}
            >
              {icon}
              <div className="flex-1 min-w-0 font-assistant">
                <div className="text-base font-bold">{t.title}</div>
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
