/**
 * SMS Types and Interfaces
 *
 * Type definitions for SMS functionality including:
 * - Send options and results
 * - Provider abstractions
 * - Consent management
 * - Webhook events
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Types of SMS messages for compliance and routing
 */
export type SmsType =
  | 'OTP'           // One-time passwords, verification codes
  | 'TRANSACTIONAL' // Account-related, receipts
  | 'REMINDER'      // Session reminders, appointments
  | 'ALERT'         // Security alerts, urgent notifications
  | 'MARKETING';    // Promotional (requires explicit consent)

/**
 * SMS delivery status
 */
export type SmsStatus =
  | 'QUEUED'        // Queued for sending
  | 'SENT'          // Sent to carrier
  | 'DELIVERED'     // Delivered to handset
  | 'UNDELIVERED'   // Carrier could not deliver
  | 'FAILED';       // Send failed

/**
 * Consent types for SMS communications
 */
export type ConsentType =
  | 'TRANSACTIONAL' // Account-related messages only
  | 'MARKETING'     // Marketing/promotional messages
  | 'ALL';          // All message types

/**
 * Phone number type
 */
export type PhoneNumberType =
  | 'mobile'
  | 'landline'
  | 'voip'
  | 'toll_free'
  | 'premium_rate'
  | 'unknown';

// ══════════════════════════════════════════════════════════════════════════════
// SEND OPTIONS AND RESULTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Options for sending an SMS message
 */
export interface SendSmsOptions {
  /** Recipient phone number (E.164 format preferred) */
  to: string;
  /** Message body (max 1600 chars, will be segmented) */
  body: string;
  /** User ID of recipient (optional) */
  userId?: string;
  /** Tenant ID (required for compliance) */
  tenantId: string;
  /** Message type for compliance routing */
  type: SmsType;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Status callback URL override */
  statusCallback?: string;
  /** Specific from number/messaging service override */
  from?: string;
  /** Media URLs for MMS (max 10) */
  mediaUrls?: string[];
  /** Schedule send time (future) */
  scheduledAt?: Date;
  /** Priority (affects queue ordering) */
  priority?: 'normal' | 'high';
  /** Skip consent check (for OTP only) */
  skipConsentCheck?: boolean;
}

/**
 * Result of sending an SMS
 */
export interface SmsResult {
  /** Whether the send was successful */
  success: boolean;
  /** Provider message ID */
  messageId?: string;
  /** Number of SMS segments used */
  segments: number;
  /** Estimated price */
  price?: number;
  /** Price currency */
  priceCurrency?: string;
  /** Error code if failed */
  errorCode?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Timestamp of send */
  timestamp: Date;
  /** Provider used */
  provider: string;
}

/**
 * OTP send options
 */
export interface SendOtpOptions {
  /** Recipient phone number */
  phoneNumber: string;
  /** OTP code to send */
  code: string;
  /** Channel (sms or voice) */
  channel?: 'sms' | 'call';
  /** Locale for message */
  locale?: string;
  /** Tenant ID */
  tenantId: string;
  /** Custom template SID */
  templateSid?: string;
}

/**
 * OTP verification options
 */
