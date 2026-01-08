/**
 * AWS SES Webhook Handler
 *
 * Handles AWS SES notifications via SNS:
 * - Bounce notifications
 * - Complaint notifications
 * - Delivery notifications
 * - SNS message signature verification
 */

import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import https from 'node:https';

import type { EmailWebhookEvent, SuppressionReason } from '../types.js';
import { emailService } from '../email.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface SNSMessage {
  Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation';
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  UnsubscribeURL?: string;
  SubscribeURL?: string;
  Token?: string;
}

interface SESNotification {
  notificationType: 'Bounce' | 'Complaint' | 'Delivery';
  mail: {
    timestamp: string;
    messageId: string;
    source: string;
    sourceArn: string;
    destination: string[];
    headersTruncated: boolean;
    headers?: Array<{ name: string; value: string }>;
    commonHeaders?: {
      from: string[];
      to: string[];
      subject: string;
    };
  };
  bounce?: SESBounce;
  complaint?: SESComplaint;
  delivery?: SESDelivery;
}

interface SESBounce {
  bounceType: 'Permanent' | 'Transient' | 'Undetermined';
  bounceSubType: string;
  bouncedRecipients: Array<{
    emailAddress: string;
    action?: string;
    status?: string;
    diagnosticCode?: string;
  }>;
  timestamp: string;
  feedbackId: string;
  remoteMtaIp?: string;
  reportingMTA?: string;
}

interface SESComplaint {
  complainedRecipients: Array<{
    emailAddress: string;
  }>;
  timestamp: string;
  feedbackId: string;
  complaintFeedbackType?: string;
  userAgent?: string;
  complaintSubType?: string;
  arrivalDate?: string;
}

