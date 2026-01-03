/**
 * @aivo/billing-access
 *
 * Billing access control library for Aivo services.
 * Provides helpers to check subscription status, limited mode, and feature access.
 *
 * Usage:
 * ```typescript
 * import { BillingAccessClient } from '@aivo/billing-access';
 *
 * const billingAccess = new BillingAccessClient({ billingServiceUrl: 'http://billing-svc:4060' });
 *
 * // Check if session can start
 * const canStart = await billingAccess.canStartSession({ tenantId, learnerId });
 * if (!canStart.allowed) {
 *   throw new ForbiddenError(canStart.reason);
 * }
 *
 * // Check add-on access
 * const hasAddon = await billingAccess.hasAddon({ tenantId, learnerId, sku: 'ADDON_SEL' });
 * ```
 */
import type { ParentSku } from '@aivo/billing-common';
export interface BillingAccessConfig {
    /** URL of billing-svc internal API */
    billingServiceUrl: string;
    /** Cache TTL in milliseconds (default: 30000 = 30 seconds) */
    cacheTtlMs?: number;
    /** Request timeout in milliseconds (default: 5000) */
    timeoutMs?: number;
}
export interface AccessCheckResult {
    allowed: boolean;
    reason?: string;
    subscriptionStatus?: string;
    limitedMode?: boolean;
}
export interface AddonCheckResult {
    hasAddon: boolean;
    isTrialing?: boolean;
    trialEndsAt?: string;
}
export interface SubscriptionAccessInfo {
    hasActiveSubscription: boolean;
    status: string | null;
    limitedMode: boolean;
    activeSkus: ParentSku[];
    learnerSkus: Record<string, ParentSku[]>;
}
export declare class BillingAccessClient {
    private config;
    private cache;
    constructor(config: BillingAccessConfig);
    /**
     * Check if a session can be started for a learner.
     * Returns false if subscription is in limited mode or expired.
     */
    canStartSession(params: {
        tenantId: string;
        learnerId: string;
    }): Promise<AccessCheckResult>;
    /**
     * Check if a learner has access to a specific add-on SKU.
     */
    hasAddon(params: {
        tenantId: string;
        learnerId: string;
        sku: ParentSku;
    }): Promise<AddonCheckResult>;
    /**
     * Check if a tenant is in limited mode.
     */
    isLimitedMode(params: {
        tenantId: string;
    }): Promise<boolean>;
    /**
     * Get full subscription access info for a tenant.
     * Results are cached for performance.
     */
    getSubscriptionAccessInfo(tenantId: string): Promise<SubscriptionAccessInfo>;
    /**
     * Invalidate cache for a tenant (call after subscription changes)
     */
    invalidateCache(tenantId: string): void;
    /**
     * Clear all cached data
     */
    clearCache(): void;
    private fetchWithTimeout;
}
/**
 * Create a Fastify preHandler hook for billing access checks.
 * Use this to protect routes that require active subscription.
 */
export declare function createBillingAccessHook(client: BillingAccessClient): (request: {
    headers: Record<string, string | undefined>;
}, reply: {
    code: (code: number) => {
        send: (body: unknown) => void;
    };
}) => Promise<void>;
/**
 * Create an Express middleware for billing access checks.
 */
export declare function createBillingAccessMiddleware(client: BillingAccessClient): (req: {
    headers: Record<string, string | undefined>;
}, res: {
    status: (code: number) => {
        json: (body: unknown) => void;
    };
}, next: () => void) => Promise<void>;
//# sourceMappingURL=index.d.ts.map