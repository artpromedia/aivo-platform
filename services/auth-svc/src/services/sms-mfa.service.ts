/**
 * SMS MFA Fallback Service
 *
 * PRD: SMS MFA fallback when TOTP is not available.
 * Sends one-time codes via notify-svc (which integrates with Twilio).
 *
 * Flow:
 *   1. User requests SMS MFA during login
 *   2. A 6-digit code is generated and stored (hashed) in Redis with 5-min TTL
 *   3. Code is sent via notify-svc → Twilio SMS
 *   4. User submits the code for verification
 */

import { randomInt, createHash } from 'node:crypto';
import type { Redis } from 'ioredis';

const SMS_CODE_LENGTH = 6;
const SMS_CODE_TTL_SECONDS = 300; // 5 minutes
const SMS_RATE_LIMIT_SECONDS = 60; // 1 code per minute per user
const NOTIFY_SVC_URL = process.env.NOTIFY_SVC_URL ?? 'http://localhost:4080';

function generateSmsCode(): string {
  const min = Math.pow(10, SMS_CODE_LENGTH - 1);
  const max = Math.pow(10, SMS_CODE_LENGTH) - 1;
  return randomInt(min, max + 1).toString();
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export class SmsMfaService {
  constructor(private readonly redis: Redis) {}

  /**
   * Send an SMS verification code to the user's phone.
   * Returns the challenge metadata (not the code).
   */
  async sendCode(userId: string, phoneNumber: string): Promise<{ expiresAt: Date }> {
    // Rate limit: 1 SMS per minute per user
    const rateLimitKey = `sms-mfa:rate:${userId}`;
    const rateLimited = await this.redis.get(rateLimitKey);
    if (rateLimited) {
      throw new Error('Please wait before requesting another SMS code.');
    }

    // Generate code
    const code = generateSmsCode();
    const hashedCode = hashCode(code);
    const expiresAt = new Date(Date.now() + SMS_CODE_TTL_SECONDS * 1000);

    // Store hashed code in Redis
    const codeKey = `sms-mfa:code:${userId}`;
    await this.redis.setex(codeKey, SMS_CODE_TTL_SECONDS, hashedCode);

    // Store attempt counter
    const attemptsKey = `sms-mfa:attempts:${userId}`;
    await this.redis.setex(attemptsKey, SMS_CODE_TTL_SECONDS, '0');

    // Set rate limit
    await this.redis.setex(rateLimitKey, SMS_RATE_LIMIT_SECONDS, '1');

    // Send SMS via notify-svc (Twilio integration)
    await this.sendSmsViaNotifySvc(phoneNumber, code);

    return { expiresAt };
  }

  /**
   * Verify the SMS code submitted by the user.
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const codeKey = `sms-mfa:code:${userId}`;
    const attemptsKey = `sms-mfa:attempts:${userId}`;

    // Check attempt limit (max 3)
    const attempts = parseInt(await this.redis.get(attemptsKey) ?? '0');
    if (attempts >= 3) {
      await this.redis.del(codeKey, attemptsKey);
      throw new Error('Maximum attempts exceeded. Please request a new code.');
    }

    // Increment attempts
    await this.redis.incr(attemptsKey);

    // Get stored hash
    const storedHash = await this.redis.get(codeKey);
    if (!storedHash) {
      throw new Error('No active SMS code. Please request a new code.');
    }

    // Verify
    const isValid = hashCode(code) === storedHash;

    if (isValid) {
      // Clean up on success
      await this.redis.del(codeKey, attemptsKey);
    }

    return isValid;
  }

  private async sendSmsViaNotifySvc(phoneNumber: string, code: string): Promise<void> {
    try {
      const response = await fetch(`${NOTIFY_SVC_URL}/api/v1/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-name': 'auth-svc',
        },
        body: JSON.stringify({
          to: phoneNumber,
          templateName: 'mfa-verification-code',
          context: {
            code,
            expiresInMinutes: SMS_CODE_TTL_SECONDS / 60,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`notify-svc SMS send failed: ${response.status}`);
      }
    } catch (err) {
      throw new Error('Failed to send SMS verification code. Please try again.');
    }
  }
}
