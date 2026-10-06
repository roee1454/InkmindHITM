# אודיט ועיצוב מחדש של הדיאלוגים

נכתב ב-28/9/2026, אחרי שדיאלוג הפרויקט (`ProjectPanel`) עוצב מחדש. המטרה היא שכל הדיאלוגים באפליקציה ייבנו לפי אותה אנטומיה ולפי DESIGN.md.

## מלאי

באפליקציה יש 33 משטחים שנפתחים מעל המסך. הם מתחלקים לשש קבוצות:

| קבוצה | דיאלוגים |
|---|---|
| **מרכזי עבודה** (הרבה מידע ופעולות) | `EditAppointmentDialog` + `AppointmentFormFields`, `ProjectPanel` (כבר עוצב), `CustomerSheet` (כבר עוצב), `CloseSessionDialog`, `DayOverviewDialog` |
| **אשפים** | `CreateAppointmentDialog`, `NewConversationDialog` |
| **טפסים קצרים** | `CustomerDialog`, `AddCustomerDialog`, `EditClosureDialog`, הוספת ועריכת שאלה נפוצה (`AiKnowledgeBaseCard`), `AddStaffDialog`, עריכת פרטים וסיסמה (`MemberDetail`), `MarkProjectLostDialog`, `PriceQuoteSheet`, `ReceiptVerificationSheet`, `ResumeBotDialog`, `SendTemplateDialog`, `AddClosureDialog`, `UploadBackupDialog` |
| **רשימות** | `AllClosuresDialog` |
| **אישורים** | `useConfirm`, `CascadeDeleteDialog`, מחיקת תור (בתוך `EditAppointmentDialog`), מחיקת סגירה (`ClosuresSection`), `DeleteBackupDialog`, `RestoreBackupDialog`, `NoCalendarWarningDialog`, ההתראה על יומן לא מחובר (בתוך `AppointmentFormFields`) |
| **צפייה** | `ImageGalleryDialog`, `InspirationGalleryDialog`, `HealthDeclarationDialog`, `McpPanel`, `AppDrawer` |

## ממצאים

### 1. הבסיס עצמו לא מחזיק דיאלוג ארוך

- ל-`DialogContent` אין גובה מקסימלי ואין גלילה פנימית. כל דיאלוג ארוך פתר את זה לבד, עם שישה ערכים שונים: `75vh`, `85vh`, `90vh`, `95vh`, `85dvh` ו-`42rem`.
- ברוב הדיאלוגים כל התוכן נגלל, כולל הכותרת והכפתורים. בדיאלוג ארוך כפתור השמירה נעלם מתחת לקצה.
- הפינות הן `rounded-3xl` (24px). DESIGN.md אוסר רדיוס גדול מ-12px.
- כפתור הסגירה בדיאלוג בדסקטופ מוקרא לקוראי מסך כ-"Close", באנגלית.

### 2. אין עוגן לפעולות

ל-`ResponsiveDialog` יש prop בשם `footer`, אבל רק שני דיאלוגים משתמשים בו. בשאר, הכפתורים יושבים בתוך התוכן בחמש צורות שונות:
- שורה מיושרת לסוף, עם ביטול ואז שמירה;
- רשת של שתי עמודות שבה כפתור המחיקה בא ראשון (מחיקת תור);
- כפתור ראשי ברוחב מלא (`btn-native`, `AddCustomerDialog`, `AddStaffDialog`);
- שני כפתורי שליחה נפרדים בדיאלוג אחד (`AddClosureDialog`);
- כפתור "סגור" קטן מיותר בתחתית (`AllClosuresDialog`).

סדר הכפתורים משתנה מדיאלוג לדיאלוג, ולכן העין לא לומדת איפה נמצאת הפעולה הראשית.

### 3. רוחב בלי משמעות

יש שבעה רוחבים שונים (`max-w-md`, `sm:max-w-md`, `max-w-lg`, `sm:max-w-lg`, `sm:max-w-xl`, `sm:max-w-2xl`, `lg:max-w-3xl`). הרוחב לא נגזר מסוג הדיאלוג.

### 4. קופסאות בתוך קופסאות

