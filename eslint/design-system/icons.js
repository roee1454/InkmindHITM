// Design system — icons pillar. Owned by the Phase 1 "icons" agent (docs/im-design-system/plan.md).
// Every message starts with `[ds:icons]` so `pnpm ds:audit` can count it. Rules and the registry:
// docs/design-system/icons.md.

const ICON_DOC = 'see docs/design-system/icons.md'

// INTERIM: the exports of src/components/ui/icon-legacy.ts, each a caller left for Phase 2 to
// migrate. Goes with that file in plan Phase 3, item 3.1. tests/components/icon-registry.test.tsx
// keeps this list equal to LEGACY_TO_IM.
const LEGACY_ICONS = [
  'Activity',
  'AlertCircle',
  'AlertTriangle',
  'ArrowLeft',
  'ArrowUp',
  'ArrowsClockwise',
  'BadgeCheck',
  'Bank',
  'Bell',
  'BellRing',
  'Bot',
  'BotOff',
  'Calendar',
  'CalendarCheck',
  'CalendarClock',
  'CalendarDays',
  'CalendarOff',
  'CalendarPlus',
  'CalendarX',
  'ChartBar',
  'Check',
  'CheckCheck',
  'CheckCircle',
  'CheckCircle2',
  'CheckIcon',
  'ChevronDown',
  'ChevronDownIcon',
  'ChevronLeft',
  'ChevronRight',
  'ChevronRightIcon',
  'ChevronUp',
  'ChevronUpIcon',
  'CircleIcon',
  'ClipboardList',
  'Clock',
  'Coins',
  'CreditCard',
  'Copy',
  'Database',
  'Download',
  'Edit3',
  'EllipsisVertical',
  'ExternalLink',
  'Eye',
  'EyeOff',
  'FileCheck',
  'FileText',
  'HelpCircle',
  'Home',
  'Image',
  'Info',
  'KeyRound',
  'Link',
  'Link2',
  'Loader2',
  'Lock',
  'LogOut',
  'Mail',
  'MapPin',
  'Menu',
  'MessageCircle',
  'MessageSquare',
  'MessageSquarePlus',
  'Monitor',
  'Moon',
  'Needle',
  'Tattoo',
  'Paperclip',
  'PaperPlaneTilt',
  'PenTool',
  'Pencil',
  'PencilLine',
  'PencilSimple',
  'Phone',
  'Plus',
  'Receipt',
  'ReceiptText',
  'RefreshCw',
  'Repeat',
  'Reply',
  'RotateCcw',
  'Search',
  'Send',
  'SendHorizontal',
  'Settings',
  'ShieldAlert',
  'ShieldCheck',
  'SidebarToggle',
  'SlidersHorizontal',
  'Sparkle',
  'Sparkles',
  'SquareKanban',
  'Star',
  'Sun',
  'Trash',
  'Trash2',
  'TriangleAlert',
  'Upload',
  'Warning',
  'User',
  'Users',
  'Wallet',
  'X',
  'XIcon',
  'ZoomIn',
]

const legacyMessage = `[ds:icons] Legacy icon — use <IMIcon name="…" /> (${ICON_DOC})`
const phosphorMessage = `[ds:icons] Icons come from the registry only — use <IMIcon name="…" /> (${ICON_DOC}). To add one, add an entry to src/components/ui/icon-registry.ts.`

/** @type {import('./types.js').DesignSystemRules} */
export default {
  exempt: [
    'src/components/ui/icon-registry.ts', // the one place that imports Phosphor glyphs
  ],
  syntax: [
    {
      selector:
        "JSXOpeningElement[name.name='IMIcon'] > JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)(?:[\\w-]+:)*(?:size|h|w)-(?:\\d|\\[)/]",
      message: `[ds:icons] Size an icon with size="xs|sm|md|lg|xl", not a class (${ICON_DOC})`,
    },
    {
      selector:
        "JSXOpeningElement[name.name='IMIcon'] > JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)text-(?:muted-foreground|foreground|destructive|success|warning|accent-ink|primary|artist-[1-8])(?:\\s|$)/]",
      message: `[ds:icons] Colour an icon with tone=, not a class (${ICON_DOC})`,
    },
  ],
  imports: {
    paths: [
      { name: '@phosphor-icons/react', message: phosphorMessage },
      ...['@', '#']
        .flatMap((alias) => [
          `${alias}/components/ui/icon`,
          `${alias}/components/ui/icon.tsx`,
        ])
        .map((name) => ({
          name,
          importNames: LEGACY_ICONS,
          message: legacyMessage,
        })),
    ],
    patterns: [
      { group: ['@phosphor-icons/react/*'], message: phosphorMessage },
    ],
  },
}
