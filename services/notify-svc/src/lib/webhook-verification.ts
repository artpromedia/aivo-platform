/**
 * Webhook Signature Verification
 *
 * Implements signature verification for SendGrid and Twilio webhooks
 * to ensure requests are authentic and not spoofed.
 */

import { createHmac, createVerify, timingSafeEqual, X509Certificate } from 'node:crypto';
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

  // Require verification key - reject if not configured
  if (!verificationKey) {
    console.warn('[Webhook] SECURITY WARNING: SendGrid webhook verification key not configured');
    // Only allow bypass in development with explicit env var
    if (process.env.NODE_ENV !== 'production' && process.env.SKIP_WEBHOOK_VERIFICATION === 'true') {
      console.warn('[Webhook] SendGrid verification BYPASSED (SKIP_WEBHOOK_VERIFICATION=true)');
      return { valid: true };
    }
    return { valid: false, error: 'Webhook verification not configured' };
  }

  const signature = request.headers['x-twilio-email-event-webhook-signature'] as string | undefined;
  const timestamp = request.headers['x-twilio-email-event-webhook-timestamp'] as string | undefined;

  if (!signature || !timestamp) {
    return { valid: false, error: 'Missing signature or timestamp headers' };
  }

  try {
    // Verify timestamp is recent (within 5 minutes) to prevent replay attacks
    const timestampNumber = Number.parseInt(timestamp, 10);
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

  // Require auth token - reject if not configured
  if (!authToken) {
    console.warn('[Webhook] SECURITY WARNING: Twilio auth token not configured');
    // Only allow bypass in development with explicit env var
    if (process.env.NODE_ENV !== 'production' && process.env.SKIP_WEBHOOK_VERIFICATION === 'true') {
      console.warn('[Webhook] Twilio verification BYPASSED (SKIP_WEBHOOK_VERIFICATION=true)');
      return { valid: true };
    }
    return { valid: false, error: 'Webhook verification not configured' };
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

// Certificate cache to avoid repeated fetches
const certificateCache: Map<string, { cert: string; fetchedAt: number }> = new Map();
const CERT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch and cache SNS signing certificate
 */
async function fetchSigningCertificate(certUrl: string): Promise<string> {
  // Check cache first
  const cached = certificateCache.get(certUrl);
  if (cached && Date.now() - cached.fetchedAt < CERT_CACHE_TTL) {
    return cached.cert;
  }

  const response = await fetch(certUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch certificate: ${response.status}`);
  }

  const cert = await response.text();

  // Cache the certificate
  certificateCache.set(certUrl, { cert, fetchedAt: Date.now() });

  return cert;
}

/**
 * Build the string to sign for SNS message verification
 * Order of fields matters and is different for Notification vs SubscriptionConfirmation
 */
function buildSigningString(message: Record<string, unknown>): string {
  const messageType = message.Type as string;
  const fields: string[] = [];

  if (messageType === 'Notification') {
    // Notification message signing string
    fields.push('Message', message.Message as string);
    if (message.MessageId) fields.push('MessageId', message.MessageId as string);
    if (message.Subject) fields.push('Subject', message.Subject as string);
    fields.push('Timestamp', message.Timestamp as string);
    fields.push('TopicArn', message.TopicArn as string);
    fields.push('Type', messageType);
  } else {
    // SubscriptionConfirmation or UnsubscribeConfirmation
    fields.push('Message', message.Message as string);
    fields.push('MessageId', message.MessageId as string);
    fields.push('SubscribeURL', message.SubscribeURL as string);
    fields.push('Timestamp', message.Timestamp as string);
    fields.push('Token', message.Token as string);
    fields.push('TopicArn', message.TopicArn as string);
    fields.push('Type', messageType);
  }

  // Build string with key\nvalue\n format
  let signingString = '';
  for (let i = 0; i < fields.length; i += 2) {
    signingString += `${fields[i]}\n${fields[i + 1]}\n`;
  }

  return signingString;
}

/**
 * Verify AWS SNS message signature
 *
 * Implements full certificate-based verification per AWS documentation:
 * 1. Validates SigningCertURL is from amazonaws.com
 * 2. Fetches and caches the signing certificate
 * 3. Verifies the certificate is valid
 * 4. Verifies the message signature using the certificate
 *
 * @see https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 */
export async function verifySnsSignature(
  message: Record<string, unknown>
): Promise<{ valid: boolean; error?: string }> {
  const messageType = message.Type as string | undefined;

  if (!messageType) {
    return { valid: false, error: 'Missing message type' };
  }

  const topicArn = message.TopicArn as string | undefined;
  if (!topicArn) {
    return { valid: false, error: 'Missing TopicArn' };
  }

  // Validate TopicArn format
  const allowedArnPatterns = [/^arn:aws:sns:[a-z0-9-]+:\d{12}:.+$/];
  const isValidArn = allowedArnPatterns.some((pattern) => pattern.test(topicArn));
  if (!isValidArn) {
    return { valid: false, error: 'Invalid TopicArn format' };
  }

  // Skip full verification in development or if explicitly disabled
  if (process.env.NODE_ENV !== 'production' || process.env.SNS_SKIP_VERIFICATION === 'true') {
    console.log('[Webhook] SNS verification skipped (non-production or explicitly disabled)');
    return { valid: true };
  }

  // Get signing certificate URL
  const signingCertUrl = message.SigningCertURL as string | undefined;
  if (!signingCertUrl) {
    return { valid: false, error: 'Missing SigningCertURL' };
  }

  // Validate certificate URL is from Amazon
  try {
    const certUrlParsed = new URL(signingCertUrl);
    if (
      !certUrlParsed.hostname.endsWith('.amazonaws.com') ||
      certUrlParsed.protocol !== 'https:'
    ) {
      return { valid: false, error: 'SigningCertURL must be from amazonaws.com over HTTPS' };
    }
  } catch {
    return { valid: false, error: 'Invalid SigningCertURL format' };
  }

  // Get signature
  const signature = message.Signature as string | undefined;
  if (!signature) {
    return { valid: false, error: 'Missing Signature' };
  }

  try {
    // Fetch the signing certificate
    const certPem = await fetchSigningCertificate(signingCertUrl);

    // Validate certificate
    const cert = new X509Certificate(certPem);

    // Check certificate is from Amazon
    if (!cert.subject.includes('CN=sns.amazonaws.com')) {
      return { valid: false, error: 'Certificate is not from SNS' };
    }

    // Check certificate is not expired
    const now = new Date();
    if (now < new Date(cert.validFrom) || now > new Date(cert.validTo)) {
      return { valid: false, error: 'Certificate has expired' };
    }

    // Build the signing string
    const signingString = buildSigningString(message);

    // Determine signature version and algorithm
    const signatureVersion = message.SignatureVersion as string;
    const algorithm = signatureVersion === '2' ? 'sha256' : 'sha1';

    // Verify signature
    const verifier = createVerify(algorithm);
    verifier.update(signingString);
    const isValid = verifier.verify(certPem, signature, 'base64');

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    console.error('[Webhook] SNS signature verification error:', error);
    return {
      valid: false,
      error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