קופסאות עם מסגרת או רקע צבוע משמשות לקישוט בתוך הדיאלוג, וזה בעצם כרטיס בתוך כרטיס:
- בדיאלוגי המחיקה והשחזור של גיבוי יש שתי קופסאות: אזהרה ופרטי קובץ.
- ב-`UploadBackupDialog` יש קופסת אזהרה בתוך קופסת מתג.
- ב-`AddClosureDialog` כל מתג יושב בקופסה.
- בהצלחה של `AddStaffDialog` יש קופסה צבועה.
- בתוך דיאלוג התור יש שלושה כרטיסים בלשונית המסמכים.

### 5. ארבע דרכים לשאול "בטוח?"

יש ארבע דרכים שונות לבקש אישור:
- `useConfirm`, מבוסס AlertDialog;
- `CascadeDeleteDialog`, גם הוא AlertDialog;
- ארבעה אישורים שבנויים ידנית על `ResponsiveDialog`: מחיקת תור, מחיקת סגירה, ומחיקה ושחזור של גיבוי;
- כותרות עם אייקון ובצבע אדום.

### 6. כותרות ותיאורים

- שישה דיאלוגים מעבירים כותרת כ-JSX עם אייקון, כך שהכותרות לא אחידות.
- תיאורים רבים הם הוראות ארוכות ("הזן את פרטי הלקוח החדש במאגר.").
- חלקם טכניים: "ה-CRM מושך תבניות מאושרות (APPROVED) ישירות מ-Meta WhatsApp API".

### 7. כפילויות ובאגים

- `AddCustomerDialog` הוא העתק של `CustomerDialog`, עם אותם שדות שנכתבו פעם שנייה.
- הוספה ועריכה של שאלה נפוצה הם שני דיאלוגים כמעט זהים.
- במחיקת תור, התאריך והשעה מוצגים פעמיים.
- דיאלוג התור בגובה קבוע של `42rem` גם כשהתוכן קצר.

## האנטומיה החדשה (כמו `ProjectPanel`)

ב-`ResponsiveDialog`:
- **שלושה אזורים:** כותרת קבועה, תוכן שנגלל, ושורת פעולות קבועה עם קו עליון. כך הכפתורים תמיד גלויים.
- **גודל עם משמעות:**

  | גודל | רוחב | שימוש |
  |---|---|---|
  | `sm` | 28rem | אישורים |
  | `md` | 32rem | טפסים, ברירת המחדל |
  | `lg` | 42rem | אשפים ורשימות |
  | `xl` | 48rem | מרכזי עבודה |

  הגובה המקסימלי הוא `min(54rem, 100dvh-2rem)`.
- **סדר הפעולות:** הפעולה הראשית בקצה (שמאל ב-RTL). "ביטול" לצידה. פעולה הרסנית משנית ("מחיקה") בצד השני, כ-ghost.
- **טופס:** כפתור השליחה נמצא בשורת הפעולות ומחובר לטופס דרך `form="<id>"`, כך ש-Enter שולח.
- **רדיוס:** 12px (`rounded-xl`), כמו כרטיס.

אישור הוא דיאלוג `sm` אחד, `ConfirmDialog`. יש בו כותרת, משפט אחד, רשימת פרטים של מה שנפגע (`dl`, בלי קופסה), וכפתור בצבע הפעולה.

## שלבים

