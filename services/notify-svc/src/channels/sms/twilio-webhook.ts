/**
 * Twilio SMS Webhook Handler
 *
 * Handles incoming webhooks from Twilio:
 * - Delivery status callbacks (sent, delivered, failed, undelivered)
 * - Inbound SMS messages (STOP, HELP keywords)
 * - Webhook signature validation
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import Twilio from 'twilio';

import { config } from '../../config.js';
import { smsConsentService } from './sms-consent.js';
import { renderSmsTemplate } from './sms-templates.js';
import { twilioProvider } from './twilio.js';
import type { TwilioStatusCallback, TwilioInboundSms, SmsWebhookEvent } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface WebhookContext {
  prisma: PrismaClient;
}

interface StatusCallbackBody {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  AccountSid: string;
  ApiVersion: string;
  SmsSid?: string;
  SmsStatus?: string;
  RawDlrDoneDate?: string;
  NumSegments?: string;
  Price?: string;
  PriceUnit?: string;
}

interface InboundSmsBody {
  MessageSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK SIGNATURE VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate Twilio webhook signature
 */
function validateTwilioSignature(
  signature: string | undefined,
  url: string,
  params: Record<string, string>
): boolean {
  if (!config.sms.twilio?.authToken) {
    console.warn('[TwilioWebhook] No auth token configured for signature validation');
    return false;
  }

  if (!signature) {
    console.warn('[TwilioWebhook] No X-Twilio-Signature header');
    return false;
  }

  try {
    return Twilio.validateRequest(
      config.sms.twilio.authToken,
      signature,
      url,
      params
    );
  } catch (error) {
    console.error('[TwilioWebhook] Signature validation error:', error);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STATUS CALLBACK HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Process delivery status callback
 */
async function handleStatusCallback(
  body: StatusCallbackBody,
  context: WebhookContext
): Promise<void> {
  const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage, Price, PriceUnit, NumSegments } = body;

  console.log('[TwilioWebhook] Status callback:', {
    messageSid: MessageSid,
    status: MessageStatus,
    to: maskPhone(To),
    errorCode: ErrorCode,
  });

  // Map Twilio status to our status
  const status = mapTwilioStatus(MessageStatus);

  try {
    // Update SMS log in database
    const updated = await context.prisma.smsLog.updateMany({
      where: { messageId: MessageSid },
      data: {
        status,
        errorCode: ErrorCode,
        errorMessage: ErrorMessage,
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
        failedAt: status === 'FAILED' || status === 'UNDELIVERED' ? new Date() : undefined,
        price: Price ? parseFloat(Price) : undefined,
        priceCurrency: PriceUnit,
        segments: NumSegments ? parseInt(NumSegments, 10) : undefined,
        updatedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      console.warn('[TwilioWebhook] No SMS log found for message:', MessageSid);
    }

    // Emit webhook event
    await emitWebhookEvent({
      type: 'sms.status',
      messageId: MessageSid,
      status,
      to: To,
      errorCode: ErrorCode,
      timestamp: new Date(),
    });

    // Handle permanent failures - mark number as problematic
    if (status === 'UNDELIVERED' && ErrorCode) {
      await handleDeliveryFailure(To, ErrorCode, context);
    }
  } catch (error) {
    console.error('[TwilioWebhook] Failed to process status callback:', error);
    throw error;
  }
}

/**
 * Handle delivery failures (invalid numbers, blocked, etc.)
 */
async function handleDeliveryFailure(
  phoneNumber: string,
  errorCode: string,
  context: WebhookContext
): Promise<void> {
  // Twilio error codes for permanently unreachable numbers
  const permanentFailureCodes = [
    '30003', // Unreachable destination handset
    '30004', // Message blocked
    '30005', // Unknown destination handset
    '30006', // Landline or unreachable carrier
    '30007', // Carrier violation
    '21211', // Invalid phone number
    '21614', // Invalid mobile number
  ];

  if (permanentFailureCodes.includes(errorCode)) {
    console.warn('[TwilioWebhook] Permanent delivery failure:', {
      phone: maskPhone(phoneNumber),
      errorCode,
    });

    // Could mark this number as invalid in the database
    // to prevent future sending attempts
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INBOUND SMS HANDLER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Process inbound SMS message
 */
async function handleInboundSms(
  body: InboundSmsBody,
  context: WebhookContext
): Promise<string | null> {
  const { MessageSid, From, To, Body } = body;

  console.log('[TwilioWebhook] Inbound SMS:', {
    messageSid: MessageSid,
    from: maskPhone(From),
    body: Body.substring(0, 20) + (Body.length > 20 ? '...' : ''),
  });

  // Normalize body for keyword matching
  const normalizedBody = Body.trim().toUpperCase();

  // Check for STOP keywords
  const stopKeywords = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
  if (stopKeywords.includes(normalizedBody)) {
    return await handleStopKeyword(From, context);
  }

  // Check for HELP keywords
  const helpKeywords = ['HELP', 'INFO'];
  if (helpKeywords.includes(normalizedBody)) {
    return handleHelpKeyword();
  }

  // Log inbound message
  await logInboundSms(body, context);

  // Emit webhook event
  await emitWebhookEvent({
    type: 'sms.inbound',
    messageId: MessageSid,
    from: From,
    to: To,
    body: Body,
    timestamp: new Date(),
  });

  // No automatic reply for non-keyword messages
  return null;
}

/**
 * Handle STOP keyword - opt out user
 */
async function handleStopKeyword(
  phoneNumber: string,
  context: WebhookContext
): Promise<string> {
  console.log('[TwilioWebhook] Processing STOP request:', maskPhone(phoneNumber));

  try {
    // Revoke all consents for this phone number
    await smsConsentService.revokeAllConsent(phoneNumber, 'sms_keyword');
  } catch (error) {
    console.error('[TwilioWebhook] Failed to revoke consent:', error);
  }

  // Required CTIA-compliant response
  return 'You have been unsubscribed from Aivo SMS. No more messages will be sent. Reply START to resubscribe.';
}

/**
 * Handle HELP keyword - provide information
 */
function handleHelpKeyword(): string {
  return renderSmsTemplate('help-response', {});
}

/**
 * Log inbound SMS to database
 */
async function logInboundSms(
  body: InboundSmsBody,
  context: WebhookContext
): Promise<void> {
  try {
    await context.prisma.smsLog.create({
      data: {
        tenantId: 'SYSTEM',
        toPhone: body.To,
        fromPhone: body.From,
        body: body.Body,
        type: 'INBOUND',
        status: 'RECEIVED',
        messageId: body.MessageSid,
        provider: 'twilio',
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[TwilioWebhook] Failed to log inbound SMS:', error);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function mapTwilioStatus(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    queued: 'QUEUED',
    sending: 'SENDING',
    sent: 'SENT',
    delivered: 'DELIVERED',
    undelivered: 'UNDELIVERED',
    failed: 'FAILED',
    received: 'RECEIVED',
    read: 'READ',
  };

  return statusMap[twilioStatus.toLowerCase()] || 'UNKNOWN';
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
}

async function emitWebhookEvent(event: SmsWebhookEvent): Promise<void> {
  // Emit to internal event system (NATS, etc.)
  console.log('[TwilioWebhook] Event:', event.type, event.messageId);
}

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY ROUTE REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

export interface TwilioWebhookPluginOptions {
  prisma: PrismaClient;
  validateSignature?: boolean;
  webhookUrl?: string;
}

/**
 * Register Twilio SMS webhook routes
 */
export async function registerTwilioWebhooks(
  fastify: FastifyInstance,
  options: TwilioWebhookPluginOptions
): Promise<void> {
  const { prisma, validateSignature = true, webhookUrl } = options;
  const context: WebhookContext = { prisma };

  // Get base URL for signature validation
  const baseUrl = webhookUrl || config.sms.webhookUrl || '';

  /**
   * Status callback webhook
   * POST /webhooks/sms/status
   */
  fastify.post<{ Body: StatusCallbackBody }>(
    '/webhooks/sms/status',
    {
      config: {
        rawBody: true, // Needed for signature validation
      },
    },
    async (request: FastifyRequest<{ Body: StatusCallbackBody }>, reply: FastifyReply) => {
      try {
        // Validate signature in production
        if (validateSignature && config.env === 'production') {
          const signature = request.headers['x-twilio-signature'] as string;
          const url = `${baseUrl}/webhooks/sms/status`;
          const isValid = validateTwilioSignature(
            signature,
            url,
            request.body as unknown as Record<string, string>
          );

          if (!isValid) {
            console.warn('[TwilioWebhook] Invalid signature for status callback');
            return reply.status(403).send({ error: 'Invalid signature' });
          }
        }

        await handleStatusCallback(request.body, context);

        // Twilio expects 200 response with no body
        return reply.status(200).send();
      } catch (error) {
        console.error('[TwilioWebhook] Status callback error:', error);
        // Still return 200 to prevent Twilio retries
        return reply.status(200).send();
      }
    }
  );

  /**
   * Inbound SMS webhook
   * POST /webhooks/sms/inbound
   */
  fastify.post<{ Body: InboundSmsBody }>(
    '/webhooks/sms/inbound',
    {
      config: {
        rawBody: true,
      },
    },
    async (request: FastifyRequest<{ Body: InboundSmsBody }>, reply: FastifyReply) => {
      try {
        // Validate signature in production
        if (validateSignature && config.env === 'production') {
          const signature = request.headers['x-twilio-signature'] as string;
          const url = `${baseUrl}/webhooks/sms/inbound`;
          const isValid = validateTwilioSignature(
            signature,
            url,
            request.body as unknown as Record<string, string>
          );

          if (!isValid) {
            console.warn('[TwilioWebhook] Invalid signature for inbound SMS');
            return reply.status(403).send({ error: 'Invalid signature' });
          }
        }

        const responseMessage = await handleInboundSms(request.body, context);

        // If we have a response (STOP, HELP), send TwiML
        if (responseMessage) {
          reply.header('Content-Type', 'text/xml');
          return reply.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(responseMessage)}</Message>
</Response>`);
        }

        // No response needed
        reply.header('Content-Type', 'text/xml');
        return reply.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      } catch (error) {
        console.error('[TwilioWebhook] Inbound SMS error:', error);
        reply.header('Content-Type', 'text/xml');
        return reply.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }
    }
  );

  /**
   * Fallback webhook (handles any unmatched Twilio callbacks)
   * POST /webhooks/sms/fallback
   */
  fastify.post('/webhooks/sms/fallback', async (request, reply) => {
    console.warn('[TwilioWebhook] Fallback webhook triggered:', request.body);
    return reply.status(200).send();
  });

  console.log('[TwilioWebhook] Registered webhook routes at /webhooks/sms/*');
}

/**
 * Escape XML special characters for TwiML
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export {
  handleStatusCallback,
  handleInboundSms,
  validateTwilioSignature,
  mapTwilioStatus,
};
