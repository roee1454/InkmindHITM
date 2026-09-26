import type { Icon as PhosphorIcon, IconProps, IconWeight } from '@phosphor-icons/react'
import {
  ArrowBendUpLeft as PhArrowBendUpLeft,
  ArrowClockwise as PhArrowClockwise,
  ArrowCounterClockwise as PhArrowCounterClockwise,
  ArrowLeft as PhArrowLeft,
  ArrowSquareOut as PhArrowSquareOut,
  ArrowUp as PhArrowUp,
  ArrowsClockwise as PhArrowsClockwise,
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
} from '@phosphor-icons/react'

/**
 * The app's entire icon vocabulary, and the only module that may import an icon library.
 *
 * Icons carrying a subject — a calendar, a robot, a receipt — render in Phosphor's
 * `duotone` weight, which is two tones of `currentColor` and so follows the theme in
 * both modes. Pure controls — carets, check, x, plus, spinners — stay `bold`: a second
 * tone on a 12px caret is noise, not colour.
 *
 * Export names are kept stable so call sites never change when the underlying set does.
 */

export type { IconProps }

function styled(Base: PhosphorIcon, defaultWeight: IconWeight) {
  function StyledIcon({ weight, ...props }: IconProps) {
    return <Base weight={weight ?? defaultWeight} {...props} />
  }
  StyledIcon.displayName = `Icon(${Base.displayName ?? 'icon'})`
  return StyledIcon
}

