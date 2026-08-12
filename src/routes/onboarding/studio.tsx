import { useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Image as ImageIcon } from 'lucide-react'
import { getSettings, updateStudioSettings, uploadStudioLogo } from '@/features/onboarding/server/onboarding'

export const Route = createFileRoute('/onboarding/studio')({
  component: StudioStep,
})

function StudioStep() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => getSettings() })
  const [name, setName] = useState('')
  const [hasEdited, setHasEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const displayName = hasEdited ? name : name || (settings?.studio_name as string) || ''

  const saveMutation = useMutation({
    mutationFn: () => updateStudioSettings({ data: { studio_name: displayName } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      navigate({ to: '/onboarding/hours' })
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'שגיאה בשמירת שם הסטודיו'),
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: { base64: string; filename: string; mimeType: string }) => uploadStudioLogo({ data: file }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = reader.result as string
      setLogoPreview(res)
      uploadLogoMutation.mutate({
        base64: res.split(',')[1] ?? '',
        filename: file.name,
        mimeType: file.type || 'image/png',
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('נא להזין שם סטודיו')
      return
    }
    setError(null)
    saveMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question">
          איך קוראים לסטודיו
          <br />
          שלך?
        </h1>
        <p className="step-hint">זה השם שהלקוחות יראו בכל הודעת וואטסאפ שהסוכן שולח.</p>
      </div>

      <input
        type="text"
        autoFocus
        value={displayName}
        onChange={(e) => {
          setHasEdited(true)
          setName(e.target.value)
        }}
        placeholder="INKMIND Tattoo"
        className="flex h-[60px] w-full items-center rounded-[20px] border border-input/80 bg-card px-4 text-[18px] font-semibold text-foreground shadow-xs outline-none transition-all duration-150 ease-native focus:border-primary focus:ring-4 focus:ring-primary/10"
      />

      {error && <p className="text-[13px] font-bold text-destructive">{error}</p>}

      <div className="flex items-center gap-3.5">
        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleLogoSelect} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground"
        >
          {logoPreview ? (
            <img src={logoPreview} alt="" className="size-full rounded-full object-cover" />
          ) : (
            <ImageIcon size={22} />
          )}
        </button>
        <div className="flex min-w-0 flex-col">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="cursor-pointer text-start text-[15px] font-bold text-foreground">
            להוסיף לוגו?
          </button>
          <span className="text-[13.5px] text-muted-foreground">
            לא חובה — אפשר בכל רגע ·{' '}
            <button type="button" onClick={() => fileInputRef.current?.click()} className="cursor-pointer text-[14.5px] font-extrabold text-primary">
              העלאה
            </button>
          </span>
        </div>
      </div>

      <div className="flex-1" />

      <div className="step-footer">
        <button type="submit" disabled={saveMutation.isPending} className="btn-native">
          {saveMutation.isPending ? 'שומר…' : 'המשך'}
        </button>
        <p className="text-center text-[13.5px] font-medium text-muted-foreground">אפשר לשנות הכל אחר כך בהגדרות</p>
      </div>
    </form>
  )
}