| שלב | מה | Removes |
|---|---|---|
| **D1** בסיס | אנטומיה וגדלים ב-`ResponsiveDialog`; רדיוס 12px ב-`dialog`, `alert-dialog` ו-`sheet`; גובה מקסימלי וגלילה פנימית; "סגירה" בעברית | ה-`max-h-*`, `overflow-y-auto` ו-`h-[42rem]` שכל דיאלוג הוסיף לעצמו |
| **D2** אישורים | `ConfirmDialog` משותף. מעבר של: מחיקת תור, מחיקת סגירה, מחיקה ושחזור של גיבוי, `NoCalendarWarningDialog`, ההתראה על יומן לא מחובר | `DeleteBackupDialog`, `RestoreBackupDialog`, `NoCalendarWarningDialog`, האישורים הידניים. `useConfirm` נשאר ומרונדר עם `ConfirmDialog` |
| **D3** טפסים קצרים | מעבר לאנטומיה ולשורת הפעולות. שאלה נפוצה הופכת לדיאלוג אחד. `AddCustomerDialog` הופך ל-`CustomerDialog`. `AddClosureDialog` מתחלק ללשוניות "חגים" ו"תאריך" עם פעולה אחת | `AddCustomerDialog`, הדיאלוג הכפול של השאלה הנפוצה, הקופסאות הדקורטיביות |
| **D4** מרכזי עבודה ואשפים | `EditAppointmentDialog`: כותרת עם סטטוס, לקוח ומועד כמו בפרויקט, בלי גובה קבוע. `CreateAppointmentDialog` ו-`NewConversationDialog`: שורת פעולות קבועה. `CloseSessionDialog`, `DayOverviewDialog` | הכרטיסים המקוננים בלשונית המסמכים, הגובה הקבוע |
| **D5** צפייה ורשימות | גלריות, הצהרת בריאות, `AllClosuresDialog` | כפתור ה"סגור" המיותר |

## מה בוצע (28/9/2026)

כל חמשת השלבים בוצעו. כל 24 הדיאלוגים שבנויים על `ResponsiveDialog` עברו לאנטומיה החדשה, ואף אחד מהם כבר לא מגביל גובה בעצמו. החריג היחיד הוא `EditAppointmentDialog`, שיש לו גובה קבוע בכוונה, רק בדסקטופ, כדי שהמעבר בין הלשוניות לא יקפיץ את הדיאלוג.

- **D1:** `ResponsiveDialog` עם שלושה אזורים, `size`, ‏`bare` ו-`DialogActions`, שמסדר את הכפתורים ומציג את השגיאה ליד כפתור הפעולה. הרדיוס ירד ל-12px ב-`dialog` וב-`sheet`, וכפתור הסגירה נקרא "סגירה". `AddCustomerDialog` מרנדר עכשיו את `CustomerDialog`, והוספה ועריכה של שאלה נפוצה הן דיאלוג אחד, `FaqDialog`. הטפסים של איש צוות הפכו ל-`EditStaffInfoDialog` ו-`SetPasswordDialog`.
- **D2:** `ConfirmDialog`. דרכו עוברים עכשיו `useConfirm`, ‏`CascadeDeleteDialog`, מחיקת תור, מחיקת סגירה, מחיקה ושחזור של גיבוי, ואישור מקדמה בלי אסמכתה. נמחקו `DeleteBackupDialog`, ‏`RestoreBackupDialog` והפרימיטיב `alert-dialog`.
- **D3:** כל הטפסים ודיאלוגי השיחה עם שורת פעולות קבועה, בלי הקופסאות הדקורטיביות. `AddClosureDialog` בנוי עכשיו משתי לשוניות עם פעולה אחת.
- **D4:**
  - `EditAppointmentDialog`: הכותרת אומרת מה התור ("סשן 3 — נועה ברק"). במקום ציר הזמן של הפרויקט יש שורה אחת שפותחת את דיאלוג הפרויקט, ו-`ProjectTimeline` נמחק. `AppointmentFormFields` (655 שורות) פוצל לקומפוננטה אחת לכל לשונית.
  - באשף קביעת התור היה באג: שליחת הטופס של "לקוח חדש" קפצה דרך עץ ה-React לטופס של האשף, והפעילה שם בדיקת שלב או מעבר שלב. זה תוקן.
  - `DayOverviewDialog`.
- **D5:** הגלריות (כולל תוויות לכפתורי הניווט, כפתורים במקום `div` שמגיב ללחיצה, וניווט במקלדת), הצהרת הבריאות, ו-`AllClosuresDialog` בלי כפתור הסגירה המיותר.

**נשאר מחוץ לתוכנית:**
- `CustomerSheet`, ‏`McpPanel` ו-`AppDrawer` בנויים ישירות על `Sheet` ומעוצבים בנפרד.
- `HealthDeclarationViewer` עדיין מוצג כקופסה עם מסגרת בתוך הדיאלוגים. זו קומפוננטה משותפת, ועוד לא טופלה.
