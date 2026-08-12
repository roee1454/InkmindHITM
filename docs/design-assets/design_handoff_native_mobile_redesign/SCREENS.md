# Screens

Every screen below exists in `Inkmind Native Design System.dc.html`. Mobile specs are at **390×844**;
desktop at **1280×800** with a 288px sidebar and content capped at 1024px.

Copy is final Hebrew — use it verbatim unless it's marked as sample data (names, numbers, dates).

---

## Auth — `/auth/login`

Vertically centered, no card. `.auth-shell` → `.auth-stack`:

1. 72px solid primary circle, "IM", 24px/800, `shadow-md`
2. "INKMIND CRM" 25px/800 tracking-tight, centered
3. "מערכת ניהול סטודיו קעקועים" 15px/500 muted, centered
4. `gap-8` then the form: two fields at `h-14`/`rounded-[18px]`, labels 14px/700 with `ps-1`
   - "כתובת אימייל" — `mail` icon, value `dir="ltr"` left-aligned
   - "סיסמה" — `lock` icon, `eye` toggle at the end, focused state shown (primary border + 4px ring)
5. `gap-8` then `.btn-native` "התחברות למערכת" (56px)
6. "שכחתי סיסמה" — 14px/700 primary, centered

---

## Onboarding — 3 steps

Shared shell: 3px progress bar under the status bar, then a 52px row: back chevron (steps 2–3) ·
"N מתוך 3" 14px/700 muted · "דלג" 14.5px/700 muted. Body `px-6 pt-5`, sticky footer. **Must not scroll
at 390×844.**

### Step 1 — Studio (`/onboarding/studio`)
- Question: "איך קוראים לסטודיו שלך?" (29px/800, two lines, `leading-[1.2]`)
- Hint: "זה השם שהלקוחות יראו בכל הודעת וואטסאפ שהסוכן שולח."
- One 60px field, focused, `rounded-[20px]`, 18px/600 text, sample "INKMIND Tattoo"
- Optional logo row: 56px dashed circle (`image` icon) + "להוסיף לוגו?" 15px/700 + "לא חובה — אפשר בכל רגע" 13.5px muted + "העלאה" 14.5px/800 primary
- Footer: `.btn-native` "המשך" + "אפשר לשנות הכל אחר כך בהגדרות" 13.5px muted centered

### Step 2 — Hours (`/onboarding/hours`)
The pre-filled default is the answer; the user confirms it.
- Question: "אלה שעות הפעילות שלך?"
- Hint: "מילאנו את הנפוץ ביותר. אם זה מדויק — אשר והמשך."
- Card (`rounded-[22px]`, `p-5`, `gap-[18px]`):
  - 7 day chips, 46px tall, `rounded-[14px]`, `flex-1`. Sun–Thu solid primary + white 15px/800; Fri–Sat `bg-muted` + muted text
  - Centered time line: `10:00` 30px/800 · "עד" 17px/700 muted · `18:00` 30px/800, `tabular-nums`
  - Three presets, 42px, `rounded-[13px]`: "בוקר 09–17" · "סטנדרט 10–18" (selected: primary border + `bg-primary/10` + 800) · "ערב 12–20"
- Footer: `.btn-native` with `check` icon + "כן, זה מדויק"; below it "עריכת יום ספציפי" 14.5px/800 primary

### Step 3 — Profile (`/onboarding/profile-links`)
- Question: "ספר לנו עליך"  (27px/800)
- Hint: "כדי שהסוכן יפנה לקוחות לתיק העבודות שלך. הכל אופציונלי."
- Four fields, 54px, `rounded-[17px]`, `gap-3`:
  - instagram — `at-sign`, focused, `dir="ltr"`, sample "inkmind.tattoo"
  - "קישור לתיק עבודות" — `image`, placeholder state
  - "אתר הסטודיו" — `globe`, placeholder state
  - bio textarea, `min-h-[82px]`, sample "מתמחה בקווי מתאר עדינים ופרחוניות, 8 שנות ניסיון"
