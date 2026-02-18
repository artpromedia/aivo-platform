/**
 * OonruMail Webhook Utilities
 *
 * Provides signature verification and typed event handling for
 * OonruMail delivery webhooks.
 *
 * @module @enterprise-email/aivolearning-email/webhooks
 */

import { createHmac } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Webhook event types emitted by OonruMail */
export type OonruMailEventType =
  | 'delivered'
  | 'bounced'
  | 'opened'
  | 'clicked'
  | 'unsubscribed'
  | 'spam_report'
  | 'deferred'
  | 'dropped';

/** Parsed webhook event from OonruMail */
export interface OonruMailWebhookEvent {
  eventId: string;
  eventType: OonruMailEventType;
  messageId: string;
  recipient: string;
  timestamp: string;
  metadata?: Record<string, string>;

  // Bounce details (present when eventType === 'bounced')
  bounceType?: 'hard' | 'soft';
  bounceReason?: string;

  // Click details (present when eventType === 'clicked')
  url?: string;
}

/** Callbacks for each OonruMail webhook event type */
export interface AivoWebhookHandlerCallbacks {
  delivered?: (event: OonruMailWebhookEvent) => Promise<void>;
  bounced?: (event: OonruMailWebhookEvent) => Promise<void>;
  opened?: (event: OonruMailWebhookEvent) => Promise<void>;
  clicked?: (event: OonruMailWebhookEvent) => Promise<void>;
  unsubscribed?: (event: OonruMailWebhookEvent) => Promise<void>;
  spam_report?: (event: OonruMailWebhookEvent) => Promise<void>;
  deferred?: (event: OonruMailWebhookEvent) => Promise<void>;
  dropped?: (event: OonruMailWebhookEvent) => Promise<void>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SIGNATURE VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Verify an OonruMail webhook signature and parse the event body.
 *
 * Returns the parsed event if the signature is valid, or `null` if
 * verification fails or the payload is malformed.
 *
 * @param rawBody - The raw request body as a string
 * @param signature - The `x-webhook-signature` header value
 * @param secret - The webhook secret (AIVO_WEBHOOK_SECRET)
 */
export function verifyAndParseWebhook(
  rawBody: string,
  signature: string,
  secret: string,
): OonruMailWebhookEvent | null {
  if (!rawBody || !signature || !secret) {
    return null;
  }

  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expected = `sha256=${expectedSignature}`;

    // Constant-time comparison
    if (expected.length !== signature.length) {
      return null;
    }

    const expectedBuf = Buffer.from(expected);
    const signatureBuf = Buffer.from(signature);

    // Use timingSafeEqual for constant-time comparison
    const { timingSafeEqual } = require('crypto') as typeof import('crypto');
    if (!timingSafeEqual(expectedBuf, signatureBuf)) {
      return null;
    }

    const parsed = JSON.parse(rawBody) as Record<string, unknown>;

    // Validate required fields
    if (
      typeof parsed.eventId !== 'string' ||
      typeof parsed.eventType !== 'string' ||
      typeof parsed.messageId !== 'string'
    ) {
      return null;
    }

    // Normalize: the raw payload may use `email` or `recipient`
    const recipient =
      (parsed.recipient as string) ?? (parsed.email as string) ?? '';

    return {
      eventId: parsed.eventId as string,
      eventType: parsed.eventType as OonruMailEventType,
      messageId: parsed.messageId as string,
      recipient,
      timestamp: (parsed.timestamp as string) ?? new Date().toISOString(),
      metadata: parsed.metadata as Record<string, string> | undefined,
      bounceType: parsed.bounceType as 'hard' | 'soft' | undefined,
      bounceReason: parsed.bounceReason as string | undefined,
      url: parsed.url as string | undefined,
    };
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Typed webhook event handler that routes parsed events to the
 * appropriate callback.
 *
 * @example
 * ```typescript
 * const handler = new AivoWebhookHandler({
 *   delivered: async (event) => { ... },
 *   bounced: async (event) => { ... },
 * });
 *
 * await handler.handle(event);
 * ```
 */
export class AivoWebhookHandler {
  private callbacks: AivoWebhookHandlerCallbacks;

  constructor(callbacks: AivoWebhookHandlerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Route a parsed event to the registered callback.
   * If no callback is registered for the event type, this is a no-op.
   */
  async handle(event: OonruMailWebhookEvent): Promise<void> {
    const cb = this.callbacks[event.eventType];
    if (cb) {
      await cb(event);
    }
  }
}
