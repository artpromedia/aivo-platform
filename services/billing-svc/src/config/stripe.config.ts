/**
 * Stripe Configuration
 *
 * Production-ready Stripe configuration with:
 * - Environment-based configuration
 * - Price ID mapping for all plans
 * - Webhook configuration
 * - Tax and portal settings
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface StripePriceIds {
  /** Pro plan monthly price ID (price_xxx) */
  proMonthly: string;
  /** Pro plan annual price ID (price_xxx) */
  proAnnual: string;
  /** Premium plan monthly price ID (price_xxx) */
  premiumMonthly: string;
  /** Premium plan annual price ID (price_xxx) */
  premiumAnnual: string;
  /** School plan annual price ID (usage-based, price_xxx) */
  schoolAnnual?: string | undefined;
  /** District plan annual price ID (usage-based, price_xxx) */
  districtAnnual?: string | undefined;
}

export interface StripeWebhookConfig {
  /** Webhook endpoint secret for signature validation */
  secret: string;
  /** Tolerance in seconds for timestamp validation (default: 300) */
  tolerance: number;
}

export interface StripeConfig {
  /** Stripe secret key (sk_live_xxx or sk_test_xxx) */
  secretKey: string;
  /** Stripe publishable key (pk_live_xxx or pk_test_xxx) */
  publishableKey: string;
  /** Webhook configuration */
  webhook: StripeWebhookConfig;
  /** Price IDs for subscription plans */
  priceIds: StripePriceIds;
  /** Billing portal configuration ID (bpc_xxx) */
  portalConfigId?: string | undefined;
  /** Default tax rates to apply (txr_xxx) */
  taxRates?: string[] | undefined;
  /** API version to use */
  apiVersion: string;
  /** Connect account ID for platform (optional) */
  connectAccountId?: string | undefined;
  /** Enable Stripe Tax automatic calculation */
  automaticTax: boolean;
  /** Default trial period in days for new subscriptions */
  defaultTrialDays: number;
  /** Grace period in days for past due subscriptions */
  gracePeriodDays: number;
  /** Enable test mode warnings */
  warnOnTestMode: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? defaultValue ?? '';
}

