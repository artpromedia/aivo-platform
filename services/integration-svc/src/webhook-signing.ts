/**
 * Webhook Signing Utilities
 * 
 * Handles HMAC-SHA256 signing of webhook payloads for verification by partners.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { WEBHOOK_HEADERS } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SIGNING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sign a webhook payload using HMAC-SHA256
 * 
 * @param payload - The JSON payload to sign
 * @param secret - The shared secret for this webhook endpoint
 * @param timestamp - Unix timestamp of when the webhook was sent
 * @returns The signature in format "v1=<hex signature>"
 */
export function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp: number
): string {
  // Create the signed payload string (timestamp.payload)
  const signedPayload = `${timestamp}.${payload}`;
  
  // Generate HMAC-SHA256 signature
  const hmac = createHmac('sha256', secret);
  hmac.update(signedPayload);
  const signature = hmac.digest('hex');
  
  return `v1=${signature}`;
}

/**
 * Verify a webhook signature
 * 
 * @param payload - The raw JSON payload received
 * @param signature - The signature from X-Aivo-Signature header
 * @param secret - The shared secret
 * @param timestamp - The timestamp from X-Aivo-Timestamp header
 * @param toleranceSeconds - Maximum age of the webhook in seconds (default 5 minutes)
 * @returns Whether the signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds: number = 300
): { valid: boolean; error?: string } {
  // Check timestamp tolerance to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;
  
  if (age > toleranceSeconds) {
    return { valid: false, error: `Webhook timestamp too old: ${age}s > ${toleranceSeconds}s tolerance` };
  }
  
  if (age < -toleranceSeconds) {
    return { valid: false, error: `Webhook timestamp in future: ${-age}s ahead` };
  }
  
  // Parse the signature (expect "v1=<signature>")
  const signatureParts = signature.split(',');
  const v1Signature = signatureParts.find(s => s.startsWith('v1='));
  
  if (!v1Signature) {
    return { valid: false, error: 'No v1 signature found in header' };
  }
  
  const expectedSignatureHex = v1Signature.substring(3);
  
  // Generate expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(signedPayload);
  const computedSignatureHex = hmac.digest('hex');
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    const expected = Buffer.from(expectedSignatureHex, 'hex');
    const computed = Buffer.from(computedSignatureHex, 'hex');
    
    if (expected.length !== computed.length) {
      return { valid: false, error: 'Signature length mismatch' };
    }
    
    const valid = timingSafeEqual(expected, computed);
    return { valid };
  } catch {
    return { valid: false, error: 'Invalid signature format' };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HEADER GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate headers for a webhook delivery
 */
export function generateWebhookHeaders(params: {
  signature: string;
  eventType: string;
  tenantId: string;
  deliveryId: string;
  timestamp: number;
}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    [WEBHOOK_HEADERS.SIGNATURE]: params.signature,
    [WEBHOOK_HEADERS.EVENT_TYPE]: params.eventType,
    [WEBHOOK_HEADERS.TENANT_ID]: params.tenantId,
    [WEBHOOK_HEADERS.DELIVERY_ID]: params.deliveryId,
    [WEBHOOK_HEADERS.TIMESTAMP]: params.timestamp.toString(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SECRET GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a secure webhook secret
 * 
 * @returns A 32-byte hex secret (64 characters)
 */
export function generateWebhookSecret(): string {
  const { randomBytes } = require('crypto');
  return `whsec_${randomBytes(32).toString('hex')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXAMPLE CODE FOR PARTNERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Example verification code (for documentation)
 * 
 * Partners can use this pattern to verify incoming webhooks:
 * 
 * ```typescript
 * import crypto from 'crypto';
 * 
 * function verifyAivoWebhook(
 *   payload: string,
 *   signature: string,
 *   timestamp: string,
 *   secret: string
 * ): boolean {
 *   const ts = parseInt(timestamp, 10);
 *   const now = Math.floor(Date.now() / 1000);
 *   
 *   // Check timestamp is within 5 minutes
 *   if (Math.abs(now - ts) > 300) {
 *     return false;
 *   }
 *   
 *   // Compute expected signature
 *   const signedPayload = `${ts}.${payload}`;
 *   const hmac = crypto.createHmac('sha256', secret);
 *   hmac.update(signedPayload);
 *   const expected = `v1=${hmac.digest('hex')}`;
 *   
 *   // Compare signatures
 *   return crypto.timingSafeEqual(
 *     Buffer.from(signature),
 *     Buffer.from(expected)
 *   );
 * }
 * ```
 */
