# Inkmind Design System & UI/UX Guidelines

Inkmind CRM is designed for professional tattoo studio owners and artists. The interface must feel modern, premium, tactile, and distraction-free.

---

## 1. RTL-First (Hebrew as Primary Language)

- The application is natively Hebrew with `dir="rtl"`.
- **Directional conventions**:
  - Always use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`) instead of hardcoded `ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`.
  - Ensure icons with inherent directionality (directional arrows, back/forward carets, send icons) respect RTL orientation.
  - Numbers, monetary amounts, and time ranges retain natural readable formatting (e.g. `13:00 - 16:00`, `₪800 - ₪1,200`, `052-705-1611`).

---

## 2. Monochrome Studio Aesthetic & Color Palette (Black & White)

- Inkmind CRM is built on a strict **monochrome palette** inspired by tattoo ink and canvas:
  - **Dark Mode (Default)**: Deep near-black background (`bg-background` / `#0a0a0b`), elevated zinc surfaces (`bg-card` / `#141415`), white text (`text-foreground` / `#ffffff`), and solid white primary controls (`bg-primary` / `#f4f4f5` with `#18181b` text).
  - **Light Mode**: Crisp white/light-slate background (`#f3f5f9`), white cards (`#ffffff`), dark ink text (`#12151c`), and solid near-black primary controls (`#18181b` with white text).
  - **No Decorative Accent Colors**: Zero arbitrary orange, amber, or bright decorative tints. All brand surfaces, tabs, and interactive focal points remain strictly black-and-white.
  - **Functional Status Roles**: Subtle and reserved strictly for system outcomes (done/confirmed, error/destructive).

---

## 3. Inkmind Component Architecture (`IM*` Prefix)

All shared UI components in `src/components/ui/` use a uniform `IM*` prefix (IM = Inkmind).
They are exported both from individual files and centrally from `@/components/ui`.

### 3.1 Standard Primitives Table
| Component | Description | Export Aliases |
|---|---|---|
| `IMButton` | Primary action button with loading, ghost, outline, and destructive variants | `IMButton`, `Button` |
| `IMCard`, `IMCardHeader`, `IMCardTitle`, `IMCardDescription`, `IMCardContent`, `IMCardFooter` | Elevated container surfaces | `IMCard*`, `Card*` |
| `IMBadge` | Compact status tags and counts with semantic variants (`done`, `warning`, `destructive`, etc.) | `IMBadge`, `Badge` |
| `IMInput` | Single-line text input with RTL padding and focus rings | `IMInput`, `Input` |
| `IMTextarea` | Multi-line auto-sizing text input | `IMTextarea`, `Textarea` |
| `IMCheckbox` | Accessible checkbox primitive | `IMCheckbox`, `Checkbox` |
| `IMSwitch` | Toggle switch | `IMSwitch`, `Switch` |
| `IMSkeleton` | Pulse animated placeholder for loading states | `IMSkeleton`, `Skeleton` |
| `IMAvatar`, `IMAvatarImage`, `IMAvatarFallback` | User/artist avatar circle | `IMAvatar*`, `Avatar*` |
| `IMDialog`, `IMDialogContent`, `IMDialogHeader`, `IMDialogTitle`, etc. | Modal overlay dialogs | `IMDialog*`, `Dialog*` |
| `IMSheet`, `IMSheetContent`, `IMSheetHeader`, `IMSheetTitle`, etc. | Side slide-over drawers | `IMSheet*`, `Sheet*` |
| `IMPopover`, `IMPopoverContent`, `IMPopoverTrigger` | Floating popovers | `IMPopover*`, `Popover*` |
| `IMSelect`, `IMSelectContent`, `IMSelectItem`, `IMSelectTrigger`, `IMSelectValue` | Accessible dropdown selector | `IMSelect*`, `Select*` |
| `IMSelectInput` | Combobox searchable select | `IMSelectInput`, `SelectInput` |
| `IMTabs`, `IMTabsList`, `IMTabsTrigger`, `IMTabsContent` | Tabbed navigation container | `IMTabs*`, `Tabs*` |
| `IMDropdownMenu`, `IMDropdownMenuContent`, `IMDropdownMenuItem`, etc. | Contextual menus | `IMDropdownMenu*`, `DropdownMenu*` |
| `IMCalendar` | Interactive date calendar grid | `IMCalendar`, `Calendar` (as IMCalendar) |
| `IMDatePicker` | Popover-driven date selection component | `IMDatePicker`, `DatePicker` |
| `IMHourPicker` | Time slot selector | `IMHourPicker`, `HourPicker` |
| `IMConfirmDialog` | Reusable modal confirmation prompt | `IMConfirmDialog`, `ConfirmDialog` |
| `IMResponsiveDialog` | Adaptive dialog (modal on desktop, bottom sheet on mobile) | `IMResponsiveDialog`, `ResponsiveDialog` |
| `IMSearchInput` | Search field with debounced clear and icon | `IMSearchInput`, `SearchInput` |
| `IMStatusLabel` | Formatted status indicators | `IMStatusLabel`, `StatusLabel` |
| `IMPagination` | Windowed pagination bar (<= 7 slots) | `IMPagination`, `Pagination` |
| `IMForm`, `IMFormField`, `IMFormItem`, `IMFormLabel`, etc. | React Hook Form + Zod form wrappers | `IMForm*`, `Form*` |
| `IMToastProvider`, `useIMToast` | Notification toasts | `IMToastProvider`, `useToast` |
| `IMChartContainer`, `IMChartTooltip`, `IMChartLegend` | Recharts wrapper primitives | `IMChart*`, `Chart*` |

