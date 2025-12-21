/**
 * SMS Service
 *
 * High-level SMS sending service that coordinates:
 * - Phone validation
 * - Consent checking
 * - Template rendering
 * - Rate limiting
 * - Quiet hours enforcement
 * - Provider management
 * - Delivery logging
 */

import type { PrismaClient } from '@prisma/client';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

import { config } from '../../config.js';
import { twilioProvider } from './twilio.js';
import { phoneValidationService, toE164 } from './phone-validation.js';
import { smsConsentService } from './sms-consent.js';
import { renderSmsTemplate, type SmsTemplateName } from './sms-templates.js';
import type {
  SendSmsOptions,
  SmsResult,
  SendOtpOptions,
  VerifyOtpOptions,
  SmsType,
  SmsTemplateContext,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SHAFT content categories prohibited by carriers
 * Sex, Hate, Alcohol, Firearms, Tobacco
 */
const SHAFT_PATTERNS = [
  /\b(sex|porn|xxx|adult|nude)\b/i,
  /\b(hate|nazi|kkk)\b/i,
  /\b(beer|wine|vodka|whiskey|alcohol)\b/i,
  /\b(gun|rifle|firearm|ammunition|ammo)\b/i,
  /\b(tobacco|cigarette|vape|juul)\b/i,
];

/**
 * Quiet hours for SMS (TCPA: generally 8am-9pm recipient local time)
 */
const QUIET_HOURS = {
  start: 21, // 9 PM
  end: 8,    // 8 AM
};

// ══════════════════════════════════════════════════════════════════════════════
// RATE LIMITERS
// ══════════════════════════════════════════════════════════════════════════════

// Rate limit: 1 SMS per 10 seconds to same number (anti-spam)
const perPhoneRateLimiter = new RateLimiterMemory({
  points: 1,
  duration: 10, // 10 seconds
});

// Rate limit: 6 SMS per minute to same number
const perPhoneMinuteRateLimiter = new RateLimiterMemory({
  points: 6,
  duration: 60,
});

// Rate limit: Per tenant daily limit
const perTenantDailyRateLimiter = new RateLimiterMemory({
  points: config.sms.dailyLimitPerTenant || 1000,
  duration: 86400, // 24 hours
});

// Priority queue for OTP (bypass per-phone limits)
const otpRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60, // 10 OTPs per minute per phone
});

// ══════════════════════════════════════════════════════════════════════════════
// SMS SERVICE
// ══════════════════════════════════════════════════════════════════════════════

interface SmsServiceOptions {
  skipValidation?: boolean;
  skipConsentCheck?: boolean;
  skipRateLimit?: boolean;
  skipQuietHours?: boolean;
  skipContentFilter?: boolean;
}

class SmsService {
  private prisma: PrismaClient | null = null;
  private _isInitialized = false;

  /**
   * Initialize the SMS service
   */
  async initialize(prisma?: PrismaClient): Promise<boolean> {
    if (this._isInitialized) {
      return true;
    }

    console.log('[SmsService] Initializing...');

    this.prisma = prisma || null;

    // Initialize consent service
    if (prisma) {
      smsConsentService.initialize(prisma);
    }

    // Initialize Twilio provider
    const providerReady = await twilioProvider.initialize();

    this._isInitialized = true;
    console.log('[SmsService] Initialized', { providerReady });

    return providerReady;
  }

  /**
   * Shutdown the SMS service
   */
  async shutdown(): Promise<void> {
    console.log('[SmsService] Shutting down...');
    await twilioProvider.shutdown();
    this._isInitialized = false;
  }

