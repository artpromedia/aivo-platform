/**
 * Email Channel Module
 *
 * Production-ready email sending system with:
 * - SendGrid (primary) and AWS SES (fallback) providers
 * - Handlebars template engine with i18n
 * - Email validation (format, MX, disposable detection)
 * - Suppression list management
 * - Webhook handlers for bounces/complaints
 * - Rate limiting
 */

// Types
export type {
  SendEmailOptions,
  TemplateEmailOptions,
  EmailResult,
  BatchEmailResult,
  EmailProvider,
  EmailWebhookEvent,
  EmailValidationResult,
  SuppressionEntry,
  SuppressionReason,
  EmailTemplateContext,
  SupportedLocale,
} from './types.js';

// Main email service
export {
  emailService,
  initializeEmailService,
  shutdownEmailService,
  sendEmail,
  sendTemplatedEmail,
  sendBulkEmail,
} from './email.service.js';

// Email validation
export {
  emailValidator,
  validateEmail,
  validateEmailFormat,
  isDisposableEmail,
  isRoleBasedEmail,
  normalizeEmail,
} from './email-validator.js';

// Template engine
export {
  emailTemplateEngine,
  initializeTemplateEngine,
  renderEmailTemplate,
} from './template-engine.js';

// Providers
export { sendGridProvider, createSendGridProvider } from './sendgrid.js';
export { sesProvider, createSESProvider } from './ses.js';

// Provider factory
export {
  emailProviderManager,
  initializeEmailProviders,
  shutdownEmailProviders,
  getEmailProvider,
} from './email-provider.factory.js';

// Webhook handlers
export {
  registerEmailWebhooks,
  sendGridWebhookHandler,
  sesWebhookHandler,
  transformSendGridEvent,
  transformSESEvent,
} from './webhooks/index.js';
