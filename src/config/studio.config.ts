import { studioConfigSchema } from './studio/schema'
import type { StudioConfig } from './studio/schema'

export const studioConfig: StudioConfig = studioConfigSchema.parse({
  // Branding & Identity
  studioName: 'INKMIND',
  tagline: 'סטודיו לקעקועים',
  logoAssetUrl: '/branding/logo.png',
  faviconUrl: '/favicon.ico',
  contactEmail: 'contact@inkmind.local',
  contactPhone: '050-0000000',
  address: 'הדקל 30, שוהם מרקט.',

  // Localization
  timezone: 'Asia/Jerusalem',
  currency: 'ILS',
  locale: 'he-IL',

  // Deposit & Payments
  depositRequired: true,
  depositAmount: 200,
  paymentInstructions: 'ביט / PayBox ל-050-0000000 (נא לציין שם מלא בהערה)',
  depositApplication: 'first_session',
  depositPerSession: 'not_required',

  // Cancellation Policy
  cancellationCutoffHours: 48,
  depositNoticeHours: 168,

  // Health Declaration
  healthDeclarationFormUrl: 'https://docs.google.com/forms/d/e/sample/viewform',
  healthDeclarationValidityMonths: 6,

  // Project Policies
  touchUpPolicy: 'free_within_days',
  touchUpFreeDays: 30,
  healingPeriodDays: 14,
  consultationFollowupDays: 2,
  consultationLostAfterDays: 7,
  inquiryLostAfterDays: 7,
  dormantAfterMonths: 6,
  postProjectFeedback: 'review_links',
  googleReviewLink: 'https://g.page/r/sample-inkmind-review',
  easyReviewLink: null,

  // AI Assistant & Knowledge Base
  aiEnabled: false,
  aiModel: 'claude-5-5-sonnet',
  systemInstructions: [
    '- לא קובעים קעקוע מתחת לגיל 18.',
    '- סקיצות מוצגות רק ביום התור, בסטודיו.',
    '- חובה לברר מיקום וגודל משוער לפני מתן הערכת מחיר.',
  ].join('\n'),
  initialFaq: [
    {
      question: 'איך מתכוננים לתור לקעקוע?',
      answer: 'מומלץ לישון טוב בלילה שלפני, לאכול ארוחה טובה כשעה לפני ההגעה, ולשתות הרבה מים. הימנעו משתיית אלכוהול 24 שעות לפני התור.',
    },
    {
      question: 'האם יש חניה באזור הסטודיו?',
      answer: 'יש חניון מוסדר במרחק 2 דקות הליכה מהסטודיו וכחול-לבן ברחובות הסמוכים.',
    },
  ],

  // System & Operations
  staffNotificationPhone: '050-0000000',
  backupIntervalHours: 24,
  backupRetentionCount: 1,
})

export default studioConfig
