/**
 * OonruMail SDK - @enterprise-email/aivolearning-email
 *
 * Local stub package implementing the OonruMail enterprise email SDK interface.
 * Replace with the real package from the private registry when available.
 *
 * Features:
 * - Transactional email sending (HTML + text)
 * - Server-side template rendering
 * - Batch sending (up to 1000 recipients)
 * - Webhook signature verification
 * - Rate limiting: 100 requests/sec
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface OonruMailConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface OonruMailMessage {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: OonruMailAttachment[];
  tags?: string[];
  metadata?: Record<string, string>;
  scheduledAt?: string; // ISO 8601
}

export interface OonruMailAttachment {
  filename: string;
  content: string; // base64
  contentType?: string;
  contentId?: string;
  disposition?: 'attachment' | 'inline';
}

export interface OonruMailTemplateMessage {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  fromName?: string;
  replyTo?: string;
  templateId: string;
  templateData: Record<string, unknown>;
  attachments?: OonruMailAttachment[];
  tags?: string[];
  metadata?: Record<string, string>;
  scheduledAt?: string;
}

export interface OonruMailSendResult {
  messageId: string;
  status: 'accepted' | 'queued' | 'rejected';
  acceptedAt: string; // ISO 8601
}

export interface OonruMailBatchResult {
  batchId: string;
  totalAccepted: number;
  totalRejected: number;
  results: {
    to: string;
    messageId?: string;
    status: 'accepted' | 'rejected';
    error?: string;
  }[];
}

export interface OonruMailHealthResponse {
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  version: string;
}

export interface OonruMailWebhookEvent {
  eventId: string;
  eventType: 'delivered' | 'bounced' | 'opened' | 'clicked' | 'complained' | 'unsubscribed' | 'deferred' | 'dropped';
  messageId: string;
  email: string;
  timestamp: string;
  metadata?: Record<string, string>;
  bounceType?: 'hard' | 'soft';
  bounceReason?: string;
  url?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPED TEMPLATE DATA INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

/** Common options for typed send* methods */
export interface OonruMailTypedSendOptions {
  from?: string;
  fromName?: string;
  replyTo?: string;
  tags?: string[];
  metadata?: Record<string, string>;
  scheduledAt?: string;
  /** Override the default server template ID */
  templateIdOverride?: string;
}

export interface OonruMailWelcomeData {
  user_name: string;
  tenant_name: string;
  activation_url: string;
  brand_color?: string;
  expiry_hours?: number;
  help_center_url?: string;
  app_name?: string;
  app_url?: string;
  support_email?: string;
  current_year?: number;
  [key: string]: unknown;
}

export interface OonruMailVerificationData {
  user_name: string;
  verification_url: string;
  verification_code?: string;
  code_expiry_minutes?: number;
  brand_color?: string;
  app_name?: string;
  app_url?: string;
  support_email?: string;
  current_year?: number;
  [key: string]: unknown;
}

export interface OonruMailPasswordResetData {
  user_email: string;
  reset_url: string;
  expiry_minutes?: number;
  brand_color?: string;
  support_url?: string;
  request_ip?: string;
  request_browser?: string;
  request_timestamp?: string;
  app_name?: string;
  app_url?: string;
  support_email?: string;
  current_year?: number;
  [key: string]: unknown;
}

export interface OonruMailPaymentReceiptData {
  user_name: string;
  amount: string;
  currency?: string;
  invoice_number?: string;
  payment_date?: string;
  plan_name?: string;
  app_name?: string;
  app_url?: string;
  support_email?: string;
  current_year?: number;
  [key: string]: unknown;
}

export interface OonruMailLessonReminderData {
  user_name: string;
  lesson_title: string;
  course_name?: string;
  start_time?: string;
  lesson_url?: string;
  app_name?: string;
  app_url?: string;
  support_email?: string;
  current_year?: number;
  [key: string]: unknown;
}

export interface OonruMailCourseCompletionData {
  user_name: string;
  course_name: string;
  completion_date?: string;
  certificate_url?: string;
  app_name?: string;
  app_url?: string;
  support_email?: string;
  current_year?: number;
  [key: string]: unknown;
}

