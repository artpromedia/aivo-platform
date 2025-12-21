/**
 * SendGrid Webhook Handler
 *
 * Handles SendGrid Event Webhook events:
 * - Delivery events (delivered, bounce, dropped, deferred)
 * - Engagement events (open, click, spam report, unsubscribe)
 * - Security signature verification
 */

import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import crypto from 'node:crypto';

import { config } from '../../../config.js';
import type { EmailWebhookEvent, SuppressionReason } from '../types.js';
import { emailService } from '../email.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface SendGridEvent {
  email: string;
  timestamp: number;
  'smtp-id'?: string;
  event: string;
  category?: string[];
  sg_event_id?: string;
  sg_message_id?: string;
  response?: string;
  attempt?: string;
  useragent?: string;
  ip?: string;
  url?: string;
  reason?: string;
  status?: string;
  type?: string; // bounce type
  bounce_classification?: string;
  tls?: number;
  cert_err?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SIGNATURE VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

function verifyWebhookSignature(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    // SendGrid's signed event webhook verification
    const timestampPayload = timestamp + payload;
    const decodedSignature = Buffer.from(signature, 'base64');

    const verifier = crypto.createVerify('sha256');
    verifier.update(timestampPayload);

    return verifier.verify(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      },
      decodedSignature
    );
  } catch (error) {
    console.error('[SendGridWebhook] Signature verification failed:', error);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

async function handleDelivered(event: SendGridEvent): Promise<void> {
  console.log('[SendGridWebhook] Email delivered:', {
    email: event.email,
    messageId: event.sg_message_id,
  });

  // Update email log status in database if needed
}

async function handleBounce(event: SendGridEvent): Promise<void> {
  console.log('[SendGridWebhook] Email bounced:', {
    email: event.email,
    type: event.type,
    reason: event.reason,
    classification: event.bounce_classification,
  });

  // Determine if hard bounce (add to suppression) or soft bounce (retry later)
  const isHardBounce = event.type === 'bounce' && 
    ['invalid', 'blocked', 'hard'].some(t => 
      event.bounce_classification?.toLowerCase().includes(t) ||
      event.reason?.toLowerCase().includes(t)
    );

  if (isHardBounce) {
    await emailService.addToSuppressionList(
      event.email,
      'hard_bounce' as SuppressionReason,
      'sendgrid_webhook'
    );
  }
}

async function handleDropped(event: SendGridEvent): Promise<void> {
  console.log('[SendGridWebhook] Email dropped:', {
    email: event.email,
    reason: event.reason,
  });

  // Dropped emails are already suppressed by SendGrid
  // Log for analytics
}

async function handleDeferred(event: SendGridEvent): Promise<void> {
  console.log('[SendGridWebhook] Email deferred:', {
    email: event.email,
    attempt: event.attempt,
    response: event.response,
  });

  // Temporary failure, SendGrid will retry
}

async function handleSpamReport(event: SendGridEvent): Promise<void> {
  console.log('[SendGridWebhook] Spam report:', {
    email: event.email,
    messageId: event.sg_message_id,
  });

  // Add to suppression list immediately
  await emailService.addToSuppressionList(
    event.email,
    'spam_complaint' as SuppressionReason,
    'sendgrid_webhook'
  );
}

async function handleUnsubscribe(event: SendGridEvent): Promise<void> {
  console.log('[SendGridWebhook] Unsubscribe:', {
    email: event.email,
  });

  await emailService.addToSuppressionList(
    event.email,
    'unsubscribed' as SuppressionReason,
    'sendgrid_webhook'
  );
}

async function handleOpen(event: SendGridEvent): Promise<void> {
  console.log('[SendGridWebhook] Email opened:', {
    email: event.email,
    userAgent: event.useragent,
    ip: event.ip,
  });

  // Track engagement metrics
}

async function handleClick(event: SendGridEvent): Promise<void> {
  console.log('[SendGridWebhook] Link clicked:', {
    email: event.email,
    url: event.url,
    userAgent: event.useragent,
    ip: event.ip,
  });

  // Track engagement metrics
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════════════

async function processEvents(events: SendGridEvent[]): Promise<void> {
  for (const event of events) {
    try {
      switch (event.event) {
        case 'delivered':
          await handleDelivered(event);
          break;
        case 'bounce':
          await handleBounce(event);
          break;
        case 'dropped':
          await handleDropped(event);
          break;
        case 'deferred':
          await handleDeferred(event);
          break;
        case 'spamreport':
          await handleSpamReport(event);
          break;
        case 'unsubscribe':
        case 'group_unsubscribe':
          await handleUnsubscribe(event);
          break;
        case 'open':
          await handleOpen(event);
          break;
        case 'click':
          await handleClick(event);
          break;
        default:
          console.log('[SendGridWebhook] Unknown event type:', event.event);
      }
    } catch (error) {
      console.error('[SendGridWebhook] Error processing event:', {
        event: event.event,
        email: event.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY ROUTE HANDLER
// ══════════════════════════════════════════════════════════════════════════════

interface WebhookRequest extends FastifyRequest {
  body: SendGridEvent[];
  headers: {
    'x-twilio-email-event-webhook-signature'?: string;
    'x-twilio-email-event-webhook-timestamp'?: string;
  };
}

export async function sendGridWebhookHandler(
  request: WebhookRequest,
  reply: FastifyReply
): Promise<void> {
  const webhookKey = config.email.sendgrid?.webhookVerificationKey;

  // Verify signature if key is configured
  if (webhookKey) {
    const signature = request.headers['x-twilio-email-event-webhook-signature'];
    const timestamp = request.headers['x-twilio-email-event-webhook-timestamp'];

    if (!signature || !timestamp) {
      console.warn('[SendGridWebhook] Missing signature headers');
      return reply.status(401).send({ error: 'Missing signature' });
    }

    const rawBody = JSON.stringify(request.body);
    const isValid = verifyWebhookSignature(webhookKey, rawBody, signature, timestamp);

    if (!isValid) {
      console.warn('[SendGridWebhook] Invalid signature');
      return reply.status(401).send({ error: 'Invalid signature' });
    }
  }

  // Process events asynchronously
  const events = request.body;
  
  if (!Array.isArray(events)) {
    return reply.status(400).send({ error: 'Invalid payload format' });
  }

  console.log('[SendGridWebhook] Received events:', events.length);

  // Process in background, respond immediately
  setImmediate(() => {
    processEvents(events).catch((error: unknown) => {
      console.error('[SendGridWebhook] Background processing error:', error);
    });
  });

  return reply.status(200).send({ received: true });
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export function registerSendGridWebhook(fastify: FastifyInstance): void {
  fastify.post('/webhooks/email/sendgrid', {
    config: {
      rawBody: true,
    },
    handler: sendGridWebhookHandler,
  });

  console.log('[SendGridWebhook] Registered POST /webhooks/email/sendgrid');
}

// ══════════════════════════════════════════════════════════════════════════════
// TRANSFORM TO CANONICAL EVENT
// ══════════════════════════════════════════════════════════════════════════════

export function transformToCanonicalEvent(event: SendGridEvent): EmailWebhookEvent {
  const eventTypeMap: Record<string, EmailWebhookEvent['eventType']> = {
    delivered: 'delivered',
    bounce: 'bounced',
    dropped: 'dropped',
    deferred: 'deferred',
    spamreport: 'complained',
    unsubscribe: 'unsubscribed',
    group_unsubscribe: 'unsubscribed',
    open: 'opened',
    click: 'clicked',
  };

  return {
    provider: 'sendgrid',
    eventType: eventTypeMap[event.event] || 'unknown',
    email: event.email,
    messageId: event.sg_message_id || '',
    timestamp: new Date(event.timestamp * 1000),
    rawEvent: event,
    metadata: {
      eventId: event.sg_event_id,
      category: event.category,
      userAgent: event.useragent,
      ip: event.ip,
      url: event.url,
      bounceType: event.type,
      bounceClassification: event.bounce_classification,
      reason: event.reason,
    },
  };
}
