/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/**
 * SKU Configuration
 *
 * Central configuration for all product SKUs used in parent billing.
 * Maps internal SKUs to Stripe price IDs and defines product metadata.
 *
 * IMPORTANT: Stripe price IDs are environment-specific.
 * Use STRIPE_SKU_* env vars to override defaults.
 */
import { z } from 'zod';
// ═══════════════════════════════════════════════════════════════════════════════
// SKU TYPES
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * All supported parent SKU identifiers
 */
export const ParentSkuValues = [
    'BASE', // Core ELA + Math foundation
    'ADDON_SEL', // Social-Emotional Learning
    'ADDON_SPEECH', // Speech & Language
    'ADDON_SCIENCE', // Science curriculum
];
/**
 * Zod schema for SKU validation
 */
export const ParentSkuSchema = z.enum(ParentSkuValues);
// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Get environment variable with fallback
 */
function getEnvVar(name, fallback) {
    return process.env[name] ?? fallback;
}
/**
 * Validate that all required Stripe IDs are configured.
 * Throws if any required configuration is missing in production.
 */
function validateStripeConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    const requiredVars = [
        'STRIPE_PRODUCT_BASE',
        'STRIPE_PRICE_BASE_MONTHLY',
        'STRIPE_PRICE_BASE_YEARLY',
        'STRIPE_PRODUCT_ADDON_SEL',
        'STRIPE_PRICE_ADDON_SEL_MONTHLY',
        'STRIPE_PRICE_ADDON_SEL_YEARLY',
        'STRIPE_PRODUCT_ADDON_SPEECH',
        'STRIPE_PRICE_ADDON_SPEECH_MONTHLY',
        'STRIPE_PRICE_ADDON_SPEECH_YEARLY',
        'STRIPE_PRODUCT_ADDON_SCIENCE',
        'STRIPE_PRICE_ADDON_SCIENCE_MONTHLY',
        'STRIPE_PRICE_ADDON_SCIENCE_YEARLY',
    ];
    const missing = requiredVars.filter((v) => !process.env[v]);
    if (isProduction && missing.length > 0) {
        throw new Error(`Missing required Stripe configuration: ${missing.join(', ')}. ` +
            'These environment variables must be set in production.');
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// SKU CATALOG DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Build the SKU catalog from environment configuration.
 * Call this during app initialization.
 */
export function buildSkuCatalog() {
    validateStripeConfig();
    const skus = {
        BASE: {
            sku: 'BASE',
            stripeProductId: getEnvVar('STRIPE_PRODUCT_BASE', 'prod_base_test'),
            stripePriceIdMonthly: getEnvVar('STRIPE_PRICE_BASE_MONTHLY', 'price_base_monthly_test'),
            stripePriceIdYearly: getEnvVar('STRIPE_PRICE_BASE_YEARLY', 'price_base_yearly_test'),
            displayName: 'Aivo Base (ELA + Math)',
            description: 'Core foundation with ELA and Math curriculum support',
            monthlyPriceCents: 1999, // $19.99/month
            yearlyPriceCents: 19999, // $199.99/year (~17% discount)
            isBase: true,
            trialEligible: false, // No trial for base - immediate subscription
            trialDays: 0,
            features: ['ELA', 'MATH', 'DASHBOARD', 'PROGRESS_TRACKING', 'PARENT_REPORTS'],
            sortOrder: 0,
        },
        ADDON_SEL: {
            sku: 'ADDON_SEL',
            stripeProductId: getEnvVar('STRIPE_PRODUCT_ADDON_SEL', 'prod_addon_sel_test'),
            stripePriceIdMonthly: getEnvVar('STRIPE_PRICE_ADDON_SEL_MONTHLY', 'price_sel_monthly_test'),
            stripePriceIdYearly: getEnvVar('STRIPE_PRICE_ADDON_SEL_YEARLY', 'price_sel_yearly_test'),
            displayName: 'Social-Emotional Learning (SEL)',
            description: 'Build emotional intelligence, self-awareness, and social skills',
            monthlyPriceCents: 799, // $7.99/month
            yearlyPriceCents: 7999, // $79.99/year
            isBase: false,
            trialEligible: true,
            trialDays: 30,
            features: ['SEL_CURRICULUM', 'MOOD_TRACKING', 'MINDFULNESS_EXERCISES'],
            sortOrder: 1,
        },
        ADDON_SPEECH: {
            sku: 'ADDON_SPEECH',
            stripeProductId: getEnvVar('STRIPE_PRODUCT_ADDON_SPEECH', 'prod_addon_speech_test'),
            stripePriceIdMonthly: getEnvVar('STRIPE_PRICE_ADDON_SPEECH_MONTHLY', 'price_speech_monthly_test'),
            stripePriceIdYearly: getEnvVar('STRIPE_PRICE_ADDON_SPEECH_YEARLY', 'price_speech_yearly_test'),
            displayName: 'Speech & Language',
            description: 'AI-powered speech therapy and language development exercises',
            monthlyPriceCents: 999, // $9.99/month
            yearlyPriceCents: 9999, // $99.99/year
            isBase: false,
            trialEligible: true,
            trialDays: 30,
            features: ['SPEECH_EXERCISES', 'PRONUNCIATION_AI', 'LANGUAGE_GAMES'],
            sortOrder: 2,
        },
        ADDON_SCIENCE: {
            sku: 'ADDON_SCIENCE',
            stripeProductId: getEnvVar('STRIPE_PRODUCT_ADDON_SCIENCE', 'prod_addon_science_test'),
            stripePriceIdMonthly: getEnvVar('STRIPE_PRICE_ADDON_SCIENCE_MONTHLY', 'price_science_monthly_test'),
            stripePriceIdYearly: getEnvVar('STRIPE_PRICE_ADDON_SCIENCE_YEARLY', 'price_science_yearly_test'),
            displayName: 'Science Curriculum',
            description: 'Interactive science experiments and STEM learning modules',
            monthlyPriceCents: 899, // $8.99/month
            yearlyPriceCents: 8999, // $89.99/year
            isBase: false,
            trialEligible: true,
            trialDays: 30,
            features: ['SCIENCE_CURRICULUM', 'VIRTUAL_LABS', 'STEM_PROJECTS'],
            sortOrder: 3,
        },
    };
    return {
        skus,
        defaultCurrency: 'usd',
        version: '1.0.0',
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// SKU HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
let _catalog = null;
/**
 * Get the SKU catalog (singleton, built on first access)
 */
export function getSkuCatalog() {
    _catalog ??= buildSkuCatalog();
    return _catalog;
}
/**
 * Reset catalog (for testing)
 */
export function resetSkuCatalog() {
    _catalog = null;
}
/**
 * Get configuration for a specific SKU
 */
export function getSkuConfig(sku) {
    const catalog = getSkuCatalog();
    return catalog.skus[sku];
}
/**
 * Get Stripe price ID for a SKU and billing period
 */
export function getStripePriceId(sku, period) {
    const config = getSkuConfig(sku);
    return period === 'yearly' ? config.stripePriceIdYearly : config.stripePriceIdMonthly;
}
/**
 * Check if a SKU is the base product
 */
export function isBaseSku(sku) {
    return getSkuConfig(sku).isBase;
}
/**
 * Check if a SKU is an add-on
 */
export function isAddonSku(sku) {
    return !getSkuConfig(sku).isBase;
}
/**
 * Check if a SKU is eligible for free trial
 */
export function isTrialEligible(sku) {
    return getSkuConfig(sku).trialEligible;
}
/**
 * Get all add-on SKUs
 */
export function getAddonSkus() {
    return ParentSkuValues.filter((sku) => isAddonSku(sku));
}
/**
 * Get the base SKU
 */
export function getBaseSku() {
    return 'BASE';
}
/**
 * Calculate total price for a set of SKUs
 */
export function calculateTotalPrice(skus, period) {
    const breakdown = skus.map((sku) => {
        const config = getSkuConfig(sku);
        const cents = period === 'yearly' ? config.yearlyPriceCents : config.monthlyPriceCents;
        return { sku, cents };
    });
    const totalCents = breakdown.reduce((sum, item) => sum + item.cents, 0);
    return { totalCents, breakdown };
}
/**
 * Validate that a SKU selection is valid (includes BASE if any add-ons)
 */
export function validateSkuSelection(skus) {
    if (skus.length === 0) {
        return { valid: false, error: 'At least one SKU must be selected' };
    }
    const hasBase = skus.includes('BASE');
    const hasAddons = skus.some((sku) => isAddonSku(sku));
    if (hasAddons && !hasBase) {
        return { valid: false, error: 'BASE subscription is required for add-ons' };
    }
    // Check for duplicates
    const uniqueSkus = new Set(skus);
    if (uniqueSkus.size !== skus.length) {
        return { valid: false, error: 'Duplicate SKUs are not allowed' };
    }
    return { valid: true };
}
/**
 * Get all features included in a set of SKUs
 */
export function getIncludedFeatures(skus) {
    const features = new Set();
    for (const sku of skus) {
        const config = getSkuConfig(sku);
        config.features.forEach((f) => features.add(f));
    }
    return Array.from(features);
}
//# sourceMappingURL=skuConfig.js.map