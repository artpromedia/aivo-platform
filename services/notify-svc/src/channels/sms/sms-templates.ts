/**
 * SMS Templates
 *
 * Pre-defined SMS templates optimized for:
 * - Single segment delivery (160 chars GSM-7)
 * - Clear call-to-action
 * - Required compliance elements
 * - Carrier deliverability
 */

import type { SmsTemplateContext } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * All available SMS template names
 */
export type SmsTemplateName =
  | 'otp'
  | 'session-reminder'
  | 'security-alert'
  | 'password-reset'
  | 'account-verification'
  | 'class-reminder'
  | 'parent-alert'
  | 'homework-due'
  | 'grade-posted'
  | 'absence-alert'
  | 'consent-confirmation'
  | 'help-response';

/**
 * Template registry with character counts and compliance notes
 */
interface SmsTemplate {
  /**
   * Template text with {{variable}} placeholders
   */
  template: string;

  /**
   * Maximum segment count for this template
   * Most should fit in 1 segment (160 chars GSM-7)
   */
  maxSegments: number;

  /**
   * Whether opt-out instructions are required
   * Required for marketing, optional for transactional
   */
  requiresOptOut: boolean;

  /**
   * Whether this template bypasses consent checks
   */
  bypassConsent: boolean;
}

const templates: Record<SmsTemplateName, SmsTemplate> = {
  // ════════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION TEMPLATES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * OTP/2FA verification code
   * ~45 chars - fits easily in 1 segment
   */
  otp: {
    template: 'Your Aivo code is {{code}}. Expires in 5 min. Do not share.',
    maxSegments: 1,
    requiresOptOut: false,
    bypassConsent: true,
  },

  /**
   * Account verification during signup
   * ~75 chars
   */
  'account-verification': {
    template: 'Welcome to Aivo! Your verification code is {{code}}. Valid for 15 min.',
    maxSegments: 1,
    requiresOptOut: false,
    bypassConsent: true,
  },

  /**
   * Password reset code
   * ~85 chars
   */
  'password-reset': {
    template: 'Aivo password reset code: {{code}}. Expires in 10 min. If you didn\'t request this, ignore this message.',
    maxSegments: 1,
    requiresOptOut: false,
    bypassConsent: true,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SECURITY TEMPLATES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Security alert for suspicious activity
   * ~130 chars
   */
  'security-alert': {
    template: 'Aivo Security: {{alertType}} detected on your account at {{time}}. If this wasn\'t you, secure your account at aivolearning.com/security',
    maxSegments: 1,
    requiresOptOut: false,
    bypassConsent: true,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // EDUCATIONAL REMINDERS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Tutoring session reminder
   * ~140 chars
   */
  'session-reminder': {
    template: 'Reminder: {{studentName}}\'s {{subject}} session starts in {{timeUntil}}. Join at aivolearning.com/session/{{sessionId}}. Reply STOP to opt out.',
    maxSegments: 1,
    requiresOptOut: true,
    bypassConsent: false,
  },

  /**
   * Class reminder for teachers/students
   * ~125 chars
   */
  'class-reminder': {
    template: '{{className}} starts in {{timeUntil}}. Room: {{room}}. Join: aivolearning.com/class/{{classId}}. Reply STOP to opt out.',
    maxSegments: 1,
    requiresOptOut: true,
    bypassConsent: false,
  },

  /**
   * Homework due reminder
   * ~120 chars
   */
  'homework-due': {
    template: 'Reminder: "{{assignmentName}}" is due {{dueDate}}. Submit at aivolearning.com/hw/{{assignmentId}}. Reply STOP to opt out.',
    maxSegments: 1,
    requiresOptOut: true,
    bypassConsent: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PARENT NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Parent alert for student activity
   * ~145 chars
   */
  'parent-alert': {
    template: 'Aivo: {{alertMessage}} for {{studentName}} at {{time}}. View details: aivolearning.com/parent. Reply STOP to opt out.',
    maxSegments: 1,
    requiresOptOut: true,
    bypassConsent: false,
  },

  /**
   * Grade posted notification
   * ~135 chars
   */
  'grade-posted': {
    template: 'New grade for {{studentName}}: {{grade}} on "{{assignmentName}}" in {{className}}. View: aivolearning.com/grades. Reply STOP to opt out.',
    maxSegments: 1,
    requiresOptOut: true,
    bypassConsent: false,
  },

  /**
   * Student absence alert
   * ~130 chars
   */
  'absence-alert': {
    template: 'Aivo Attendance: {{studentName}} was marked absent from {{className}} on {{date}}. Contact school if unexpected. Reply STOP to opt out.',
    maxSegments: 1,
    requiresOptOut: true,
    bypassConsent: false,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // SYSTEM MESSAGES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Consent confirmation
   * ~140 chars
   */
  'consent-confirmation': {
    template: 'You\'ve opted in to receive SMS from Aivo for {{tenantName}}. Reply STOP anytime to unsubscribe. Msg&data rates may apply.',
    maxSegments: 1,
    requiresOptOut: true,
    bypassConsent: true, // This IS the consent confirmation
  },

  /**
   * Response to HELP keyword
   * ~145 chars
   */
  'help-response': {
    template: 'Aivo SMS: For support visit aivolearning.com/help or email support@aivolearning.com. Reply STOP to unsubscribe. Msg freq varies. Msg&data rates may apply.',
    maxSegments: 1,
    requiresOptOut: true,
    bypassConsent: true,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE RENDERING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Render a template with context variables
 */
export function renderSmsTemplate(
  templateName: SmsTemplateName,
  context: SmsTemplateContext
): string {
  const templateDef = templates[templateName];

  if (!templateDef) {
    throw new Error(`Unknown SMS template: ${templateName}`);
  }

  let rendered = templateDef.template;

  // Replace all {{variable}} placeholders
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined && value !== null) {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), stringValue);
    }
  }

  // Remove any unreplaced placeholders
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');

  // Clean up double spaces
  rendered = rendered.replace(/\s+/g, ' ').trim();

  return rendered;
}

/**
 * Get template metadata
 */
export function getTemplateInfo(templateName: SmsTemplateName): SmsTemplate | null {
  return templates[templateName] || null;
}

/**
 * Check if a template requires opt-out instructions
 */
export function templateRequiresOptOut(templateName: SmsTemplateName): boolean {
  return templates[templateName]?.requiresOptOut ?? true;
}

/**
 * Check if a template bypasses consent
 */
export function templateBypassesConsent(templateName: SmsTemplateName): boolean {
  return templates[templateName]?.bypassConsent ?? false;
}

/**
 * List all available templates
 */
export function listTemplates(): SmsTemplateName[] {
  return Object.keys(templates) as SmsTemplateName[];
}

/**
 * Validate a template exists
 */
export function isValidTemplate(templateName: string): templateName is SmsTemplateName {
  return templateName in templates;
}

/**
 * Preview a template with sample data
 */
export function previewTemplate(templateName: SmsTemplateName): {
  template: string;
  preview: string;
  charCount: number;
  segments: number;
} {
  const templateDef = templates[templateName];

  if (!templateDef) {
    throw new Error(`Unknown SMS template: ${templateName}`);
  }

  // Sample context for preview
  const sampleContext: SmsTemplateContext = {
    code: '123456',
    studentName: 'Alex',
    subject: 'Math',
    timeUntil: '30 min',
    sessionId: 'abc123',
    className: 'Algebra 101',
    room: 'Room 204',
    classId: 'xyz789',
    assignmentName: 'Chapter 5 Quiz',
    dueDate: 'Tomorrow 3pm',
    assignmentId: 'hw456',
    alertMessage: 'Assignment submitted',
    grade: 'A',
    date: 'Today',
    tenantName: 'Lincoln High',
    alertType: 'New login',
    time: '2:30 PM',
  };

  const preview = renderSmsTemplate(templateName, sampleContext);

  return {
    template: templateDef.template,
    preview,
    charCount: preview.length,
    segments: Math.ceil(preview.length / 160),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export { templates };
