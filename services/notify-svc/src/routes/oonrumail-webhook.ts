/**
 * OonruMail Webhook Route
 *
 * Receives delivery events from OonruMail (delivered, bounced, opened,
 * clicked, unsubscribed, spam_report), verifies signatures via HMAC-SHA256,
 * and updates the platform's suppression list, delivery tracking, and
 * engagement analytics.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  verifyAndParseWebhook,
  AivoWebhookHandler,
} from '@enterprise-email/aivolearning-email/webhooks';

import { config } from '../config.js';
import { prisma, SuppressionReason, EmailStatus } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export async function registerOonruMailWebhookRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // ── Event handler ────────────────────────────────────────────────────────

  const handler = new AivoWebhookHandler({
    // ─── delivered ─────────────────────────────────────────────────────────
    delivered: async (event) => {
      fastify.log.info(
        { recipient: event.recipient, messageId: event.messageId },
        'Email delivered',
      );

      await prisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: {
          status: EmailStatus.DELIVERED,
          deliveredAt: new Date(event.timestamp),
        },
      });
    },

    // ─── bounced ───────────────────────────────────────────────────────────
    bounced: async (event) => {
      fastify.log.warn(
        { recipient: event.recipient, bounceType: event.bounceType },
        'Email bounced',
      );

      const isHardBounce = event.bounceType === 'hard';

      // Add / update suppression list
      await prisma.emailSuppression.upsert({
        where: { email: event.recipient },
        update: {
          reason: isHardBounce
            ? SuppressionReason.HARD_BOUNCE
            : SuppressionReason.SOFT_BOUNCE,
          bounceCount: { increment: 1 },
          bounceType: event.bounceType ?? null,
          diagnosticCode: event.bounceReason ?? null,
          updatedAt: new Date(),
        },
        create: {
          email: event.recipient,
          reason: isHardBounce
            ? SuppressionReason.HARD_BOUNCE
            : SuppressionReason.SOFT_BOUNCE,
          source: 'oonrumail_webhook',
          bounceCount: 1,
          bounceType: event.bounceType ?? null,
          diagnosticCode: event.bounceReason ?? null,
        },
      });

      // Update delivery status
      await prisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: {
          status: EmailStatus.BOUNCED,
          bouncedAt: new Date(event.timestamp),
          errorCode: event.bounceType ?? 'bounce',
          errorMessage: event.bounceReason ?? 'Email bounced',
        },
      });

      // Sync hard bounces to OonruMail's server-side suppression list
      if (isHardBounce) {
        try {
          const { default: AivolearningEmail } = await import(
            '@enterprise-email/aivolearning-email'
          );
          const client = new AivolearningEmail({
            apiKey: config.email.oonrumail.apiKey,
          });
          // Sync hard bounce to OonruMail's server-side suppression list
          await client.sdk.suppressions.create({
            email: event.recipient,
            reason: 'hard_bounce',
          });
        } catch (err) {
          fastify.log.error(
            { error: err },
            'Failed to sync hard-bounce suppression to OonruMail',
          );
        }
      }
    },

    // ─── opened ────────────────────────────────────────────────────────────
    opened: async (event) => {
      fastify.log.debug(
        { recipient: event.recipient, messageId: event.messageId },
        'Email opened',
      );

      await prisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: {
          status: EmailStatus.OPENED,
          openedAt: new Date(event.timestamp),
          openCount: { increment: 1 },
        },
      });
    },

    // ─── clicked ───────────────────────────────────────────────────────────
    clicked: async (event) => {
      fastify.log.info(
        { recipient: event.recipient, url: event.url },
        'Email link clicked',
      );

      await prisma.emailClick.create({
        data: {
          messageId: event.messageId,
          email: event.recipient,
          url: event.url ?? '',
          clickedAt: new Date(event.timestamp),
        },
      });

      // Also update the email log
      await prisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: {
          status: EmailStatus.CLICKED,
          clickedAt: new Date(event.timestamp),
        },
      });
    },

    // ─── unsubscribed ──────────────────────────────────────────────────────
    unsubscribed: async (event) => {
      fastify.log.info(
        { recipient: event.recipient },
        'User unsubscribed via email',
      );

      // Add to local suppression list
      await prisma.emailSuppression.upsert({
        where: { email: event.recipient },
        update: {
          reason: SuppressionReason.UNSUBSCRIBED,
          updatedAt: new Date(),
        },
        create: {
          email: event.recipient,
          reason: SuppressionReason.UNSUBSCRIBED,
          source: 'oonrumail_webhook',
        },
      });

      // Update user email preferences (opt-out)
      await prisma.emailPreference.updateMany({
        where: { emailEnabled: true }, // only where currently enabled
        data: { emailEnabled: false },
      });

      // Update delivery status
      await prisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: { status: EmailStatus.UNSUBSCRIBED },
      });
    },

    // ─── spam_report ───────────────────────────────────────────────────────
    spam_report: async (event) => {
      fastify.log.error(
        { recipient: event.recipient },
        'Spam report received — suppressing immediately',
      );

      await prisma.emailSuppression.upsert({
        where: { email: event.recipient },
        update: {
          reason: SuppressionReason.SPAM_COMPLAINT,
          spamReported: true,
          updatedAt: new Date(),
        },
        create: {
          email: event.recipient,
          reason: SuppressionReason.SPAM_COMPLAINT,
          source: 'oonrumail_webhook',
          spamReported: true,
        },
      });

      // Update delivery status
      await prisma.emailLog.updateMany({
        where: { messageId: event.messageId },
        data: { status: EmailStatus.COMPLAINED },
      });
    },
  });

  // ── Raw body content-type parser ───────────────────────────────────────
  // We need the raw string body for HMAC signature verification,
  // so parse application/json as a string within this plugin scope.
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req: FastifyRequest, body: string, done: (err: Error | null, result?: unknown) => void) => {
      try {
        done(null, body);
      } catch (err) {
        done(err as Error);
      }
    },
  );

  // ── POST /webhooks/oonrumail ────────────────────────────────────────────
  fastify.post(
    '/webhooks/oonrumail',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawBody = request.body as string;
      const signature =
        (request.headers['x-webhook-signature'] as string) ?? '';

      // Verify signature
      const event = verifyAndParseWebhook(
        rawBody,
        signature,
        config.email.oonrumail.webhookSecret,
      );

      if (!event) {
        fastify.log.warn('OonruMail webhook signature verification failed');
        return reply.status(401).send({ error: 'Invalid signature' });
      }

      // Log raw event for audit / replay
      try {
        await prisma.emailWebhookEvent.create({
          data: {
            provider: 'OONRUMAIL',
            eventId: event.eventId,
            eventType: event.eventType,
            email: event.recipient,
            messageId: event.messageId,
            timestamp: new Date(event.timestamp),
            rawPayload: JSON.parse(rawBody) as object,
            processedAt: new Date(),
          },
        });
      } catch (logErr) {
        // Non-fatal — don't block processing
        fastify.log.warn({ error: logErr }, 'Failed to log webhook event');
      }

      // Dispatch to typed handler — always return 200 to prevent retries
      try {
        await handler.handle(event);
        return reply.status(200).send({ received: true });
      } catch (err) {
        fastify.log.error(
          { error: err },
          'Error processing OonruMail webhook event',
        );
        return reply
          .status(200)
          .send({ received: true, error: 'Processing error' });
      }
    },
  );
}
