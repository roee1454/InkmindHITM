import { useQuery } from '@tanstack/react-query'
import { EllipsisVertical, ExternalLink, FileText, Paperclip, RotateCcw, ShieldCheck, Trash2 } from '@/components/ui/icon'
import { IMButton } from '@/components/ui/button'
import { IMDropdownMenu, IMDropdownMenuContent, IMDropdownMenuItem, IMDropdownMenuSeparator, IMDropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { getCurrentStaffInfo } from '@/features/settings/server/staff'
import type { CurrentStaffInfo } from '@/features/settings/server/staff'
import { useResetBotConversation } from '../hooks/use-reset-bot-conversation'
import type { ThreadDialog } from './ConversationDialogs'

interface ConversationMenuProps {
  conversationId: string
  customerPhone: string
  windowExpired: boolean
  onOpenDialog: (dialog: ThreadDialog) => void
}

/** Everything the thread can do beyond its next step and the bot/staff switch in the header. Plain rows: the icon names the action, it doesn't colour it. */
export function ConversationMenu({ conversationId, customerPhone, windowExpired, onOpenDialog }: ConversationMenuProps) {
  const { data: currentStaff } = useQuery<CurrentStaffInfo>({ queryKey: ['currentStaff'], queryFn: () => getCurrentStaffInfo() })
  const resetBot = useResetBotConversation(conversationId)
  const digits = customerPhone.replace(/\D/g, '')

  return (
    <IMDropdownMenu dir="rtl">
      <IMDropdownMenuTrigger asChild>
        <IMButton variant="ghost" size="icon" className="size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="פעולות נוספות">
          <EllipsisVertical className="size-4.5" />
        </IMButton>
      </IMDropdownMenuTrigger>
      <IMDropdownMenuContent align="end" className="min-w-52 font-assistant">
        <IMDropdownMenuItem onClick={() => onOpenDialog('health')}>
          <ShieldCheck />
          הצהרת בריאות
        </IMDropdownMenuItem>
        <IMDropdownMenuItem onClick={() => onOpenDialog('gallery')}>
          <Paperclip />
          תמונות ומסמכים
        </IMDropdownMenuItem>
        {windowExpired && (
          <IMDropdownMenuItem onClick={() => onOpenDialog('template')}>
            <FileText />
            שליחת תבנית מאושרת
          </IMDropdownMenuItem>
        )}
        {digits && (
          <>
            <IMDropdownMenuSeparator />
            <IMDropdownMenuItem asChild>
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer">
                <ExternalLink />
                פתיחה בוואטסאפ
              </a>
            </IMDropdownMenuItem>
          </>
        )}
        {currentStaff?.isAdmin && (
          <>
            <IMDropdownMenuSeparator />
            <IMDropdownMenuItem onClick={() => void resetBot()}>
              <RotateCcw />
              איפוס שיחת הבוט
            </IMDropdownMenuItem>
            <IMDropdownMenuItem variant="destructive" onClick={() => onOpenDialog('delete')}>
              <Trash2 />
              מחיקת השיחה
            </IMDropdownMenuItem>
          </>
        )}
      </IMDropdownMenuContent>
    </IMDropdownMenu>
  )
}
