/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare, @typescript-eslint/no-unnecessary-condition */
/**
 * Payments Service - Production Configuration Validator
 * 
 * This script validates that the payments service configuration is production-ready.
 * Run this during CI/CD deployment checks to prevent misconfigurations.
 * 
 * Usage:
 *   npx tsx src/validate-production-config.ts
 *   node dist/validate-production-config.js
 */

const PLACEHOLDER_PATTERNS = [
  'placeholder',
  'your_key_here',
  'replace_me',
  'xxx',
  'your_stripe',
  'YOUR_STRIPE',
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Check for placeholder values
function isPlaceholder(value: string): boolean {
  const lowerValue = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(pattern => lowerValue.includes(pattern));
}

// Validate Stripe secret key
function validateStripeSecretKey(key: string, isProduction: boolean, result: ValidationResult): void {
  if (!key) {
    result.errors.push('STRIPE_SECRET_KEY is not set');
    result.valid = false;
    return;
  }
  if (isPlaceholder(key)) {
    result.errors.push('STRIPE_SECRET_KEY contains a placeholder value');
    result.valid = false;
    return;
  }
  if (isProduction && key.startsWith('sk_test_')) {
    result.warnings.push('Using Stripe TEST key in production - ensure this is intentional (e.g., staging)');
    return;
  }
  if (!key.startsWith('sk_live_') && !key.startsWith('sk_test_')) {
    result.errors.push('STRIPE_SECRET_KEY does not appear to be a valid Stripe key (should start with sk_live_ or sk_test_)');
    result.valid = false;
  }
}

// Validate Stripe webhook secret
function validateStripeWebhookSecret(secret: string, result: ValidationResult): void {
  if (!secret) {
    result.errors.push('STRIPE_WEBHOOK_SECRET is not set');
    result.valid = false;
    return;
  }
  if (isPlaceholder(secret)) {
    result.errors.push('STRIPE_WEBHOOK_SECRET contains a placeholder value');
    result.valid = false;
    return;
  }
  if (!secret.startsWith('whsec_')) {
    result.errors.push('STRIPE_WEBHOOK_SECRET does not appear valid (should start with whsec_)');
    result.valid = false;
  }
}

// Validate a URL configuration (no localhost in production)
function validateUrl(name: string, url: string, isProduction: boolean, result: ValidationResult): void {
  if (!url) {
    result.errors.push(`${name} is not set`);
    result.valid = false;
    return;
  }
  if (isProduction && url.includes('localhost')) {
    result.errors.push(`${name} contains localhost - not allowed in production`);
    result.valid = false;
  }
}

function validateProductionConfig(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const isProduction = process.env.NODE_ENV === 'production';
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const databaseUrl = process.env.DATABASE_URL || '';
  const redisUrl = process.env.REDIS_URL || '';
  const billingServiceUrl = process.env.BILLING_SERVICE_URL || '';

  // Validate Stripe configuration
  validateStripeSecretKey(stripeSecretKey, isProduction, result);
  validateStripeWebhookSecret(stripeWebhookSecret, result);

  // Validate service URLs
  validateUrl('DATABASE_URL', databaseUrl, isProduction, result);
  validateUrl('REDIS_URL', redisUrl, isProduction, result);
  validateUrl('BILLING_SERVICE_URL', billingServiceUrl, isProduction, result);

  return result;
}

function printResults(result: ValidationResult): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Payments Service Configuration Validation (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (result.errors.length > 0) {
    console.log('❌ ERRORS:');
    for (const error of result.errors) {
      console.log(`   • ${error}`);
    }
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    for (const warning of result.warnings) {
      console.log(`   • ${warning}`);
    }
    console.log('');
  }

  if (result.valid) {
    console.log('✅ Configuration is valid');
  } else {
    console.log('❌ Configuration is INVALID - fix errors before deploying');
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
}

// Run validation
const result = validateProductionConfig();
printResults(result);

// Exit with error code if validation failed
if (!result.valid) {
  process.exit(1);
}
