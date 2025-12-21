/**
 * SMS Channel
 *
 * Production-ready SMS sending system using Twilio:
 * - Twilio Messaging Services for A2P 10DLC compliance
 * - Twilio Verify for OTP/2FA
 * - TCPA-compliant consent management
 * - Phone number validation with libphonenumber-js
 * - Rate limiting and quiet hours enforcement
 * - Webhook handling for delivery status and inbound SMS
 */

// Types
export type {
  SendSmsOptions,
  SmsResult,
  SendOtpOptions,
  VerifyOtpOptions,
  PhoneValidationResult,
  CarrierLookupResult,
  SmsConsent,
  ConsentCheckResult,
  RecordConsentOptions,
  TwilioStatusCallback,
  TwilioInboundSms,
  SmsWebhookEvent,
  SmsProvider,
  SmsTemplateContext,
} from './types.js';

export {
  SmsType,
  SmsStatus,
  ConsentType,
  PhoneNumberType,
} from './types.js';

// SMS Service (main entry point)
export {
  smsService,
  initializeSmsService,
  shutdownSmsService,
  sendSms,
  sendOtp,
  verifyOtp,
} from './sms.service.js';

// Phone Validation
export {
  phoneValidationService,
  validatePhoneNumber,
  validatePhoneFormat,
  toE164,
  maskPhone,
} from './phone-validation.js';

// Consent Management
export {
  smsConsentService,
  initializeSmsConsent,
  checkSmsConsent,
  recordSmsConsent,
  revokeSmsConsent,
} from './sms-consent.js';

// Templates
export {
  renderSmsTemplate,
  getTemplateInfo,
  templateRequiresOptOut,
  templateBypassesConsent,
  listTemplates,
  isValidTemplate,
  previewTemplate,
} from './sms-templates.js';
export type { SmsTemplateName } from './sms-templates.js';

// Twilio Provider
export {
  twilioProvider,
  createTwilioProvider,
  calculateSegments,
  mapTwilioStatus,
} from './twilio.js';

// Webhooks
export {
  registerTwilioWebhooks,
  handleStatusCallback,
  handleInboundSms,
  validateTwilioSignature,
} from './twilio-webhook.js';
export type { TwilioWebhookPluginOptions } from './twilio-webhook.js';
