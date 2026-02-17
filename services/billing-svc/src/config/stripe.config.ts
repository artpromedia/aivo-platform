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

/**
 * SKU-based price IDs for the parent billing flow
 * Maps each SKU to its monthly and yearly Stripe price IDs
 */
export interface StripeSkuPriceIds {
  baseMonthly: string;
  baseYearly: string;
  addonSelMonthly: string;
  addonSelYearly: string;
  addonSpeechMonthly: string;
  addonSpeechYearly: string;
  addonScienceMonthly: string;
  addonScienceYearly: string;
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
  /** SKU-based price IDs for parent billing checkout */
  skuPriceIds: StripeSkuPriceIds;
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

/**
 * Validates a Stripe price ID format
 * Real Stripe price IDs match: price_[a-zA-Z0-9]{14,}
 */
function isValidStripePriceId(value: string): boolean {
  // Stripe price IDs are: price_ followed by 14+ alphanumeric characters
  return /^price_[a-zA-Z0-9]{14,}$/.test(value);
}

/**
 * Get price ID with validation - returns undefined for invalid/placeholder values
 */
function getPriceIdEnvVar(name: string, isProduction: boolean): string {
  const value = process.env[name];

  if (!value) {
    if (isProduction) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    // Return empty string for development - will be validated as missing
    return '';
  }

  // Check for valid Stripe price ID format
  if (isProduction && !isValidStripePriceId(value)) {
    throw new Error(
      `Invalid Stripe price ID format for ${name}: "${value}". ` +
        'Expected format: price_[alphanumeric14+chars] (e.g., price_1A2B3C4D5E6F7G8H)'
    );
  }

  return value;
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
  publishableKey: getEnvVar(
    'STRIPE_PUBLISHABLE_KEY',
    isDevelopment ? 'pk_test_placeholder' : undefined
  ),

  // Webhook
  webhook: {
    secret: getEnvVar('STRIPE_WEBHOOK_SECRET', isDevelopment ? 'whsec_placeholder' : undefined),
    tolerance: Number.parseInt(getEnvVar('STRIPE_WEBHOOK_TOLERANCE', '300'), 10),
  },

  // Price IDs for subscription plans
  // IMPORTANT: In production, real Stripe price IDs are REQUIRED
  // Format: price_[alphanumeric14+chars] (e.g., price_1A2B3C4D5E6F7G8H)
  // Configure via environment variables:
  //   - STRIPE_PRICE_PRO_MONTHLY
  //   - STRIPE_PRICE_PRO_ANNUAL
  //   - STRIPE_PRICE_PREMIUM_MONTHLY
  //   - STRIPE_PRICE_PREMIUM_ANNUAL
  //   - STRIPE_PRICE_SCHOOL_ANNUAL (optional)
  //   - STRIPE_PRICE_DISTRICT_ANNUAL (optional)
  priceIds: {
    proMonthly: getPriceIdEnvVar('STRIPE_PRICE_PRO_MONTHLY', isProduction),
    proAnnual: getPriceIdEnvVar('STRIPE_PRICE_PRO_ANNUAL', isProduction),
    premiumMonthly: getPriceIdEnvVar('STRIPE_PRICE_PREMIUM_MONTHLY', isProduction),
    premiumAnnual: getPriceIdEnvVar('STRIPE_PRICE_PREMIUM_ANNUAL', isProduction),
    schoolAnnual: getOptionalEnvVar('STRIPE_PRICE_SCHOOL_ANNUAL'),
    districtAnnual: getOptionalEnvVar('STRIPE_PRICE_DISTRICT_ANNUAL'),
  },

  // SKU-based price IDs for parent billing flow
  // These map to the 4-SKU catalog defined in @aivo/billing-common
  // Configure via environment variables:
  //   - STRIPE_PRICE_BASE_MONTHLY / STRIPE_PRICE_BASE_YEARLY
  //   - STRIPE_PRICE_ADDON_SEL_MONTHLY / STRIPE_PRICE_ADDON_SEL_YEARLY
  //   - STRIPE_PRICE_ADDON_SPEECH_MONTHLY / STRIPE_PRICE_ADDON_SPEECH_YEARLY
  //   - STRIPE_PRICE_ADDON_SCIENCE_MONTHLY / STRIPE_PRICE_ADDON_SCIENCE_YEARLY
  skuPriceIds: {
    baseMonthly: getEnvVar(
      'STRIPE_PRICE_BASE_MONTHLY',
      isDevelopment ? 'price_base_monthly_test' : ''
    ),
    baseYearly: getEnvVar(
      'STRIPE_PRICE_BASE_YEARLY',
      isDevelopment ? 'price_base_yearly_test' : ''
    ),
    addonSelMonthly: getEnvVar(
      'STRIPE_PRICE_ADDON_SEL_MONTHLY',
      isDevelopment ? 'price_sel_monthly_test' : ''
    ),
    addonSelYearly: getEnvVar(
      'STRIPE_PRICE_ADDON_SEL_YEARLY',
      isDevelopment ? 'price_sel_yearly_test' : ''
    ),
    addonSpeechMonthly: getEnvVar(
      'STRIPE_PRICE_ADDON_SPEECH_MONTHLY',
      isDevelopment ? 'price_speech_monthly_test' : ''
    ),
    addonSpeechYearly: getEnvVar(
      'STRIPE_PRICE_ADDON_SPEECH_YEARLY',
      isDevelopment ? 'price_speech_yearly_test' : ''
    ),
    addonScienceMonthly: getEnvVar(
      'STRIPE_PRICE_ADDON_SCIENCE_MONTHLY',
      isDevelopment ? 'price_science_monthly_test' : ''
    ),
    addonScienceYearly: getEnvVar(
      'STRIPE_PRICE_ADDON_SCIENCE_YEARLY',
      isDevelopment ? 'price_science_yearly_test' : ''
    ),
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
 * Check if a price ID is valid with strict format validation
 */
function checkPriceId(value: string, name: string, errors: string[], isRequired = true): void {
  if (!value) {
    if (isRequired) {
      errors.push(`${name} is required but not set`);
    }
    return;
  }

  if (!isValidStripePriceId(value)) {
    errors.push(
      `${name} has invalid format: "${value}". ` +
        'Expected: price_[alphanumeric14+chars] (e.g., price_1A2B3C4D5E6F7G8H)'
    );
  }
}

/**
 * Validate Stripe configuration at startup
 * In production, ensures all required values are properly configured with real Stripe IDs
 */
export function validateStripeConfig(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for placeholder values in API keys
  checkPlaceholder(stripeConfig.secretKey, 'STRIPE_SECRET_KEY', errors);
  checkPlaceholder(stripeConfig.webhook.secret, 'STRIPE_WEBHOOK_SECRET', errors);

  // Warn about test keys in production
  if (isProduction) {
    if (stripeConfig.secretKey.startsWith('sk_test_')) {
      if (stripeConfig.warnOnTestMode) {
        warnings.push('Using Stripe TEST secret key in production environment');
      }
    }
    if (stripeConfig.publishableKey.startsWith('pk_test_')) {
      if (stripeConfig.warnOnTestMode) {
        warnings.push('Using Stripe TEST publishable key in production environment');
      }
    }
  }

  // Validate required price IDs (with strict format in production)
  const { priceIds } = stripeConfig;
  if (isProduction) {
    checkPriceId(priceIds.proMonthly, 'STRIPE_PRICE_PRO_MONTHLY', errors, true);
    checkPriceId(priceIds.proAnnual, 'STRIPE_PRICE_PRO_ANNUAL', errors, true);
    checkPriceId(priceIds.premiumMonthly, 'STRIPE_PRICE_PREMIUM_MONTHLY', errors, true);
    checkPriceId(priceIds.premiumAnnual, 'STRIPE_PRICE_PREMIUM_ANNUAL', errors, true);

    // Optional price IDs - validate format if set
    if (priceIds.schoolAnnual) {
      checkPriceId(priceIds.schoolAnnual, 'STRIPE_PRICE_SCHOOL_ANNUAL', errors, false);
    }
    if (priceIds.districtAnnual) {
      checkPriceId(priceIds.districtAnnual, 'STRIPE_PRICE_DISTRICT_ANNUAL', errors, false);
    }
  } else {
    // In development, warn if price IDs are missing but don't error
    if (
      !priceIds.proMonthly ||
      !priceIds.proAnnual ||
      !priceIds.premiumMonthly ||
      !priceIds.premiumAnnual
    ) {
      warnings.push(
        'Some Stripe price IDs are not configured. ' +
          'Billing features may not work until STRIPE_PRICE_* environment variables are set.'
      );
    }
  }

  // Output warnings
  for (const warning of warnings) {
    console.warn(`⚠️  STRIPE WARNING: ${warning}`);
  }

  // Throw on errors
  if (errors.length > 0) {
    throw new Error(
      `Stripe configuration validation failed:\n` +
        errors.map((e) => `  - ${e}`).join('\n') +
        '\n\nPlease configure the required environment variables with valid Stripe values.'
    );
  }

  // Log success in production
  if (isProduction) {
    console.log('[Stripe] Configuration validated successfully');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRICE ID HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export type PlanName = 'FREE' | 'PRO' | 'PREMIUM' | 'SCHOOL' | 'DISTRICT';
export type BillingInterval = 'monthly' | 'annual';

/**
 * Get Stripe price ID for a plan and billing interval
 * Returns null if the price ID is not configured
 */
export function getPriceId(plan: PlanName, interval: BillingInterval): string | null {
  const { priceIds } = stripeConfig;

  // Helper to return null for empty strings
  const getValidPriceId = (priceId: string | undefined): string | null => {
    return priceId && priceId.length > 0 ? priceId : null;
  };

  switch (plan) {
    case 'FREE':
      return null; // Free plan has no price
    case 'PRO':
      return interval === 'monthly'
        ? getValidPriceId(priceIds.proMonthly)
        : getValidPriceId(priceIds.proAnnual);
    case 'PREMIUM':
      return interval === 'monthly'
        ? getValidPriceId(priceIds.premiumMonthly)
        : getValidPriceId(priceIds.premiumAnnual);
    case 'SCHOOL':
      return getValidPriceId(priceIds.schoolAnnual);
    case 'DISTRICT':
      return getValidPriceId(priceIds.districtAnnual);
    default:
      return null;
  }
}

/**
 * Get plan name from Stripe price ID
 */
export function getPlanFromPriceId(
  priceId: string
): { plan: PlanName; interval: BillingInterval } | null {
  if (!priceId) {
    return null;
  }

  const { priceIds } = stripeConfig;

  // Check each configured price ID (only if they are set)
  if (priceIds.proMonthly && priceId === priceIds.proMonthly) {
    return { plan: 'PRO', interval: 'monthly' };
  }
  if (priceIds.proAnnual && priceId === priceIds.proAnnual) {
    return { plan: 'PRO', interval: 'annual' };
  }
  if (priceIds.premiumMonthly && priceId === priceIds.premiumMonthly) {
    return { plan: 'PREMIUM', interval: 'monthly' };
  }
  if (priceIds.premiumAnnual && priceId === priceIds.premiumAnnual) {
    return { plan: 'PREMIUM', interval: 'annual' };
  }
  if (priceIds.schoolAnnual && priceId === priceIds.schoolAnnual) {
    return { plan: 'SCHOOL', interval: 'annual' };
  }
  if (priceIds.districtAnnual && priceId === priceIds.districtAnnual) {
    return { plan: 'DISTRICT', interval: 'annual' };
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SKU-BASED PRICE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export type ParentSku = 'BASE' | 'ADDON_SEL' | 'ADDON_SPEECH' | 'ADDON_SCIENCE';
export type SkuBillingInterval = 'monthly' | 'yearly';

/**
 * Get Stripe price ID for a parent SKU and billing interval
 */
export function getSkuPriceId(sku: ParentSku, interval: SkuBillingInterval): string | null {
  const { skuPriceIds } = stripeConfig;

  const getValid = (id: string | undefined): string | null => (id && id.length > 0 ? id : null);

  switch (sku) {
    case 'BASE':
      return interval === 'monthly'
        ? getValid(skuPriceIds.baseMonthly)
        : getValid(skuPriceIds.baseYearly);
    case 'ADDON_SEL':
      return interval === 'monthly'
        ? getValid(skuPriceIds.addonSelMonthly)
        : getValid(skuPriceIds.addonSelYearly);
    case 'ADDON_SPEECH':
      return interval === 'monthly'
        ? getValid(skuPriceIds.addonSpeechMonthly)
        : getValid(skuPriceIds.addonSpeechYearly);
    case 'ADDON_SCIENCE':
      return interval === 'monthly'
        ? getValid(skuPriceIds.addonScienceMonthly)
        : getValid(skuPriceIds.addonScienceYearly);
    default:
      return null;
  }
}

/**
 * Get SKU from a Stripe price ID (reverse lookup)
 */
export function getSkuFromPriceId(
  priceId: string
): { sku: ParentSku; interval: SkuBillingInterval } | null {
  if (!priceId) return null;

  const { skuPriceIds } = stripeConfig;

  const mapping: [string, ParentSku, SkuBillingInterval][] = [
    [skuPriceIds.baseMonthly, 'BASE', 'monthly'],
    [skuPriceIds.baseYearly, 'BASE', 'yearly'],
    [skuPriceIds.addonSelMonthly, 'ADDON_SEL', 'monthly'],
    [skuPriceIds.addonSelYearly, 'ADDON_SEL', 'yearly'],
    [skuPriceIds.addonSpeechMonthly, 'ADDON_SPEECH', 'monthly'],
    [skuPriceIds.addonSpeechYearly, 'ADDON_SPEECH', 'yearly'],
    [skuPriceIds.addonScienceMonthly, 'ADDON_SCIENCE', 'monthly'],
    [skuPriceIds.addonScienceYearly, 'ADDON_SCIENCE', 'yearly'],
  ];

  for (const [configuredId, sku, interval] of mapping) {
    if (configuredId && priceId === configuredId) {
      return { sku, interval };
    }
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export default stripeConfig;
