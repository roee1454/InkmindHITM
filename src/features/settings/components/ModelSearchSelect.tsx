import React, { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check, Sparkles, X } from 'lucide-react'

export interface ModelOption {
  id: string
  name: string
  category?: string
  description?: string
  badge?: string
}

export const REAL_AI_MODELS: ModelOption[] = [
  {
    id: 'claude-sonnet-5',
    name: 'Claude 5 Sonnet',
    category: 'Flagship (Anthropic)',
    description: 'מודל הדגל המקצועי החדש של Anthropic — מומלץ ביותר לצייתנות ודיוק',
    badge: 'מומלץ',
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    category: 'Reasoning (Anthropic)',
    description: 'מודל הדגל לעיבוד מידע ומשימות לוגיות מורכבות במיוחד',
    badge: 'חזק',
  },
]

interface ModelSearchSelectProps {
  value: string
  onChange: (value: string) => void
}

export const ModelSearchSelect: React.FC<ModelSearchSelectProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const filteredModels = REAL_AI_MODELS.filter(
    (m) =>
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase())),
  )

  const selectedModelObj = REAL_AI_MODELS.find((m) => m.id === value)
  const isCustomModel = !selectedModelObj && value

  const handleSelect = (modelId: string) => {
    onChange(modelId)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative w-full font-assistant" dir="rtl">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-input/80 bg-card px-4 text-right text-base text-foreground shadow-xs outline-none transition-all duration-150 ease-native active:scale-[0.99] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 md:h-11 md:text-[15px]"
      >
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <Sparkles size={16} className="shrink-0 text-primary" />
          <span className="truncate font-bold min-w-0">
            {selectedModelObj ? selectedModelObj.name : value || 'בחר מודל AI…'}
          </span>
          {selectedModelObj?.badge && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-micro font-bold text-primary">
              {selectedModelObj.badge}
            </span>
          )}
          {isCustomModel && (
            <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-micro font-bold text-amber-500">
              מותאם אישית
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-border/80 bg-popover shadow-lg">
          <div className="border-b border-border/60 p-2">
            <div className="relative flex items-center">
              <Search size={15} className="pointer-events-none absolute right-3 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חפש מודל (למשל: gpt-4o, gpt-5, o3…)"
                className="w-full rounded-xl border border-input/80 bg-card py-1.5 pr-9 pl-8 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute left-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {filteredModels.length > 0
              ? filteredModels.map((m) => {
                  const isSelected = value === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(m.id)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-right transition-colors ${
                        isSelected
                          ? 'border border-primary/30 bg-primary/15 text-foreground'
                          : 'text-foreground hover:bg-muted/70'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 overflow-hidden min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-assistant text-xs font-bold truncate">{m.name}</span>
                          <span className="hidden sm:inline font-mono text-micro text-muted-foreground/70">({m.id})</span>
                          {m.badge && (
                            <span className="rounded bg-primary/10 px-1.5 text-micro font-bold text-primary">
                              {m.badge}
                            </span>
                          )}
                        </div>
                        {m.description && (
                          <span className="truncate text-mini leading-tight text-muted-foreground">
                            {m.description}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={14} className="mr-2 shrink-0 text-primary" />}
                    </button>
                  )
                })
              : null}

            {search.trim() && !REAL_AI_MODELS.some((m) => m.id === search.trim()) && (
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-right text-amber-400 transition-colors hover:bg-amber-500/20"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">השתמש במודל:</span>
                  <span className="font-mono text-xs font-semibold">{search.trim()}</span>
                </div>
                <Check size={14} className="shrink-0 text-amber-400" />
              </button>
            )}

            {filteredModels.length === 0 && !search.trim() && (
              <div className="p-3 text-center text-xs text-muted-foreground">לא נמצאו מודלים</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