- Footer: `.btn-native` "סיום"

### Done (`/onboarding/done`)
Centered: 92px `bg-success/12` circle with a 44px check → "הסטודיו מוכן" 30px/800 → "הסוכן כבר יכול לענות
ללקוחות, לאסוף פרטים ולהציע תורים בשעות שהגדרת." 16.5px muted → full-width status row: 38px success chip
(`message-square`) + "וואטסאפ מחובר" 15px/800 + "נבדק אוטומטית — לא נדרשה פעולה" 13.5px muted.
Footer: `.btn-native` "כניסה למערכת" + "נשארו 4 הגדרות לא־חובה" 14.5px/700 muted.

---

## Dashboard — `/dashboard`

**Mobile.** Top bar (menu · "בית" · bell with dot). Body `px-4 pt-5 gap-[18px]`:
1. `.page-head` — "בוקר טוב, רועי" 23px/800 + "שני, 10/08/2026 — 4 תורים היום" 14px muted
2. Three `.stat-native` tiles in one row: 34px icon chip (`rounded-[12px]`), 26px/800 value, 12.5px/700 label
   — תורים היום (success/`calendar-days`) · פניות חדשות (primary/`zap`) · לידים פעילים (warning/`users`)
3. Alert bar: 52px solid primary, `rounded-[18px]`, "3 פניות ממתינות לתמחור שלך" 15px/700 + `arrow-left`
4. "פניות אחרונות" card: header (16.5px/800 + "הכל" 13.5px/700 primary), then **3** `.row-native`s —
   40px avatar monogram · name 15px/700 + style 13px muted · status pill
5. When the setup checklist is incomplete, it renders **above** the stat tiles: card header
   ("להשלים את ההגדרה" + "3 / 7" + 7px progress bar) + 3 rows + "הצג את כל השבע" footer link

Bottom nav: בית · תורים · לידים · לקוחות · שיחות (badge "3" on שיחות).

**Desktop.** Sidebar 288 (monogram+wordmark+bell · AI-agent status row · nav · user footer). Content
`p-8 px-10`, max 1024: header row with title 30px/800 + "תור חדש" primary button (46px) → 3-col stat cards
(22px padding, 40px icon chip, 38px/800 value) → alert bar 56px → 2-col grid of "פניות אחרונות" and
"תורים קרובים" cards, 4 rows each.

---

## Customers — `/dashboard/customers`

Search field 52px (`search` icon, "חיפוש שם, טלפון או אימייל") → count row ("128 לקוחות" 13px/800 muted +
"חוזרים בלבד" 13px/700 primary) → **one** `.card-native` with 6 `.row-native`s: 42px avatar · name 15.5px/700
· "₪2,400 • 3 ביקורים" 13px muted · `chevron-left`. `+` lives in the top bar.

---

## Calendar — `/dashboard/calendar`

Top bar (menu · "תורים" · `+` primary). Then:
1. White block: month label 16px/800 + day/month segmented toggle; below it a 7-cell week strip —
   each cell `flex-1`, `rounded-[14px]`, day name 11.5px/700 muted over date 16px/800. Selected = solid
   primary + `shadow`. Weekend = `opacity-40`.
2. Status filter chips (horizontal scroll): "הכל · 4" solid primary · "מאושר · 3" · "ממתין · 1" · "בוטל"
3. Day timeline, `gap-2.5`: 52px `tabular-nums` time gutter + card (`rounded-[18px]`, `border-s-4` in the
   status color) containing name 15.5px/800 + status pill, "בלאק־אנד־גריי, אמה • 3 שעות" 13.5px muted,
   and "₪1,800 · מקדמה שולמה" 13.5px/700

---

## Leads — `/dashboard/leads`

