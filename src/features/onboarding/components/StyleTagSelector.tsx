import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const SUGGESTED_STYLES = [
  'fine_line',
  'traditional',
  'neo_traditional',
  'realism',
  'blackwork',
  'japanese',
  'geometric',
  'watercolor',
  'tribal',
  'lettering',
  'minimalist',
  'portrait',
]

const STYLE_LABELS: Record<string, string> = {
  fine_line: 'פיין ליין',
  traditional: 'טרדישונל',
  neo_traditional: 'ניאו טרדישונל',
  realism: 'ריאליזם',
  blackwork: 'בלאקוורק',
  japanese: 'יפני',
  geometric: 'גיאומטרי',
  watercolor: 'צבעי מים',
  tribal: 'טרייבל',
  lettering: 'קליגרפיה',
  minimalist: 'מינימליסטי',
  portrait: 'דיוקן',
}

function label(style: string) {
  return (
    STYLE_LABELS[style] ??
    style
      .split('_')
      .filter(Boolean)
      .map((w) => w[0]!.toUpperCase() + w.slice(1))
      .join(' ')
  )
}

interface StyleTagSelectorProps {
  value: string[]
  onChange: (next: string[]) => void
}

export function StyleTagSelector({ value, onChange }: StyleTagSelectorProps) {
  const [customInput, setCustomInput] = useState('')

  function add(style: string) {
    const trimmed = style.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
  }

  function remove(style: string) {
    onChange(value.filter((s) => s !== style))
  }

  const remainingSuggestions = SUGGESTED_STYLES.filter((s) => !value.includes(s))

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((style) => (
            <Badge key={style} variant="secondary" className="gap-1 pr-1">
              {label(style)}
              <button
                type="button"
                aria-label={`הסרת ${label(style)}`}
                onClick={() => remove(style)}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {remainingSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {remainingSuggestions.map((style) => (
            <Button
              key={style}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => add(style)}
            >
              + {label(style)}
            </Button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="הוספת סגנון מותאם אישית"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(customInput)
              setCustomInput('')
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            add(customInput)
            setCustomInput('')
          }}
        >
          הוספה
        </Button>
      </div>
    </div>
  )
}
