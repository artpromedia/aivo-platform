/**
 * Twilio SMS Provider
 *
 * Production-ready Twilio integration with:
 * - Messaging Services for A2P 10DLC compliance
 * - Twilio Verify for OTP
 * - Carrier lookup
 * - MMS support
 * - Delivery status callbacks
 */

import Twilio from 'twilio';
import type { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message.js';

import { config } from '../../config.js';
import type {
  SmsProvider,
  SendSmsOptions,
  SmsResult,
  SendOtpOptions,
  VerifyOtpOptions,
  CarrierLookupResult,
  PhoneNumberType,
} from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const SMS_MAX_SEGMENTS = 10;
const GSM_CHAR_LIMIT = 160;
const GSM_CONCAT_CHAR_LIMIT = 153;
const UNICODE_CHAR_LIMIT = 70;
const UNICODE_CONCAT_CHAR_LIMIT = 67;

/**
 * Check if a string contains only GSM-7 characters
 */
function isGsmEncoding(text: string): boolean {
  // GSM 7-bit basic character set
  const GSM_BASIC = new Set([
    '@', '£', '$', '¥', 'è', 'é', 'ù', 'ì', 'ò', 'Ç', '\n', 'Ø', 'ø', '\r',
    'Å', 'å', 'Δ', '_', 'Φ', 'Γ', 'Λ', 'Ω', 'Π', 'Ψ', 'Σ', 'Θ', 'Ξ', ' ',
    'Æ', 'æ', 'ß', 'É', '!', '"', '#', '¤', '%', '&', "'", '(', ')', '*',
    '+', ',', '-', '.', '/', '0', '1', '2', '3', '4', '5', '6', '7', '8',
    '9', ':', ';', '<', '=', '>', '?', '¡', 'A', 'B', 'C', 'D', 'E', 'F',
    'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z', 'Ä', 'Ö', 'Ñ', 'Ü', '§', '¿', 'a', 'b',
    'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
    'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'ä', 'ö', 'ñ', 'ü',
    'à', '\f', '^', '{', '}', '\\', '[', '~', ']', '|', '€',
  ]);

  for (const char of text) {
    if (!GSM_BASIC.has(char)) {
      return false;
    }
  }
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate number of SMS segments for a message
 */
function calculateSegments(body: string): number {
  const isGsm = isGsmEncoding(body);
  const length = body.length;

  if (isGsm) {
    if (length <= GSM_CHAR_LIMIT) return 1;
    return Math.ceil(length / GSM_CONCAT_CHAR_LIMIT);
  } else {
    if (length <= UNICODE_CHAR_LIMIT) return 1;
    return Math.ceil(length / UNICODE_CONCAT_CHAR_LIMIT);
  }
}

/**
 * Map Twilio status to our status
 */
function mapTwilioStatus(status: string): 'QUEUED' | 'SENT' | 'DELIVERED' | 'UNDELIVERED' | 'FAILED' {
  switch (status) {
    case 'queued':
    case 'accepted':
      return 'QUEUED';
    case 'sending':
    case 'sent':
      return 'SENT';
    case 'delivered':
      return 'DELIVERED';
    case 'undelivered':
      return 'UNDELIVERED';
    case 'failed':
    case 'canceled':
      return 'FAILED';
    default:
      return 'QUEUED';
  }
}

/**
 * Map Twilio carrier type to our type
 */
function mapCarrierType(type: string | undefined | null): PhoneNumberType {
  const typeStr = (type ?? '').toLowerCase();
  switch (typeStr) {
    case 'mobile':
      return 'mobile';
    case 'landline':
      return 'landline';
    case 'voip':
      return 'voip';
    case 'toll free':
    case 'tollfree':
      return 'toll_free';
    case 'premium':
    case 'premium rate':
      return 'premium_rate';
    default:
      return 'unknown';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TWILIO PROVIDER CLASS
// ══════════════════════════════════════════════════════════════════════════════

class TwilioProvider implements SmsProvider {
  name = 'twilio';
  private client: Twilio.Twilio | null = null;
  private _isInitialized = false;

  /**
   * Initialize the Twilio client
   */
  async initialize(): Promise<boolean> {
    if (this._isInitialized) {
      return true;
    }

    const accountSid = config.sms.twilio?.accountSid;
    const authToken = config.sms.twilio?.authToken;

    if (!accountSid || !authToken) {
      console.warn('[TwilioProvider] Missing credentials, provider disabled');
      return false;
    }

    try {
      this.client = Twilio(accountSid, authToken);
      
      // Verify credentials by fetching account info
      const account = await this.client.api.accounts(accountSid).fetch();
      
      console.log('[TwilioProvider] Initialized successfully', {
        accountSid: accountSid.substring(0, 8) + '...',
        accountStatus: account.status,
      });

      this._isInitialized = true;
      return true;
    } catch (error) {
      console.error('[TwilioProvider] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Send an SMS message
   */
  async send(options: SendSmsOptions): Promise<SmsResult> {
    if (!this.client) {
      return {
        success: false,
        segments: 0,
        errorCode: 'NOT_INITIALIZED',
        errorMessage: 'Twilio provider not initialized',
        timestamp: new Date(),
        provider: this.name,
      };
    }

    const segments = calculateSegments(options.body);

    // Check segment limit
    if (segments > SMS_MAX_SEGMENTS) {
      return {
        success: false,
        segments,
        errorCode: 'MESSAGE_TOO_LONG',
        errorMessage: `Message would require ${segments} segments, max is ${SMS_MAX_SEGMENTS}`,
        timestamp: new Date(),
        provider: this.name,
      };
    }

    try {
      const messageParams: Twilio.Twilio['messages']['create'] extends (params: infer P) => unknown ? P : never = {
        to: options.to,
        body: options.body,
      };

      // Use Messaging Service SID for A2P 10DLC compliance
      const messagingServiceSid = config.sms.twilio?.messagingServiceSid;
      if (messagingServiceSid) {
        (messageParams as Record<string, unknown>).messagingServiceSid = messagingServiceSid;
      } else if (options.from) {
        (messageParams as Record<string, unknown>).from = options.from;
      } else if (config.sms.twilio?.fromNumber) {
        (messageParams as Record<string, unknown>).from = config.sms.twilio.fromNumber;
      }

      // Add status callback URL
      const statusCallback = options.statusCallback || config.sms.twilio?.statusCallbackUrl;
      if (statusCallback) {
        (messageParams as Record<string, unknown>).statusCallback = `${statusCallback}/status`;
      }

      // Add MMS media URLs if present
      if (options.mediaUrls && options.mediaUrls.length > 0) {
        (messageParams as Record<string, unknown>).mediaUrl = options.mediaUrls.slice(0, 10);
      }

      // Schedule for later if specified
      if (options.scheduledAt && options.scheduledAt > new Date()) {
        (messageParams as Record<string, unknown>).sendAt = options.scheduledAt.toISOString();
        (messageParams as Record<string, unknown>).scheduleType = 'fixed';
      }

      const message: MessageInstance = await this.client.messages.create(
        messageParams
      );

      console.log('[TwilioProvider] SMS sent:', {
        messageId: message.sid,
        to: options.to.substring(0, 6) + '****',
        segments: message.numSegments || segments,
        status: message.status,
      });

      return {
        success: true,
        messageId: message.sid,
        segments: Number.parseInt(message.numSegments || String(segments), 10),
        price: message.price ? Number.parseFloat(message.price) : undefined,
        priceCurrency: message.priceUnit || 'USD',
        timestamp: new Date(),
        provider: this.name,
      };
    } catch (error) {
      const twilioError = error as { code?: number; message?: string; moreInfo?: string };
      
      console.error('[TwilioProvider] Send failed:', {
        to: options.to.substring(0, 6) + '****',
        errorCode: twilioError.code,
        errorMessage: twilioError.message,
      });

      return {
        success: false,
        segments,
        errorCode: String(twilioError.code || 'UNKNOWN'),
        errorMessage: twilioError.message || 'Failed to send SMS',
        timestamp: new Date(),
        provider: this.name,
      };
    }
  }

  /**
   * Send OTP using Twilio Verify
   */
  async sendOtp(options: SendOtpOptions): Promise<SmsResult> {
    if (!this.client) {
      return {
        success: false,
        segments: 0,
        errorCode: 'NOT_INITIALIZED',
        errorMessage: 'Twilio provider not initialized',
        timestamp: new Date(),
        provider: this.name,
      };
    }

    const verifyServiceSid = config.sms.twilio?.verifyServiceSid;
    if (!verifyServiceSid) {
      // Fall back to regular SMS for OTP
      return this.send({
        to: options.phoneNumber,
        body: `Your AIVO verification code is ${options.code}. Valid for 10 minutes. Do not share this code.`,
        tenantId: options.tenantId,
        type: 'OTP',
        skipConsentCheck: true,
      });
    }

    try {
      const verification = await this.client.verify.v2
        .services(verifyServiceSid)
        .verifications.create({
          to: options.phoneNumber,
          channel: options.channel || 'sms',
          locale: options.locale || 'en',
          customCode: options.code,
        });

      console.log('[TwilioProvider] OTP sent via Verify:', {
        to: options.phoneNumber.substring(0, 6) + '****',
        status: verification.status,
        channel: verification.channel,
      });

      return {
        success: verification.status === 'pending',
        messageId: verification.sid,
        segments: 1,
        timestamp: new Date(),
        provider: this.name,
      };
    } catch (error) {
      const twilioError = error as { code?: number; message?: string };

      console.error('[TwilioProvider] OTP send failed:', twilioError.message);

      return {
        success: false,
        segments: 0,
        errorCode: String(twilioError.code || 'UNKNOWN'),
        errorMessage: twilioError.message || 'Failed to send OTP',
        timestamp: new Date(),
        provider: this.name,
      };
    }
  }

  /**
   * Verify OTP code using Twilio Verify
   */
  async verifyOtp(options: VerifyOtpOptions): Promise<boolean> {
    if (!this.client) {
      console.error('[TwilioProvider] Cannot verify OTP: not initialized');
      return false;
    }

    const verifyServiceSid = config.sms.twilio?.verifyServiceSid;
    if (!verifyServiceSid) {
      console.warn('[TwilioProvider] Verify service not configured, OTP verification not available');
      return false;
    }

    try {
      const verificationCheck = await this.client.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({
          to: options.phoneNumber,
          code: options.code,
        });

      console.log('[TwilioProvider] OTP verification:', {
        to: options.phoneNumber.substring(0, 6) + '****',
        status: verificationCheck.status,
        valid: verificationCheck.valid,
      });

      return verificationCheck.status === 'approved' && verificationCheck.valid;
    } catch (error) {
      const twilioError = error as { code?: number; message?: string };
      console.error('[TwilioProvider] OTP verification failed:', twilioError.message);
      return false;
    }
  }

  /**
   * Lookup carrier information for a phone number
   */
  async lookupCarrier(phoneNumber: string): Promise<CarrierLookupResult> {
    if (!this.client) {
      return {
        type: 'unknown',
        error: 'Twilio provider not initialized',
      };
    }

    try {
      const lookup = await this.client.lookups.v2
        .phoneNumbers(phoneNumber)
        .fetch({ fields: 'line_type_intelligence' });

      const lineTypeIntelligence = lookup.lineTypeIntelligence as {
        type?: string;
        carrier_name?: string;
        mobile_country_code?: string;
        mobile_network_code?: string;
      } | null;

      return {
        type: mapCarrierType(lineTypeIntelligence?.type || 'unknown'),
        carrierName: lineTypeIntelligence?.carrier_name,
        mcc: lineTypeIntelligence?.mobile_country_code,
        mnc: lineTypeIntelligence?.mobile_network_code,
      };
    } catch (error) {
      const twilioError = error as { message?: string };
      console.error('[TwilioProvider] Carrier lookup failed:', twilioError.message);
      return {
        type: 'unknown',
        error: twilioError.message,
      };
    }
  }

  /**
   * Cancel a scheduled message
   */
  async cancelMessage(messageId: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.messages(messageId).update({ status: 'canceled' });
      console.log('[TwilioProvider] Message canceled:', messageId);
      return true;
    } catch (error) {
      const twilioError = error as { message?: string };
      console.error('[TwilioProvider] Cancel failed:', twilioError.message);
      return false;
    }
  }

  /**
   * Shutdown the provider
   */
  async shutdown(): Promise<void> {
    console.log('[TwilioProvider] Shutting down...');
    this.client = null;
    this._isInitialized = false;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const accountSid = config.sms.twilio?.accountSid;
      if (!accountSid) return false;
      
      const account = await this.client.api.accounts(accountSid).fetch();
      return account.status === 'active';
    } catch {
      return false;
    }
  }

  /**
   * Get the raw Twilio client for advanced operations
   */
  getClient(): Twilio.Twilio | null {
    return this.client;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

export const twilioProvider = new TwilioProvider();

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

export function createTwilioProvider(): SmsProvider {
  return new TwilioProvider();
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export { calculateSegments, mapTwilioStatus };
