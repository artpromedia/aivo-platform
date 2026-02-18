/**
 * OonruMail Template Mapping Registry
 *
 * Maps local Handlebars template names and their context variables
 * to OonruMail server-side template IDs and variable schemas.
 *
 * Enables progressive migration from local HBS rendering to
 * server-rendered templates while maintaining backward compatibility.
 *
 * Each mapping provides:
 * - oonruMailTemplateConfigKey: key into config.email.oonrumail.templates
 * - transformContext: converts local EmailTemplateContext → OonruMail templateData
 *
 * Default values ensure server templates render correctly even when
 * a caller omits optional fields.
 */

import { config } from '../../config.js';

import type { EmailTemplateContext } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * OonruMail server-side template config keys
 * (must match keys in config.email.oonrumail.templates)
 */
export type OonruMailTemplateConfigKey = keyof typeof config.email.oonrumail.templates;

/**
 * A single template mapping entry.
 */
export interface TemplateMapping {
  /** Key into config.email.oonrumail.templates to resolve the server template ID */
  readonly oonruMailTemplateConfigKey: OonruMailTemplateConfigKey;

  /**
   * Transform caller-provided context into OonruMail template variables.
   * Must always return a complete variable set with sensible defaults
   * so the server template can render without missing-variable errors.
   */
  readonly transformContext: (ctx: EmailTemplateContext) => Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS — safe accessors for context values
// ══════════════════════════════════════════════════════════════════════════════

/** Extract a string from context with a fallback */
function str(ctx: EmailTemplateContext, key: string, fallback = ''): string {
  const val = ctx[key];
  return typeof val === 'string' ? val : fallback;
}

/** Extract a number from context with a fallback */
function num(ctx: EmailTemplateContext, key: string, fallback = 0): number {
  const val = ctx[key];
  return typeof val === 'number' ? val : fallback;
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE MAP
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Master mapping from local HBS template names (as they appear in
 * `templateName` field of sendTemplatedEmail calls) to OonruMail
 * server-side template configurations.
 *
 * Template names are stored with their directory prefix exactly as
 * the template engine resolves them, e.g. `transactional/welcome`.
 *
 * Multiple aliases (e.g. with and without prefix) are supported by
 * adding extra entries.
 */
export const TEMPLATE_MAP: Readonly<Record<string, TemplateMapping>> = {
  // ──────────────────────────────────────────────────────────────────────────
  // TRANSACTIONAL
  // ──────────────────────────────────────────────────────────────────────────

  'transactional/welcome': {
    oonruMailTemplateConfigKey: 'welcome',
    transformContext: (ctx) => ({
      user_name: str(ctx, 'userName', ctx.recipientName ?? 'there'),
      tenant_name: str(ctx, 'tenantName', ctx.tenantName ?? ctx.appName),
      activation_url: str(ctx, 'activationUrl', ctx.appUrl),
      brand_color: str(ctx, 'brandColor', '#6366f1'),
      expiry_hours: num(ctx, 'expiryHours', 48),
      help_center_url: str(ctx, 'helpCenter', ''),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  // Alias without prefix — some callers may use just 'welcome'
  welcome: {
    oonruMailTemplateConfigKey: 'welcome',
    transformContext: (ctx) => ({
      user_name: str(ctx, 'userName', ctx.recipientName ?? 'there'),
      tenant_name: str(ctx, 'tenantName', ctx.tenantName ?? ctx.appName),
      activation_url: str(ctx, 'activationUrl', ctx.appUrl),
      brand_color: str(ctx, 'brandColor', '#6366f1'),
      expiry_hours: num(ctx, 'expiryHours', 48),
      help_center_url: str(ctx, 'helpCenter', ''),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  'transactional/email-verification': {
    oonruMailTemplateConfigKey: 'emailVerification',
    transformContext: (ctx) => ({
      user_name: str(ctx, 'userName', ctx.recipientName ?? 'User'),
      verification_url: str(ctx, 'verificationUrl', ctx.appUrl),
      verification_code: str(ctx, 'verificationCode', ''),
      code_expiry_minutes: num(ctx, 'codeExpiryMinutes', 30),
      brand_color: str(ctx, 'brandColor', '#6366f1'),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  'email-verification': {
    oonruMailTemplateConfigKey: 'emailVerification',
    transformContext: (ctx) => ({
      user_name: str(ctx, 'userName', ctx.recipientName ?? 'User'),
      verification_url: str(ctx, 'verificationUrl', ctx.appUrl),
      verification_code: str(ctx, 'verificationCode', ''),
      code_expiry_minutes: num(ctx, 'codeExpiryMinutes', 30),
      brand_color: str(ctx, 'brandColor', '#6366f1'),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  'transactional/password-reset': {
    oonruMailTemplateConfigKey: 'passwordReset',
    transformContext: (ctx) => ({
      user_email: str(ctx, 'userEmail', ctx.recipientEmail ?? ''),
      reset_url: str(ctx, 'resetUrl', ctx.appUrl),
      expiry_minutes: num(ctx, 'expiryMinutes', 60),
      brand_color: str(ctx, 'brandColor', '#6366f1'),
      support_url: str(ctx, 'supportUrl', ctx.supportEmail),
      request_ip: (ctx.requestInfo as Record<string, unknown> | undefined)?.ipAddress as string ?? '',
      request_browser: (ctx.requestInfo as Record<string, unknown> | undefined)?.browser as string ?? '',
      request_timestamp: (ctx.requestInfo as Record<string, unknown> | undefined)?.timestamp as string ?? '',
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  'password-reset': {
    oonruMailTemplateConfigKey: 'passwordReset',
    transformContext: (ctx) => ({
      user_email: str(ctx, 'userEmail', ctx.recipientEmail ?? ''),
      reset_url: str(ctx, 'resetUrl', ctx.appUrl),
      expiry_minutes: num(ctx, 'expiryMinutes', 60),
      brand_color: str(ctx, 'brandColor', '#6366f1'),
      support_url: str(ctx, 'supportUrl', ctx.supportEmail),
      request_ip: (ctx.requestInfo as Record<string, unknown> | undefined)?.ipAddress as string ?? '',
      request_browser: (ctx.requestInfo as Record<string, unknown> | undefined)?.browser as string ?? '',
      request_timestamp: (ctx.requestInfo as Record<string, unknown> | undefined)?.timestamp as string ?? '',
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CAREGIVER
  // ──────────────────────────────────────────────────────────────────────────

  'caregiver/caregiver-welcome': {
    oonruMailTemplateConfigKey: 'welcome',
    transformContext: (ctx) => ({
      user_name: str(ctx, 'firstName', ctx.recipientName ?? 'there'),
      tenant_name: str(ctx, 'tenantName', ctx.tenantName ?? ctx.appName),
      activation_url: str(ctx, 'loginUrl', ctx.appUrl),
      brand_color: str(ctx, 'brandColor', '#6366f1'),
      expiry_hours: 0,
      help_center_url: str(ctx, 'supportUrl', ''),
      learner_count: num(ctx, 'learnerCount', 1),
      dashboard_url: str(ctx, 'dashboardUrl', ctx.appUrl),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  'caregiver/caregiver-verify-email': {
    oonruMailTemplateConfigKey: 'emailVerification',
    transformContext: (ctx) => ({
      user_name: str(ctx, 'firstName', ctx.recipientName ?? 'User'),
      verification_url: '',
      verification_code: str(ctx, 'verificationCode', ''),
      code_expiry_minutes: num(ctx, 'expiryHours', 24) * 60,
      brand_color: str(ctx, 'brandColor', '#6366f1'),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BILLING (stub — templates may not exist on OonruMail yet)
  // ──────────────────────────────────────────────────────────────────────────

  'billing/payment-receipt': {
    oonruMailTemplateConfigKey: 'paymentReceipt',
    transformContext: (ctx) => ({
      user_name: str(ctx, 'userName', ctx.recipientName ?? 'Customer'),
      amount: str(ctx, 'amount', '0.00'),
      currency: str(ctx, 'currency', 'USD'),
      invoice_number: str(ctx, 'invoiceNumber', ''),
      payment_date: str(ctx, 'paymentDate', new Date().toISOString()),
      plan_name: str(ctx, 'planName', ''),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // LEARNING NOTIFICATIONS
  // ──────────────────────────────────────────────────────────────────────────

  'notifications/lesson-reminder': {
    oonruMailTemplateConfigKey: 'lessonReminder',
    transformContext: (ctx) => ({
      user_name: str(ctx, 'userName', ctx.recipientName ?? 'Learner'),
      lesson_title: str(ctx, 'lessonTitle', 'Upcoming Lesson'),
      course_name: str(ctx, 'courseName', ''),
      start_time: str(ctx, 'startTime', ''),
      lesson_url: str(ctx, 'lessonUrl', ctx.appUrl),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  'notifications/course-completion': {
    oonruMailTemplateConfigKey: 'courseCompletion',
    transformContext: (ctx) => ({
      user_name: str(ctx, 'userName', ctx.recipientName ?? 'Learner'),
      course_name: str(ctx, 'courseName', ''),
      completion_date: str(ctx, 'completionDate', new Date().toISOString()),
      certificate_url: str(ctx, 'certificateUrl', ''),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  'notifications/assignment-submitted': {
    oonruMailTemplateConfigKey: 'assignmentSubmitted',
    transformContext: (ctx) => ({
      student_name: str(ctx, 'studentName', ctx.recipientName ?? 'Student'),
      assignment_title: str(ctx, 'assignmentTitle', ''),
      course_name: str(ctx, 'courseName', ''),
      submitted_at: str(ctx, 'submittedAt', new Date().toISOString()),
      assignment_url: str(ctx, 'assignmentUrl', ctx.appUrl),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  'notifications/assignment-graded': {
    oonruMailTemplateConfigKey: 'assignmentGraded',
    transformContext: (ctx) => ({
      student_name: str(ctx, 'studentName', ctx.recipientName ?? 'Student'),
      assignment_title: str(ctx, 'assignmentTitle', ''),
      course_name: str(ctx, 'courseName', ''),
      grade: str(ctx, 'grade', ''),
      feedback: str(ctx, 'feedback', ''),
      assignment_url: str(ctx, 'assignmentUrl', ctx.appUrl),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },

  'instructor-new-enrollment': {
    oonruMailTemplateConfigKey: 'instructorNewEnrollment',
    transformContext: (ctx) => ({
      instructor_name: str(ctx, 'instructorName', ctx.recipientName ?? 'Instructor'),
      student_name: str(ctx, 'studentName', ''),
      course_name: str(ctx, 'courseName', ''),
      enrollment_date: str(ctx, 'enrollmentDate', new Date().toISOString()),
      course_url: str(ctx, 'courseUrl', ctx.appUrl),
      app_name: ctx.appName,
      app_url: ctx.appUrl,
      support_email: ctx.supportEmail,
      current_year: ctx.currentYear,
    }),
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// QUERY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check whether the given template name has an OonruMail server-side mapping
 * AND a server template ID is configured.
 */
export function hasOonruMailTemplate(templateName: string): boolean {
  const mapping = TEMPLATE_MAP[templateName];
  if (!mapping) {
    return false;
  }

  const serverId = config.email.oonrumail.templates[mapping.oonruMailTemplateConfigKey];
  return Boolean(serverId);
}

/**
 * Retrieve the mapping entry for a template name.
 * Returns `undefined` if no mapping exists.
 */
export function getOonruMailMapping(templateName: string): TemplateMapping | undefined {
  return TEMPLATE_MAP[templateName];
}

/**
 * Resolve a template name to its OonruMail server template ID.
 * Returns `undefined` if no mapping or no configured ID.
 */
export function resolveOonruMailTemplateId(templateName: string): string | undefined {
  const mapping = TEMPLATE_MAP[templateName];
  if (!mapping) {
    return undefined;
  }

  const serverId = config.email.oonrumail.templates[mapping.oonruMailTemplateConfigKey];
  return serverId || undefined;
}

/**
 * Get all registered template names that have OonruMail mappings.
 */
export function getRegisteredTemplateNames(): string[] {
  return Object.keys(TEMPLATE_MAP);
}
