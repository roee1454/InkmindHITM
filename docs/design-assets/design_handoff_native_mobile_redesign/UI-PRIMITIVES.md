# UI primitives — exact className strings

Paste-ready. Keep your existing prop signatures, `cn()` calls, `data-slot` attributes, and Radix wiring —
only the class strings change.

---

## `src/components/ui/input.tsx`

```tsx
<input
  type={type}
  data-slot="input"
  className={cn(
    "flex h-12 w-full min-w-0 rounded-2xl border border-input/80 bg-card px-4 font-assistant text-base text-foreground shadow-xs transition-all duration-150 ease-native outline-none selection:bg-primary/15 selection:text-foreground file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:text-[15px]",
    "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:shadow-sm",
    "aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10",
    className,
  )}
  {...props}
/>
```

**With a leading icon** (login, search, instagram) wrap instead of nesting an input in a div with its own
border — use `.field-native` on the wrapper and strip the input's own chrome:

```tsx
<div className="field-native gap-2.5">
  <Mail className="size-[18px] shrink-0 text-muted-foreground" />
  <input className="h-full w-full border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground/50" />
</div>
```

---

## `src/components/ui/select.tsx`

**SelectTrigger**

```tsx
<SelectPrimitive.Trigger
  data-slot="select-trigger"
  data-size={size}
  className={cn(
    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-input/80 bg-card px-4 font-assistant text-base text-foreground shadow-xs transition-all duration-150 ease-native outline-none select-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground/50 data-[size=default]:h-12 data-[size=sm]:h-10 md:text-[15px] md:data-[size=default]:h-11",
    "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 data-[state=open]:border-primary data-[state=open]:ring-4 data-[state=open]:ring-primary/10",
    "aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10",
    "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px] [&_svg:not([class*='text-'])]:text-muted-foreground",
    className,
  )}
  {...props}
>
```

**SelectContent**

```tsx
"relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl border border-border/80 bg-popover p-1.5 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
```

**SelectItem**

```tsx
"relative flex h-11 w-full cursor-pointer select-none items-center gap-2 rounded-xl px-3 text-[15.5px] font-medium outline-none transition-colors duration-100 data-[highlighted]:bg-muted data-[state=checked]:bg-primary/10 data-[state=checked]:font-bold data-[state=checked]:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-[17px]"
```

---

## `src/components/ui/button.tsx`

```ts
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 rounded-2xl font-assistant font-bold whitespace-nowrap outline-none transition-all duration-150 ease-native active:scale-[0.97] focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground shadow-md active:shadow-sm",
        destructive: "bg-destructive text-destructive-foreground shadow-md active:shadow-sm",
        outline:     "border border-border/80 bg-card text-foreground shadow-xs",
        secondary:   "bg-muted text-foreground",
        ghost:       "text-foreground active:bg-muted",
        link:        "text-primary underline-offset-4 active:scale-100 hover:underline",
      },
      size: {
        default: "h-12 px-5 text-base md:h-11 md:text-[15px]",
        lg:      "h-14 w-full px-6 text-[17px]",   // primary CTA — auth, onboarding, sheets
        sm:      "h-10 rounded-xl px-4 text-sm",
        icon:    "size-11 rounded-2xl",            // 44pt tap target
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)
```

---

## `src/components/ui/card.tsx`

```
Card:        "flex flex-col rounded-3xl border border-border/80 bg-card text-card-foreground shadow-sm"
CardHeader:  "flex items-center justify-between gap-3 px-5 pt-4 pb-3"
CardTitle:   "text-[16.5px] font-extrabold text-foreground"
CardDescription: "text-[13px] font-medium text-muted-foreground"
CardContent: "px-5 pb-4"          /* px-0 when the card holds a .row-native list */
CardFooter:  "flex items-center gap-3 border-t border-border/60 px-5 py-3.5"
```

A card that holds a list gets `CardContent` with **no horizontal padding** — the rows own it:

```tsx
<Card>
  <CardHeader><CardTitle>פניות אחרונות</CardTitle><a href="…">הכל</a></CardHeader>
  <CardContent className="px-0 pb-0">
    {leads.map(l => <div key={l.id} className="row-native">…</div>)}
  </CardContent>
</Card>
```

---

## `src/components/ui/badge.tsx`

```ts
const badgeVariants = cva(
  "inline-flex shrink-0 select-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] leading-none font-bold whitespace-nowrap [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:     "bg-primary/10 text-primary",             // waiting on you
        success:     "bg-emerald-500/12 text-emerald-600",     // confirmed / paid
        warning:     "bg-amber-500/12 text-amber-600",         // waiting on customer
        destructive: "bg-rose-500/10 text-rose-600",           // expired / failed
        muted:       "bg-muted text-muted-foreground",         // new / closed
        outline:     "border border-border/80 text-foreground",
      },
    },
    defaultVariants: { variant: "muted" },
  },
)
```

