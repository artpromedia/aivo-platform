/**
 * Email Channel Types
 *
 * Common types for email providers (SendGrid, SES)
 */

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL RESULT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: EmailProviderType;
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}

export interface BatchEmailResult {
  provider: EmailProviderType;
  totalSent: number;
  totalFailed: number;
  results: {
    to: string;
    success: boolean;
    messageId?: string;
    errorCode?: string;
    errorMessage?: string;
  }[];
}

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL OPTIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  contentId?: string; // For inline images
  disposition?: 'attachment' | 'inline';
}

export interface SendEmailOptions {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  attachments?: EmailAttachment[];
  priority?: 'high' | 'normal' | 'low';
  category?: string;
  tags?: string[];
  customArgs?: Record<string, string>;
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface TemplateEmailOptions {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  fromName?: string;
  replyTo?: string;
  templateId: string;
  dynamicTemplateData: Record<string, unknown>;
  attachments?: EmailAttachment[];
  category?: string;
  tags?: string[];
  customArgs?: Record<string, string>;
  scheduledAt?: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type EmailProviderType = 'sendgrid' | 'ses' | 'none';

export interface EmailProviderConfig {
  type: EmailProviderType;
  enabled: boolean;
  sandboxMode: boolean;
  fromEmail: string;
  fromName: string;
}

export interface SendGridConfig extends EmailProviderConfig {
  type: 'sendgrid';
  apiKey: string;
  webhookSigningKey?: string;
  ipPoolName?: string;
}

export interface SESConfig extends EmailProviderConfig {
  type: 'ses';
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  configurationSetName?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER INTERFACE
// ══════════════════════════════════════════════════════════════════════════════

export interface EmailProvider {
  readonly name: EmailProviderType;
  readonly isHealthy: boolean;

  /**
   * Initialize the provider
   */
  initialize(): Promise<boolean>;

  /**
   * Shutdown the provider
   */
  shutdown(): Promise<void>;

  /**
   * Check provider health
   */
  healthCheck(): Promise<boolean>;

  /**
   * Send a single email
   */
  send(options: SendEmailOptions): Promise<EmailResult>;

  /**
   * Send batch emails (up to provider limit)
   */
  sendBatch(emails: SendEmailOptions[]): Promise<BatchEmailResult>;

  /**
   * Send using provider's dynamic template
   */
  sendTemplate(options: TemplateEmailOptions): Promise<EmailResult>;

  /**
   * Cancel a scheduled email (if supported)
   */
  cancelScheduled?(messageId: string): Promise<boolean>;
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type EmailEventType =
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'dropped'
  | 'spam_report'
  | 'unsubscribe'
  | 'deferred';

export interface EmailWebhookEvent {
  provider: EmailProviderType;
  eventType: EmailEventType;
  messageId: string;
  email: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  // Bounce-specific
  bounceType?: 'hard' | 'soft';
  bounceReason?: string;
  // Click-specific
  url?: string;
  // Spam-specific
  feedbackId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPPRESSION TYPES
// ══════════════════════════════════════════════════════════════════════════════

// Re-export from Prisma for compatibility
export type { SuppressionReason } from '../../../generated/prisma-client/index.js';

export type SuppressionReasonType =
  | 'hard_bounce'
  | 'soft_bounce_repeated'
  | 'complaint'
  | 'unsubscribed'
  | 'manual';

export interface SuppressionEntry {
  email: string;
  reason: SuppressionReasonType;
  source: string;
  createdAt: Date;
  expiresAt?: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOCALE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ja' | 'ko';

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface EmailValidationResult {
  email: string;
  isValid: boolean;
  isSuppressed?: boolean;
  isDisposable?: boolean;
  isRoleBased?: boolean;
  hasMxRecord?: boolean;
  reason?: string;
  domain?: string;
  mxValid?: boolean;
  suggestion?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface EmailTemplateContext {
  // Base context
  appName: string;
  appUrl: string;
  supportEmail: string;
  currentYear: number;
  
  // User context
  recipientName?: string;
  recipientEmail?: string;
  
  // Tenant context
  tenantName?: string;
  tenantLogo?: string;
  
  // Locale
  locale?: SupportedLocale;
  
  // Template-specific data
  [key: string]: unknown;
}

export interface CompiledTemplate {
  subject: (context: EmailTemplateContext) => string;
  html: (context: EmailTemplateContext) => string;
  text: (context: EmailTemplateContext) => string;
}
