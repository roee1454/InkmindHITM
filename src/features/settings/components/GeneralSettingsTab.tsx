import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Image as ImageIcon, Moon, Sun } from 'lucide-react'
import { getSettings, updateStudioSettings, uploadStudioLogo } from '@/features/onboarding/server/onboarding'
import { useToast } from '@/components/ui/ToastProvider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SettingsTabSkeleton } from './SettingsTabSkeleton'

const PALETTES = [
  { id: 'indigo', label: 'Indigo', swatch: '#4f46e5' },
  { id: 'nordic', label: 'Nordic', swatch: '#4c7a5b' },
  { id: 'obsidian', label: 'Obsidian', swatch: '#0e8fa8' },
  { id: 'terracotta', label: 'Terracotta', swatch: '#c0603c' },
  { id: 'noir', label: 'Noir', swatch: '#171717' },
  { id: 'amethyst', label: 'Amethyst', swatch: '#7c3aed' },
  { id: 'gold', label: 'Gold', swatch: '#a67c26' },
  { id: 'crimson', label: 'Crimson', swatch: '#9b2226' },
  { id: 'teal', label: 'Teal', swatch: '#0f766e' },
  { id: 'rose', label: 'Rose', swatch: '#b05a72' },
  { id: 'olive', label: 'Olive', swatch: '#6b7a3a' },
  { id: 'steel', label: 'Steel', swatch: '#3b6ea5' },
] as const

function logoUrl(recordId: string, filename: string): string {
  const base = import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090'
  return `${base}/api/files/settings/${recordId}/${encodeURIComponent(filename)}`
}

export function GeneralSettingsTab() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => getSettings() })

  const [studioName, setStudioName] = useState('')
  useEffect(() => {
    if (data?.studio_name) setStudioName(data.studio_name as string)
  }, [data?.studio_name])

  const saveNameMutation = useMutation({
    mutationFn: () => updateStudioSettings({ data: { studio_name: studioName } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast('שם הסטודיו נשמר', 'success')
    },
  })

  const themeMutation = useMutation({
    mutationFn: (theme: (typeof PALETTES)[number]['id']) => updateStudioSettings({ data: { ui_theme: theme } }),
    onSuccess: (_data, theme) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      document.documentElement.setAttribute('data-theme', theme)
      try {
        localStorage.setItem('ui-theme', theme)
      } catch {}
    },
  })

  const darkModeMutation = useMutation({
    mutationFn: (dark: boolean) => updateStudioSettings({ data: { ui_dark_mode: dark } }),
    onSuccess: (_data, dark) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      document.documentElement.classList.toggle('dark', dark)
      try {
        localStorage.setItem('ui-dark-mode', dark ? '1' : '0')
      } catch {}
    },
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: { base64: string; filename: string; mimeType: string }) => uploadStudioLogo({ data: file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast('הלוגו הועלה', 'success')
    },
  })

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = reader.result as string
      uploadLogoMutation.mutate({ base64: res.split(',')[1] ?? '', filename: file.name, mimeType: file.type || 'image/png' })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (isLoading) {
    return <SettingsTabSkeleton />
  }

  const activeTheme = (data?.ui_theme as string) || 'indigo'
  const isDark = Boolean(data?.ui_dark_mode)
  const currentLogoUrl = data?.id && data?.logo ? logoUrl(data.id as string, data.logo as string) : null

  return (
    <div className="flex flex-col gap-6 font-assistant" dir="rtl">
      <div className="hidden lg:flex lg:flex-col lg:gap-0.5">
        <h1 className="text-[23px] font-extrabold tracking-tight text-foreground">כללי</h1>
        <p className="text-[13.5px] font-medium text-muted-foreground">פרטי הסטודיו, מיתוג וערכת נושא</p>
      </div>

      <div className="flex max-w-xl flex-col gap-5">
        <div className="card-native flex flex-col gap-5 p-4">
          <div className="flex items-center gap-3.5">
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleLogoSelect} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border text-muted-foreground"
            >
              {currentLogoUrl ? (
                <img src={currentLogoUrl} alt="לוגו הסטודיו" className="size-full object-cover" />
              ) : (
                <ImageIcon size={22} />
              )}
            </button>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-foreground">לוגו הסטודיו</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer text-start text-[13.5px] font-extrabold text-primary"
              >
                {uploadLogoMutation.isPending ? 'מעלה…' : currentLogoUrl ? 'החלפת לוגו' : 'העלאת לוגו'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="form-label">שם הסטודיו</label>
            <div className="flex gap-2">
              <Input value={studioName} onChange={(e) => setStudioName(e.target.value)} className="flex-1" />
              <Button
                type="button"
                disabled={saveNameMutation.isPending || !studioName.trim()}
                onClick={() => saveNameMutation.mutate()}
                className="shrink-0"
              >
                {saveNameMutation.isPending ? 'שומר…' : 'שמירה'}
              </Button>
            </div>
          </div>
        </div>

        <div className="card-native overflow-hidden">
          <div className="flex flex-col gap-3 p-4">
            <label className="form-label">ערכת נושא</label>
            <div className="grid grid-cols-4 gap-2.5">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => themeMutation.mutate(p.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all duration-150 ease-native active:scale-[0.97] ${
                    activeTheme === p.id ? 'border-primary bg-primary/10' : 'border-border/80'
                  }`}
                >
                  <span
                    className="relative flex size-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: p.swatch }}
                  >
                    {activeTheme === p.id && <Check size={16} className="text-white" />}
                  </span>
                  <span className="text-[11.5px] font-bold text-foreground">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="row-native">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-foreground">מצב כהה</div>
              <div className="text-[13px] text-muted-foreground">{isDark ? 'פעיל' : 'כבוי'}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              onClick={() => darkModeMutation.mutate(!isDark)}
              className={`peer inline-flex h-[30px] w-[50px] shrink-0 cursor-pointer items-center rounded-full border-0 p-[3px] transition-colors duration-150 ease-native ${
                isDark ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`block size-6 rounded-full bg-white shadow-sm transition-transform duration-150 ease-native ${isDark ? 'ms-auto' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GeneralSettingsTab
