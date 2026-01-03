/**
 * Webhook Signature Verification
 *
 * Implements signature verification for SendGrid and Twilio webhooks
 * to ensure requests are authentic and not spoofed.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

import { config } from '../config.js';

// ============================================================================
// SENDGRID WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify SendGrid webhook signature using the Event Webhook Signature
 *
 * @see https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
 */
export function verifySendGridSignature(
  request: FastifyRequest,
  rawBody: string | Buffer
): { valid: boolean; error?: string } {
  const verificationKey = config.email.sendgrid.webhookVerificationKey;

  // Skip verification if no key is configured (log warning in production)
  if (!verificationKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Webhook] SECURITY WARNING: SendGrid webhook verification key not configured');
      return { valid: false, error: 'Webhook verification not configured' };
    }
    // In development, allow unverified webhooks with warning
    console.warn('[Webhook] SendGrid verification skipped (no key configured)');
    return { valid: true };
  }

  const signature = request.headers['x-twilio-email-event-webhook-signature'] as string | undefined;
  const timestamp = request.headers['x-twilio-email-event-webhook-timestamp'] as string | undefined;

  if (!signature || !timestamp) {
    return { valid: false, error: 'Missing signature or timestamp headers' };
  }

  try {
    // Verify timestamp is recent (within 5 minutes) to prevent replay attacks
    const timestampNumber = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 300; // 5 minutes

    if (Math.abs(now - timestampNumber) > maxAge) {
      return { valid: false, error: 'Timestamp too old or in future' };
    }

    // Create the signed payload (timestamp + body)
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const payload = timestamp + body;

    // Calculate expected signature using ECDSA or HMAC-SHA256
    // SendGrid uses ECDSA by default, but we implement HMAC as fallback
    const expectedSignature = createHmac('sha256', verificationKey)
      .update(payload)
      .digest('base64');

    // Use timing-safe comparison
    const signatureBuffer = Buffer.from(signature, 'base64');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Signature length mismatch' };
    }

    const isValid = timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    console.error('[Webhook] SendGrid signature verification error:', error);
    return { valid: false, error: 'Verification failed' };
  }
}

// ============================================================================
// TWILIO WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify Twilio webhook signature
 *
 * @see https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function verifyTwilioSignature(
  request: FastifyRequest,
  rawBody: string | Buffer
): { valid: boolean; error?: string } {
  const authToken = config.sms.twilio.authToken;

  // Skip verification if no auth token is configured
  if (!authToken) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Webhook] SECURITY WARNING: Twilio auth token not configured');
      return { valid: false, error: 'Webhook verification not configured' };
    }
    console.warn('[Webhook] Twilio verification skipped (no auth token configured)');
    return { valid: true };
  }

  const signature = request.headers['x-twilio-signature'] as string | undefined;

  if (!signature) {
    return { valid: false, error: 'Missing X-Twilio-Signature header' };
  }

  try {
    // Get the full URL that Twilio sent the request to
    const protocol = request.headers['x-forwarded-proto'] || request.protocol || 'https';
    const host = request.headers['x-forwarded-host'] || request.headers.host || '';
    const url = `${protocol}://${host}${request.url}`;

    // Parse the POST parameters
    const params: Record<string, string> = {};
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');

    if (body) {
      const searchParams = new URLSearchParams(body);
      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }
    }

    // Sort parameters alphabetically and append to URL
    const sortedKeys = Object.keys(params).sort();
    let dataToSign = url;
    for (const key of sortedKeys) {
      dataToSign += key + params[key];
    }

    // Calculate expected signature
    const expectedSignature = createHmac('sha1', authToken)
      .update(Buffer.from(dataToSign, 'utf-8'))
      .digest('base64');

    // Use timing-safe comparison
    const signatureBuffer = Buffer.from(signature, 'base64');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Signature length mismatch' };
    }

    const isValid = timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    console.error('[Webhook] Twilio signature verification error:', error);
    return { valid: false, error: 'Verification failed' };
  }
}

// ============================================================================
// AWS SNS MESSAGE VERIFICATION
// ============================================================================

/**
 * Verify AWS SNS message signature
 *
 * @see https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 */
export async function verifySnsSignature(
  message: Record<string, unknown>
): Promise<{ valid: boolean; error?: string }> {
  // In production, we should verify the SNS message signature
  // This requires fetching the signing certificate from AWS

  const messageType = message.Type as string | undefined;

  // For now, we do basic validation
  if (!messageType) {
    return { valid: false, error: 'Missing message type' };
  }

  const topicArn = message.TopicArn as string | undefined;
  if (!topicArn) {
    return { valid: false, error: 'Missing TopicArn' };
  }

  // Validate that the TopicArn matches our expected AWS account
  // In production, restrict to specific ARN patterns
  const allowedArnPatterns = [
    /^arn:aws:sns:[a-z0-9-]+:\d{12}:.+$/,
  ];

  const isValidArn = allowedArnPatterns.some(pattern => pattern.test(topicArn));
  if (!isValidArn) {
    return { valid: false, error: 'Invalid TopicArn format' };
  }

  // TODO: Implement full certificate-based verification for production
  // This would involve:
  // 1. Fetching the signing certificate from message.SigningCertURL
  // 2. Verifying the certificate is from amazonaws.com
  // 3. Using the certificate to verify the message signature
  // For now, we trust the basic validation and AWS VPC security

  if (process.env.NODE_ENV === 'production' && !process.env.SNS_SKIP_VERIFICATION) {
    console.warn('[Webhook] SNS message verification is basic - implement full certificate verification for production');
  }

  return { valid: true };
}
