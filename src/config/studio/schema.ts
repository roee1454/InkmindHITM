import { z } from 'zod'

export const faqEntrySchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
})

export const studioConfigSchema = z.object({
  // Branding & Identity
  studioName: z.string().trim().min(1),
  tagline: z.string().trim().optional().default(''),
  logoAssetUrl: z.string().trim().default('/branding/logo.png'),
  faviconUrl: z.string().trim().default('/favicon.ico'),
  contactEmail: z.string().trim().email().optional().or(z.literal('')),
  contactPhone: z.string().trim().optional().default(''),
  address: z.string().trim().optional().default(''),

  // Localization
  timezone: z.string().trim().default('Asia/Jerusalem'),
  currency: z.string().trim().default('ILS'),
  locale: z.string().trim().default('he-IL'),

  // Deposit & Payments
  depositRequired: z.boolean().default(false),
  depositAmount: z.number().min(0).nullable().default(null),
  paymentInstructions: z.string().trim().default(''),
  depositApplication: z.enum(['first_session', 'last_session']).nullable().default('first_session'),
  depositPerSession: z.enum(['required', 'not_required']).nullable().default('not_required'),

  // Cancellation Policy
  cancellationCutoffHours: z.number().min(0).default(48),
  depositNoticeHours: z.number().min(0).default(168),

  // Health Declaration
  healthDeclarationFormUrl: z.string().trim().nullable().default(null),
  healthDeclarationValidityMonths: z.number().default(6),

  // Project & Lifecycle Policies
  touchUpPolicy: z.enum(['free_within_days', 'charged']).nullable().default('free_within_days'),
  touchUpFreeDays: z.number().int().min(1).nullable().default(30),
  healingPeriodDays: z.number().int().min(1).default(14),
  consultationFollowupDays: z.number().int().min(1).default(2),
  consultationLostAfterDays: z.number().int().min(1).default(7),
  inquiryLostAfterDays: z.number().int().min(1).default(7),
  dormantAfterMonths: z.number().int().min(1).default(6),
  postProjectFeedback: z.enum(['review_links', 'nps_then_review']).default('review_links'),
  googleReviewLink: z.string().trim().nullable().default(null),
  easyReviewLink: z.string().trim().nullable().default(null),

  // AI Assistant & Knowledge Base
  aiEnabled: z.boolean().default(true),
  aiModel: z.string().trim().default('claude-3-5-sonnet-20241022'),
  systemInstructions: z.string().trim().default(''),
  initialFaq: z.array(faqEntrySchema).default([]),

  // System & Operations
  staffNotificationPhone: z.string().trim().default(''),
  backupIntervalHours: z.number().int().min(1).default(24),
  backupRetentionCount: z.number().int().min(1).default(1),
})

export type StudioConfig = z.infer<typeof studioConfigSchema>
export type StudioConfigInput = z.input<typeof studioConfigSchema>
