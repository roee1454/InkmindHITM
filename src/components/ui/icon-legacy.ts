/**
 * INTERIM — the lucide-named icon exports from before the IM registry (`Trash2`, `Loader2`, `XIcon`…).
 * Deleted in plan Phase 3, item 3.1 (docs/im-design-system/plan.md), once
 * `grep -rw <name> src tests` finds no caller for any export below. Don't add callers: new code
 * uses `<IMIcon name="…" />`, and `eslint/design-system/icons.js` flags every import of these.
 *
 * Each export draws exactly what `<IMIcon name={LEGACY_TO_IM[export]} />` draws — the registry's
 * glyph, weight and RTL mirroring — but keeps the old props (`size={15}`, `className="h-4 w-4"`),
 * so the Phase 2 codemod (`pnpm ds:codemod icons <path>`) changes no pixels.
 *
 * Physical names map by what they show under the app's `dir="rtl"`: `ChevronLeft` points to the
 * inline end, so it is `chevron-end`; `ArrowLeft`'s one caller is a "continue" button, which the
 * registry has no forward arrow for, so it maps to `chevron-end` as well.
 */
import { createElement } from 'react'
import { cn } from '@/lib/utils'
import { IM_ICONS, IM_ICON_MIRROR_CLASS } from './icon-registry'
import type { IMGlyphProps, IMIconName } from './icon-registry'

/** Every legacy export → the registry name that replaces it. The codemod and the icons doc read it. */
export const LEGACY_TO_IM = {
  Activity: 'activity',
  AlertCircle: 'warning-circle',
  AlertTriangle: 'warning',
  ArrowLeft: 'chevron-end',
  ArrowUp: 'arrow-up',
  ArrowsClockwise: 'refresh',
  BadgeCheck: 'verified',
  Bank: 'bank',
  Bell: 'bell',
  BellRing: 'bell-ringing',
  Bot: 'bot',
  BotOff: 'prohibited',
  Calendar: 'calendar',
  CalendarCheck: 'calendar-check',
  CalendarClock: 'calendar',
  CalendarDays: 'calendar',
  CalendarOff: 'calendar-off',
  CalendarPlus: 'calendar-plus',
  CalendarX: 'calendar-x',
  ChartBar: 'chart-bar',
  Check: 'check',
  CheckCheck: 'check-double',
  CheckCircle: 'check-circle',
  CheckCircle2: 'check-circle',
  CheckIcon: 'check',
  ChevronDown: 'chevron-down',
  ChevronDownIcon: 'chevron-down',
  ChevronLeft: 'chevron-end',
  ChevronRight: 'chevron-start',
  ChevronRightIcon: 'chevron-start',
  ChevronUp: 'chevron-up',
  ChevronUpIcon: 'chevron-up',
  CircleIcon: 'dot',
  ClipboardList: 'clipboard',
  Clock: 'clock',
  Coins: 'coins',
  CreditCard: 'credit-card',
  Copy: 'copy',
  Database: 'database',
  Download: 'download',
  Edit3: 'edit',
  EllipsisVertical: 'more',
  ExternalLink: 'external-link',
  Eye: 'eye',
  EyeOff: 'eye-off',
  FileCheck: 'file-download',
  FileText: 'file-text',
  HelpCircle: 'help',
  Home: 'home',
  Image: 'image',
  Info: 'info',
  KeyRound: 'key',
  Link: 'link',
  Link2: 'link',
  Loader2: 'spinner',
  Lock: 'lock',
  LogOut: 'logout',
  Mail: 'mail',
  MapPin: 'map-pin',
  Menu: 'menu',
  MessageCircle: 'chat',
  MessageSquare: 'chat',
  MessageSquarePlus: 'chat',
  Monitor: 'monitor',
  Moon: 'moon',
  Needle: 'needle',
  Tattoo: 'needle',
  Paperclip: 'attach',
  PaperPlaneTilt: 'send',
  PenTool: 'pen-nib',
  Pencil: 'edit',
  PencilLine: 'edit',
  PencilSimple: 'edit',
  Phone: 'phone',
  Plus: 'plus',
  Receipt: 'receipt',
  ReceiptText: 'receipt',
  RefreshCw: 'refresh',
  Repeat: 'repeat',
  Reply: 'reply',
  RotateCcw: 'undo',
  Search: 'search',
  Send: 'send',
  SendHorizontal: 'send',
  Settings: 'settings',
  ShieldAlert: 'shield-warning',
  ShieldCheck: 'shield-check',
  SidebarToggle: 'sidebar',
  SlidersHorizontal: 'filter',
  Sparkle: 'sparkle',
  Sparkles: 'sparkle',
  SquareKanban: 'kanban',
  Star: 'star',
  Sun: 'sun',
  Trash: 'trash',
  Trash2: 'trash',
  TriangleAlert: 'warning',
  Upload: 'upload',
  Warning: 'warning',
  User: 'user',
  Users: 'users',
  Wallet: 'wallet',
  X: 'close',
  XIcon: 'close',
  ZoomIn: 'zoom-in',
} as const satisfies Record<string, IMIconName>

