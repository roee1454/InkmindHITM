import type { Icon as PhosphorIcon, IconProps, IconWeight } from "@phosphor-icons/react"
import {
  ArrowBendUpLeft as PhArrowBendUpLeft,
  ArrowClockwise as PhArrowClockwise,
  ArrowCounterClockwise as PhArrowCounterClockwise,
  ArrowLeft as PhArrowLeft,
  ArrowSquareOut as PhArrowSquareOut,
  ArrowUp as PhArrowUp,
  ArrowsClockwise as PhArrowsClockwise,
  Bank as PhBank,
  Bell as PhBell,
  BellRinging as PhBellRinging,
  Calendar as PhCalendar,
  CalendarBlank as PhCalendarBlank,
  CalendarCheck as PhCalendarCheck,
  CalendarDots as PhCalendarDots,
  CalendarHeart as PhCalendarHeart,
  CalendarPlus as PhCalendarPlus,
  CalendarSlash as PhCalendarSlash,
  CalendarX as PhCalendarX,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  CaretUp as PhCaretUp,
  Certificate as PhCertificate,
  ChartBar as PhChartBar,
  ChatCircleDots as PhChatCircleDots,
  ChatTeardropDots as PhChatTeardropDots,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  Checks as PhChecks,
  Circle as PhCircle,
  CircleNotch as PhCircleNotch,
  ClipboardText as PhClipboardText,
  Clock as PhClock,
  Coins as PhCoins,
  CreditCard as PhCreditCard,
  Copy as PhCopy,
  Database as PhDatabase,
  DotsThreeVertical as PhDotsThreeVertical,
  DownloadSimple as PhDownloadSimple,
  Envelope as PhEnvelope,
  Eye as PhEye,
  EyeSlash as PhEyeSlash,
  FileArrowDown as PhFileArrowDown,
  FileText as PhFileText,
  FirstAid as PhFirstAid,
  FloppyDisk as PhFloppyDisk,
  Gear as PhGear,
  HandCoins as PhHandCoins,
  Heartbeat as PhHeartbeat,
  House as PhHouse,
  Image as PhImage,
  Info as PhInfo,
  Kanban as PhKanban,
  Key as PhKey,
  Keyboard as PhKeyboard,
  Link as PhLink,
  LinkSimple as PhLinkSimple,
  List as PhList,
  Lock as PhLock,
  MagnifyingGlass as PhMagnifyingGlass,
  MagnifyingGlassPlus as PhMagnifyingGlassPlus,
  MapPin as PhMapPin,
  Monitor as PhMonitor,
  Moon as PhMoon,
  Needle as PhNeedle,
  PaperPlaneRight as PhPaperPlaneRight,
  PaperPlaneTilt as PhPaperPlaneTilt,
  Paperclip as PhPaperclip,
  PenNib as PhPenNib,
  Pencil as PhPencil,
  PencilLine as PhPencilLine,
  PencilSimple as PhPencilSimple,
  Phone as PhPhone,
  Plus as PhPlus,
  Prohibit as PhProhibit,
  Pulse as PhPulse,
  Question as PhQuestion,
  Receipt as PhReceipt,
  Repeat as PhRepeat,
  Robot as PhRobot,
  SealCheck as PhSealCheck,
  ShieldCheck as PhShieldCheck,
  ShieldWarning as PhShieldWarning,
  SidebarSimpleIcon as PhSidebarSimple,
  SignOut as PhSignOut,
  SlidersHorizontal as PhSlidersHorizontal,
  Sparkle as PhSparkle,
  Star as PhStar,
  Sun as PhSun,
  Trash as PhTrash,
  TrendUp as PhTrendUp,
  UploadSimple as PhUploadSimple,
  User as PhUser,
  UserCheck as PhUserCheck,
  UserGear as PhUserGear,
  Users as PhUsers,
  Wallet as PhWallet,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  X as PhX,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

/**
 * Inkmind Icon Design System:
 * - Appearance: ALWAYS filled inside ('fill' weight), never outlined or hollow.
 * - Directional/action strokes: 'bold' or 'fill' where solid fill applies (e.g. Caret triangles).
 * - Palette: strict semantic tokens (default, muted, primary, success, warning, destructive, accent, artist-1..8).
 */

export type { IconProps }

export const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const

export type IMIconSize = keyof typeof ICON_SIZES | number

export const ICON_TONES = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  accent: "text-accent-ink",
  success: "text-emerald-500 dark:text-emerald-400",
  warning: "text-amber-500 dark:text-amber-400",
  destructive: "text-rose-500 dark:text-rose-400",
  "artist-1": "text-[var(--brand-artist-1)]",
  "artist-2": "text-[var(--brand-artist-2)]",
  "artist-3": "text-[var(--brand-artist-3)]",
  "artist-4": "text-[var(--brand-artist-4)]",
  "artist-5": "text-[var(--brand-artist-5)]",
  "artist-6": "text-[var(--brand-artist-6)]",
  "artist-7": "text-[var(--brand-artist-7)]",
  "artist-8": "text-[var(--brand-artist-8)]",
} as const