---

## 4. Typography Design System

The typography system enforces clear visual hierarchy, Hebrew-first readability, and consistent typographic rhythm.

### 4.1 Fonts
- **Assistant (`font-assistant`)**: Used exclusively for prominent headlines, displays, and hero titles. Geometric grotesque designed specifically for Hebrew with exceptional visual punch at bold weights (`font-extrabold`, 800).
- **Open Sans (`font-sans`)**: Used for all body text, UI controls, buttons, form inputs, metadata labels, and tables. Clean, neutral, high x-height for readability.

### 4.2 Scale and Semantic Components (`src/components/ui/typography.tsx`)

| Component / Variant | Element | Size / Line-Height | Weight | Font | When to Use |
|---|---|---|---|---|---|
| `IMDisplay` (`display`) | `h1` | `text-[29px]` (1.8125rem) / `leading-tight` | ExtraBold (800) | Assistant | Dashboard hero stats, modal main banners, feature highlights |
| `IMHeadline` (`headline`) | `h1` | `text-[23px]` (1.4375rem) / `leading-snug` | ExtraBold (800) | Assistant | Page headers, drawer titles, major view titles |
| `IMTitle` (`title`) | `h2` | `text-[17px]` (1.0625rem) / `leading-normal` | Bold (700) | Open Sans | Section titles, card headers, table group headers |
| `IMSubtitle` (`subtitle`) | `h3` | `text-[15px]` (0.9375rem) / `leading-normal` | SemiBold (600) | Open Sans | Card subheadings, secondary section titles, dialogue headers |
| `IMText` (`body`) | `p` | `text-[15px]` (0.9375rem) / `leading-relaxed` | Medium (500) | Open Sans | Default body text, message bubbles, customer history notes |
| `IMText` (`body-sm`) | `p` | `text-[13.5px]` (0.84375rem) / `leading-normal` | Medium (500) | Open Sans | Compact views, table cells, secondary descriptions |
| `IMLabelText` (`label`) | `label` | `text-[12.5px]` (0.78125rem) / `leading-tight` | Bold (700) | Open Sans | Form field labels, stat card metadata keys, table headers |
| `IMCaption` (`caption`) | `span` / `p` | `text-[12px]` (0.75rem) / `leading-tight` | Medium (500) | Open Sans | Timestamps, help text under inputs, status footnotes |
| `IMText` (`micro`) | `span` | `text-[11px]` (0.6875rem) / `leading-none` | Medium (500) | Open Sans | Small badges, tags, compact chips |

### 4.3 Typography Tones
- `default`: High contrast primary text (`text-foreground`)
- `muted`: Subdued secondary text (`text-muted-foreground`)
- `accent`: Monochrome emphasis text (`text-primary` / `text-foreground`)
- `success`: Positive confirmation text (`text-emerald-500`)
- `warning`: Attention warning text (`text-amber-500`)
- `destructive`: Error and alert text (`text-rose-500`)

---

## 5. Icon Design System (Always Filled)

Icons in Inkmind CRM must **always have a filled interior (`weight="fill"`)**, never outlined or hollow. Solid silhouettes provide immediate visual recognition in dense studio environments.

### 5.1 Architecture & Sizing Hierarchy (`src/components/ui/icon.tsx`)
Icons are powered by `@phosphor-icons/react` pre-configured to `weight="fill"`, wrapped by `IMIcon` or imported directly from `@/components/ui`:

| Size Token | Dimension | Use Case |
|---|---|---|
| `xs` | `12px` | Badges, micro-indicators, inline bullet icons |
| `sm` | `16px` | Compact table actions, input prefixes, dropdown menu items |
| `md` | `20px` (Default) | Standard button icons, card header icons, navigation items |
| `lg` | `24px` | Page action triggers, prominent status indicators |
| `xl` | `32px` | Empty state illustrations, hero section badges |

### 5.2 Color Tokens & Semantic Tones
```tsx
<IMIcon icon={Calendar} size="md" tone="primary" />
<IMIcon icon={CheckCircle} size="sm" tone="success" />
```
- `default`: `text-foreground`
- `muted`: `text-muted-foreground`
- `primary`: `text-primary` (monochrome)
- `accent`: `text-accent-ink` (monochrome)
- `success`: `text-emerald-500`
- `warning`: `text-amber-500`
- `destructive`: `text-rose-500`
- `artist-1` through `artist-8`: Dedicated artist theme tokens (`var(--brand-artist-1)`, etc.)

---

## 6. Complete UI State Coverage

Every data-driven view or component must implement all four state variants:
1. **Loading State**: Use animated skeleton placeholders (`<IMSkeleton>`) that preserve the layout structure, rather than a raw text string like "טוען...".
2. **Empty State**: Clear visual illustration with filled icon (`<IMIcon size="xl" tone="muted" />`) and concise Hebrew copy explaining that no items exist and an optional action button (e.g. "אין עדיין שיחות חדשות").
3. **Error State**: Informative error boundary or error alert with retry button where appropriate.
4. **Interactive / Success State**: Smooth transitions, tactile hover states (`hover:bg-accent`), and clear button loading spinners during async actions.
