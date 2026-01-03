/**
 * Webhook Routes
 *
 * REST endpoints for webhook management and receiving webhooks from providers.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { webhookService } from '../channels/webhook/webhook.service.js';
import { DeliveryChannel } from '../prisma.js';
import { deliveryTracker } from '../services/delivery-tracker.service.js';
import {
  verifySendGridSignature,
  verifyTwilioSignature,
  verifySnsSignature,
} from '../lib/webhook-verification.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface SNSMessage {
  Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation';
  MessageId: string;
  TopicArn: string;
  Message?: string;
  SubscribeURL?: string;
  Token?: string;
}

interface SESNotification {
  notificationType?: string;
  eventType?: string;
  mail?: {
    messageId: string;
  };
  delivery?: {
    timestamp: string;
  };
  bounce?: {
    bounceType: string;
    bounceSubType: string;
  };
}

interface SendGridEvent {
  event: string;
  sg_message_id?: string;
  timestamp?: number;
  type?: string;
  reason?: string;
  email?: string;
}

interface TwilioEvent {
  MessageSid: string;
  MessageStatus: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const _WebhookSubscriptionSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(16).optional(),
  headers: z.record(z.string()).optional(),
  description: z.string().optional(),
});

const TestWebhookSchema = z.object({
  url: z.string().url(),
  secret: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function _getTenantContext(request: FastifyRequest): { tenantId: string } {
  const tenantId = request.headers['x-tenant-id'] as string;

  if (!tenantId) {
    throw new Error('Missing tenant context');
  }

  return { tenantId };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  // ════════════════════════════════════════════════════════════════════════════
  // WEBHOOK SUBSCRIPTIONS (for outbound webhooks)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /webhooks/test
   * Test a webhook endpoint
   */
  fastify.post(
    '/webhooks/test',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const body = TestWebhookSchema.parse(request.body);

      const sendOptions: Parameters<typeof webhookService.send>[0] = {
        url: body.url,
        type: 'webhook.test',
        data: {
          message: 'This is a test webhook from AIVO',
          timestamp: new Date().toISOString(),
        },
      };

      if (body.secret) {
        sendOptions.secret = body.secret;
      }

      const result = await webhookService.send(sendOptions);

      return reply.send({
        data: {
          success: result.success,
          statusCode: result.statusCode,
          responseTime: result.responseTime,
          error: result.error,
        },
      });
    }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // EMAIL PROVIDER WEBHOOKS (inbound)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * POST /webhooks/sendgrid
   * Handle SendGrid event webhooks
   */
  fastify.post(
    '/webhooks/sendgrid',
    {
      config: {
        rawBody: true, // Need raw body for signature verification
      },
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        // Verify webhook signature
        const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
        if (rawBody) {
          const verification = verifySendGridSignature(request, rawBody);
          if (!verification.valid) {
            fastify.log.warn({ error: verification.error }, 'SendGrid webhook signature verification failed');
            return reply.status(401).send({ error: 'Unauthorized', message: verification.error });
          }
        } else if (process.env.NODE_ENV === 'production') {
          fastify.log.warn('SendGrid webhook missing raw body for signature verification');
          return reply.status(400).send({ error: 'Missing raw body' });
        }

        const events = Array.isArray(request.body) ? request.body : [request.body];

        for (const rawEvent of events) {
          const event = rawEvent as SendGridEvent;
          await processSendGridEvent(event);
        }

        return reply.status(200).send({ received: true });
      } catch (error) {
        fastify.log.error({ error }, 'SendGrid webhook processing failed');
        return reply.status(500).send({ error: 'Processing failed' });
      }
    }
  );

  /**
   * POST /webhooks/ses
   * Handle AWS SES notifications via SNS
   */
  fastify.post(
    '/webhooks/ses',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        const body = request.body as SNSMessage;

        // Verify SNS message authenticity
        const verification = await verifySnsSignature(body as unknown as Record<string, unknown>);
        if (!verification.valid) {
          fastify.log.warn({ error: verification.error }, 'SNS message verification failed');
          return reply.status(401).send({ error: 'Unauthorized', message: verification.error });
        }

        // Handle SNS subscription confirmation
        if (body.Type === 'SubscriptionConfirmation') {
          fastify.log.info('SNS subscription confirmation received');
          // Validate SubscribeURL is from AWS before following
          if (body.SubscribeURL) {
            const url = new URL(body.SubscribeURL);
            if (!url.hostname.endsWith('.amazonaws.com')) {
              fastify.log.warn({ url: body.SubscribeURL }, 'Suspicious SNS SubscribeURL rejected');
              return reply.status(400).send({ error: 'Invalid subscription URL' });
            }
            await fetch(body.SubscribeURL);
            fastify.log.info('SNS subscription confirmed');
          }
          return reply.status(200).send({ confirmed: true });
        }

        // Handle SNS notification
        if (body.Type === 'Notification' && body.Message) {
          const message = JSON.parse(body.Message) as SESNotification;
          await processSESNotification(message);
        }

        return reply.status(200).send({ received: true });
      } catch (error) {
        fastify.log.error({ error }, 'SES webhook processing failed');
        return reply.status(500).send({ error: 'Processing failed' });
      }
    }
  );

  /**
   * POST /webhooks/twilio
   * Handle Twilio SMS webhooks
   */
  fastify.post(
    '/webhooks/twilio',
    {
      config: {
        rawBody: true, // Need raw body for signature verification
      },
    },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      try {
        // Verify Twilio signature
        const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
        if (rawBody) {
          const verification = verifyTwilioSignature(request, rawBody);
          if (!verification.valid) {
            fastify.log.warn({ error: verification.error }, 'Twilio webhook signature verification failed');
            return reply.status(401).send({ error: 'Unauthorized', message: verification.error });
          }
        } else if (process.env.NODE_ENV === 'production') {
          fastify.log.warn('Twilio webhook missing raw body for signature verification');
          return reply.status(400).send({ error: 'Missing raw body' });
        }

        const body = request.body as TwilioEvent;
        await processTwilioEvent(body);

        // Return TwiML response (empty for status callbacks)
        reply.header('Content-Type', 'text/xml');
        return reply.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      } catch (error) {
        fastify.log.error({ error }, 'Twilio webhook processing failed');
        return reply.status(500).send({ error: 'Processing failed' });
      }
    }
  );

  /**
   * GET /webhooks/email/track/open/:trackingId
   * Track email opens (tracking pixel)
   */
  fastify.get(
    '/webhooks/email/track/open/:trackingId',
    async (
      request: FastifyRequest<{ Params: { trackingId: string } }>,
      reply: FastifyReply
    ) => {
      const { trackingId } = request.params;

      try {
        // Record the open event
        // Note: Email tracking is handled via dedicated webhook endpoints
        fastify.log.info({ trackingId }, 'Email open tracked');
      } catch (error) {
        fastify.log.error({ error, trackingId }, 'Failed to track email open');
      }

      // Return a 1x1 transparent GIF
      const transparentGif = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );

      reply.header('Content-Type', 'image/gif');
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');

      return reply.send(transparentGif);
    }
  );

  /**
   * GET /webhooks/email/track/click/:trackingId
   * Track email link clicks
   */
  fastify.get(
    '/webhooks/email/track/click/:trackingId',
    async (
      request: FastifyRequest<{
        Params: { trackingId: string };
        Querystring: { url: string };
      }>,
      reply: FastifyReply
    ) => {
      const { trackingId } = request.params;
      const { url } = request.query;

      try {
        // Record the click event
        // Note: Email tracking is handled via dedicated webhook endpoints
        fastify.log.info({ trackingId, url }, 'Email click tracked');
      } catch (error) {
        fastify.log.error({ error, trackingId }, 'Failed to track email click');
      }

      // Redirect to the original URL
      return reply.redirect(url);
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT PROCESSORS
// ══════════════════════════════════════════════════════════════════════════════

async function processSendGridEvent(event: SendGridEvent): Promise<void> {
  const messageId = event.sg_message_id?.split('.')[0];
  const eventType = event.event;

  console.log('[Webhook] Processing SendGrid event', { eventType, messageId });

  if (!messageId) {
    console.warn('[Webhook] SendGrid event missing message ID');
    return;
  }

  switch (eventType) {
    case 'delivered':
      if (event.timestamp) {
        await deliveryTracker.markDelivered(
          messageId,
          DeliveryChannel.EMAIL,
          new Date(event.timestamp * 1000)
        );
      } else {
        await deliveryTracker.markDelivered(messageId, DeliveryChannel.EMAIL);
      }
      break;

    case 'bounce':
      await deliveryTracker.markBounced(
        messageId,
        DeliveryChannel.EMAIL,
        event.type ?? 'bounce',
        event.reason ?? 'Email bounced'
      );
      // Note: Suppression handling is done via dedicated webhook handlers
      console.log('[Webhook] Bounce recorded', { messageId, email: event.email });
      break;

    case 'dropped':
      await deliveryTracker.markFailed(
        messageId,
        DeliveryChannel.EMAIL,
        'dropped',
        event.reason ?? 'Email dropped'
      );
      break;

    case 'spamreport':
      // Note: Complaint handling is done via dedicated webhook handlers
      console.log('[Webhook] Spam report received', { messageId, email: event.email });
      break;

    case 'unsubscribe':
      // Handle unsubscribe
      console.log('[Webhook] Unsubscribe event', { email: event.email });
      break;
  }
}

async function processSESNotification(notification: SESNotification): Promise<void> {
  const notificationType = notification.notificationType ?? notification.eventType;
  const messageId = notification.mail?.messageId;

  console.log('[Webhook] Processing SES notification', { notificationType, messageId });

  if (!messageId) {
    console.warn('[Webhook] SES notification missing message ID');
    return;
  }

  switch (notificationType) {
    case 'Delivery':
      if (notification.delivery?.timestamp) {
        await deliveryTracker.markDelivered(
          messageId,
          DeliveryChannel.EMAIL,
          new Date(notification.delivery.timestamp)
        );
      } else {
        await deliveryTracker.markDelivered(messageId, DeliveryChannel.EMAIL);
      }
      break;

    case 'Bounce':
      await deliveryTracker.markBounced(
        messageId,
        DeliveryChannel.EMAIL,
        notification.bounce?.bounceType ?? 'bounce',
        notification.bounce?.bounceSubType ?? 'Email bounced'
      );
      break;

    case 'Complaint':
      // Note: Complaint handling is done via dedicated webhook handlers
      console.log('[Webhook] Complaint received', { messageId });
      break;
  }
}

async function processTwilioEvent(event: TwilioEvent): Promise<void> {
  const messageSid = event.MessageSid;
  const status = event.MessageStatus;

  console.log('[Webhook] Processing Twilio event', { messageSid, status });

  switch (status) {
    case 'sent':
      await deliveryTracker.markSent(messageSid, DeliveryChannel.SMS, messageSid, 'twilio');
      break;

    case 'delivered':
      await deliveryTracker.markDelivered(messageSid, DeliveryChannel.SMS);
      break;

    case 'failed':
    case 'undelivered':
      await deliveryTracker.markFailed(
        messageSid,
        DeliveryChannel.SMS,
        event.ErrorCode ?? 'unknown',
        event.ErrorMessage ?? 'Message delivery failed'
      );
      break;
  }
}