export type IMIconTone = keyof typeof ICON_TONES

export type AnyIcon = PhosphorIcon | React.ComponentType<IconProps>

export interface IMIconProps extends Omit<IconProps, "size"> {
  icon: AnyIcon
  size?: IMIconSize
  tone?: IMIconTone
  className?: string
}

export function IMIcon({
  icon: IconComponent,
  size = "md",
  tone = "default",
  weight = "fill",
  className,
  ...props
}: IMIconProps) {
  const pixelSize = typeof size === "number" ? size : ICON_SIZES[size]
  return (
    <IconComponent
      data-slot="im-icon"
      size={pixelSize}
      weight={weight}
      className={cn("shrink-0 transition-colors", ICON_TONES[tone], className)}
      {...props}
    />
  )
}

function styled(Base: PhosphorIcon, defaultWeight: IconWeight = "fill") {
  function StyledIcon({ weight, className, ...props }: IconProps) {
    return <Base weight={weight ?? defaultWeight} className={cn("shrink-0", className)} {...props} />
  }
  StyledIcon.displayName = `Icon(${Base.displayName ?? "icon"})`
  return StyledIcon
}

// All subject & entity icons now default strictly to 'fill' (solid filled interior)
export const Activity = styled(PhPulse, "fill")
export const AlertCircle = styled(PhWarningCircle, "fill")
export const AlertTriangle = styled(PhWarning, "fill")
export const ArrowLeft = styled(PhArrowLeft, "bold")
export const ArrowUp = styled(PhArrowUp, "bold")
export const ArrowsClockwise = styled(PhArrowsClockwise, "bold")
export const BadgeCheck = styled(PhSealCheck, "fill")
export const Bank = styled(PhBank, "fill")
export const Bell = styled(PhBell, "fill")
export const BellRing = styled(PhBellRinging, "fill")
export const Bot = styled(PhRobot, "fill")
export const BotOff = styled(PhProhibit, "fill")
export const Calendar = styled(PhCalendarDots, "fill")
export const CalendarBlank = styled(PhCalendarBlank, "fill")
export const CalendarCheck = styled(PhCalendarCheck, "fill")
export const CalendarClock = styled(PhCalendarDots, "fill")
export const CalendarDays = styled(PhCalendar, "fill")
export const CalendarHeart = styled(PhCalendarHeart, "fill")
export const CalendarOff = styled(PhCalendarSlash, "fill")
export const CalendarPlus = styled(PhCalendarPlus, "fill")
export const CalendarX = styled(PhCalendarX, "fill")
export const Certificate = styled(PhCertificate, "fill")
export const ChartBar = styled(PhChartBar, "fill")
export const Check = styled(PhCheck, "bold")
export const CheckCheck = styled(PhChecks, "bold")
export const CheckCircle = styled(PhCheckCircle, "fill")
export const CheckCircle2 = styled(PhCheckCircle, "fill")
export const CheckIcon = styled(PhCheck, "bold")
export const ChevronDown = styled(PhCaretDown, "fill")
export const ChevronDownIcon = styled(PhCaretDown, "fill")
export const ChevronLeft = styled(PhCaretLeft, "fill")
export const ChevronRight = styled(PhCaretRight, "fill")
export const ChevronRightIcon = styled(PhCaretRight, "fill")
export const ChevronUp = styled(PhCaretUp, "fill")
export const ChevronUpIcon = styled(PhCaretUp, "fill")
export const CircleIcon = styled(PhCircle, "fill")
export const ClipboardList = styled(PhClipboardText, "fill")
export const Clock = styled(PhClock, "fill")
export const Coins = styled(PhCoins, "fill")
export const CreditCard = styled(PhCreditCard, "fill")
export const Copy = styled(PhCopy, "fill")
export const Database = styled(PhDatabase, "fill")
export const Download = styled(PhDownloadSimple, "bold")
export const Edit3 = styled(PhPencilSimple, "fill")
export const EllipsisVertical = styled(PhDotsThreeVertical, "bold")
export const ExternalLink = styled(PhArrowSquareOut, "bold")
export const Eye = styled(PhEye, "fill")
export const EyeOff = styled(PhEyeSlash, "fill")
export const FileCheck = styled(PhFileArrowDown, "fill")
export const FileText = styled(PhFileText, "fill")
export const FirstAid = styled(PhFirstAid, "fill")
export const HandCoins = styled(PhHandCoins, "fill")
export const Heartbeat = styled(PhHeartbeat, "fill")
export const HelpCircle = styled(PhQuestion, "fill")
export const Home = styled(PhHouse, "fill")
export const Image = styled(PhImage, "fill")
export const Info = styled(PhInfo, "fill")
export const KeyRound = styled(PhKey, "fill")
export const Keyboard = styled(PhKeyboard, "fill")
export const Link = styled(PhLink, "bold")
export const Link2 = styled(PhLinkSimple, "bold")
export const List = styled(PhList, "bold")
export const Loader2 = styled(PhCircleNotch, "bold")
export const Lock = styled(PhLock, "fill")
export const LogOut = styled(PhSignOut, "fill")
export const Mail = styled(PhEnvelope, "fill")
export const MapPin = styled(PhMapPin, "fill")
export const Menu = styled(PhList, "bold")
export const MessageCircle = styled(PhChatCircleDots, "fill")
export const MessageSquare = styled(PhChatTeardropDots, "fill")
export const MessageSquarePlus = styled(PhChatCircleDots, "fill")
export const Monitor = styled(PhMonitor, "fill")
export const Moon = styled(PhMoon, "fill")
export const Needle = styled(PhNeedle, "fill")
export const Tattoo = styled(PhNeedle, "fill")
export const Paperclip = styled(PhPaperclip, "fill")
export const PaperPlaneTilt = styled(PhPaperPlaneTilt, "fill")
export const PenTool = styled(PhPenNib, "fill")
export const Pencil = styled(PhPencil, "fill")
export const PencilLine = styled(PhPencilLine, "fill")
export const PencilSimple = styled(PhPencilSimple, "fill")
export const Phone = styled(PhPhone, "fill")
export const Plus = styled(PhPlus, "bold")
export const Receipt = styled(PhReceipt, "fill")
export const ReceiptText = styled(PhReceipt, "fill")
export const RefreshCw = styled(PhArrowsClockwise, "bold")
export const Repeat = styled(PhRepeat, "bold")
export const Reply = styled(PhArrowBendUpLeft, "bold")
export const RotateCcw = styled(PhArrowCounterClockwise, "bold")
export const RotateCw = styled(PhArrowClockwise, "bold")
export const Save = styled(PhFloppyDisk, "fill")
export const Search = styled(PhMagnifyingGlass, "bold")
export const Send = styled(PhPaperPlaneTilt, "fill")
export const SendHorizontal = styled(PhPaperPlaneRight, "fill")
export const Settings = styled(PhGear, "fill")
export const ShieldAlert = styled(PhShieldWarning, "fill")
export const ShieldCheck = styled(PhShieldCheck, "fill")
export const SidebarToggle = styled(PhSidebarSimple, "bold")
export const SlidersHorizontal = styled(PhSlidersHorizontal, "bold")
export const Sparkle = styled(PhSparkle, "fill")
export const Sparkles = styled(PhSparkle, "fill")
export const SquareKanban = styled(PhKanban, "fill")
export const Star = styled(PhStar, "fill")
export const Sun = styled(PhSun, "fill")
export const Trash = styled(PhTrash, "fill")
export const Trash2 = styled(PhTrash, "fill")
export const TrendingUp = styled(PhTrendUp, "bold")
export const TriangleAlert = styled(PhWarning, "fill")
export const Upload = styled(PhUploadSimple, "bold")
export const Warning = styled(PhWarning, "fill")
export const User = styled(PhUser, "fill")
export const UserCheck = styled(PhUserCheck, "fill")
export const UserCog = styled(PhUserGear, "fill")
export const Users = styled(PhUsers, "fill")
export const Wallet = styled(PhWallet, "fill")
export const X = styled(PhX, "bold")
export const XIcon = styled(PhX, "bold")
export const ZoomIn = styled(PhMagnifyingGlassPlus, "bold")