export type LegacyIconName = keyof typeof LEGACY_TO_IM

function legacyIcon(name: IMIconName) {
  const { glyph, weight, mirrorInRtl } = IM_ICONS[name]
  function LegacyIcon({ className, ...props }: IMGlyphProps) {
    // `weight` comes last: the registry decides it, as it does for IMIcon.
    return createElement(glyph, {
      ...props,
      weight,
      className: cn('shrink-0', mirrorInRtl && IM_ICON_MIRROR_CLASS, className),
    })
  }
  LegacyIcon.displayName = `LegacyIcon(${name})`
  return LegacyIcon
}

export const Activity = legacyIcon(LEGACY_TO_IM.Activity)
export const AlertCircle = legacyIcon(LEGACY_TO_IM.AlertCircle)
export const AlertTriangle = legacyIcon(LEGACY_TO_IM.AlertTriangle)
export const ArrowLeft = legacyIcon(LEGACY_TO_IM.ArrowLeft)
export const ArrowUp = legacyIcon(LEGACY_TO_IM.ArrowUp)
export const ArrowsClockwise = legacyIcon(LEGACY_TO_IM.ArrowsClockwise)
export const BadgeCheck = legacyIcon(LEGACY_TO_IM.BadgeCheck)
export const Bank = legacyIcon(LEGACY_TO_IM.Bank)
export const Bell = legacyIcon(LEGACY_TO_IM.Bell)
export const BellRing = legacyIcon(LEGACY_TO_IM.BellRing)
export const Bot = legacyIcon(LEGACY_TO_IM.Bot)
export const BotOff = legacyIcon(LEGACY_TO_IM.BotOff)
export const Calendar = legacyIcon(LEGACY_TO_IM.Calendar)
export const CalendarCheck = legacyIcon(LEGACY_TO_IM.CalendarCheck)
export const CalendarClock = legacyIcon(LEGACY_TO_IM.CalendarClock)
export const CalendarDays = legacyIcon(LEGACY_TO_IM.CalendarDays)
export const CalendarOff = legacyIcon(LEGACY_TO_IM.CalendarOff)
export const CalendarPlus = legacyIcon(LEGACY_TO_IM.CalendarPlus)
export const CalendarX = legacyIcon(LEGACY_TO_IM.CalendarX)
export const ChartBar = legacyIcon(LEGACY_TO_IM.ChartBar)
export const Check = legacyIcon(LEGACY_TO_IM.Check)
export const CheckCheck = legacyIcon(LEGACY_TO_IM.CheckCheck)
export const CheckCircle = legacyIcon(LEGACY_TO_IM.CheckCircle)
export const CheckCircle2 = legacyIcon(LEGACY_TO_IM.CheckCircle2)
export const CheckIcon = legacyIcon(LEGACY_TO_IM.CheckIcon)
export const ChevronDown = legacyIcon(LEGACY_TO_IM.ChevronDown)
export const ChevronDownIcon = legacyIcon(LEGACY_TO_IM.ChevronDownIcon)
export const ChevronLeft = legacyIcon(LEGACY_TO_IM.ChevronLeft)
export const ChevronRight = legacyIcon(LEGACY_TO_IM.ChevronRight)
export const ChevronRightIcon = legacyIcon(LEGACY_TO_IM.ChevronRightIcon)
export const ChevronUp = legacyIcon(LEGACY_TO_IM.ChevronUp)
export const ChevronUpIcon = legacyIcon(LEGACY_TO_IM.ChevronUpIcon)
export const CircleIcon = legacyIcon(LEGACY_TO_IM.CircleIcon)
export const ClipboardList = legacyIcon(LEGACY_TO_IM.ClipboardList)
export const Clock = legacyIcon(LEGACY_TO_IM.Clock)
export const Coins = legacyIcon(LEGACY_TO_IM.Coins)
export const CreditCard = legacyIcon(LEGACY_TO_IM.CreditCard)
export const Copy = legacyIcon(LEGACY_TO_IM.Copy)
export const Database = legacyIcon(LEGACY_TO_IM.Database)
export const Download = legacyIcon(LEGACY_TO_IM.Download)
export const Edit3 = legacyIcon(LEGACY_TO_IM.Edit3)
export const EllipsisVertical = legacyIcon(LEGACY_TO_IM.EllipsisVertical)
export const ExternalLink = legacyIcon(LEGACY_TO_IM.ExternalLink)
export const Eye = legacyIcon(LEGACY_TO_IM.Eye)
export const EyeOff = legacyIcon(LEGACY_TO_IM.EyeOff)
export const FileCheck = legacyIcon(LEGACY_TO_IM.FileCheck)
export const FileText = legacyIcon(LEGACY_TO_IM.FileText)
export const HelpCircle = legacyIcon(LEGACY_TO_IM.HelpCircle)
export const Home = legacyIcon(LEGACY_TO_IM.Home)
export const Image = legacyIcon(LEGACY_TO_IM.Image)
export const Info = legacyIcon(LEGACY_TO_IM.Info)
export const KeyRound = legacyIcon(LEGACY_TO_IM.KeyRound)
export const Link = legacyIcon(LEGACY_TO_IM.Link)
export const Link2 = legacyIcon(LEGACY_TO_IM.Link2)
export const Loader2 = legacyIcon(LEGACY_TO_IM.Loader2)
export const Lock = legacyIcon(LEGACY_TO_IM.Lock)
export const LogOut = legacyIcon(LEGACY_TO_IM.LogOut)
export const Mail = legacyIcon(LEGACY_TO_IM.Mail)
export const MapPin = legacyIcon(LEGACY_TO_IM.MapPin)
export const Menu = legacyIcon(LEGACY_TO_IM.Menu)
export const MessageCircle = legacyIcon(LEGACY_TO_IM.MessageCircle)
export const MessageSquare = legacyIcon(LEGACY_TO_IM.MessageSquare)
export const MessageSquarePlus = legacyIcon(LEGACY_TO_IM.MessageSquarePlus)
export const Monitor = legacyIcon(LEGACY_TO_IM.Monitor)
export const Moon = legacyIcon(LEGACY_TO_IM.Moon)
export const Needle = legacyIcon(LEGACY_TO_IM.Needle)
export const Tattoo = legacyIcon(LEGACY_TO_IM.Tattoo)
export const Paperclip = legacyIcon(LEGACY_TO_IM.Paperclip)
export const PaperPlaneTilt = legacyIcon(LEGACY_TO_IM.PaperPlaneTilt)
export const PenTool = legacyIcon(LEGACY_TO_IM.PenTool)
export const Pencil = legacyIcon(LEGACY_TO_IM.Pencil)
export const PencilLine = legacyIcon(LEGACY_TO_IM.PencilLine)
export const PencilSimple = legacyIcon(LEGACY_TO_IM.PencilSimple)
export const Phone = legacyIcon(LEGACY_TO_IM.Phone)
export const Plus = legacyIcon(LEGACY_TO_IM.Plus)
export const Receipt = legacyIcon(LEGACY_TO_IM.Receipt)
export const ReceiptText = legacyIcon(LEGACY_TO_IM.ReceiptText)
export const RefreshCw = legacyIcon(LEGACY_TO_IM.RefreshCw)
export const Repeat = legacyIcon(LEGACY_TO_IM.Repeat)
export const Reply = legacyIcon(LEGACY_TO_IM.Reply)
export const RotateCcw = legacyIcon(LEGACY_TO_IM.RotateCcw)
export const Search = legacyIcon(LEGACY_TO_IM.Search)
export const Send = legacyIcon(LEGACY_TO_IM.Send)
export const SendHorizontal = legacyIcon(LEGACY_TO_IM.SendHorizontal)
export const Settings = legacyIcon(LEGACY_TO_IM.Settings)
export const ShieldAlert = legacyIcon(LEGACY_TO_IM.ShieldAlert)
export const ShieldCheck = legacyIcon(LEGACY_TO_IM.ShieldCheck)
export const SidebarToggle = legacyIcon(LEGACY_TO_IM.SidebarToggle)
export const SlidersHorizontal = legacyIcon(LEGACY_TO_IM.SlidersHorizontal)
export const Sparkle = legacyIcon(LEGACY_TO_IM.Sparkle)
export const Sparkles = legacyIcon(LEGACY_TO_IM.Sparkles)
export const SquareKanban = legacyIcon(LEGACY_TO_IM.SquareKanban)
export const Star = legacyIcon(LEGACY_TO_IM.Star)
export const Sun = legacyIcon(LEGACY_TO_IM.Sun)
export const Trash = legacyIcon(LEGACY_TO_IM.Trash)
export const Trash2 = legacyIcon(LEGACY_TO_IM.Trash2)
export const TriangleAlert = legacyIcon(LEGACY_TO_IM.TriangleAlert)
export const Upload = legacyIcon(LEGACY_TO_IM.Upload)
export const Warning = legacyIcon(LEGACY_TO_IM.Warning)
export const User = legacyIcon(LEGACY_TO_IM.User)
export const Users = legacyIcon(LEGACY_TO_IM.Users)
export const Wallet = legacyIcon(LEGACY_TO_IM.Wallet)
export const X = legacyIcon(LEGACY_TO_IM.X)
export const XIcon = legacyIcon(LEGACY_TO_IM.XIcon)
export const ZoomIn = legacyIcon(LEGACY_TO_IM.ZoomIn)