**Mobile.** Stage chips (ממתין למחיר · איסוף פרטים · נקבע), then a single column of lead cards with the next
column peeking ~22px at the trailing edge as a swipe affordance. Card: source row (`message-square`/
`instagram` + label 12.5px/700 muted + ⋮) → name 16px/800 → "מקעקע: מאיה לוי" 13.5px muted → divider →
relative time 12.5px muted + "פתח שיחה" 13.5px/800 primary. Locked cards `opacity-65` with a `lock` icon.

**Desktop.** Horizontal-scroll kanban, 236px columns, `rounded-[20px]`. Column header = stage pill + count.
Active drop target = `border-primary` + `bg-primary/10` + a dashed 82px "שחרר כאן" placeholder.

---

## Conversations — `/dashboard/conversations`

**Mobile list.** Search 48px on `bg-muted` inside the white header, then rows: 46px avatar · name 15.5px/700
+ time 12.5px/600 on the top line · preview 13.5px muted + unread badge (success pill) or handler pill
(בוט primary / צוות muted / הוסלם warning / סגור muted) on the second line. Selected row = `bg-primary/10`.

**Chat thread (mobile).** No top bar, no tab bar — full bleed.
- Header 62px: back chevron (primary) · 40px avatar · name 16px/800 + "סוכן AI פעיל" 12.5px/700 success with
  a 7px dot · ⋮
- Feed `px-3.5 py-3.5 gap-[7px]`: centered date chip ("היום", 11.5px/700 on `bg-muted`), then bubbles
- Composer: 46px attach chip · 46px `bg-muted` input ("הודעה…") · 46px solid primary send
- The four HITL blocks appear inline in the feed — see below

**Chat thread (desktop).** Three panes: sidebar 288 · conversation list 288 · thread. Header 70px adds the
23-hour window note and a "העברה לצוות" outline button. Bubbles cap at 58%.

### The four HITL blocks

All are one compact row except the quote, which is a header + a 3-box row + a full-width action.

**Quote** — `border-primary`, `rounded-[16px]`, `p-2.5`, `gap-1.5`:
`hand-coins` 14px primary + "נדרש אישור שלך — תמחור" 13px/800; then three 34px boxes
(משך `3 שעות` · טווח מחיר `₪1,600–2,000` · מקדמה `₪300`, each 9.5px/700 muted label over 12px/800 value);
then a 36px primary bar "שליחת הצעה ללקוח" 13px/800.

**Slot confirm** — `.hitl-row`: `calendar-clock` + "מועד: יום ד׳ 12/08 · 16:00" 11.5px/700 (truncating) +
26px primary "אישור".

**Receipt approve** — `.hitl-row`: `receipt-text` + "אסמכתה: ₪300 ביט" + muted "דחייה" 10.5px/700 +
26px primary "אישור".

**Final confirm** — `.hitl-row-success`: `badge-check` (success) + "אישור סופי — התור נקבע" +
26px success "שליחה".

### ⋮ menu → gallery dialog
Two segmented tabs: **תמונות השראה** (grid of customer reference images, tap to zoom) and **אסמכתות**
(receipt rows: thumbnail + amount + method + timestamp + approval pill).

---

## Notifications — `/dashboard/notifications`

Grouped `.card-native` lists under 13px/800 muted date headers (היום / אתמול / השבוע). Row: 36px icon chip
in the semantic color · title 15px/700 + body 13px muted · relative time 12px muted. Unread = `bg-primary/5`
plus an 8px primary dot in the leading position. Header action "סמן הכל כנקרא". Empty state = 64px muted
icon + one muted line, centered.

---

## Settings

**Mobile — menu (`/dashboard/settings`).** Profile header (52px avatar + name 17px/800 + email 13px mono
muted), then one `.card-native` with 7 rows (36px muted icon chip + label 15px/700 + optional sub-line +
`chevron-left`): כללי · מדיניות הסטודיו · צוות והרשאות (sub "2 חברי צוות") · יומן Google (sub "מחובר" in
success) · סוכן AI · שאלות נפוצות · גיבויים. Below the card: a 52px outline "התנתקות" in `destructive`.