interface SESDelivery {
  timestamp: string;
  processingTimeMillis: number;
  recipients: string[];
  smtpResponse: string;
  remoteMtaIp: string;
  reportingMTA: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SNS SIGNATURE VERIFICATION
// ══════════════════════════════════════════════════════════════════════════════

const certCache = new Map<string, string>();

async function fetchCertificate(url: string): Promise<string> {
  // Validate URL is from AWS
  const parsed = new URL(url);
  if (!parsed.hostname.endsWith('.amazonaws.com')) {
    throw new Error('Invalid certificate URL');
  }

  // Check cache
  const cached = certCache.get(url);
  if (cached) {
    return cached;
  }

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        certCache.set(url, data);
        resolve(data);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function buildSignatureString(message: SNSMessage): string {
  let fields: string[];

  if (message.Type === 'Notification') {
    fields = [
      'Message', message.Message,
      'MessageId', message.MessageId,
      ...(message.Subject ? ['Subject', message.Subject] : []),
      'Timestamp', message.Timestamp,
      'TopicArn', message.TopicArn,
      'Type', message.Type,
    ];
  } else {
    // SubscriptionConfirmation or UnsubscribeConfirmation
    fields = [
      'Message', message.Message,
      'MessageId', message.MessageId,
      'SubscribeURL', message.SubscribeURL || '',
      'Timestamp', message.Timestamp,
      'Token', message.Token || '',
      'TopicArn', message.TopicArn,
      'Type', message.Type,
    ];
  }

  return fields.join('\n') + '\n';
}

async function verifySNSSignature(message: SNSMessage): Promise<boolean> {
  try {
    const cert = await fetchCertificate(message.SigningCertURL);
    const signatureString = buildSignatureString(message);

    // NOSONAR - SHA1 is the algorithm name, not a password. AWS SES requires SHA1 for SNS signature verification.
    const verifier = crypto.createVerify('SHA1'); // NOSONAR
    verifier.update(signatureString, 'utf8');

    return verifier.verify(cert, message.Signature, 'base64');
  } catch (error) {
    console.error('[SESWebhook] Signature verification failed:', error);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

async function handleBounce(notification: SESNotification): Promise<void> {
  const bounce = notification.bounce;
  
  console.log('[SESWebhook] Bounce notification:', {
    type: bounce.bounceType,
    subType: bounce.bounceSubType,
    recipients: bounce.bouncedRecipients.map((r) => r.emailAddress),
    feedbackId: bounce.feedbackId,
  });

  // Only suppress for permanent bounces
  if (bounce.bounceType === 'Permanent') {
    for (const recipient of bounce.bouncedRecipients) {
      await emailService.addToSuppressionList(
        recipient.emailAddress,
        'hard_bounce' as SuppressionReason,
        'ses_webhook'
      );
    }
  }
}

async function handleComplaint(notification: SESNotification): Promise<void> {
  const complaint = notification.complaint;

  console.log('[SESWebhook] Complaint notification:', {
    type: complaint.complaintFeedbackType,
    recipients: complaint.complainedRecipients.map((r) => r.emailAddress),
    feedbackId: complaint.feedbackId,
  });

  // Always suppress for complaints
  for (const recipient of complaint.complainedRecipients) {
    await emailService.addToSuppressionList(
      recipient.emailAddress,
      'spam_complaint' as SuppressionReason,
      'ses_webhook'
    );
  }
}

async function handleDelivery(notification: SESNotification): Promise<void> {
  const delivery = notification.delivery;

  console.log('[SESWebhook] Delivery notification:', {
    recipients: delivery.recipients,
    smtpResponse: delivery.smtpResponse,
    processingTime: delivery.processingTimeMillis,
  });

  // Update email log status in database if needed
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION CONFIRMATION
// ══════════════════════════════════════════════════════════════════════════════

async function confirmSubscription(subscribeUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(subscribeUrl, (res) => {
      let _data = '';
      res.on('data', (chunk) => { _data += chunk; });
      res.on('end', () => {
        console.log('[SESWebhook] Subscription confirmed');
        resolve();
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY ROUTE HANDLER
// ══════════════════════════════════════════════════════════════════════════════

interface WebhookRequest extends FastifyRequest {
  body: SNSMessage | string;
}

export async function sesWebhookHandler(
  request: WebhookRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Parse body if it's a string (SNS sends as text/plain)
    let message: SNSMessage;
    if (typeof request.body === 'string') {
      message = JSON.parse(request.body);
    } else {
      message = request.body;
    }

    // Verify SNS signature
    const isValid = await verifySNSSignature(message);
    if (!isValid) {
      console.warn('[SESWebhook] Invalid signature');
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    // Handle subscription confirmation
    if (message.Type === 'SubscriptionConfirmation') {
      console.log('[SESWebhook] Confirming subscription...');
      if (message.SubscribeURL) {
        await confirmSubscription(message.SubscribeURL);
      }
      return reply.status(200).send({ confirmed: true });
    }

    // Handle unsubscribe confirmation
    if (message.Type === 'UnsubscribeConfirmation') {
      console.log('[SESWebhook] Unsubscribe confirmation received');
      return reply.status(200).send({ received: true });
    }

    // Handle notification
    if (message.Type === 'Notification') {
      const notification: SESNotification = JSON.parse(message.Message);

      console.log('[SESWebhook] Received notification:', notification.notificationType);

      // Process in background
      setImmediate(async () => {
        try {
          switch (notification.notificationType) {
            case 'Bounce':
              await handleBounce(notification);
              break;
            case 'Complaint':
              await handleComplaint(notification);
              break;
            case 'Delivery':
              await handleDelivery(notification);
              break;
            default:
              console.log('[SESWebhook] Unknown notification type:', notification.notificationType);
          }
        } catch (error) {
          console.error('[SESWebhook] Error processing notification:', error);
        }
      });
    }

    return reply.status(200).send({ received: true });
  } catch (error) {
    console.error('[SESWebhook] Handler error:', error);
    return reply.status(400).send({ error: 'Invalid message format' });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export function registerSESWebhook(fastify: FastifyInstance): void {
  fastify.post('/webhooks/email/ses', {
    config: {
      rawBody: true,
    },
    handler: sesWebhookHandler,
  });

  console.log('[SESWebhook] Registered POST /webhooks/email/ses');
}

// ══════════════════════════════════════════════════════════════════════════════
// TRANSFORM TO CANONICAL EVENT
// ══════════════════════════════════════════════════════════════════════════════

export function transformToCanonicalEvent(notification: SESNotification): EmailWebhookEvent[] {
  const events: EmailWebhookEvent[] = [];
  const baseEvent = {
    provider: 'ses' as const,
    messageId: notification.mail.messageId,
    rawEvent: notification,
  };

  switch (notification.notificationType) {
    case 'Bounce':
      if (notification.bounce) {
        for (const recipient of notification.bounce.bouncedRecipients) {
          events.push({
            ...baseEvent,
            eventType: notification.bounce.bounceType === 'Permanent' ? 'bounced' : 'deferred',
            email: recipient.emailAddress,
            timestamp: new Date(notification.bounce.timestamp),
            metadata: {
              bounceType: notification.bounce.bounceType,
              bounceSubType: notification.bounce.bounceSubType,
              diagnosticCode: recipient.diagnosticCode,
              feedbackId: notification.bounce.feedbackId,
            },
          });
        }
      }
      break;

    case 'Complaint':
      if (notification.complaint) {
        for (const recipient of notification.complaint.complainedRecipients) {
          events.push({
            ...baseEvent,
            eventType: 'complained',
            email: recipient.emailAddress,
            timestamp: new Date(notification.complaint.timestamp),
            metadata: {
              complaintType: notification.complaint.complaintFeedbackType,
              feedbackId: notification.complaint.feedbackId,
              userAgent: notification.complaint.userAgent,
            },
          });
        }
      }
      break;

    case 'Delivery':
      if (notification.delivery) {
        for (const recipient of notification.delivery.recipients) {
          events.push({
            ...baseEvent,
            eventType: 'delivered',
            email: recipient,
            timestamp: new Date(notification.delivery.timestamp),
            metadata: {
              smtpResponse: notification.delivery.smtpResponse,
              processingTimeMs: notification.delivery.processingTimeMillis,
            },
          });
        }
      }
      break;
  }

  return events;
}
