import { useQuery } from '@tanstack/react-query'
import { EllipsisVertical, ExternalLink, FileText, Paperclip, RotateCcw, ShieldCheck, Trash2 } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="פעולות נוספות">
          <EllipsisVertical className="size-4.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 font-assistant">
        <DropdownMenuItem onClick={() => onOpenDialog('health')}>
          <ShieldCheck />
          הצהרת בריאות
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpenDialog('gallery')}>
          <Paperclip />
          תמונות ומסמכים
        </DropdownMenuItem>
        {windowExpired && (
          <DropdownMenuItem onClick={() => onOpenDialog('template')}>
            <FileText />
            שליחת תבנית מאושרת
          </DropdownMenuItem>
        )}
        {digits && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer">
                <ExternalLink />
                פתיחה בוואטסאפ
              </a>
            </DropdownMenuItem>
          </>
        )}
        {currentStaff?.isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void resetBot()}>
              <RotateCcw />
              איפוס שיחת הבוט
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onOpenDialog('delete')}>
              <Trash2 />
              מחיקת השיחה
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
