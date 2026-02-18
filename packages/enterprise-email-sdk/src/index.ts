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
