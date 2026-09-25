# Track B: תשתית שלא תלויה בשיחה עם הלקוח

> **המטרה:** לבנות עכשיו כל מה שלא מחכה להחלטה עסקית, חשבונאית או משפטית. כל החלטה פתוחה נבנית כ**חריץ**: הגדרה שהערך שלה "טרם הוחלט", לא קוד קשיח. כך רוב [Track A](track-a-after-client-call.md) הוא מילוי הגדרות וחיבור מפתחות.
> הקשר, עקרונות ומטריצת כיסוי: [README.md](README.md).
## איך כל פריט בנוי
| חלק | תוכן |
| --- | --- |
| מה זה | מה נבנה |
| מה זה משפר | הבעיה שנפתרת, עם הפניה לקוד כשיש |
| UI ב-CRM | מסכים, תגים, מצבי טעינה, ריק ושגיאה, מובייל |
| סוכן הוואטסאפ | מה הלקוח חווה בשיחה |
| שרת ולוגיקה | פונקציות, ולידציה, נעילות, מקרי קצה |
| DB וסכמה | קולקציות, שדות, אינדקסים, hooks |
| פעולות חיצוניות | Meta, Google, `.env`, Docker |
| טסטים | מה מוכיח שזה עובד |

"אין שינוי" פירושו שהממד נבדק ואין בו השפעה. זה לא סימן שהוא דולג.

## סדר ותלויות
| שלב | נושא | גודל | תלוי ב- | פותח את (Track A) |
| --- | --- | --- | --- | --- |
| B0 | הכנה: commit, גרסת PocketBase, baseline | S | — | — |
| B1 | הגדרות עסק ומדיניות כחריצים | M | B0 | A1, A5, A6, A8 |
| B2 | מסמכים (חשבוניות) על Mock | L | B1 | A1, A2, A3, A9, A12 |
| B3 | ביטולים והחזרים: מנגנון בלי מדיניות | M | B2 | A4 |
| B4 | מכונת שלבי הפרויקט | L | B0 | A7, A10 |
| B5 | מכונת מצבי השיחה: הקשחה | L | B4 | — |
| B6 | הבוט: מודעות לפרויקט ולכסף | M | B1, B5 | A5, A6 |
| B7 | Lifecycle: הודעות אוטומטיות | M | B1, B4, B5 | A8, A9 |
| B8 | אנליטיקות ודשבורד | M–L | B2, B4 | — |
| B9 | עוזר ה-MCP | S–M | B2, B4 | — |
| B10 | UI משלים | M | B2, B4 | — |
| B11 | ניקוי שדות ישנים ותיעוד | M | הכול | — |

**הסדר המומלץ:** B0 ← B1 ← B2 ← B3 ← B4 ← B5 ← B6 ← B7 ← B8 ← B9 ← B10 ← B11.

**למה המסמכים לפני שלבי הפרויקט:** B1 עד B3 הם מה ש-Track A נשען עליו (הגדרות עסק, Green Invoice, החזרים). אם השיחה עם הלקוח תהיה בקרוב, כדאי שהם יהיו מוכנים ראשונים. B4 עד B8 פותרים את הבעיה המקורית שלך (אנליטיקות ובוט קשיח), אבל לא חוסמים אף תשובה של הלקוח. **חלופה:** אם האנליטיקות דחופות יותר, אפשר להתחיל ב-B4 ← B5 ← B8. B1 עד B3 לא תלויים בהם.

## Definition of Done: בכל שלב
אותה שיטה ששימשה בשלבים (א)–(ד):

- מיגרציות ו-hooks נכתבים קודם ב-scratchpad, ונבדקים על PocketBase זמני שנבנה מאפס.

- טסטים לפני הקוד, לכל hook ולכל פונקציה טהורה. **בדיקת שפיות:** אותם טסטים בלי ה-hook החדש חייבים להיכשל.

- המיגרציה רצה על עותק של ה-DB שלך, כולל `migrate down`. הגיבוי נשמר ב-scratchpad.

- התקנה בריפו, ואז `curl /api/health`.

- `pnpm tsc --noEmit`, `pnpm test`, `pnpm test:integration`, eslint על כל קובץ שנגעתי בו, ו-`pnpm db:audit`.

- בדיקה שקוד שרת לא דולף ל-bundle של הלקוח (grep על המודולים מה-dev server).

- עדכון `docs/architecture.md` וקובץ הזיכרון.