---

## `src/components/ui/textarea.tsx`

```
"flex min-h-[76px] w-full rounded-2xl border border-input/80 bg-card px-4 py-3 font-assistant text-base leading-relaxed text-foreground shadow-xs transition-all duration-150 ease-native outline-none placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10 md:text-[15px]"
```

---

## `src/components/ui/label.tsx`

```
"flex select-none items-center gap-2 ps-1 text-sm font-bold text-foreground group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50"
```

---

## `src/components/ui/switch.tsx`

```
Root:  "peer inline-flex h-[30px] w-[50px] shrink-0 cursor-pointer items-center rounded-full border-0 p-[3px] transition-colors duration-150 ease-native outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
Thumb: "pointer-events-none block size-6 rounded-full bg-white shadow-sm ring-0 transition-transform duration-150 ease-native data-[state=checked]:translate-x-0 data-[state=unchecked]:translate-x-0 data-[state=checked]:ms-auto"
```

RTL note: drive the thumb with `ms-auto` on the checked state rather than `translate-x-*`, which flips
incorrectly under `dir="rtl"`.

---

## `src/components/ui/tabs.tsx`

```
TabsList:    "inline-flex w-full select-none items-center gap-1 rounded-2xl bg-muted p-1"
TabsTrigger: "inline-flex h-10 flex-1 cursor-pointer select-none items-center justify-center gap-1.5 rounded-xl px-3 text-[14.5px] font-bold text-muted-foreground transition-all duration-150 ease-native outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:font-extrabold data-[state=active]:text-foreground data-[state=active]:shadow-sm"
TabsContent: "flex-1 outline-none"
```

---

## `src/components/ui/checkbox.tsx`

```
"peer size-6 shrink-0 cursor-pointer rounded-lg border border-input/80 bg-card shadow-xs transition-all duration-150 ease-native outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
```

---

## `src/components/ui/sheet.tsx` — mobile bottom sheet

```
Overlay: "fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"

Content (side="bottom"):
"fixed inset-x-0 bottom-0 z-50 flex max-h-[92svh] flex-col gap-4 rounded-t-3xl border-t border-border/80 bg-card px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-lg transition ease-native data-[state=closed]:duration-200 data-[state=open]:duration-300 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
```

Add a grab handle as the first child so it reads as draggable:

```tsx
<div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-foreground/15" />
```

---

## `src/components/ui/dialog.tsx`

```
"fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
```

Prefer `Sheet` on mobile and `Dialog` on desktop. `src/hooks/use-media-query.ts` already exists — branch on it.

---

## `src/components/ui/dropdown-menu.tsx`

```
Content: "z-50 min-w-[10rem] overflow-hidden rounded-2xl border border-border/80 bg-popover p-1.5 text-popover-foreground shadow-lg"
Item:    "relative flex h-11 cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 text-[15px] font-medium outline-none transition-colors duration-100 data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-[17px] [&_svg]:text-muted-foreground"
```

---

## `src/components/ui/table.tsx` — desktop only

```
Table:     "w-full caption-bottom text-[15px]"
TableHead: "h-11 px-4 text-start align-middle text-[13px] font-bold text-muted-foreground"
TableRow:  "border-b border-border/60 transition-colors last:border-0 data-[state=selected]:bg-primary/5"
TableCell: "h-14 px-4 align-middle"
```

On viewports below `lg`, don't render a table — render `.row-native` list items.

---

## `src/components/ui/avatar.tsx`

```
Root:     "relative flex size-[42px] shrink-0 overflow-hidden rounded-full"
Fallback: "flex size-full items-center justify-center rounded-full bg-primary/10 text-base font-extrabold text-primary"
```

---

## `src/components/ui/skeleton.tsx`

```
"animate-pulse rounded-2xl bg-muted"
```

---

## `src/components/ui/option-card-button.tsx`

```
"flex w-full cursor-pointer select-none flex-col gap-1 rounded-2xl border border-border/80 bg-card p-4 text-start shadow-xs transition-all duration-150 ease-native active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-primary/15 data-[selected=true]:border-primary data-[selected=true]:bg-primary/10"
```

---

## `src/components/ui/hour-picker.tsx` / `date-picker.tsx` / `calendar.tsx`

- Trigger: use `.field-native` geometry (`h-12`, `rounded-2xl`, `px-4`, `text-base`).
- Popover: `rounded-2xl border-border/80 shadow-lg p-2`.
- Calendar day cell: `size-11 rounded-xl text-[15px] font-medium`; selected = `bg-primary text-primary-foreground font-extrabold`; today = `border border-primary`; outside month = `opacity-40`.
- Hour list row: `h-12 rounded-xl px-3 text-base tabular-nums`, selected = `bg-primary/10 text-primary font-bold`.