export interface VerifyOtpOptions {
  /** Phone number to verify */
  phoneNumber: string;
  /** OTP code to verify */
  code: string;
  /** Tenant ID */
  tenantId: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PHONE VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Phone number validation result
 */
export interface PhoneValidationResult {
  /** Whether the phone number is valid */
  isValid: boolean;
  /** Normalized E.164 format */
  e164?: string;
  /** Country code (e.g., 'US', 'GB') */
  countryCode?: string;
  /** National number without country code */
  nationalNumber?: string;
  /** Phone number type */
  type?: PhoneNumberType;
  /** Carrier name (if lookup performed) */
  carrier?: string;
  /** Whether SMS is supported */
  smsCapable?: boolean;
  /** Validation error reason */
  reason?: string;
}

/**
 * Carrier lookup result
 */
export interface CarrierLookupResult {
  /** Phone number type */
  type: PhoneNumberType;
  /** Carrier name */
  carrierName?: string;
  /** Mobile country code */
  mcc?: string;
  /** Mobile network code */
  mnc?: string;
  /** Whether the number is ported */
  ported?: boolean;
  /** Error if lookup failed */
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSENT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SMS consent record
 */
export interface SmsConsent {
  /** Consent ID */
  id: string;
  /** Phone number (E.164) */
  phoneNumber: string;
  /** User ID */
  userId: string;
  /** Tenant ID */
  tenantId: string;
  /** Type of consent granted */
  consentType: ConsentType;
  /** When consent was given */
  consentedAt: Date;
  /** How consent was obtained */
  consentMethod: ConsentMethod;
  /** IP address when consent was given (for web forms) */
  ipAddress?: string;
  /** When consent was revoked (null if active) */
  revokedAt?: Date;
  /** How consent was revoked */
  revokeMethod?: RevokeMethod;
}

/**
 * Methods by which consent can be obtained
 */
export type ConsentMethod =
  | 'web_form'      // Online form submission
  | 'sms_keyword'   // Texted keyword (e.g., "YES")
  | 'verbal'        // Verbal consent (call recording)
  | 'written'       // Physical written consent
  | 'api';          // Programmatic consent

/**
 * Methods by which consent can be revoked
 */
export type RevokeMethod =
  | 'sms_stop'      // Replied STOP
  | 'web_form'      // Online preference update
  | 'api'           // Programmatic revocation
  | 'support'       // Customer support request
  | 'expired';      // Auto-expired (18 months TCPA)

/**
 * Consent check result
 */
export interface ConsentCheckResult {
  /** Whether consent exists and is valid */
  hasConsent: boolean;
  /** The consent record if exists */
  consent?: SmsConsent;
  /** Reason if no consent */
  reason?: string;
  /** Whether re-consent is needed (approaching 18 months) */
  needsRenewal?: boolean;
}

/**
 * Options for recording consent
 */
export interface RecordConsentOptions {
  phoneNumber: string;
  userId: string;
  tenantId: string;
  consentType: ConsentType;
  consentMethod: ConsentMethod;
  ipAddress?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK EVENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Twilio status callback event
 */
export interface TwilioStatusCallback {
  MessageSid: string;
  MessageStatus: 'accepted' | 'queued' | 'sending' | 'sent' | 'delivered' | 'undelivered' | 'failed' | 'canceled';
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  ApiVersion?: string;
  AccountSid?: string;
  SmsSid?: string;
  SmsStatus?: string;
  NumSegments?: string;
  Price?: string;
  PriceUnit?: string;
}

/**
 * Twilio inbound SMS event
 */
export interface TwilioInboundSms {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
}

/**
 * Canonical SMS webhook event
 */
export interface SmsWebhookEvent {
  provider: 'twilio';
  eventType: 'status_update' | 'inbound' | 'opt_out';
  messageId: string;
  phoneNumber: string;
  status?: SmsStatus;
  body?: string;
  timestamp: Date;
  rawEvent: unknown;
  metadata?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SMS rate limit configuration
 */
export interface SmsRateLimitConfig {
  /** Max SMS per phone per minute */
  perPhonePerMinute: number;
  /** Max SMS per phone per hour */
  perPhonePerHour: number;
  /** Max SMS per tenant per day */
  perTenantPerDay: number;
  /** OTP exemption (OTPs bypass per-phone limits) */
  otpExempt: boolean;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER INTERFACE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SMS Provider interface
 */
export interface SmsProvider {
  /** Provider name */
  name: string;

  /** Initialize the provider */
  initialize(): Promise<boolean>;

  /** Send an SMS */
  send(options: SendSmsOptions): Promise<SmsResult>;

  /** Send OTP via Verify service */
  sendOtp?(options: SendOtpOptions): Promise<SmsResult>;

  /** Verify OTP code */
  verifyOtp?(options: VerifyOtpOptions): Promise<boolean>;

  /** Lookup carrier info */
  lookupCarrier?(phoneNumber: string): Promise<CarrierLookupResult>;

  /** Cancel a scheduled message */
  cancelMessage?(messageId: string): Promise<boolean>;

  /** Shutdown the provider */
  shutdown(): Promise<void>;

  /** Health check */
  healthCheck(): Promise<boolean>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SMS template context
 */
export interface SmsTemplateContext {
  [key: string]: unknown;
  code?: string;
  childName?: string;
  sessionTime?: string;
  location?: string;
  deviceInfo?: string;
  link?: string;
}

/**
 * Available SMS templates
 */
export type SmsTemplateName =
  | 'otp'
  | 'session-reminder'
  | 'security-alert'
  | 'password-reset'
  | 'consent-confirmation'
  | 'account-locked';