- צילומי מסך ל-`walkthrough.md`: **רק כשתבקש**, לפי [CLAUDE.md](http://CLAUDE.md).

- commit אחד לכל שלב, באישורך.

---

## B0. הכנה
### B0.1 commit לעבודה שכבר נעשתה
- **מה זה:** כרגע לא נעשה commit לשום דבר מ-Cascade ומשלבים (א)–(ד). בעץ יש גם שינויים שלך שלא קשורים (UI revamp, קבצים שנמחקו). אציע חלוקה ל-commits לוגיים: data integrity, מדיניות ביטולים, פרויקטים, יומן מעברים, תשלומים וסגירת סשן. את השינויים שלך אשאיר לך.

- **מה זה משפר:** נקודת חזרה בטוחה לפני ש-B נוגע באותם קבצים, ו-diff קטן יותר לסקירה.

- **UI / סוכן / שרת / DB:** אין שינוי.

- **פעולות חיצוניות:** אישור שלך על החלוקה.

### B0.2 יישור גרסת PocketBase
- **מה זה:** [pocketbase/Dockerfile:3](../../pocketbase/Dockerfile#L3) מתקין את `0.39.7`, והטסטים רצים על `0.39.10`.

- **מה זה משפר:** ה-hooks נשענים על API של טרנזקציות, כך שמה שנבדק צריך להיות מה שרץ ב-production.

- **UI / סוכן / שרת:** אין שינוי.

- **DB:** אין שינוי בסכמה. גיבוי לפני הפריסה.

- **פעולות חיצוניות:** בניית image מחדש ופריסה (`deploy.sh`), ואותה גרסה נעולה גם ב-CI.

### B0.3 Baseline
להריץ את כל הבדיקות מסעיף 5 ב-Definition of Done ולשמור את התוצאה. זה מה שכל שלב יושווה אליו.

---

## B1. הגדרות כחריצים
**העיקרון:** כל שאלה פתוחה ב-Track A מקבלת כאן שדה בהגדרות, עם ברירת מחדל שמשמרת את ההתנהגות של היום או עם `null` שפירושו "טרם הוחלט". הקבועים שכתובים היום בקוד (48 שעות ל-aftercare, 14–21 ימים לבדיקת החלמה, 7 ימים לתפוגת ליד) עוברים להגדרות, וכך יש להם מקור אחד.

### B1.1 הגדרות עסק ומסמכים
- **מה זה:** שדות חדשים ב-`settings`:

- `business_type`: `exempt` / `licensed` / `company`, ו-`null` כשטרם הוחלט.

- `business_legal_name`, `business_tax_id`, `business_address`.

- `vat_rate`: ברירת מחדל 18.

- `prices_include_vat`: ברירת מחדל `true`.

- `deposit_document_type`: `null` עד שרואה החשבון מחליט.

- `invoice_whatsapp_auto_send`: ברירת מחדל `false`.

- **מה זה משפר:** היום אין בהגדרות אף פרט למס. בלי השדות האלה אי אפשר להפיק מסמך, ואחרי השיחה צריך לכתוב קוד במקום למלא טופס.

- **UI ב-CRM:**

- לשונית חדשה, **"עסק ותשלומים"**, בהגדרות. רק owner/admin רואים אותה. היא מחולקת לכרטיסים: "פרטי העסק", "מע"מ", "סוגי מסמכים" ו"ספק המסמכים".

- שדה שעוד לא הוחלט מקבל תג **"ממתין להחלטה"** (`bg-status-wait-soft text-status-wait`), עם הסבר מי מחליט ("רואה החשבון של הסטודיו").

- כרטיס "ספק המסמכים" מציג לקריאה בלבד את מצב ה-provider מה-env (Mock או Green Invoice, sandbox או production) וכפתור "בדיקת חיבור" (ב-B2).

- skeleton בזמן טעינה, שגיאה עם "נסה שוב", toast בשמירה. בנוי מרכיבי `components/ui`, עם tokens בלבד.

- **סוכן הוואטסאפ:** אין שינוי. הבוט לא מדבר על מס.

- **שרת ולוגיקה:**

- `getBusinessSettings` / `updateBusinessSettings` (`createServerFn` עם Zod ובדיקת תפקיד).

- פונקציה טהורה `isValidIsraeliTaxId`: 9 ספרות עם ספרת ביקורת.

- פונקציה טהורה `getInvoicingReadiness(settings)`: מחזירה רשימה של מה שחסר. ה-UI משתמש בה כדי להשבית את "הפקת מסמך" ולהסביר למה.

- **DB:** מיגרציה שמוסיפה את השדות ל-`settings`.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit ל-`isValidIsraeliTaxId` ול-`getInvoicingReadiness` (כל שילוב של שדות חסרים), ו-integration לשמירה ולבדיקת הרשאה.

### B1.2 מדיניות פרויקטים וטיפול
- **מה זה:** שדות ב-`settings`:

| שדה | ברירת מחדל | משמש את | ההחלטה ב- |
| --- | --- | --- | --- |
| `touch_up_free_days` | `null` (כל טאץ' עובר לצוות) | B6.2, סגירת סשן | A5 |
| `deposit_application` | `first_session` (ההתנהגות של היום) | B4.3, B6.4 | A6 |
| `deposit_per_session` | `null` (כמו היום: כל תור עובר תמחור ומקדמה) | B6.2 | A6 |
| `healing_period_days` | 21 | B6.1, B7.2 | A8 |
| `consultation_followup_days` | 3 | B7.3 | A8 |
| `consultation_lost_after_days` | 30 | B7.4 | A8 |
| `inquiry_lost_after_days` | 7 (היום `LEAD_INACTIVITY_EXPIRY_DAYS`) | B7.4 | A8 |
| `dormant_after_months` | 12 | B4.5 | — |
| `post_project_feedback` | `review_links` (כמו היום) | B7.5 | A8 |
| `booking_disclosure_text` | ריק | הודעת אישור התור | A4 (עו"ד) |
| `easy_review_link` | ריק | B7.1 | — |

- **מה זה משפר:** כל החלטה של הלקוח הופכת לערך בטופס. בנוסף נעלמים קבועים כפולים: בדיקת החלמה, aftercare ותפוגת ליד כתובים היום בקוד של [lifecycle-service.ts](../../src/features/lifecycle/server/lifecycle-service.ts).

- **UI ב-CRM:** כרטיס "מדיניות פרויקטים" בלשונית "עסק ותשלומים", עם תג "ממתין להחלטה" על כל שדה `null`. `booking_disclosure_text` מופיע כ-textarea, עם תצוגה מקדימה של הודעת האישור.

- **סוכן הוואטסאפ:** כש-`booking_disclosure_text` לא ריק, הוא נוסף בסוף הודעת אישור התור. כשהוא ריק, ההודעה לא משתנה. שאר השדות נצרכים ב-B6 וב-B7.

- **שרת ולוגיקה:** פונקציה טהורה `resolveProjectPolicy(record)`, שמחזירה אובייקט עם טיפוסים וברירות מחדל, ו-`getProjectPolicy()` בשרת. כל מי שקורא מדיניות עובר דרכה.

- **DB:** מיגרציה.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit ל-`resolveProjectPolicy` (ערכים חסרים, לא חוקיים וגבולות).

### B1.3 פרטי חיוב ללקוח
- **מה זה:** `customers.billing_name` ו-`customers.tax_id`, שניהם אופציונליים.

- **מה זה משפר:** לקוח עסקי צריך מסמך על שם העסק. מעל 5,000 ₪ לפני מע"מ, ללקוח שמקזז מע"מ, נדרש גם מספר הקצאה.

- **UI ב-CRM:** אזור מתקפל "פרטי חשבונית (אופציונלי)" ב-[CustomerDialog.tsx](../../src/features/customers/components/CustomerDialog.tsx), עם ולידציה של מספר עוסק.

- **סוכן הוואטסאפ:** אין שינוי.

- **שרת ולוגיקה:** Zod בשמירת לקוח.

- **DB:** מיגרציה.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit לולידציה.

---

## B2. מסמכים (חשבוניות) על Mock
**העיקרון:** המערכת לא מפיקה מסמכים חשבונאיים בעצמה. היא מבקשת אותם מספק (Mock בפיתוח, Green Invoice אחרי A2) ושומרת תוצאה שאי אפשר לשנות. ביטול נעשה רק בחשבונית זיכוי.

**Feature חדש:** `src/features/invoices/` (`types.ts`, `utils/`, `server/`, `components/`, `hooks/`). הספקים יושבים ב-`src/integrations/invoicing/`, לפי §7 ב-architecture.

### B2.1 סכמה, hooks ו-outbox
- **מה זה:**

- **קולקציה **`invoices`**:**

- קשרים: `project` (חובה, **בלי cascade**, כך שמחיקה נחסמת), `appointment` (אופציונלי), `payments` (multi-relation).

- מסמך: `purpose` (`deposit` / `session_payment` / `refund`), `document_type` (`320` / `305` / `400` / `330` / `600` / `610`).

- ספק: `provider` (`mock` / `greeninvoice`), `provider_document_id`, `number`, קובץ `pdf`.

- סכומים: `amount_gross`, `vat_amount`, `vat_rate`, `lines` (json).

- **snapshot** של פרטי הלקוח ברגע ההפקה (`billing_name`, `tax_id`, `phone`), כי מסמך לא משתנה גם אם הלקוח עודכן.

- סטטוס: `status` (`draft` / `issuing` / `issued` / `failed`), `error`, `issued_at`, `idempotency_key` (**unique index**).

- זיכוי: `credit_for` ו-`credited_amount`.

- שליחה: `delivered_at`, `delivery_channel`, `delivery_error`.

- **hooks** ב-`pb_hooks/invoices.pb.js`, עם הלוגיקה ב-`lib/invoices.js`:

- **immutability:** מסמך ב-`issued` מקבל עדכון רק לשדות המשלוח ול-`credited_amount`.

- **מחיקה אסורה**, אלא אם הסטטוס `draft` או `failed`.

- **מעברי סטטוס:** `draft→issuing→issued|failed`, ו-`failed→issuing` לניסיון חוזר.

- **כל מעבר נרשם** ב-`state_transitions` (`entity: invoices`, כבר קיים ב-select).

- **תשלום אחד, מסמך פעיל אחד:** תשלום לא יכול להופיע בשני מסמכים פעילים. קוד `integrity:payment_already_documented`.

- **תשלום שכבר תועד** לא נמחק ולא מבוטל (`voided`). מבטלים אותו רק בזיכוי.

- `integration_outbox.kind` מקבל שני ערכים חדשים: `invoice_issue` ו-`invoice_deliver`.

- **מה זה משפר:** מסמך חשבונאי חייב להישמר 7 שנים בלי שינוי. האכיפה ב-PocketBase חלה על כל כותב, כולל ממשק הניהול.

- **UI / סוכן:** אין שינוי בשלב הזה.

- **שרת ולוגיקה:** קודי שגיאה חדשים ב-[integrity-codes.ts](../../src/features/database/utils/integrity-codes.ts).

- **DB:** מיגרציה עם `migrate down`. `relation-graph` ב-delete impact יציג את `invoices` כחוסם, בלי קוד נוסף.

- **פעולות חיצוניות:** אין.

- **טסטים** (integration): עדכון מסמך מונפק נדחה, מחיקה נדחית, מעבר אסור נדחה, תשלום כפול במסמכים נדחה. בדיקת שפיות בלי ה-hooks.

### B2.2 לוגיקה טהורה
- **מה זה:** ב-`src/features/invoices/utils/`:

- `document-type.ts` → `resolveDocumentType(settings, purpose)`. מחזיר `{ type }` או `{ needsDecision: true, reason }`:

- `exempt` → קבלה (400).

- `licensed` / `company`:

- תשלום על סשן: 320.

- מקדמה: לפי `deposit_document_type`, ואם השדה ריק `needsDecision`.

- החזר: 330 מול 320, או 610 מול 600.

- החזר לעוסק פטור → `needsDecision`, כי זו שאלה לרואה החשבון (A1).

- `vat.ts` → `splitVat(amount, rate, includeVat)`, עם עיגול לאגורה.

- `draft.ts` → `buildInvoiceDraft(...)`: שורות בעברית ("סשן קעקוע: {שם הפרויקט} ({תאריך})", "מקדמה עבור {שם הפרויקט}") ו-snapshot של הלקוח.

- `idempotency.ts` → מפתח שנגזר מ-`purpose`, מה-IDs של התשלומים (ממוינים) ומסוג המסמך. לזיכוי: מה-ID של המסמך המקורי ומהסכום.

- `allocation.ts` → `needsAllocationNumber(net, customer)`: לקוח עסקי מעל הסף. הסף הוא קבוע שמוגדר במקום אחד, כי הוא יורד בהדרגה לפי החוק.

- **מה זה משפר:** כל הכללים החשבונאיים נמצאים בפונקציות שאפשר לבדוק ב-100%. תשובת רואה החשבון (A1) משנה ערך בטבלה, לא קוד.

- **UI / סוכן / DB / חיצוני:** אין שינוי.

- **טסטים:** 100% כיסוי. כל שילוב של סוג עוסק, מטרה ומע"מ. עיגול. מפתח זהה לאותה קבוצת תשלומים בסדר אחר.

### B2.3 Provider ו-Mock
- **מה זה:**

- ממשק `InvoiceProvider` ב-`src/integrations/invoicing/types.ts`: `createDocument(draft, key)`, `findByKey(key)`, `getPdf(doc)`.

- `mock-provider.server.ts`:

- מספרים רציפים בפורמט `MOCK-000123`.

- **PDF מינימלי שנבנה כמחרוזת**, בלי תלות חדשה. הטקסט באנגלית, "TEST DOCUMENT: NOT A TAX DOCUMENT", כדי לא להתעסק בעברית ב-PDF.

- אפשרות להכשיל קריאה בטסטים.

- `provider.server.ts` בוחר ספק לפי `INVOICE_PROVIDER`. **הגנה:** ב-`NODE_ENV=production`, ספק `mock` נחסם אלא אם הוגדר `ALLOW_MOCK_INVOICES=1`.

- **נקודה אחת שקובעת מי המנפיק:** `resolveIssuer(appointment)` מחזירה כרגע תמיד "הסטודיו". אם יתברר שכל אמן הוא עוסק נפרד (A3), זה המקום היחיד שמשתנה.

- **מה זה משפר:** אפשר לבנות ולבדוק את כל התהליך מקצה לקצה בלי חשבון Green Invoice, ומסמך Mock לא יכול להגיע ללקוח אמיתי ב-production.

- **UI ב-CRM:** מסמך Mock מקבל תג "מסמך בדיקה" (`bg-muted text-muted-foreground`).

- **סוכן הוואטסאפ:** מסמך Mock נשלח עם קידומת "[בדיקה]".

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שינוי.

- **פעולות חיצוניות:** ב-`.env` מוסיפים `INVOICE_PROVIDER=mock`, ומעדכנים את `.env.example`.

- **טסטים:** unit ל-factory (חסימה ב-production), ו-contract tests משותפים ל-`InvoiceProvider`. אותה סוויטה תרוץ מול Green Invoice ב-A2.

### B2.4 תהליך ההפקה
- **מה זה:**

- `issueDocument({ purpose, paymentIds })`**:** `createServerFn` עם Zod ובדיקת הרשאה (owner/admin, או האמן של התור).

- `invoiceLock` חדש ב-[async-lock.ts](../../src/lib/async-lock.ts), לפי פרויקט.

- טעינת הנתונים, `getInvoicingReadiness`, `resolveDocumentType`, `buildInvoiceDraft`.

- **batch אחד:** יצירת המסמך בסטטוס `issuing` ושורת outbox מסוג `invoice_issue`.

- הרצת ה-outbox מיד (כמו אחרי מחיקה), והחזרת המסמך.

- **handler ב-outbox:**

- מסמך שכבר `issued` מסומן `done`.

- `findByKey`. אם נמצא, מסמנים `issued` (הגנה מהפקה כפולה ב-retry).

- אחרת `createDocument`, ושמירה של המספר, ה-ID וה-PDF כקובץ.

- אם `invoice_whatsapp_auto_send` פעיל, נרשמת גם שורת `invoice_deliver`.

- **כישלון:** ניסיון חוזר עם backoff. אחרי המקסימום הסטטוס עובר ל-`failed`, והצוות מקבל התראה "הפקת מסמך נכשלה" עם כפתור לניסיון נוסף.

- **מה זה משפר:** אין הפקה כפולה (unique על המפתח, `findByKey` ונעילה), ואין מסמך שנשכח באמצע (outbox עם ניסיונות חוזרים).

- **UI ב-CRM:**

- תג "בהפקה…" עם ספינר (`status-wait`) ← מספר המסמך וקישור ל-PDF (`status-done`), או "נכשל" עם "נסה שוב" (`destructive`).

- Realtime על `invoices` ב-`useDashboardRealtime`.

- **סוכן הוואטסאפ:** אין שינוי, השליחה מטופלת ב-B2.6.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שינוי מעבר ל-B2.1.

- **פעולות חיצוניות:** אין.

- **טסטים:**

- integration: הפקה מלאה מול Mock.

- שתי קריאות במקביל על אותם תשלומים מפיקות מסמך אחד (`Promise.allSettled`, כמו בטסט סגירת הסשן).

- כשל בספק מגיע ל-`failed`, ו-retry לא מפיק פעמיים.

### B2.5 חשבונית זיכוי
- **מה זה:** `issueCreditNote({ invoiceId, amount, reason })`. הזיכוי יכול להיות חלקי: עד הסכום המקורי פחות זיכויים קודמים. הוא מתעדכן ב-`credited_amount` של המסמך המקורי.

- **מה זה משפר:** הדרך החוקית היחידה לבטל מסמך. היום אין אותה בכלל.

- **UI ב-CRM:** "הפקת זיכוי" בתפריט של המסמך, דרך `AlertDialog` שמסביר שהפעולה בלתי הפיכה.

- **סוכן הוואטסאפ:** אין שינוי.

- **שרת ולוגיקה:** ולידציה של הסכום. תהליך ההפקה זהה ל-B2.4.

- **DB:** אין שינוי מעבר ל-B2.1.

- **פעולות חיצוניות:** אין.

- **טסטים:** זיכוי מעל היתרה נדחה, זיכויים חלקיים מצטברים, זיכוי על זיכוי נדחה.

### B2.6 שליחה בוואטסאפ
- **מה זה:**

- `uploadMedia(buffer, mime, filename)` ו-`sendDocument({ to, mediaId, filename, caption })` ב-[client.ts](../../src/integrations/whatsapp-cloud-api/client.ts). היום יש שם רק `sendText` ו-`sendTemplate`.

- handler מסוג `invoice_deliver`:

- חלון 24 השעות פתוח: `sendDocument`.

- החלון סגור: template בשם `invoice_ready` עם header מסוג document.

- החלון סגור ואין template: התראה לצוות, באותו דפוס של `dispatchLifecycleMessage`.

- ההודעה נשמרת בשרשור השיחה.

- **מה זה משפר:** הלקוח מקבל את המסמך בלי שהצוות צריך להוריד ולשלוח ידנית. העלאה כ-media id במקום `link` עובדת גם כש-Meta לא יכולה לגשת לשרת, למשל בפיתוח בלי ngrok.

- **UI ב-CRM:** כפתור "שליחה ללקוח" ליד כל מסמך, ותג "נשלח" עם התאריך. המסמך מופיע כהודעה בשיחה.

- **סוכן הוואטסאפ:** הלקוח מקבל PDF עם כיתוב קצר, למשל "מצורפת קבלה על התשלום. תודה!". הבוט רואה את ההודעה בהיסטוריה.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שינוי מעבר ל-B2.1.

- **פעולות חיצוניות:** template `invoice_ready` ב-Meta. הגשה לאישור ב-A9, והקוד עובד גם לפני האישור.

- **טסטים:** unit ל-client (payload), ו-integration ל-handler בשני מצבי החלון.

### B2.7 UI: שלושת מקומות ההפקה
- **מה זה:**

- [**CloseSessionDialog.tsx**](../../src/features/payments/components/CloseSessionDialog.tsx)**:** אחרי סגירה מוצלחת מופיע שלב "סיכום", עם "הפקת מסמך על התשלום" ו-checkbox "לשלוח ללקוח בוואטסאפ".

- **חלון התור:** section חדש, `ProjectFinancePanel`:

- רשימת תשלומים, ולכל תשלום תג "תועד #123" או "חסר מסמך".

- "הפקת מסמך" לתשלומים מאומתים שעוד לא תועדו.

- רשימת מסמכים עם PDF, שליחה וזיכוי.

- **אימות מקדמה** (`confirmDepositReceived` ב-[messages.ts:320](../../src/features/conversations/server/messages.ts#L320), מה-`BookingActionCard`): אחרי האישור מופיע "הפקת מסמך על המקדמה". כש-`deposit_document_type` ריק, הכפתור מושבת עם tooltip: "סוג המסמך למקדמה טרם נקבע (רואה חשבון)".

- **מה זה משפר:** המסמך מופק ברגע שהכסף מתקבל, וזו הדרישה החוקית.

- **UI ב-CRM:** רכיבים חדשים עד 250 שורות: `InvoiceStatusBadge`, `IssueDocumentButton`, `DocumentsList`, `CreditNoteDialog`, `ProjectFinancePanel`. hooks: `use-issue-document`, `use-project-finance`. במובייל, `ResponsiveDialog` ושורות שנערמות אנכית.

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** `getProjectFinance` מורחב עם המסמכים.

- **טסטים:** unit ללוגיקת התצוגה (מה מושבת ולמה).

### B2.8 אכיפה: "תשלום בלי מסמך"
- **מה זה:** פונקציה טהורה `findUndocumentedPayments(payments, invoices, now, graceDays = 7)`.

- **מה זה משפר:** זו חובה חוקית: מסמך על כל תקבול, ולעוסק מורשה תוך 7 ימים ממקדמה. כפתור ידני חוקי רק כשיש משהו שמוודא שלא שוכחים.

- **UI ב-CRM:**

- **באנר בדשבורד:** "X תשלומים ללא מסמך". הוא אדום (`destructive`) מעל 7 ימים וכתום (`status-wait`) לפני כן, ולחיצה עליו פותחת רשימה (Sheet).

- **תג "חסר מסמך"** בכרטיס התור.

- **לפני שהגדרות העסק מולאו:** לא מופיע באנר אדום לכל תשלום. במקומו מופיע באנר אחד, "הגדרות המסמכים טרם הושלמו", עם קישור להגדרות.

- **סוכן הוואטסאפ:** אין שינוי.

- **שרת ולוגיקה:** סיכום יומי לצוות (B7.6).

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit לגבולות של 7 ימים, לתשלום שזוכה ולמסמך שנכשל.

### B2.9 הגנה על רשומות כספיות ואנונימיזציה
- **מה זה:**

- **חוק חדש ב-**[**data-integrity.js**](../../pocketbase/pb_hooks/lib/data-integrity.js)**:** אי אפשר למחוק לקוח שיש לו תשלום מאומת או מסמך. קוד `integrity:customer_has_financial_records`.

- **היום זה פער:** מחיקת לקוח מוחקת את התשלומים שלו, כי `payments.project` מוגדר cascade.

- `anonymizeCustomer` (owner/admin), בטרנזקציה אחת:

- **מוחלף או נמחק:** השם הופך ל"לקוח שהוסר", הטלפון ל-`anon-`, ונמחקים האימייל, ההערות, ההצהרה הרפואית והקבצים שלה, והשיחות עם ההודעות.

- **נשמר:** פרויקטים, תורים, תשלומים ומסמכים. למסמכים יש snapshot משלהם.

- **תיעוד ובטיחות:** נרשמת שורה ב-`deletion_log` עם `action: anonymized`, ותור בוט פעיל נעצר.

- **חסימה:** אם יש ללקוח תור עתידי, הפעולה נחסמת כמו מחיקה.

- **(אופציונלי) job לתקופת שמירה:** מריץ אנונימיזציה על לקוחות שלא היו פעילים יותר מ-N חודשים. **כבוי כברירת מחדל**, והתקופה נקבעת ב-A11.

- **מה זה משפר:** עמידה גם בחובת השמירה ל-7 שנים וגם בתיקון 13 לחוק הגנת הפרטיות. במקום לבחור בין "למחוק הכול" ל"לשמור הכול", מוחקים את המידע האישי ושומרים את המסמכים.

- **UI ב-CRM:** כשהמחיקה חסומה, [CascadeDeleteDialog](../../src/features/database/components/CascadeDeleteDialog.tsx) מציע "אנונימיזציה במקום מחיקה" ומסביר את חובת השמירה.

- **סוכן הוואטסאפ:** לקוח שעבר אנונימיזציה וכותב שוב מתחיל כלקוח חדש, בדיוק כמו אחרי מחיקה.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שדה חדש. `deletion_log.action` מקבל ערך נוסף.

- **פעולות חיצוניות:** אין.

- **טסטים** (integration): מחיקה נחסמת. אנונימיזציה שומרת את המסמכים ומוחקת את ה-PII. אנונימיזציה נחסמת כשיש תור עתידי. rollback בכישלון באמצע.

---

## B3. ביטולים והחזרים: מנגנון בלי מדיניות
**העיקרון:** בונים את **היכולת** לחשב ולרשום החזר, אבל **לא מחברים אותה להחלטות**. הבוט ממשיך לומר "נציג יחזור אליך לגבי המקדמה", עד שעורך הדין יענה (A4).

### B3.1 מחשבון החזר
- **מה זה:** `src/lib/remote-sale-refund.ts`, פונקציה טהורה:

- **קלט:** `{ transactionAt, serviceAt, cancelledAt, amountPaid, transactionPrice, isRestDay, rules }`. ב-`rules` יושבים הפרמטרים: `windowDays: 14`, `minNonRestDaysBefore: 2`, `feePercent: 5`, `feeCap: 100`.

- **פלט:** discriminated union:

```ts
| { eligibility: 'eligible'; refund: number; fee: number }
| { eligibility: 'outside_window' | 'too_close_to_service' | 'not_remote_sale' }

```

- **מה זה משפר:** כשעורך הדין יענה, החישוב כבר קיים ובדוק. אם הוא ישנה פרמטר (למשל שדמי הביטול מחושבים מהמקדמה ולא ממחיר העבודה), משנים ערך ב-`rules`, לא לוגיקה.

- **UI ב-CRM:** אין UI ל-production. יש רק תצוגת בדיקה בכרטיס הפיתוח (DEV בלבד).

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **טסטים:** 100% כיסוי. גבולות 14 הימים. יומיים שאינם ימי מנוחה, כולל ביטול ביום שישי לתור ביום ראשון. דמי ביטול עם תקרה. מעבר שעון קיץ. אותו יום.

### B3.2 רישום החזר ידני
- **מה זה:** "רישום החזר" ב-`ProjectFinancePanel` פותח `RefundDialog`: סכום (עד מה ששולם נטו), אמצעי תשלום, סיבה ותור קשור. השמירה יוצרת `payment` מסוג `refund` בסטטוס `verified`. אם התשלום המקורי תועד, מופיע "הפקת זיכוי" (B2.5).

- **מה זה משפר:** היום החזר לא נרשם בכלל, ולכן היתרה והאנליטיקות לא יודעות עליו.

- **UI ב-CRM:** דיאלוג עם ולידציה, והיתרה מתעדכנת מיד.

- **סוכן הוואטסאפ:** אין שינוי.

- **שרת ולוגיקה:** `recordRefund`, עם אותה נעילה של הפרויקט. הסכום לא יכול לעבור את היתרה ששולמה.

- **DB:** אין שינוי. `payments.kind = refund` כבר קיים.

- **פעולות חיצוניות:** אין.

- **טסטים:** integration להחזר מעל מה ששולם (נדחה), ו-unit ל-`computeProjectBalance` עם החזר (כבר קיים ברובו).

### B3.3 קישור בין ביטול להחזר
- **מה זה:** כשהצוות מבטל תור שיש עליו מקדמה מאומתת (ביומן או ב-`staffConfirmCancellation`), הודעת ההצלחה מציעה "לרשום החזר?". **ההחזר לא נרשם אוטומטית.**

- **מה זה משפר:** ההחזר נרשם באותו רגע, ולא נשכח.

- **UI ב-CRM:** toast עם פעולה. אחרי A4 זה יוחלף בדיאלוג "ביטול והחזר" עם החישוב.

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** אין שינוי.

- **טסטים:** unit לתנאי הצגת ההצעה.

---

## B4. מכונת שלבי הפרויקט
**העיקרון:** הפרויקט הוא המשפך. השלב **נגזר** מאירועים של התורים, ורק שלושה אירועים הם מפורשים: הצעת מחיר, "אבוד" ו"הושלם". הנגזרת רצה ב-hook בתוך אותה טרנזקציה, ולכן לא יכולה להתרחק מהמציאות. מכאן גם שהצוות לא בוחר שלב מרשימה, כמו שקורה היום בלידים.

### B4.1 סכמה
- **מה זה:** שדות ב-`projects`:

- **משפך:** `stage` (שמונה ערכים, ברירת מחדל `inquiry`), `stage_changed_at`.

- **אבוד:** `lost_reason` (`price` / `no_response` / `chose_other_studio` / `customer_cancelled` / `no_show` / `other`), `lost_note`, `lost_at`.

- **סיום:** `completed_at`.

- **הצעת מחיר:** `quote_min`, `quote_max`, `quote_sent_at`, `estimated_sessions`.

- **משוב:** `nps_score`, `lifecycle_sent` (json, כמו בתורים).

- **אינדקסים:** `(stage)` ו-`(customer, stage)`.

- **מה זה משפר:** זה מה שמאפשר את לוח ה-Pipeline, את המשפך באנליטיקות, ואת "סשן 2 מתוך ~3".

- **UI / סוכן:** אין שינוי בשלב הזה.

- **שרת ולוגיקה:** אין שינוי בשלב הזה.

- **DB:** מיגרציה עם backfill. השלב מחושב לכל פרויקט קיים באותה פונקציה מ-B4.2, כך שאין לוגיקה כפולה.

- **פעולות חיצוניות:** אין.

- **טסטים:** `projects-backfill` מורחב.

### B4.2 גזירת השלב
- **מה זה:** `pocketbase/pb_hooks/lib/project-stage.js` → `deriveProjectStage(project, appointments)`. **לפי סדר קדימות:**

- יש `lost_at` → `lost`.

- יש `completed_at` → `completed`.

- יש סשן שהסתיים (`completed`) → `in_progress`.

- יש סשן `confirmed` → `booked`.

- יש `quote_sent_at` → `quoted`.

- יש ייעוץ `completed` → `consultation_done`.

- יש ייעוץ `pending` או `confirmed` → `consultation_scheduled`.

- אחרת → `inquiry`.

**טאץ'-אפ לא מזיז שלב.** טאץ'-אפ בפרויקט שהושלם משאיר אותו `completed`.

ה-hook רץ אחרי יצירה, עדכון ומחיקה של תור, ואחרי עדכון פרויקט. אם השלב השתנה, הוא כותב `stage` ו-`stage_changed_at`, ומוסיף שורה ל-`state_transitions` (`entity: projects`, ה-actor נלקח מ-`status_actor` של התור). הכול קורה בתוך הטרנזקציה, בדפוס `inTransaction` הקיים.

- **מה זה משפר:**

- מקור אמת אחד לשלב.

- "זמן בכל שלב" מגיע מהיומן.

- "ייעוץ נקבע" ו"ייעוץ בוצע", שביקשת, הם שלבים אמיתיים.

- תשלומים **לא** משתתפים בשלב. המצב הכספי הוא ציר נפרד שנגזר מהתשלומים, לפי העיקרון "ישות אחת, מכונה אחת".

- **UI / סוכן:** אין שינוי בשלב הזה.

- **שרת ולוגיקה:** ה-TS קורא את השדה השמור. אין עותק TS של הכללים.

- **DB:** hook חדש, `pb_hooks/project-stage.pb.js`.

- **פעולות חיצוניות:** אין.

- **טסטים:**

- unit ל-`deriveProjectStage` דרך `createRequire`, על כל שורה בטבלת הקדימות.

- integration: כל מעבר, רגרסיות (סשן שבוטל מחזיר את הפרויקט ל-`quoted`), rollback, ובדיקת שפיות בלי ה-hook.

### B4.3 אירועים מפורשים וסגירת סשן אחרון
- **מה זה:**

- **הצעת מחיר:** `sendPriceQuoteToCustomerHandler` ([appointments.server.ts:505](../../src/features/calendar/server/appointments.server.ts#L505)) כותב גם `quote_min`, `quote_max` ו-`quote_sent_at` לפרויקט. בתקופת המעבר הוא ממשיך לכתוב גם את שדות המחיר בתור.

- **אבוד ופתיחה מחדש:** `markProjectLost({ projectId, reason, note })` ו-`reopenProject`. אי אפשר לסמן כאבוד פרויקט עם תור עתידי מאושר (`integrity:project_has_active_appointments`).

- **הושלם:**

- **ב-**`CloseSessionDialog`**:** checkbox חדש, **"זה הסשן האחרון בפרויקט"**. הוא מסומן מראש כשאין לפרויקט סשן עתידי, וכשמספר הסשנים הגיע ל-`estimated_sessions` (או שהשדה ריק). אם הוא מסומן, `completed_at` נכתב באותו batch.

- **בפאנל הפרויקט:** פעולה "סיום פרויקט" למקרים חריגים.

- **סכום מוצע לגבייה:** פונקציה טהורה `suggestedCollection({ balanceBefore, finalPrice, depositApplication, isLastSession })`. ב-`first_session` התוצאה זהה למה שקורה היום. ב-`last_session` הזיכוי נשמר לסשן האחרון.

- **סיכום פרויקט בסשן האחרון:** סך החיובים מול טווח ההצעה, כמה שולם, היתרה ומספר הסשנים.

- **מה זה משפר:**

- בלי סימון מפורש, אי אפשר לדעת מתי עבודה רב-מפגשית הסתיימה.

- **תיקון למה שאמרתי קודם:** ההחלטה איפה לקזז את המקדמה (A6) **כן** משפיעה על הקוד, בסכום המוצע לגבייה. ה-ledger עצמו לא משתנה.

- **UI ב-CRM:**

- checkbox בדיאלוג, שורת "לגבייה עכשיו" עם כפתור "מילוי", וכרטיס סיכום.

- פעולות "סימון כאבוד" (Select של סיבות ו-textarea) ו"פתיחה מחדש".

- **סוכן הוואטסאפ:** אין שינוי ישיר. השלב נצרך ב-B5 וב-B6.

- **שרת ולוגיקה:** הרחבה של `handleCloseSession` (עוד שדה ב-batch), ושתי פונקציות שרת חדשות.

- **DB:** אין שינוי מעבר ל-B4.1.

- **פעולות חיצוניות:** אין.

- **טסטים:**

- unit ל-`suggestedCollection` (כל השילובים).

- integration: סשן אחרון מעביר את הפרויקט ל-`completed`. "אבוד" עם תור עתידי נחסם.

### B4.4 פרויקט `inquiry` כבר מהפנייה
- **מה זה:** כש-`start_booking` או `choose_booking_track` רצים ואין `active_project`, נוצר פרויקט בשלב `inquiry` ונכתב ל-`active_project`. `collect_tattoo_info` ממלא בו כותרת ותיאור, אם הם ריקים. `createPendingHoldForBot` כבר משתמש ב-`active_project` ([bot-appointments.server.ts:552](../../src/features/calendar/server/bot-appointments.server.ts#L552)).

- **מה זה משפר:** היום פרויקט נוצר רק כשנוצר תור, כך שלידים שעוד לא קבעו לא מופיעים במשפך. מעכשיו אפשר למדוד את השלב הראשון.

- **UI ב-CRM:** הלידים מופיעים בלוח הפרויקטים.

- **סוכן הוואטסאפ:** אין שינוי מבחינת הלקוח.

- **שרת ולוגיקה:** פונקציית עזר אחת, `ensureInquiryProject`, בתוך `conversationLock`.

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit לכלים (mock), ו-integration ל-hold שנכנס לפרויקט שכבר קיים.

### B4.5 מחזור חיי לקוח, נגזר
- **מה זה:** `src/features/customers/utils/lifecycle.ts` → `deriveCustomerLifecycle(projects, now, dormantMonths)`. הערכים:

- `lead`: אין פרויקט, או שיש רק פרויקטים ב-`inquiry`.

- `prospect`: יש פרויקט ב-`consultation_scheduled` עד `booked`.

- `client`: יש לפחות סשן אחד שהסתיים.

- `returning`: פרויקט חדש אחרי פרויקט עם סשן שהסתיים.

- `dormant`: לקוח שהסשן האחרון שלו לפני יותר מ-`dormant_after_months`, ואין לו פרויקט פעיל.

- **מה זה משפר:** מחליף את `lead_stage`, שהיום הוא עותק של מצב השיחה ([state-machine.ts:51](../../src/features/conversations/server/state-machine.ts#L51)). הדשבורד משווה אותו לערכים באותיות קטנות שכבר לא קיימים, ולכן הספירות בו שגויות ([dashboard.ts:62-65](../../src/features/dashboard/server/dashboard.ts#L62-L65)).

- **UI ב-CRM:** תג מחזור חיים ברשימת הלקוחות, ופילטר לפיו.

- **סוכן הוואטסאפ:** `returningCustomerInfo` ייגזר מכאן (B6.1).

- **שרת ולוגיקה:** מחושב בזמן קריאה, בלי עותק שמור שיכול לסטות. הכמויות קטנות (סטודיו אחד), כך שזה זול.

- **DB:** אין שינוי. `lead_stage` יוסר ב-B11.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit ב-100%.

### B4.6 לוח הלידים הופך ללוח פרויקטים
- **מה זה:** [LeadsPage.tsx](../../src/features/leads/LeadsPage.tsx) הופך ל"לידים ופרויקטים". פונקציית השרת `listPipeline()` מחזירה לכל פרויקט:

- לקוח, שלב וכמה ימים הוא בשלב (לפי `stage_changed_at`).

- אמן, טווח הצעה, התור הבא ומצב כספי.

- **מה זה משפר:** היום [LeadStatusSelect](../../src/features/leads/components/LeadStatusSelect.tsx) משנה ידנית את `lead_stage` **וגם את **`conversations.state` ([leads.ts:94-96](../../src/features/leads/server/leads.ts#L94-L96)). כלומר גרירה בלוח הלידים משנה את מצב הדיאלוג של הבוט, בלי ולידציה ובלי תיעוד. אחרי השינוי השלב נגזר ואי אפשר לבחור אותו, והפעולות הידניות היחידות הן "אבוד", "פתיחה מחדש" ו"סיום".

- **UI ב-CRM:**

- **פילטרים:** chips לפי שלב, אמן ומקור.

- **לשוניות:** "אבודים" עם הסיבות, ו"לידים ללא פרויקט" ללקוחות שרק דיברו.

- **תצוגה:** טבלה בדסקטופ וכרטיסים במובייל.

- **בכל שורה:** פתיחת השיחה, פתיחת פאנל הפרויקט, "סימון כאבוד".

- **צבעי השלבים לפי ה-tokens הקיימים:** `status-new` לפניות, `accent-ink` להצעה ולקביעה, `status-done` לפרויקט שהושלם, ו-`status-dead` לאבוד.

- skeleton, מצב ריק ושגיאה.

- **סוכן הוואטסאפ:** מצב הבוט כבר לא משתנה מהלוח. כדי לאפס את הבוט יש פעולה מפורשת (B5.2).

- **שרת ולוגיקה:** `listPipeline` ו-`updateProjectStage` (רק lost, reopen ו-complete).

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit למיפוי, integration להרשאות (`canEditLead` הקיים).

### B4.7 עריכת פרויקט
- **מה זה:** `ProjectPanel`, בתוך Sheet שנפתח מהיומן, מהלוח ומכרטיס הלקוח:

- שינוי שם, הצעת מחיר ומספר סשנים משוער.

- פעולות: אבוד, פתיחה מחדש, סיום.

- ציר הזמן, שימוש חוזר ב-[ProjectTimeline](../../src/features/calendar/components/ProjectTimeline.tsx).

- **העברת תור** לפרויקט אחר של אותו לקוח, ו**פיצול** תור לפרויקט חדש.

- **מה זה משפר:** תיקון ידני של שיוך שגוי. ה-hook כבר מוודא שזה אותו לקוח, ושני הפרויקטים מחושבים מחדש.

- **UI ב-CRM:** Sheet עם טופס, `AlertDialog` להעברה, toast.

- **סוכן הוואטסאפ:** אין שינוי.

- **שרת ולוגיקה:** `updateProject`, `moveAppointmentToProject`.

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:** integration להעברה בין לקוחות (נחסמת), ולחישוב מחדש של שני הפרויקטים.

---

## B5. מכונת מצבי השיחה: הקשחה
**העיקרון:** `conversations.state` הוא **מצב הדיאלוג בלבד**: מה הבוט עושה עכשיו בשיחה. עובדות עסקיות (יש תור? הפרויקט באמצע? שולמה מקדמה?) מגיעות מהמכונות של התור, הפרויקט והתשלומים, וכל מעבר נעשה דרך כותב אחד.

**מה מצאתי בקוד:**

| # | בעיה | איפה |
| --- | --- | --- |
| 1 | שלושה כותבים עוקפים את `transition()` | webhook.ts:81-115 כותב `state: 'NEW'` ישירות. leads.ts:96 כותב כל ערך. כלי ה-MCP `update_lead_stage` עובר דרך אותו מסלול |
| 2 | דליפת פרויקט: איפוס ה-webhook לא מנקה את `active_project` | לקוח שכותב כמה שעות אחרי סשן חוזר ל-`NEW` עם הפרויקט הישן, והקעקוע הבא שלו נכנס לפרויקט הקודם |
| 3 | `AWAIT_NPS_SCORE` לא נגיש: אף קוד לא מעביר אליו | ואם כן היה מגיע, ה-webhook מאפס אותו ל-`NEW` בהודעה הבאה, כך שתשובת הלקוח לעולם לא הייתה נרשמת |
| 4 | אין מצב לעבודה רב-מפגשית באמצע | סשן 1 הסתיים והפרויקט ממשיך, אבל השיחה עוברת ל-`COMPLETED` ומאבדת את הפרויקט |
| 5 | הכלים מוגבלים לפי מצב, לא לפי עובדות | state-prompts.ts, `STATE_TOOLS` |
| 6 | אין שום מנגנון שמזהה מצב שיחה שסותר את המציאות | — |
| 7 | `lead_stage` הוא עותק של מצב השיחה | state-machine.ts:51 |

### B5.1 כותב אחד, נאכף ב-PocketBase
- **מה זה:**

- **שדות:** `conversations.state_actor` ו-`state_reason`, כמו `status_actor` בתורים.

- `transition()` ממלא אותם.

- **hook חדש, **`pb_hooks/conversation-state.pb.js`**:**

- עדכון שמשנה את `state` בלי `state_actor` נדחה עם `integrity:conversation_state_unattributed`.

- כל מעבר חוקי נרשם ב-`state_transitions` (`entity: conversations`).

- השדות מתאפסים אחרי שה-hook קורא אותם.

- יצירת שיחה ב-`NEW` מותרת.

- **יומנים:** `audit_log` ממשיך לתעד רק ניסיונות שנדחו ועקיפות של הצוות. האיחוד נעשה ב-B11.

- **מה זה משפר:** כתיבה ישירה שעוקפת את המכונה נכשלת מיד ובקול, בטסט ולא ב-production. זה אותו דפוס שכבר מגן על התורים.

- **UI / סוכן:** אין שינוי.

- **שרת ולוגיקה:** שינוי קטן ב-`transition()`.

- **DB:** מיגרציה והוק.

- **פעולות חיצוניות:** אין.

- **טסטים:** integration: כתיבה ישירה נדחית, `transition()` עובר ונרשם ביומן, בדיקת שפיות.

### B5.2 הסרת העקיפות
- **מה זה:**

- **ה-webhook:** האיפוס שכתוב ישירות בקוד מוחלף בפונקציה טהורה, `resolveInboundRouting({ state, status, facts, now })`. היא מחזירה `{ transition?: { to, reason }, reactivateBot }`, והמעבר עצמו עובר דרך `transition()`:

| מצב נוכחי | תנאי | מעבר |
| --- | --- | --- |
| `AWAITING_APPOINTMENT` | אין תור עתידי, והתור שעבר היה ייעוץ | → `WANTS_TO_BOOK`, והפרויקט נשמר |
| `AWAITING_APPOINTMENT` | אין תור עתידי, והפרויקט לא הושלם | → `PROJECT_IN_PROGRESS` |
| `AWAITING_APPOINTMENT` | אין תור עתידי, והפרויקט הושלם | → `NEW`, ו-`active_project` מתנקה |
| `COMPLETED` | — | → `NEW` |
| `AWAIT_NPS_SCORE` | בקשת המשוב נשלחה לפני פחות מ-7 ימים | נשאר. הבוט מטפל בתשובה |
| `AWAIT_NPS_SCORE` | יותר מ-7 ימים | → `NEW` |
| `PROJECT_IN_PROGRESS` | — | נשאר |

זו אותה לוגיקה כמו `planConversationAdvance` ב-[after-appointment.server.ts](../../src/features/conversations/server/after-appointment.server.ts), כך שה-lifecycle וה-webhook מקבלים תמיד אותה החלטה.

- **לוח הלידים** לא נוגע יותר במצב השיחה (B4.6). במקום זה יש פעולה מפורשת בכותרת השיחה, **"איפוס שיחת הבוט"** (owner/admin): `transition(..., 'NEW', { actor: 'staff', reason: 'staff_reset' })`, שמנקה גם את `active_project`.

- **ה-MCP:** `update_lead_stage` מוחלף ב-`update_project_stage` (B9).

- **מה זה משפר:** נסגרים באגים 1 עד 3 מהטבלה. כל שינוי מצב מתועד ועובר ולידציה.

- **UI ב-CRM:** פעולת "איפוס שיחת הבוט" בתפריט השיחה, עם `AlertDialog`.

- **סוכן הוואטסאפ:**

- לקוח שכותב "תודה!" כמה שעות אחרי סשן בפרויקט רב-מפגשי נשאר בהקשר הפרויקט.

- לקוח אחרי ייעוץ ממשיך ישר לקביעת הקעקוע.

- הקעקוע הבא של לקוח שסיים פרויקט לא נדבק לפרויקט הקודם.

- **שרת ולוגיקה:** פונקציה טהורה, והקריאה אליה ב-`phoneLock` הקיים.

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:**

- unit ל-`resolveInboundRouting`: כל שורה בטבלה.

- טסט רגרסיה לדליפת הפרויקט: סשן, ואחריו הודעה, ואחריה פרויקט חדש.

- טסט רגרסיה לתשובת NPS שלא נמחקת.

### B5.3 מצב חדש: `PROJECT_IN_PROGRESS`
- **מה זה:** מצב דיאלוג ללקוח שנמצא באמצע עבודה רב-מפגשית ואין לו כרגע תור עתידי. **טבלת המעברים החדשה** (מסומן מה משתנה):

| מ- | אל |
| --- | --- |
| `NEW` | `WANTS_TO_BOOK`, `COLLECTING_INFO`, `COMPLETED` |
| `WANTS_TO_BOOK` | `COLLECTING_INFO`, `AWAIT_PRICE_OFFER`, `WAITLIST`, `NEW`, `COMPLETED` |
| `COLLECTING_INFO` | `AWAIT_PRICE_OFFER`, `WAITLIST`, `NEW`, `COMPLETED` |
| `WAITLIST` | `WANTS_TO_BOOK`, `COLLECTING_INFO`, `AWAIT_PAYMENT`, `COMPLETED` |
| `AWAIT_PRICE_OFFER` | `AWAIT_HEALTH_NOTICE`, `AWAIT_PAYMENT`, `AWAITING_APPOINTMENT`, `COLLECTING_INFO` |
| `AWAIT_HEALTH_NOTICE` | `AWAIT_PAYMENT`, `AWAITING_APPOINTMENT`, `COLLECTING_INFO`, `COMPLETED` |
| `AWAIT_PAYMENT` | `AWAIT_FINAL_CONFIRMATION`, `AWAITING_APPOINTMENT`, `COLLECTING_INFO` |
| `AWAIT_FINAL_CONFIRMATION` | `AWAITING_APPOINTMENT`, `AWAIT_PAYMENT`, `AWAIT_PRICE_OFFER`, `COLLECTING_INFO` |
| `AWAITING_APPOINTMENT` | `AWAIT_NPS_SCORE`, `COMPLETED`, `COLLECTING_INFO`, `WANTS_TO_BOOK`, `PROJECT_IN_PROGRESS`, `NEW` (נחזור אליו כשהפרויקט הושלם) |
| `PROJECT_IN_PROGRESS` (חדש) | `WANTS_TO_BOOK` (הסשן הבא או טאץ'-אפ), `COLLECTING_INFO`, `AWAIT_NPS_SCORE`, `COMPLETED`, `NEW` (מאופס בידי הצוות) |
| `AWAIT_NPS_SCORE` | `COMPLETED`, `NEW` (אחרי 7 ימים) |
| `COMPLETED` | `NEW`, `WANTS_TO_BOOK`, `COLLECTING_INFO`, `AWAIT_NPS_SCORE` (משוב בסוף הפרויקט) |

- **כלים ב-**`PROJECT_IN_PROGRESS`**:** `start_booking` (עם `scope`, ב-B6.2), `answer_faq`, `call_staff`, `send_message`, `check_availability`, `get_available_slots`, `get_artist_schedule`, `resolve_date`.

- **טיוטת פרומפט:**

> "הלקוח באמצע פרויקט רב-מפגשי ואין לו כרגע תור. אם ירצה לקבוע את הסשן הבא, קרא ל-start_booking עם scope next_session. זמן ההחלמה המומלץ מופיע ב-active_project. שאלות על ההחלמה: answer_faq. טאץ'-אפ: start_booking עם scope touch_up."

- **מי מתעדכן עם המצב החדש:**

- `ConversationState` וה-select ב-DB (מיגרציה).

- `STATE_TOOLS` ו-`STATE_PROMPTS`.

- [labels.ts](../../src/features/conversations/utils/labels.ts), `RecentLeadsCard`.

- `STAGE_CONFIG` בלידים, עד שהוא מוסר.

- `POST_INFO_STATES` באנליטיקות, והתוויות ב-MCP.

- `planConversationAdvance` מחזיר `PROJECT_IN_PROGRESS` אחרי סשן בפרויקט שלא הושלם, ו-`COMPLETED` רק כשהפרויקט הושלם.

- **מה זה משפר:** המצב שביקשת. הבוט יודע שהעבודה לא נגמרה, ולא מתייחס ללקוח כאל ליד חדש.

- **UI ב-CRM:** התווית "באמצע פרויקט" (`accent-ink`) בשיחות ובדשבורד.

- **סוכן הוואטסאפ:** כמו בסעיף "מה זה".

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** מיגרציה ל-select.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit לכל מעבר חוקי ואסור בטבלה (הרחבה של `state-machine.test.ts`), ול-`planConversationAdvance` בשלושת המקרים.

### B5.4 עובדות ושומרים על הכלים
- **מה זה:**

- `loadConversationFacts(su, conversation)` (שרת) מחזיר `ConversationFacts`: תורים עתידיים (סוג וסטטוס), הפרויקט הפעיל (שלב, סשנים שהסתיימו, `estimated_sessions`, מקדמה מאומתת, זיכוי, תאריך הסשן האחרון), האם יש hold, ומצב הצהרת הבריאות.

- `applyFactGuards(tools, facts)`, פונקציה טהורה, שקובעת:

| כלי | זמין רק כש- |
| --- | --- |
| `request_cancel`, `request_reschedule` | יש תור עתידי |
| `flag_earlier_preference` | יש תור עתידי מאושר |
| `confirm_booking_final` | יש hold שהמקדמה שלו אומתה, או שהצוות עקף |
| `start_booking` עם `scope: next_session` | יש פרויקט ב-`in_progress` |
| `start_booking` עם `scope: touch_up` | יש פרויקט `completed` או `in_progress` |
| `choose_booking_track` | פרויקט שעבר ייעוץ ננעל ל-`tattoo` (בצד השרת) |

- **מי משתמש בזה:**

- `getAllowedToolNames(state, facts)` ב-[run-bot-turn.server.ts](../../src/integrations/ai/engine/run-bot-turn.server.ts).

- **כל כלי בודק שוב בזמן הביצוע.** אם העובדה השתנתה בינתיים, הכלי מחזיר הנחיה במקום לבצע.

- **מה זה משפר:** זו ה"קשיחות" שביקשת. הבוט לא יכול להציע ביטול כשאין תור, או להקדים תור שכבר עבר, גם אם מצב השיחה שגוי.

- **UI ב-CRM:** אין שינוי.

- **סוכן הוואטסאפ:** פחות תשובות שסותרות את המציאות.

- **שרת ולוגיקה:** עובדות נטענות פעם אחת לכל סבב, יחד עם ההקשר הקיים, בלי שאילתות נוספות לכל כלי.

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit ל-`applyFactGuards` על כל שורה בטבלה, ו-unit לכלים שדוחים בזמן ביצוע.

### B5.5 Reconciler: לולאת התאמה
- **מה זה:** פונקציה טהורה, `detectStateDrift(conversation, facts, now)`, שמחזירה תיקונים. `reconcileConversations` רץ בכל tick של ה-lifecycle (עם dry-run), ומבצע כל תיקון דרך `transition()` עם `reason: reconciler_*` והתראה לצוות. **המקרים:**

- `AWAITING_APPOINTMENT` בלי תור עתידי, יותר מ-24 שעות אחרי התור האחרון → לפי `planConversationAdvance`.

- `AWAIT_PAYMENT` עם מקדמה מאומתת ותור מאושר → `AWAITING_APPOINTMENT`.

- `AWAIT_PRICE_OFFER` או `AWAIT_PAYMENT` בלי hold, כי הוא פג או בוטל → `COLLECTING_INFO`.

- `PROJECT_IN_PROGRESS` כשהפרויקט הושלם או אבד → `COMPLETED`.

- `active_project` שמצביע על פרויקט אבוד או שהושלם, בזמן שהשיחה באמצע המשפך → ניקוי.

- **מה זה משפר:** זו הדרך המקובלת בתעשייה (reconciliation loop) לתקן סטיות שמגיעות מכל מקור: באג, עריכה ידנית או כשל חלקי. כל תיקון מופיע כהתראה, כך שבאגים לא נבלעים.

- **UI ב-CRM:** התראה "מצב השיחה תוקן אוטומטית" עם קישור. הפעולה מופיעה גם בכרטיס "סימולציית זמן".

- **סוכן הוואטסאפ:** אין שינוי ישיר. השיחה חוזרת למצב הנכון.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit לכל מקרה, ו-dry-run ב-`lifecycle-service.test.ts`.

### B5.6 חיבור NPS לפרויקט
- **מה זה:**

- כשפרויקט מסתיים ו-`post_project_feedback = nps_then_review`, ה-lifecycle שולח שאלת NPS ומעביר את השיחה ל-`AWAIT_NPS_SCORE` (B7.5).

- `record_nps_score` ([support.server.ts:61](../../src/integrations/ai/tools/support.server.ts#L61)) כותב ל-`projects.nps_score`, במקום לנחש "תור שהושלם ב-14 הימים האחרונים" ([bot-appointments.server.ts:679](../../src/features/calendar/server/bot-appointments.server.ts#L679)).

- **מה זה משפר:** ה-NPS עובד בפעם הראשונה, פעם אחת לכל פרויקט, כמו שתוכנן.

- **UI ב-CRM:** ציון NPS בכרטיס הפרויקט ובאנליטיקות.

- **סוכן הוואטסאפ:** שאלה אחת בסוף הפרויקט, ולא אחרי כל סשן.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** `projects.nps_score` (B4.1).

- **פעולות חיצוניות:** template `nps_request` ב-Meta, לשליחה מחוץ לחלון (A9).

- **טסטים:** unit לכלי, ו-integration למעבר.

### B5.7 ניתוק `lead_stage`
- **מה זה:** מפסיקים את ההעתקה ב-`transition()`, אחרי שכל הקוראים (הדשבורד, הלידים, ה-MCP ותפוגת הלידים) עברו למחזור החיים הנגזר (B4.5). הסרת השדה עצמו: B11.

- **מה זה משפר:** מקור אמת אחד.

- **UI / סוכן / DB / חיצוני:** אין שינוי מעבר למה שכבר נכלל ב-B4.5.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **טסטים:** עדכון `cluster6-state-machine-sync.test.ts`.

---

## B6. הבוט: מודעות לפרויקט ולכסף
### B6.1 הקשר הפרויקט בפרומפט
- **מה זה:** בלוק חדש, ``, בחלק הדינמי של הפרומפט. הוא נבנה בפונקציה טהורה ב-`prompts/project-context.ts`, מתוך `ConversationFacts`:

- שם הפרויקט ושלב. "סשן N מתוך ~M" (לפי `estimated_sessions`, ורק כשהוא ידוע).

- טווח הצעת המחיר.

- מקדמה וזיכוי, בנוסח מ-B6.4.

- תאריך הסשן האחרון ו"מועד מומלץ לסשן הבא", לפי `healing_period_days`.

- מדיניות טאץ'-אפ, רק אם הוגדרה.

בנוסף, התוויות של התורים הפעילים עוברות מ-`type === 'sketch'` ל-`kind`: "פגישת ייעוץ", "סשן", "טאץ'-אפ".

- **מה זה משפר:** הבוט יודע באיזה שלב של העבודה הלקוח נמצא. היום הוא רואה רק רשימת תורים.

- **UI ב-CRM:** אין שינוי.

- **סוכן הוואטסאפ:** תשובות כמו "זה יהיה הסשן השני מתוך כשלושה. ההמלצה היא לקבוע אחרי ה-12.10, כשהקעקוע יחלים".

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit לבונה, והרחבה של `prompts.test.ts`.

### B6.2 קביעת הסשן הבא וטאץ'-אפ באותו פרויקט
- **מה זה:**

- `start_booking`** מקבל פרמטר **`scope`**:** `new_project` / `next_session` / `touch_up`, לפי השומרים ב-B5.4.

- `createPendingHoldForBot` מקבל `kind` ומשייך את התור לפרויקט הקיים.

- **מקדמה לסשן:**

- `deposit_per_session = false`: ה-hold עובר לאישור הצוות בלי מקדמה, דרך מסלול האישור הידני הקיים (Bug 45).

- `true` או `null`: הזרימה של היום.

- **טאץ'-אפ בתוך **`touch_up_free_days`** כשהמדיניות מוגדרת:** נקבע כ-`touch_up`, ו-`charge_waived` מסומן מראש בסגירת הסשן.

- **טאץ'-אפ כשהמדיניות לא מוגדרת (**`null`**):** `call_staff` עם סיבה חדשה, `touch_up_request`.

- **מה זה משפר:** "סשן 2" נכנס לפרויקט הנכון. היום הוא מתחיל פרויקט חדש, והמשפך והאנליטיקות מתבלגנים.

- **UI ב-CRM:** התור מופיע עם "סשן 2" בפרויקט הנכון, בלי תיקון ידני.

- **סוכן הוואטסאפ:** הלקוח לא נשאל שוב "סקיצה או קעקוע?" ולא מתבקש מקדמה חדשה אם המדיניות אומרת שלא צריך.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit לכלים, ו-integration ל-hold של סשן 2 שנכנס לאותו פרויקט.

### B6.3 המשך אחרי ייעוץ
- **מה זה:** `planConversationAdvance` אחרי ייעוץ מעביר ל-`WANTS_TO_BOOK`, עם `tattoo_info.appointmentType = 'tattoo'`. בחלק הדינמי מופיעה השורה: "הלקוח עבר פגישת ייעוץ בפרויקט X. המסלול הוא סשן קעקוע, ואין להציע ייעוץ נוסף אלא אם ביקש." בצד השרת, `choose_booking_track` מקבל כברירת מחדל `tattoo`.

- **מה זה משפר:** היום, אחרי ייעוץ, הבוט שואל שוב "ייעוץ או קעקוע?".

- **UI ב-CRM:** אין שינוי.

- **סוכן הוואטסאפ:** המשך טבעי: "איך היה בפגישה? רוצה שנקבע את הקעקוע?".

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit, ו-eval (B6.6).

### B6.4 כללי ניסוח לכסף
- **מה זה:** `src/lib/customer-finance-wording.ts`, באותו דפוס כמו [cancellation-policy.ts](../../src/lib/cancellation-policy.ts):

- `depositCreditLine(amount, application)`. בזמן שההחלטה פתוחה הנוסח ניטרלי: "המקדמה נרשמה ותקוזז מהתשלום על העבודה".

- `NO_FINAL_PRICE_RULE`: "אין לך מידע על מחיר סופי. אל תנקוב בסכום. אמור שהצוות יעדכן."

- `NO_REFUND_PROMISE_RULE`: כבר קיים בצורה אחרת, ויאוחד לכאן.

- **מה זה משפר:** כל הנוסחים של כסף נמצאים במקום אחד, כך שאחרי A4 ו-A6 משנים קובץ אחד. הבוט לא מחשב יתרות בעצמו, כל מספר מגיע מה-ledger.

- **UI ב-CRM:** אין שינוי.

- **סוכן הוואטסאפ:** לקוח ששואל "כמה אשלם בסוף?" לפני שהסשן נסגר לא מקבל מספר ממציא.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit.

### B6.5 בקשה להעתק מסמך
- **מה זה:** כלי חדש, `request_document_copy`:

- אם יש מסמך שהונפק על התשלום האחרון, הוא נשלח שוב (`invoice_deliver`).

- אחרת: `call_staff` עם סיבה חדשה, `document_request`.

- **מה זה משפר:** לקוח שמבקש קבלה מקבל אותה מיד, או שהצוות מקבל בקשה ממוקדת במקום "שאלה שלא טופלה".

- **UI ב-CRM:** סיבת קריאה חדשה בתוויות.

- **סוכן הוואטסאפ:** "שלחתי לך שוב את הקבלה".

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שינוי.

- **פעולות חיצוניות:** אין.

- **טסטים:** unit לכלי.

### B6.6 Evals
- **מה זה:** תרחישים חדשים ב-[eval-scenarios-data.ts](../../scripts/eval-scenarios-data.ts):

- הקשר של "סשן 2 מתוך 3".

- המשך אחרי ייעוץ, בלי לשאול שוב על ייעוץ.

- קביעת הסשן הבא באותו פרויקט.

- טאץ'-אפ כשהמדיניות לא מוגדרת: פנייה לצוות.

- שאלה על מחיר סופי לפני סגירה: בלי מספר.

- בקשת החזר: בלי הבטחה.

- "תודה על הקעקוע" 4 שעות אחרי סשן: בלי הצעה להקדים.

- תשובת NPS שנשמרת.

- **מה זה משפר:** בדיקה שההתנהגות החדשה של המודל עובדת בפועל, לא רק שהקוד קיים.

- **UI / DB / חיצוני:** אין שינוי.

- **סוכן / שרת:** זו הבדיקה שלהם.

- **טסטים:** `scripts/eval-agent-prompt.ts`.

---

## B7. Lifecycle
### B7.1 תיקון ה-aftercare
- **מה זה:** [processPostSessionAftercare](../../src/features/lifecycle/server/lifecycle-service.ts#L397):

- רק ל-`kind = session`. **היום ההודעה נשלחת גם אחרי פגישת ייעוץ.**

- החלון נמדד מ-`max(end, completed_at)`. היום, סשן שנסגר יותר מ-48 שעות אחרי שהסתיים לא מקבל aftercare בכלל, וזה הפער שציינתי. הודעה לא תישלח על סשן שהסתיים לפני יותר מ-7 ימים.

- לפי `post_project_feedback`: הודעת הביקורת נשלחת בסוף הפרויקט, לא אחרי כל סשן.

- הקישורים ושם הסטודיו מגיעים מההגדרות (`google_review_link`, `easy_review_link`). היום הם כתובים ישירות בקוד.

- **מה זה משפר:** לקוח לא מקבל בקשת ביקורת אחרי ייעוץ, ולא שלוש פעמים על שרוול אחד.

- **UI ב-CRM:** שדה קישור Easy בהגדרות.

- **סוכן הוואטסאפ:** כמו בסעיף "מה זה".

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שינוי מעבר ל-B1.2.

- **פעולות חיצוניות:** אין.

- **טסטים:** dry-run עם `now` מוזרק, בכל המקרים.

### B7.2 בדיקת החלמה והסשן הבא
- **מה זה:** [processHealingFollowUp](../../src/features/lifecycle/server/lifecycle-service.ts#L447) עובר מ-`type` ל-`kind = session`, בלי ייעוץ ובלי טאץ'-אפ. החלון מחושב מ-`healing_period_days`: `[H−7, H]`, שעם ברירת המחדל שווה ל-14–21 של היום. אם הפרויקט `in_progress` ואין סשן עתידי, מתווספת שורה: "כשתרגיש/י מוכן/ה, נשמח לקבוע את הסשן הבא."

- **מה זה משפר:** פרויקט לא נתקע באמצע.

- **UI / DB / חיצוני:** אין שינוי.

- **סוכן הוואטסאפ:** הודעה אחת שמשלבת את בדיקת ההחלמה ואת ההזמנה להמשך.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **טסטים:** dry-run.

### B7.3 מעקב אחרי ייעוץ
- **מה זה:** trigger חדש, `consultation_followup`, על הפרויקט (`projects.lifecycle_sent`). הוא נשלח כשהפרויקט `consultation_done` כבר `consultation_followup_days` ימים, לא נקבע סשן, והשיחה לא באמצע המשפך.

- **מה זה משפר:** המקום שבו רוב הלקוחות נושרים, כמו שדיברנו.

- **UI ב-CRM:** הפעולה מופיעה בסימולציית הזמן.

- **סוכן הוואטסאפ:** "היי X, איך היה בפגישה? רוצה שנקבע את הקעקוע?". מחוץ לחלון 24 השעות נשלח template.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **DB:** אין שינוי מעבר ל-B4.1.

- **פעולות חיצוניות:** template `consultation_followup` (A9).

- **טסטים:** dry-run.

### B7.4 פרויקט שנתקע הופך לאבוד
- **מה זה:** מחליף את [processExpiredLeads](../../src/features/lifecycle/server/lifecycle-service.ts#L548):

- `inquiry` או `quoted` בלי פעילות `inquiry_lost_after_days` ימים → `lost('no_response')`.

- `consultation_done` אחרי `consultation_lost_after_days` ימים → `lost('no_response')`.

- השיחה עוברת ל-`COMPLETED`, כמו היום.

- **מה זה משפר:** המשפך יודע למה לקוחות לא המשיכו. היום רק `lead_stage` נסגר.

- **UI ב-CRM:** מופיע בלשונית "אבודים".

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **טסטים:** dry-run.

### B7.5 משוב בסוף הפרויקט
- **מה זה:** כמה שעות אחרי `completed_at`, לפי `post_project_feedback`:

- `review_links`: הודעת הביקורת, כמו היום.

- `nps_then_review`: שאלת NPS ומעבר ל-`AWAIT_NPS_SCORE` (B5.6).

- **מה זה משפר:** בקשת משוב אחת, בזמן הנכון.

- **UI / DB:** אין שינוי מעבר ל-B1.2 ו-B4.1.

- **סוכן הוואטסאפ:** כמו בסעיף "מה זה".

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **פעולות חיצוניות:** template `nps_request` (A9).

- **טסטים:** dry-run.

### B7.6 סיכום יומי לצוות
- **מה זה:** פעם ביום בבוקר, התראה **אחת** לכל נושא: סשנים שלא נסגרו (יותר מיום), ותשלומים בלי מסמך (B2.8). כל התראה מקשרת לרשימה המסוננת. היום יש לכל סשן תזכורת אחת בלבד, ואחריה הוא נשכח.

- **מה זה משפר:** גם הכנסות וגם מסמכים לא הולכים לאיבוד.

- **UI ב-CRM:** התראה.

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **טסטים:** dry-run.

### B7.7 סימולציית הזמן
- **מה זה:** פעולות חדשות ב-`LifecyclePlannedAction`: `mark_project_lost`, `request_feedback`, `reconcile_conversation`, `staff_digest`, `consultation_followup`. כולן מוצגות בכרטיס "סימולציית זמן".

- **מה זה משפר:** בודקים את כל ההתנהגות החדשה בלי לגעת בשעון.

- **UI ב-CRM:** הכרטיס הקיים מציג את הפעולות החדשות.

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **טסטים:** `lifecycle-service.test.ts`.

---

## B8. אנליטיקות ודשבורד
### B8.1 מבנה
- **מה זה:** [analytics-core.server.ts](../../src/features/analytics/server/analytics-core.server.ts) (481 שורות, קריאות I/O וחישוב באותו קובץ) מתפצל:

- `server/analytics-data.server.ts`: שליפת snapshot של הנתונים לטווח.

- `utils/metrics/{funnel,revenue,conversion,operations,artists,sources,styles}.ts`: פונקציות טהורות.

- fixtures ב-`tests/features/analytics/fixtures/`.

- **מה זה משפר:** עמידה ב-code-principles §3. היום אין בדיקה על שום חישוב של הכנסה.

- **UI / סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **טסטים:** 100% כיסוי על `metrics/`.

### B8.2 המדדים
| מדד | חישוב | מקור | מתקן |
| --- | --- | --- | --- |
| משפך פרויקטים | ספירה לכל שלב, נשירה וסיבות אבוד | `projects` | "תורים" במקום פרויקטים. ייעוץ וקעקוע נספרים היום כשני תורים |
| המרה מייעוץ לקעקוע | פרויקטים עם ייעוץ שהגיעו ל-`booked` | `projects`, `appointments` | — |
| זמן מייעוץ לסשן ראשון | חציון | `state_transitions` | — |
| זמן בכל שלב | חציון | `state_transitions` | — |
| הכנסה בפועל | תשלומים מאומתים פחות החזרים, לפי `received_at` | `payments` | price_amount שלא קיים, ומקדמה שנספרת פעמיים (שורות 297-309) |
| הכנסה לחיוב | מחירים סופיים של סשנים, לפי `completed_at` | `appointments` | הערכת `price_max` במקום סכום אמיתי |
| יתרות פתוחות | סכום `due` | ledger | — |
| מקדמות שמוחזקות | סכום `credit` | ledger | — |
| ממוצע לפרויקט, סשנים לפרויקט | פרויקטים שהושלמו | שניהם | — |
| הכנסה לאמן ולשעת אמן | חיוב חלקי שעות הסשנים | שניהם | — |
| אי-הגעה וביטול מאוחר | `no_show`, ו-`cancelled_by = customer` בתוך `cancellation_cutoff_hours` | `appointments` | — |
| אחוז טאץ'-אפ | תורי טאץ' חלקי פרויקטים שהושלמו | שניהם | — |
| תשלומים בלי מסמך | כמות וסכום | B2.8 | — |
| NPS | ממוצע ופילוח | `projects` | — |
| נשארים | מקורות, סגנונות, אחוז התערבות של הצוות | קיים | — |

### B8.3 UI
- **מה זה:** כרטיסים חדשים ב-[AnalyticsPage](../../src/features/analytics/AnalyticsPage.tsx):

- `RevenueCard`: הכנסה בפועל מול הכנסה לחיוב, עם tooltip שמסביר את ההבדל.

- `ProjectFunnelCard`: מחליף את `FunnelDropoffCard`, וכולל סיבות אבוד.

- `ConversionCard`, `BalancesCard`, `OperationsCard`.

- כל כרטיס: skeleton, מצב ריק ("עדיין אין פרויקטים שהושלמו בטווח הזה") ושגיאה. בגרפים רק `chart-1..5`. במובייל הכרטיסים נערמים.

- **מה זה משפר:** האנליטיקות מבוססות עובדות, כמו שביקשת.

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** הכרטיסים מקבלים את המדדים מ-B8.2.

- **טסטים:** unit למיפויי התצוגה.

### B8.4 דשבורד
- **מה זה:** [dashboard.ts](../../src/features/dashboard/server/dashboard.ts):

- **תיקון הספירות:** "לידים חדשים" ו"ממתינים להצעת מחיר" נספרים לפי מחזור החיים והשלב. היום הקוד משווה את `lead_stage` ל-`'new'`, `'awaiting_price'` ו-`'expired'`, ערכים שלא קיימים יותר, ולכן הספירות שגויות.

- **התראות חדשות:** "ממתין לסגירה", "תשלומים ללא מסמך", "פרויקטים תקועים בשלב".

- **מה זה משפר:** מספרים נכונים בדשבורד.

- **UI ב-CRM:** `MetricsSummary`, `AlertBanners`.

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **טסטים:** unit ל-fixtures.

---

## B9. עוזר ה-MCP
- **מה זה:**

- `list_payments` קורא מ-`payments`: סוג, אמצעי, סטטוס ומצב מסמך. היום הוא קורא את `deposit_paid`.

- `list_unpaid_deposits` מחפש פרויקטים ב-`quoted` או `booked` בלי מקדמה מאומתת.

- `get_business_summary` מציג הכנסה בפועל מול הכנסה לחיוב.

- **כלי חדש, **`close_session` (דורש אישור): ה-diff מציג מחיר, תשלומים ויתרה, והביצוע עובר דרך `handleCloseSession`.

- `mark_appointment_status`**:** עובר ל-`statusChange(..., 'staff', 'mcp_assistant')`. `completed` לסשן נדחה עם הפניה ל-`close_session`.

- **באג שמצאתי:** היום הכלי כותב `{ status }` ישירות ([calendar.server.ts:368](../../src/features/mcp-assistant/server/tool-servers/calendar.server.ts#L368)). בסשן זה נכשל בשגיאה לא ברורה.

- `update_lead_stage` מוחלף ב-`update_project_stage` (אבוד עם סיבה, פתיחה מחדש, סיום). הוא לא נוגע במצב השיחה.

- `list_appointments` ו-`get_customer` מחזירים גם `kind`, פרויקט, מיקום, יתרה ומחזור חיים.

- (אופציונלי) `issue_document`, שדורש אישור.

- עדכון המונחים בפרומפט של ה-MCP.

- **מה זה משפר:** העוזר מדבר באותה שפה כמו המערכת, ולא יכול לעקוף את הכללים.

- **UI ב-CRM:** כרטיסי אישור ל-`close_session` ול-`update_project_stage`.

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** כמו בסעיף "מה זה".

- **טסטים:** הרחבה של `tests/features/mcp-assistant/server/tool-servers/*.test.ts`.

---

## B10. UI משלים
### B10.1 כרטיס לקוח
- **מה זה:** בעריכת לקוח, [CustomerDialog](../../src/features/customers/components/CustomerDialog.tsx) הופך ל-Sheet "כרטיס לקוח" עם לשוניות:

- **פרטים:** הטופס הקיים ופרטי החשבונית.

- **פרויקטים:** `ProjectCard` לכל פרויקט, עם שלב, ציר זמן, יתרה וסיבת אבוד.

- **כספים ומסמכים:** כל התשלומים והמסמכים של הלקוח.

- **(אופציונלי) היסטוריה:** מתוך `state_transitions`.

- **אזור מסוכן:** מחיקה או אנונימיזציה.

- **מה זה משפר:** זה הפער שציינתי: דף הלקוח לא מציג פרויקטים או מצב כספי.

- **UI ב-CRM:** כמו בסעיף "מה זה".

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** `getCustomerOverview`.

- **טסטים:** unit למיפוי.

### B10.2 יומן
- **מה זה:**

- **פילטר לפי **`kind` ב-[CalendarFilters](../../src/features/calendar/components/CalendarFilters.tsx#L88), במקום החיפוש לפי `type`.

- **תג "ממתין לסגירה"** גם בטבלה (`AppointmentTable`) ובתצוגת החודש (`MonthGrid`).

- **תג מצב כספי** בכרטיסים: שולם, יתרה, זיכוי או חסר מסמך.

- **קישור למסמך** בחלון התור.

- **מה זה משפר:** סוגר את שאר הפערים ביומן.

- **UI ב-CRM:** כמו בסעיף "מה זה".

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** `getAppointmentsHandler` מחזיר גם `financialStatus`.

- **טסטים:** unit.

### B10.3 שיחות
- **מה זה:** chip בכותרת השיחה עם הפרויקט הפעיל: שם, שלב, "סשן N/~M" ויתרה. לחיצה עליו פותחת את `ProjectPanel`.

- **מה זה משפר:** מי שעונה ללקוח רואה את ההקשר בלי לפתוח את היומן.

- **UI ב-CRM:** כמו בסעיף "מה זה".

- **סוכן / DB / חיצוני:** אין שינוי.

- **שרת ולוגיקה:** `getActiveAppointmentSummary` מורחב.

- **טסטים:** unit.

### B10.4 פיצול רכיבים גדולים
- **מה זה:** [EditAppointmentDialog](../../src/features/calendar/components/EditAppointmentDialog.tsx) (322 שורות) ו-[ConversationThread](../../src/features/conversations/components/ConversationThread.tsx) (287) מתפצלים ל-sections ו-hooks, מתחת ל-250 שורות. ב-B2 וב-B4 שני הקבצים גדלים עוד, אז הפיצול נעשה **לפני** השינויים שם.

- **מה זה משפר:** עמידה ב-code-principles §2.

- **UI ב-CRM:** אין שינוי נראה.

- **סוכן / שרת / DB / חיצוני:** אין שינוי.

- **טסטים:** הקיימים.

### B10.5 מובייל
- **מה זה:** מעבר על המסכים הצפופים: שורות התשלום בסגירת סשן, פאנל הכספים, והכרטיסים בלוח הפרויקטים. צילומי מסך רק כשתבקש.

- **מה זה משפר:** בזמן הסשן, הסטודיו עובד מהטלפון.

- **UI ב-CRM:** כמו בסעיף "מה זה".

- **סוכן / שרת / DB / חיצוני:** אין שינוי.

---

## B11. ניקוי
כל הסרה נעשית רק אחרי שכל הקוראים עברו (strangler), עם מיגרציה שיש לה `migrate down`.

| # | מה | הדרך |
| --- | --- | --- |
| B11.1 | `type` → `kind` | הקוראים: היומן, `CalendarFilters`, הפרומפטים, `healing_check`, האנליטיקות וה-MCP. אחריהם הסרת הסנכרון מ-`projects.pb.js` והסרת השדה. בכלי `collect_tattoo_info` המודל ממשיך לראות `sketch`/`tattoo`, ומיפוי ל-`kind` נעשה בצד השרת |
| B11.2 | `deposit_paid` → `payments` | היום ה-hook מעתיק מהדגל לתשלום. `confirmDepositReceived` עובר לכתוב `payment` ישירות, וה-hook מתהפך: מהתשלום לדגל. אחרי שכל הקוראים עוברים, הדגל וה-hook מוסרים |
| B11.3 | `price_min`, `price_max`, `deposit_amount`, `payment_receipt_url` על התור | עוברים ל-`projects.quote_*` ול-`payments` |
| B11.4 | `price_amount` | כל ההפניות מוסרות (השדה לא קיים בסכמה) |
| B11.5 | `lead_stage` ו-`stateToLeadStage` | הסרה. `audit_log` מאוחד לתוך `state_transitions`, כולל העברת השורות הקיימות |
| B11.6 | `pocketbase/schema/build_schema.py` | מחיקה. אף סקריפט לא משתמש בו, והמיגרציות הן מקור האמת |
| B11.7 | תיעוד | `architecture.md` §9 מתעדכן, ונוסף §10 על מסמכים. ב-`design-system.md` §2 עדיין כתוב emerald/amber/rose, בזמן שה-eslint אוכף tokens (`status-done` / `status-wait` / `status-dead`), אז הוא מתעדכן לפיהם |