**Mobile — צוות והרשאות.** Top bar with `+`. Intro "2 חברי צוות · יומן אחד מחובר". One card, two rows:
46px avatar · name 15.5px/800 · two small pills ("את/ה" primary + "יומן מחובר" success; second member gets
"מקעקעת" muted + "אין יומן" warning) · `chevron-left`. Then a 52px dashed "הוספת חבר צוות".

**Mobile — member detail.** Top bar shows the member's name. A 3-tab segmented control (פרופיל · שעות · גישה)
in the white header. Body: instagram 52px · portfolio 52px · bio 76px, then the Google Calendar row
(38px muted `calendar-days` chip + "Google Calendar" 14.5px/800 + email 12.5px `dir="ltr"` muted + success
dot & "מחובר" + muted "נתק"). Sticky footer: `.btn-native` with `save` icon + "שמור פרופיל".

**Mobile — מדיניות הסטודיו.** Deposit instructions textarea (88px) · "חלון ביטול" select showing "48 שעות" ·
"ימי סגירה" list with an "הוספה" link (ראש השנה 22–23/09 · יום כיפור 01/10). Sticky "שמור שינויים".

**Mobile — סוכן AI.** Active toggle row (38px success chip + "הסוכן פעיל" + "מגיב אוטומטית לפניות חדשות" +
switch) · "מודל" select ("Claude Sonnet 5") · "רמת יצירתיות" with the value 14px/800 primary on the label row
and a 6px track + 22px thumb at 40% · "הנחיות מותאמות" textarea (110px). Sticky "שמור הגדרות".

**Mobile — שאלות נפוצות.** `+` in the top bar. Intro "הסוכן עונה מהן ישירות ללקוחות · 3 שאלות". One card,
each row = question 15.5px/800 + answer 14px muted.

**Mobile — גיבויים.** Intro "גיבוי אוטומטי יומי של כל נתוני הסטודיו" · 52px outline "גיבוי עכשיו"
(`download`) · one card listing backups (timestamp 14.5px/700 + "4.2MB · אוטומטי" 13px muted + "שחזור"
13.5px/800 primary).

**Desktop — צוות והרשאות (`/settings/team`).** Three panes: sidebar 288 · section list 236 (selected row =
`bg-primary/10` + primary 800) · content.
Content: header row (title 23px/800 + "2 חברי צוות · 1 יומן מחובר" 13.5px muted, and a 40px primary
"חבר צוות" button) then a two-column body:
- Left, 214px: member cards. Selected = **solid primary** card (36px translucent-white avatar, name 14px/800
  white, "בעלים · את/ה" 11.5px at 80% opacity). Unselected = white card with muted avatar. Then a dashed
  "הוספה" card.
- Right, flex: one `.card-native`. Header — name 17px/800 + email 12.5px mono muted, with "מנהל" (primary)
  and "סיסמה מוגדרת" (success) pills on the trailing side; then the 3-tab segmented control.
  Body — 2-col grid (אינסטגרם · תיק עבודות, 44px fields with leading icons), "תיאור קצר" 64px textarea,
  and the Google Calendar row on `bg-background`. Footer — "כל השדות אופציונליים" 12.5px muted +
  40px primary "שמור".

---

## Responsive contract

Only **density and layout** change between mobile and desktop — never the components. Fields go 48→44,
CTAs 56→48, body text 16→15, page padding 16→40, and the bottom tab bar is replaced by the 288px sidebar.
Radii, shadows, pills, list rows, and status colors are identical at every width.

Breakpoint: `lg` (64rem) is the single switch between the mobile chrome (top bar + tab bar) and the desktop
chrome (sidebar). `src/hooks/use-media-query.ts` already encodes it — reuse it rather than adding a second
threshold.
