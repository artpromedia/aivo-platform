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
/**
 * All supported parent SKU identifiers
 */
export declare const ParentSkuValues: readonly ["BASE", "ADDON_SEL", "ADDON_SPEECH", "ADDON_SCIENCE"];
export type ParentSku = (typeof ParentSkuValues)[number];
/**
 * Zod schema for SKU validation
 */
export declare const ParentSkuSchema: z.ZodEnum<["BASE", "ADDON_SEL", "ADDON_SPEECH", "ADDON_SCIENCE"]>;
/**
 * Configuration for a single SKU
 */
export interface SkuConfig {
    /** Internal SKU identifier */
    sku: ParentSku;
    /** Stripe product ID */
    stripeProductId: string;
    /** Stripe price ID for monthly billing */
    stripePriceIdMonthly: string;
    /** Stripe price ID for yearly billing */
    stripePriceIdYearly: string;
    /** Human-readable display name */
    displayName: string;
    /** Short description */
    description: string;
    /** Monthly price in cents */
    monthlyPriceCents: number;
    /** Yearly price in cents (typically discounted) */
    yearlyPriceCents: number;
    /** Whether this is a base product (required) */
    isBase: boolean;
    /** Whether this SKU supports free trial */
    trialEligible: boolean;
    /** Trial duration in days */
    trialDays: number;
    /** Features/modules included */
    features: string[];
    /** Sort order for display */
    sortOrder: number;
}
/**
 * Full SKU catalog configuration
 */
export interface SkuCatalog {
    skus: Record<ParentSku, SkuConfig>;
    /** Default currency */
    defaultCurrency: string;
    /** API version for reference */
    version: string;
}
/**
 * Build the SKU catalog from environment configuration.
 * Call this during app initialization.
 */
export declare function buildSkuCatalog(): SkuCatalog;
/**
 * Get the SKU catalog (singleton, built on first access)
 */
export declare function getSkuCatalog(): SkuCatalog;
/**
 * Reset catalog (for testing)
 */
export declare function resetSkuCatalog(): void;
/**
 * Get configuration for a specific SKU
 */
export declare function getSkuConfig(sku: ParentSku): SkuConfig;
/**
 * Get Stripe price ID for a SKU and billing period
 */
export declare function getStripePriceId(sku: ParentSku, period: 'monthly' | 'yearly'): string;
/**
 * Check if a SKU is the base product
 */
export declare function isBaseSku(sku: ParentSku): boolean;
/**
 * Check if a SKU is an add-on
 */
export declare function isAddonSku(sku: ParentSku): boolean;
/**
 * Check if a SKU is eligible for free trial
 */
export declare function isTrialEligible(sku: ParentSku): boolean;
/**
 * Get all add-on SKUs
 */
export declare function getAddonSkus(): ParentSku[];
/**
 * Get the base SKU
 */
export declare function getBaseSku(): ParentSku;
/**
 * Calculate total price for a set of SKUs
 */
export declare function calculateTotalPrice(skus: ParentSku[], period: 'monthly' | 'yearly'): {
    totalCents: number;
    breakdown: {
        sku: ParentSku;
        cents: number;
    }[];
};
/**
 * Validate that a SKU selection is valid (includes BASE if any add-ons)
 */
export declare function validateSkuSelection(skus: ParentSku[]): {
    valid: boolean;
    error?: string;
};
/**
 * Get all features included in a set of SKUs
 */
export declare function getIncludedFeatures(skus: ParentSku[]): string[];
//# sourceMappingURL=skuConfig.d.ts.map