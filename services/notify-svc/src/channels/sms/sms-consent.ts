/**
 * SMS Consent Service
 *
 * TCPA-compliant consent management:
 * - Track opt-in consent with timestamps
 * - Support double opt-in flow
 * - Handle STOP/HELP keywords automatically
 * - Maintain opt-out list
 * - Re-consent after 18 months (TCPA requirement)
 */

import type { PrismaClient } from '@prisma/client';

import { phoneValidationService, toE164 } from './phone-validation.js';
import type {
  SmsConsent,
  ConsentType,
  ConsentMethod,
  RevokeMethod,
  ConsentCheckResult,
  RecordConsentOptions,
  SmsType,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * TCPA requires re-consent after 18 months
 */
const CONSENT_EXPIRY_MONTHS = 18;

/**
 * Warn about re-consent 30 days before expiry
 */
const CONSENT_RENEWAL_WARNING_DAYS = 30;

/**
 * Message types that require explicit consent
 */
const CONSENT_REQUIRED_TYPES: Set<SmsType> = new Set([
  'REMINDER',
  'ALERT',
  'MARKETING',
]);

/**
 * Message types exempt from consent (transactional)
 */
const CONSENT_EXEMPT_TYPES: Set<SmsType> = new Set([
  'OTP',
  'TRANSACTIONAL',
]);

/**
 * STOP keywords that trigger opt-out
 */
const STOP_KEYWORDS = new Set([
  'stop',
  'stopall',
  'unsubscribe',
  'cancel',
  'end',
  'quit',
]);

/**
 * HELP keywords that trigger help response
 */
const HELP_KEYWORDS = new Set([
  'help',
  'info',
]);

// ══════════════════════════════════════════════════════════════════════════════
// SMS CONSENT SERVICE
// ══════════════════════════════════════════════════════════════════════════════

class SmsConsentService {
  private prisma: PrismaClient | null = null;

  /**
   * Initialize with Prisma client
   */
  initialize(prisma: PrismaClient): void {
    this.prisma = prisma;
    console.log('[SmsConsentService] Initialized');
  }

  /**
   * Check if a phone number has valid consent for a message type
   */
  async checkConsent(
    phoneNumber: string,
    tenantId: string,
    messageType: SmsType
  ): Promise<ConsentCheckResult> {
    // OTP and transactional messages don't require consent
    if (CONSENT_EXEMPT_TYPES.has(messageType)) {
      return { hasConsent: true };
    }

    if (!this.prisma) {
      console.warn('[SmsConsentService] No Prisma client, allowing message');
      return { hasConsent: true };
    }

    // Normalize phone number
    const e164 = toE164(phoneNumber);
    if (!e164) {
      return {
        hasConsent: false,
        reason: 'Invalid phone number format',
      };
    }

    try {
      const consent = await this.prisma.smsConsent.findUnique({
        where: {
          phoneNumber_tenantId: {
            phoneNumber: e164,
            tenantId,
          },
        },
      });

      // No consent record
      if (!consent) {
        return {
          hasConsent: false,
          reason: 'No consent on file for this phone number',
        };
      }

      // Consent was revoked
      if (consent.revokedAt) {
        return {
          hasConsent: false,
          reason: 'Consent was previously revoked',
        };
      }

      // Check consent type matches
      if (messageType === 'MARKETING' && consent.consentType === 'TRANSACTIONAL') {
        return {
          hasConsent: false,
          reason: 'Marketing consent not granted',
        };
      }

      // Check for 18-month expiry
      const consentAge = Date.now() - consent.consentedAt.getTime();
      const expiryMs = CONSENT_EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000;
      
      if (consentAge > expiryMs) {
        return {
          hasConsent: false,
          consent: this.mapToSmsConsent(consent),
          reason: 'Consent expired (over 18 months old). Re-consent required.',
        };
      }

      // Check if approaching expiry (for renewal warning)
      const renewalWarningMs = (CONSENT_EXPIRY_MONTHS * 30 - CONSENT_RENEWAL_WARNING_DAYS) * 24 * 60 * 60 * 1000;
      const needsRenewal = consentAge > renewalWarningMs;

      return {
        hasConsent: true,
        consent: this.mapToSmsConsent(consent),
        needsRenewal,
      };
    } catch (error) {
      console.error('[SmsConsentService] Error checking consent:', error);
      // Fail open for transactional, fail closed for marketing
      return {
        hasConsent: messageType !== 'MARKETING',
        reason: 'Error checking consent status',
      };
    }
  }

  /**
   * Record opt-in consent
   */
  async recordConsent(options: RecordConsentOptions): Promise<SmsConsent | null> {
    if (!this.prisma) {
      console.error('[SmsConsentService] No Prisma client');
      return null;
    }

    // Normalize phone number
    const e164 = toE164(options.phoneNumber);
    if (!e164) {
      console.error('[SmsConsentService] Invalid phone number');
      return null;
    }

    try {
      const consent = await this.prisma.smsConsent.upsert({
        where: {
          phoneNumber_tenantId: {
            phoneNumber: e164,
            tenantId: options.tenantId,
          },
        },
        create: {
          phoneNumber: e164,
          userId: options.userId,
          tenantId: options.tenantId,
          consentType: options.consentType,
          consentedAt: new Date(),
          consentMethod: options.consentMethod,
          ipAddress: options.ipAddress,
        },
        update: {
          // Re-consent clears revocation and updates timestamp
          userId: options.userId,
          consentType: options.consentType,
          consentedAt: new Date(),
          consentMethod: options.consentMethod,
          ipAddress: options.ipAddress,
          revokedAt: null,
          revokeMethod: null,
        },
      });

      console.log('[SmsConsentService] Consent recorded:', {
        phone: phoneValidationService.maskPhoneNumber(e164),
        type: options.consentType,
        method: options.consentMethod,
      });

      return this.mapToSmsConsent(consent);
    } catch (error) {
      console.error('[SmsConsentService] Error recording consent:', error);
      return null;
    }
  }

  /**
   * Revoke consent (opt-out)
   */
  async revokeConsent(
    phoneNumber: string,
    tenantId: string,
    method: RevokeMethod
  ): Promise<boolean> {
    if (!this.prisma) {
      console.error('[SmsConsentService] No Prisma client');
      return false;
    }

    const e164 = toE164(phoneNumber);
    if (!e164) {
      return false;
    }

    try {
      await this.prisma.smsConsent.updateMany({
        where: {
          phoneNumber: e164,
          tenantId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokeMethod: method,
        },
      });

      console.log('[SmsConsentService] Consent revoked:', {
        phone: phoneValidationService.maskPhoneNumber(e164),
        method,
      });

      return true;
    } catch (error) {
      console.error('[SmsConsentService] Error revoking consent:', error);
      return false;
    }
  }

  /**
   * Revoke consent for ALL tenants (global STOP)
   */
  async revokeAllConsent(phoneNumber: string, method: RevokeMethod): Promise<number> {
    if (!this.prisma) {
      return 0;
    }

    const e164 = toE164(phoneNumber);
    if (!e164) {
      return 0;
    }

    try {
      const result = await this.prisma.smsConsent.updateMany({
        where: {
          phoneNumber: e164,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokeMethod: method,
        },
      });

      console.log('[SmsConsentService] All consent revoked:', {
        phone: phoneValidationService.maskPhoneNumber(e164),
        count: result.count,
      });

      return result.count;
    } catch (error) {
      console.error('[SmsConsentService] Error revoking all consent:', error);
      return 0;
    }
  }

  /**
   * Process inbound SMS for STOP/HELP keywords
   */
  async processInboundKeyword(
    phoneNumber: string,
    body: string
  ): Promise<{
    keyword: 'stop' | 'help' | null;
    response: string | null;
    revokedCount?: number;
  }> {
    const normalizedBody = body.trim().toLowerCase();

    // Check for STOP keywords
    if (STOP_KEYWORDS.has(normalizedBody)) {
      const revokedCount = await this.revokeAllConsent(phoneNumber, 'sms_stop');
      
      return {
        keyword: 'stop',
        response: 'You have been unsubscribed from AIVO SMS messages. Reply HELP for assistance.',
        revokedCount,
      };
    }

    // Check for HELP keywords
    if (HELP_KEYWORDS.has(normalizedBody)) {
      return {
        keyword: 'help',
        response: 'AIVO: For help, visit aivolearning.com/help or call 1-800-XXX-XXXX. Reply STOP to opt out.',
      };
    }

    return {
      keyword: null,
      response: null,
    };
  }

  /**
   * Get consent history for a phone number
   */
  async getConsentHistory(
    phoneNumber: string,
    tenantId?: string
  ): Promise<SmsConsent[]> {
    if (!this.prisma) {
      return [];
    }

    const e164 = toE164(phoneNumber);
    if (!e164) {
      return [];
    }

    try {
      const consents = await this.prisma.smsConsent.findMany({
        where: {
          phoneNumber: e164,
          ...(tenantId && { tenantId }),
        },
        orderBy: { createdAt: 'desc' },
      });

      return consents.map((consent) => this.mapToSmsConsent(consent));
    } catch (error) {
      console.error('[SmsConsentService] Error getting consent history:', error);
      return [];
    }
  }

  /**
   * Check if message type requires consent
   */
  requiresConsent(messageType: SmsType): boolean {
    return CONSENT_REQUIRED_TYPES.has(messageType);
  }

  /**
   * Get consents that will expire soon (for renewal campaigns)
   */
  async getExpiringConsents(
    daysUntilExpiry: number = 30,
    limit: number = 100
  ): Promise<SmsConsent[]> {
    if (!this.prisma) {
      return [];
    }

    const expiryThreshold = new Date();
    expiryThreshold.setMonth(expiryThreshold.getMonth() - CONSENT_EXPIRY_MONTHS);
    expiryThreshold.setDate(expiryThreshold.getDate() + daysUntilExpiry);

    try {
      const consents = await this.prisma.smsConsent.findMany({
        where: {
          revokedAt: null,
          consentedAt: {
            lte: expiryThreshold,
          },
        },
        take: limit,
        orderBy: { consentedAt: 'asc' },
      });

      return consents.map((consent) => this.mapToSmsConsent(consent));
    } catch (error) {
      console.error('[SmsConsentService] Error getting expiring consents:', error);
      return [];
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private mapToSmsConsent(record: {
    id: string;
    phoneNumber: string;
    userId: string;
    tenantId: string;
    consentType: string;
    consentedAt: Date;
    consentMethod: string;
    ipAddress: string | null;
    revokedAt: Date | null;
    revokeMethod: string | null;
    createdAt?: Date;
  }): SmsConsent {
    return {
      id: record.id,
      phoneNumber: record.phoneNumber,
      userId: record.userId,
      tenantId: record.tenantId,
      consentType: record.consentType as ConsentType,
      consentedAt: record.consentedAt,
      consentMethod: record.consentMethod as ConsentMethod,
      ipAddress: record.ipAddress || undefined,
      revokedAt: record.revokedAt || undefined,
      revokeMethod: record.revokeMethod as RevokeMethod | undefined,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

export const smsConsentService = new SmsConsentService();

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export function initializeSmsConsent(prisma: PrismaClient): void {
  smsConsentService.initialize(prisma);
}

export function checkSmsConsent(
  phoneNumber: string,
  tenantId: string,
  messageType: SmsType
): Promise<ConsentCheckResult> {
  return smsConsentService.checkConsent(phoneNumber, tenantId, messageType);
}

export function recordSmsConsent(options: RecordConsentOptions): Promise<SmsConsent | null> {
  return smsConsentService.recordConsent(options);
}

export function revokeSmsConsent(
  phoneNumber: string,
  tenantId: string,
  method: RevokeMethod
): Promise<boolean> {
  return smsConsentService.revokeConsent(phoneNumber, tenantId, method);
}