function getOptionalEnvVar(name: string): string | undefined {
  return process.env[name] || undefined;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Stripe configuration loaded from environment variables
 */
export const stripeConfig: StripeConfig = {
  // API Keys
  secretKey: getEnvVar('STRIPE_SECRET_KEY', isDevelopment ? 'sk_test_placeholder' : undefined),
  publishableKey: getEnvVar('STRIPE_PUBLISHABLE_KEY', isDevelopment ? 'pk_test_placeholder' : undefined),
  
  // Webhook
  webhook: {
    secret: getEnvVar('STRIPE_WEBHOOK_SECRET', isDevelopment ? 'whsec_placeholder' : undefined),
    tolerance: Number.parseInt(getEnvVar('STRIPE_WEBHOOK_TOLERANCE', '300'), 10),
  },
  
  // Price IDs for subscription plans
  priceIds: {
    proMonthly: getEnvVar('STRIPE_PRICE_PRO_MONTHLY', 'price_pro_monthly'),
    proAnnual: getEnvVar('STRIPE_PRICE_PRO_ANNUAL', 'price_pro_annual'),
    premiumMonthly: getEnvVar('STRIPE_PRICE_PREMIUM_MONTHLY', 'price_premium_monthly'),
    premiumAnnual: getEnvVar('STRIPE_PRICE_PREMIUM_ANNUAL', 'price_premium_annual'),
    ...(process.env.STRIPE_PRICE_SCHOOL_ANNUAL ? { schoolAnnual: process.env.STRIPE_PRICE_SCHOOL_ANNUAL } : {}),
    ...(process.env.STRIPE_PRICE_DISTRICT_ANNUAL ? { districtAnnual: process.env.STRIPE_PRICE_DISTRICT_ANNUAL } : {}),
  },
  
  // Portal and Tax
  portalConfigId: getOptionalEnvVar('STRIPE_PORTAL_CONFIG_ID'),
  taxRates: getOptionalEnvVar('STRIPE_TAX_RATES')?.split(',').filter(Boolean),
  
  // API Configuration
  apiVersion: '2024-12-18.acacia',
  
  // Connect (for marketplace features)
  connectAccountId: getOptionalEnvVar('STRIPE_CONNECT_ACCOUNT_ID'),
  
  // Features
  automaticTax: process.env.STRIPE_AUTOMATIC_TAX === 'true',
  defaultTrialDays: Number.parseInt(getEnvVar('STRIPE_DEFAULT_TRIAL_DAYS', '14'), 10),
  gracePeriodDays: Number.parseInt(getEnvVar('STRIPE_GRACE_PERIOD_DAYS', '7'), 10),
  warnOnTestMode: process.env.STRIPE_WARN_TEST_MODE !== 'false',
};

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a value contains a placeholder
 */
function checkPlaceholder(value: string, name: string, errors: string[]): void {
  if (value.includes('placeholder')) {
    errors.push(`${name} contains placeholder value`);
  }
}

/**
 * Check if a price ID is valid
 */
function checkPriceId(value: string, name: string, errors: string[]): void {
  if (!value.startsWith('price_')) {
    errors.push(`${name} is not a valid Stripe price ID`);
  }
}

/**
 * Validate Stripe configuration at startup
 */
export function validateStripeConfig(): void {
  const errors: string[] = [];
  
  // Only run full validation in production
  if (!isProduction) {
    return;
  }
  
  // Check for placeholder values
  checkPlaceholder(stripeConfig.secretKey, 'STRIPE_SECRET_KEY', errors);
  checkPlaceholder(stripeConfig.webhook.secret, 'STRIPE_WEBHOOK_SECRET', errors);
  
  // Warn about test keys in production
  if (stripeConfig.secretKey.startsWith('sk_test_') && stripeConfig.warnOnTestMode) {
    console.warn('⚠️  WARNING: Using Stripe TEST key in production environment!');
  }
  
  // Validate price IDs
  const { priceIds } = stripeConfig;
  checkPriceId(priceIds.proMonthly, 'STRIPE_PRICE_PRO_MONTHLY', errors);
  checkPriceId(priceIds.proAnnual, 'STRIPE_PRICE_PRO_ANNUAL', errors);
  checkPriceId(priceIds.premiumMonthly, 'STRIPE_PRICE_PREMIUM_MONTHLY', errors);
  checkPriceId(priceIds.premiumAnnual, 'STRIPE_PRICE_PREMIUM_ANNUAL', errors);
  
  if (errors.length > 0) {
    throw new Error(`Stripe configuration errors:\n${errors.join('\n')}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRICE ID HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export type PlanName = 'FREE' | 'PRO' | 'PREMIUM' | 'SCHOOL' | 'DISTRICT';
export type BillingInterval = 'monthly' | 'annual';

/**
 * Get Stripe price ID for a plan and billing interval
 */
export function getPriceId(plan: PlanName, interval: BillingInterval): string | null {
  const { priceIds } = stripeConfig;
  
  switch (plan) {
    case 'FREE':
      return null; // Free plan has no price
    case 'PRO':
      return interval === 'monthly' ? priceIds.proMonthly : priceIds.proAnnual;
    case 'PREMIUM':
      return interval === 'monthly' ? priceIds.premiumMonthly : priceIds.premiumAnnual;
    case 'SCHOOL':
      return priceIds.schoolAnnual ?? null;
    case 'DISTRICT':
      return priceIds.districtAnnual ?? null;
    default:
      return null;
  }
}

/**
 * Get plan name from Stripe price ID
 */
export function getPlanFromPriceId(priceId: string): { plan: PlanName; interval: BillingInterval } | null {
  const { priceIds } = stripeConfig;
  
  if (priceId === priceIds.proMonthly) {
    return { plan: 'PRO', interval: 'monthly' };
  }
  if (priceId === priceIds.proAnnual) {
    return { plan: 'PRO', interval: 'annual' };
  }
  if (priceId === priceIds.premiumMonthly) {
    return { plan: 'PREMIUM', interval: 'monthly' };
  }
  if (priceId === priceIds.premiumAnnual) {
    return { plan: 'PREMIUM', interval: 'annual' };
  }
  if (priceId === priceIds.schoolAnnual) {
    return { plan: 'SCHOOL', interval: 'annual' };
  }
  if (priceId === priceIds.districtAnnual) {
    return { plan: 'DISTRICT', interval: 'annual' };
  }
  
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export default stripeConfig;