export interface OonruMailAssignmentSubmittedData {
  student_name: string;
  assignment_title: string;
  course_name?: string;
  submitted_at?: string;
  assignment_url?: string;
  app_name?: string;
  app_url?: string;
  support_email?: string;
  current_year?: number;
  [key: string]: unknown;
}

export interface OonruMailAssignmentGradedData {
  student_name: string;
  assignment_title: string;
  course_name?: string;
  grade?: string;
  feedback?: string;
  assignment_url?: string;
  app_name?: string;
  app_url?: string;
  support_email?: string;
  current_year?: number;
  [key: string]: unknown;
}

export interface OonruMailInstructorEnrollmentData {
  instructor_name: string;
  student_name: string;
  course_name: string;
  enrollment_date?: string;
  course_url?: string;
  app_name?: string;
  app_url?: string;
  support_email?: string;
  current_year?: number;
  [key: string]: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// ERRORS
// ══════════════════════════════════════════════════════════════════════════════

export class OonruMailError extends Error {
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly errorCode?: string;

  constructor(message: string, options: { retryable?: boolean; statusCode?: number; errorCode?: string } = {}) {
    super(message);
    this.name = 'OonruMailError';
    this.retryable = options.retryable ?? false;
    this.statusCode = options.statusCode;
    this.errorCode = options.errorCode;
  }
}

export class OonruMailTimeoutError extends OonruMailError {
  constructor(message = 'Request timed out') {
    super(message, { retryable: true, errorCode: 'TIMEOUT' });
    this.name = 'OonruMailTimeoutError';
  }
}

export class OonruMailAuthError extends OonruMailError {
  constructor(message = 'Authentication failed') {
    super(message, { retryable: false, statusCode: 401, errorCode: 'AUTH_ERROR' });
    this.name = 'OonruMailAuthError';
  }
}

export class OonruMailRateLimitError extends OonruMailError {
  readonly retryAfterMs?: number;

  constructor(message = 'Rate limit exceeded', retryAfterMs?: number) {
    super(message, { retryable: true, statusCode: 429, errorCode: 'RATE_LIMITED' });
    this.name = 'OonruMailRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export class AivolearningEmail {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: OonruMailConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.oonrumail.com/v1';
    this.timeout = config.timeout ?? 30_000;
  }

  /**
   * Send a single email message
   */
  async send(message: OonruMailMessage): Promise<OonruMailSendResult> {
    return this.request<OonruMailSendResult>('POST', '/messages', message);
  }