  /**
   * Send an SMS message
   */
  async send(
    options: SendSmsOptions,
    serviceOptions: SmsServiceOptions = {}
  ): Promise<SmsResult> {
    // Ensure service is initialized
    if (!this._isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      // Validate phone number
      if (!serviceOptions.skipValidation) {
        const validation = await phoneValidationService.validate(options.to, {
          requireMobile: true,
        });

        if (!validation.isValid) {
          return this.createErrorResult('INVALID_PHONE', validation.reason || 'Invalid phone number');
        }

        // Update to E.164 format
        options.to = validation.e164!;
      } else {
        // At minimum, normalize the number
        const e164 = toE164(options.to);
        if (e164) {
          options.to = e164;
        }
      }

      // Check consent (unless OTP or skipped)
      if (!options.skipConsentCheck && !serviceOptions.skipConsentCheck) {
        const consentResult = await smsConsentService.checkConsent(
          options.to,
          options.tenantId,
          options.type
        );

        if (!consentResult.hasConsent) {
          return this.createErrorResult('NO_CONSENT', consentResult.reason || 'No consent on file');
        }
      }

      // Check rate limits
      if (!serviceOptions.skipRateLimit) {
        const rateLimitResult = await this.checkRateLimits(options.to, options.tenantId, options.type);
        if (!rateLimitResult.allowed) {
          return this.createErrorResult('RATE_LIMITED', rateLimitResult.reason || 'Rate limit exceeded');
        }
      }

      // Check quiet hours (except for OTP and urgent alerts)
      if (!serviceOptions.skipQuietHours && options.type !== 'OTP' && options.priority !== 'high') {
        if (this.isQuietHours()) {
          return this.createErrorResult(
            'QUIET_HOURS',
            'Message blocked during quiet hours (9pm-8am). Will be sent at 8am.'
          );
        }
      }

      // Content filtering (SHAFT)
      if (!serviceOptions.skipContentFilter) {
        const contentCheck = this.checkContent(options.body);
        if (!contentCheck.allowed) {
          return this.createErrorResult('PROHIBITED_CONTENT', contentCheck.reason || 'Message contains prohibited content');
        }
      }

      // Send via provider
      const result = await twilioProvider.send(options);

      // Log delivery
      await this.logDelivery(options, result);

      const duration = Date.now() - startTime;
      console.log('[SmsService] SMS sent:', {
        to: phoneValidationService.maskPhoneNumber(options.to),
        type: options.type,
        segments: result.segments,
        success: result.success,
        duration,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SmsService] Send error:', errorMessage);
      return this.createErrorResult('SEND_ERROR', errorMessage);
    }
  }

  /**
   * Send a templated SMS
   */
  async sendTemplated(
    templateName: SmsTemplateName,
    to: string,
    context: SmsTemplateContext,
    tenantId: string,
    type: SmsType,
    serviceOptions: SmsServiceOptions = {}
  ): Promise<SmsResult> {
    const body = renderSmsTemplate(templateName, context);

    return this.send(
      {
        to,
        body,
        tenantId,
        type,
        metadata: { template: templateName, ...context },
      },
      serviceOptions
    );
  }

  /**
   * Send OTP code
   */
  async sendOtp(
    phoneNumber: string,
    code: string,
    tenantId: string
  ): Promise<SmsResult> {
    // OTPs bypass consent and most rate limits
    const options: SendOtpOptions = {
      phoneNumber,
      code,
      tenantId,
      channel: 'sms',
    };

    // Check OTP-specific rate limit
    try {
      await otpRateLimiter.consume(phoneNumber);
    } catch {
      return this.createErrorResult('OTP_RATE_LIMITED', 'Too many OTP requests. Please wait before trying again.');
    }

    // Try Twilio Verify first
    if (twilioProvider.sendOtp) {
      return twilioProvider.sendOtp(options);
    }

    // Fall back to regular SMS
    return this.sendTemplated(
      'otp',
      phoneNumber,
      { code },
      tenantId,
      'OTP',
      { skipConsentCheck: true, skipQuietHours: true }
    );
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(phoneNumber: string, code: string, tenantId: string): Promise<boolean> {
    if (twilioProvider.verifyOtp) {
      return twilioProvider.verifyOtp({ phoneNumber, code, tenantId });
    }

    // Without Twilio Verify, OTP verification must be handled externally
    console.warn('[SmsService] OTP verification not available without Twilio Verify');
    return false;
  }

  /**
   * Check opt-in status for a phone number
   */
  async checkOptInStatus(phoneNumber: string, tenantId: string): Promise<boolean> {
    const result = await smsConsentService.checkConsent(phoneNumber, tenantId, 'REMINDER');
    return result.hasConsent;
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<Record<string, unknown>> {
    const providerHealth = await twilioProvider.healthCheck();

    return {
      initialized: this._isInitialized,
      provider: {
        name: 'twilio',
        healthy: providerHealth,
      },
      rateLimits: {
        perPhonePoints: 1,
        perPhoneDuration: 10,
        dailyLimitPerTenant: config.sms.dailyLimitPerTenant || 1000,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private async checkRateLimits(
    phoneNumber: string,
    tenantId: string,
    type: SmsType
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // OTPs have separate limits
      if (type === 'OTP') {
        await otpRateLimiter.consume(phoneNumber);
        return { allowed: true };
      }

      // Check per-phone limit (10 second cooldown)
      try {
        await perPhoneRateLimiter.consume(phoneNumber);
      } catch (e) {
        const rlRes = e as RateLimiterRes;
        return {
          allowed: false,
          reason: `Rate limited. Try again in ${Math.ceil(rlRes.msBeforeNext / 1000)} seconds.`,
        };
      }

      // Check per-phone minute limit
      try {
        await perPhoneMinuteRateLimiter.consume(phoneNumber);
      } catch (e) {
        const rlRes = e as RateLimiterRes;
        return {
          allowed: false,
          reason: `Too many messages to this number. Try again in ${Math.ceil(rlRes.msBeforeNext / 1000)} seconds.`,
        };
      }

      // Check tenant daily limit
      try {
        await perTenantDailyRateLimiter.consume(tenantId);
      } catch (e) {
        const rlRes = e as RateLimiterRes;
        return {
          allowed: false,
          reason: `Daily SMS limit reached for this organization. Resets in ${Math.ceil(rlRes.msBeforeNext / 3600000)} hours.`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('[SmsService] Rate limit check error:', error);
      return { allowed: true }; // Fail open
    }
  }

  private isQuietHours(timezone?: string): boolean {
    // Get current hour in recipient's timezone (or default to server time)
    const now = new Date();
    let hour = now.getHours();

    if (timezone) {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          hour12: false,
          timeZone: timezone,
        });
        hour = parseInt(formatter.format(now), 10);
      } catch {
        // Invalid timezone, use server time
      }
    }

    // Quiet hours: 9pm to 8am
    return hour >= QUIET_HOURS.start || hour < QUIET_HOURS.end;
  }

  private checkContent(body: string): { allowed: boolean; reason?: string } {
    for (const pattern of SHAFT_PATTERNS) {
      if (pattern.test(body)) {
        return {
          allowed: false,
          reason: 'Message contains content prohibited by carrier guidelines',
        };
      }
    }

    // Check message length
    if (body.length > 1600) {
      return {
        allowed: false,
        reason: 'Message exceeds maximum length (1600 characters)',
      };
    }

    return { allowed: true };
  }

  private async logDelivery(options: SendSmsOptions, result: SmsResult): Promise<void> {
    if (!this.prisma) {
      return;
    }

    try {
      await this.prisma.smsLog.create({
        data: {
          tenantId: options.tenantId,
          userId: options.userId,
          toPhone: options.to,
          fromPhone: options.from || config.sms.twilio?.fromNumber || '',
          body: options.body,
          type: options.type,
          segments: result.segments,
          provider: result.provider,
          messageId: result.messageId,
          status: result.success ? 'SENT' : 'FAILED',
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          price: result.price,
          priceCurrency: result.priceCurrency,
          sentAt: result.success ? result.timestamp : null,
        },
      });
    } catch (error) {
      console.error('[SmsService] Failed to log delivery:', error);
    }
  }

  private createErrorResult(errorCode: string, errorMessage: string): SmsResult {
    return {
      success: false,
      segments: 0,
      errorCode,
      errorMessage,
      timestamp: new Date(),
      provider: 'twilio',
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

export const smsService = new SmsService();

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export async function initializeSmsService(prisma?: PrismaClient): Promise<boolean> {
  return smsService.initialize(prisma);
}

export async function shutdownSmsService(): Promise<void> {
  await smsService.shutdown();
}

export async function sendSms(
  options: SendSmsOptions,
  serviceOptions?: SmsServiceOptions
): Promise<SmsResult> {
  return smsService.send(options, serviceOptions);
}

export async function sendOtp(
  phoneNumber: string,
  code: string,
  tenantId: string
): Promise<SmsResult> {
  return smsService.sendOtp(phoneNumber, code, tenantId);
}

export async function verifyOtp(
  phoneNumber: string,
  code: string,
  tenantId: string
): Promise<boolean> {
  return smsService.verifyOtp(phoneNumber, code, tenantId);
}