export const Activity = styled(PhPulse, 'duotone')
export const AlertCircle = styled(PhWarningCircle, 'duotone')
export const AlertTriangle = styled(PhWarning, 'duotone')
export const ArrowLeft = styled(PhArrowLeft, 'bold')
export const ArrowUp = styled(PhArrowUp, 'bold')
export const ArrowsClockwise = styled(PhArrowsClockwise, 'bold')
export const BadgeCheck = styled(PhSealCheck, 'duotone')
export const Bell = styled(PhBell, 'duotone')
export const BellRing = styled(PhBellRinging, 'duotone')
export const Bot = styled(PhRobot, 'duotone')
export const BotOff = styled(PhProhibit, 'duotone')
export const Calendar = styled(PhCalendarDots, 'duotone')
export const CalendarBlank = styled(PhCalendarBlank, 'duotone')
export const CalendarCheck = styled(PhCalendarCheck, 'duotone')
export const CalendarClock = styled(PhCalendarDots, 'duotone')
export const CalendarDays = styled(PhCalendar, 'duotone')
export const CalendarHeart = styled(PhCalendarHeart, 'duotone')
export const CalendarOff = styled(PhCalendarSlash, 'duotone')
export const CalendarPlus = styled(PhCalendarPlus, 'duotone')
export const CalendarX = styled(PhCalendarX, 'duotone')
export const Certificate = styled(PhCertificate, 'duotone')
export const ChartBar = styled(PhChartBar, 'duotone')
export const Check = styled(PhCheck, 'bold')
export const CheckCheck = styled(PhChecks, 'bold')
export const CheckCircle = styled(PhCheckCircle, 'duotone')
export const CheckCircle2 = styled(PhCheckCircle, 'duotone')
export const CheckIcon = styled(PhCheck, 'bold')
export const ChevronDown = styled(PhCaretDown, 'bold')
export const ChevronDownIcon = styled(PhCaretDown, 'bold')
export const ChevronLeft = styled(PhCaretLeft, 'bold')
export const ChevronRight = styled(PhCaretRight, 'bold')
export const ChevronRightIcon = styled(PhCaretRight, 'bold')
export const ChevronUp = styled(PhCaretUp, 'bold')
export const ChevronUpIcon = styled(PhCaretUp, 'bold')
export const CircleIcon = styled(PhCircle, 'bold')
export const ClipboardList = styled(PhClipboardText, 'duotone')
export const Clock = styled(PhClock, 'duotone')
export const Coins = styled(PhCoins, 'duotone')
export const Copy = styled(PhCopy, 'duotone')
export const Database = styled(PhDatabase, 'duotone')
export const Download = styled(PhDownloadSimple, 'bold')
export const Edit3 = styled(PhPencilSimple, 'duotone')
export const EllipsisVertical = styled(PhDotsThreeVertical, 'bold')
export const ExternalLink = styled(PhArrowSquareOut, 'bold')
export const Eye = styled(PhEye, 'duotone')
export const EyeOff = styled(PhEyeSlash, 'duotone')
export const FileCheck = styled(PhFileArrowDown, 'duotone')
export const FileText = styled(PhFileText, 'duotone')
export const FirstAid = styled(PhFirstAid, 'duotone')
export const HandCoins = styled(PhHandCoins, 'duotone')
export const Heartbeat = styled(PhHeartbeat, 'duotone')
export const HelpCircle = styled(PhQuestion, 'duotone')
export const Home = styled(PhHouse, 'duotone')
export const Image = styled(PhImage, 'duotone')
export const Info = styled(PhInfo, 'duotone')
export const KeyRound = styled(PhKey, 'duotone')
export const Keyboard = styled(PhKeyboard, 'duotone')
export const Link = styled(PhLink, 'bold')
export const Link2 = styled(PhLinkSimple, 'bold')
export const List = styled(PhList, 'bold')
export const Loader2 = styled(PhCircleNotch, 'bold')
export const Lock = styled(PhLock, 'duotone')
export const LogOut = styled(PhSignOut, 'duotone')
export const Mail = styled(PhEnvelope, 'duotone')
export const MapPin = styled(PhMapPin, 'duotone')
export const Menu = styled(PhList, 'bold')
export const MessageCircle = styled(PhChatCircleDots, 'duotone')
export const MessageSquare = styled(PhChatTeardropDots, 'duotone')
export const MessageSquarePlus = styled(PhChatCircleDots, 'duotone')
export const Monitor = styled(PhMonitor, 'duotone')
export const Moon = styled(PhMoon, 'duotone')
export const Needle = styled(PhNeedle, 'duotone')
export const Tattoo = styled(PhNeedle, 'duotone')
export const Paperclip = styled(PhPaperclip, 'duotone')
export const PaperPlaneTilt = styled(PhPaperPlaneTilt, 'duotone')
export const PenTool = styled(PhPenNib, 'duotone')
export const Pencil = styled(PhPencil, 'duotone')
export const PencilLine = styled(PhPencilLine, 'duotone')
export const PencilSimple = styled(PhPencilSimple, 'duotone')
export const Phone = styled(PhPhone, 'duotone')
export const Plus = styled(PhPlus, 'bold')
export const Receipt = styled(PhReceipt, 'duotone')
export const ReceiptText = styled(PhReceipt, 'duotone')
export const RefreshCw = styled(PhArrowsClockwise, 'bold')
export const Repeat = styled(PhRepeat, 'bold')
export const Reply = styled(PhArrowBendUpLeft, 'bold')
export const RotateCcw = styled(PhArrowCounterClockwise, 'bold')
export const RotateCw = styled(PhArrowClockwise, 'bold')
export const Save = styled(PhFloppyDisk, 'duotone')
export const Search = styled(PhMagnifyingGlass, 'bold')
export const Send = styled(PhPaperPlaneTilt, 'duotone')
export const SendHorizontal = styled(PhPaperPlaneRight, 'duotone')
export const Settings = styled(PhGear, 'duotone')
export const ShieldAlert = styled(PhShieldWarning, 'duotone')
export const ShieldCheck = styled(PhShieldCheck, 'duotone')
export const SidebarToggle = styled(PhSidebarSimple, 'bold')
export const SlidersHorizontal = styled(PhSlidersHorizontal, 'bold')
export const Sparkle = styled(PhSparkle, 'duotone')
export const Sparkles = styled(PhSparkle, 'duotone')
export const SquareKanban = styled(PhKanban, 'duotone')
export const Star = styled(PhStar, 'duotone')
export const Sun = styled(PhSun, 'duotone')
export const Trash = styled(PhTrash, 'duotone')
export const Trash2 = styled(PhTrash, 'duotone')
export const TrendingUp = styled(PhTrendUp, 'bold')
export const TriangleAlert = styled(PhWarning, 'duotone')
export const Upload = styled(PhUploadSimple, 'bold')
export const Warning = styled(PhWarning, 'duotone')
export const User = styled(PhUser, 'duotone')
export const UserCheck = styled(PhUserCheck, 'duotone')
export const UserCog = styled(PhUserGear, 'duotone')
export const Users = styled(PhUsers, 'duotone')
export const Wallet = styled(PhWallet, 'duotone')
export const X = styled(PhX, 'bold')
export const XIcon = styled(PhX, 'bold')
export const ZoomIn = styled(PhMagnifyingGlassPlus, 'bold')