  /**
   * Send using a server-side template
   */
  async sendTemplate(message: OonruMailTemplateMessage): Promise<OonruMailSendResult> {
    return this.request<OonruMailSendResult>('POST', '/messages/template', message);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TYPED TEMPLATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Send a welcome email via server-side template.
   */
  async sendWelcome(
    to: string | string[],
    data: OonruMailWelcomeData,
    options?: OonruMailTypedSendOptions,
  ): Promise<OonruMailSendResult> {
    return this.sendTypedTemplate(to, 'welcome', data, options);
  }

  /**
   * Send an email verification email via server-side template.
   */
  async sendVerification(
    to: string | string[],
    data: OonruMailVerificationData,
    options?: OonruMailTypedSendOptions,
  ): Promise<OonruMailSendResult> {
    return this.sendTypedTemplate(to, 'email_verification', data, options);
  }

  /**
   * Send a password reset email via server-side template.
   */
  async sendPasswordReset(
    to: string | string[],
    data: OonruMailPasswordResetData,
    options?: OonruMailTypedSendOptions,
  ): Promise<OonruMailSendResult> {
    return this.sendTypedTemplate(to, 'password_reset', data, options);
  }

  /**
   * Send a payment receipt email via server-side template.
   */
  async sendPaymentReceipt(
    to: string | string[],
    data: OonruMailPaymentReceiptData,
    options?: OonruMailTypedSendOptions,
  ): Promise<OonruMailSendResult> {
    return this.sendTypedTemplate(to, 'payment_receipt', data, options);
  }

  /**
   * Send a lesson reminder email via server-side template.
   */
  async sendLessonReminder(
    to: string | string[],
    data: OonruMailLessonReminderData,
    options?: OonruMailTypedSendOptions,
  ): Promise<OonruMailSendResult> {
    return this.sendTypedTemplate(to, 'lesson_reminder', data, options);
  }

  /**
   * Send a course completion email via server-side template.
   */
  async sendCourseCompletion(
    to: string | string[],
    data: OonruMailCourseCompletionData,
    options?: OonruMailTypedSendOptions,
  ): Promise<OonruMailSendResult> {
    return this.sendTypedTemplate(to, 'course_completion', data, options);
  }

  /**
   * Send an assignment-submitted notification via server-side template.
   */
  async sendAssignmentSubmitted(
    to: string | string[],
    data: OonruMailAssignmentSubmittedData,
    options?: OonruMailTypedSendOptions,
  ): Promise<OonruMailSendResult> {
    return this.sendTypedTemplate(to, 'assignment_submitted', data, options);
  }

  /**
   * Send an assignment-graded notification via server-side template.
   */
  async sendAssignmentGraded(
    to: string | string[],
    data: OonruMailAssignmentGradedData,
    options?: OonruMailTypedSendOptions,
  ): Promise<OonruMailSendResult> {
    return this.sendTypedTemplate(to, 'assignment_graded', data, options);
  }

  /**
   * Send an instructor new-enrollment notification via server-side template.
   */
  async sendInstructorNewEnrollment(
    to: string | string[],
    data: OonruMailInstructorEnrollmentData,
    options?: OonruMailTypedSendOptions,
  ): Promise<OonruMailSendResult> {
    return this.sendTypedTemplate(to, 'instructor_new_enrollment', data, options);
  }

  /** Internal helper: build OonruMailTemplateMessage and call sendTemplate */
  private async sendTypedTemplate(
    to: string | string[],
    templateId: string,
    data: Record<string, unknown>,
    options?: OonruMailTypedSendOptions,
  ): Promise<OonruMailSendResult> {
    const message: OonruMailTemplateMessage = {
      to,
      templateId: options?.templateIdOverride ?? templateId,
      templateData: data,
      ...(options?.from ? { from: options.from } : {}),
      ...(options?.fromName ? { fromName: options.fromName } : {}),
      ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
      ...(options?.tags ? { tags: options.tags } : {}),
      ...(options?.metadata ? { metadata: options.metadata } : {}),
      ...(options?.scheduledAt ? { scheduledAt: options.scheduledAt } : {}),
    };
    return this.sendTemplate(message);
  }

  /**
   * Send batch messages (up to 1000)
   */
  async sendBatch(messages: OonruMailMessage[]): Promise<OonruMailBatchResult> {
    return this.request<OonruMailBatchResult>('POST', '/messages/batch', { messages });
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduled(messageId: string): Promise<{ cancelled: boolean }> {
    return this.request<{ cancelled: boolean }>('DELETE', `/messages/${messageId}/schedule`);
  }

  /**
   * Check API health
   */
  async health(): Promise<OonruMailHealthResponse> {
    return this.request<OonruMailHealthResponse>('GET', '/health');
  }

  /**
   * Verify a webhook signature
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): boolean {
    // In production SDK, this would use HMAC-SHA256 verification
    // Stub implementation for development
    if (!payload || !signature || !secret) {
      return false;
    }

    try {
      const { createHmac } = require('crypto') as typeof import('crypto');
      const expectedSignature = createHmac('sha256', secret)
        .update(typeof payload === 'string' ? payload : payload.toString('utf8'))
        .digest('hex');
      return `sha256=${expectedSignature}` === signature;
    } catch {
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE
  // ════════════════════════════════════════════════════════════════════════════

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');

        if (response.status === 401) {
          throw new OonruMailAuthError();
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          throw new OonruMailRateLimitError(
            'Rate limit exceeded',
            retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : undefined,
          );
        }

        const retryable = response.status >= 500;
        throw new OonruMailError(errorBody || `HTTP ${response.status}`, {
          retryable,
          statusCode: response.status,
          errorCode: retryable ? 'SERVICE_UNAVAILABLE' : 'REQUEST_ERROR',
        });
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof OonruMailError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new OonruMailTimeoutError();
      }

      throw new OonruMailError(
        error instanceof Error ? error.message : 'Unknown error',
        { retryable: true, errorCode: 'CONNECTION_ERROR' },
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

export default AivolearningEmail;
