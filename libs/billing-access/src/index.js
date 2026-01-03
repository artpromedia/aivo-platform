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
class SimpleCache {
    cache = new Map();
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.data;
    }
    set(key, data, ttlMs) {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttlMs,
        });
    }
    invalidate(keyPrefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(keyPrefix)) {
                this.cache.delete(key);
            }
        }
    }
    clear() {
        this.cache.clear();
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// BILLING ACCESS CLIENT
// ═══════════════════════════════════════════════════════════════════════════════
export class BillingAccessClient {
    config;
    cache;
    constructor(config) {
        this.config = {
            billingServiceUrl: config.billingServiceUrl,
            cacheTtlMs: config.cacheTtlMs ?? 30000, // 30 seconds default
            timeoutMs: config.timeoutMs ?? 5000,
        };
        this.cache = new SimpleCache();
    }
    /**
     * Check if a session can be started for a learner.
     * Returns false if subscription is in limited mode or expired.
     */
    async canStartSession(params) {
        const { tenantId, learnerId } = params;
        try {
            const accessInfo = await this.getSubscriptionAccessInfo(tenantId);
            // No active subscription
            if (!accessInfo.hasActiveSubscription) {
                return {
                    allowed: false,
                    reason: 'No active subscription. Please subscribe to continue.',
                    subscriptionStatus: accessInfo.status ?? 'none',
                    limitedMode: false,
                };
            }
            // In limited mode
            if (accessInfo.limitedMode) {
                return {
                    allowed: false,
                    reason: 'Your subscription is past due. Please update your payment method.',
                    subscriptionStatus: accessInfo.status ?? 'unknown',
                    limitedMode: true,
                };
            }
            // Check if learner has BASE access
            const learnerSkus = accessInfo.learnerSkus[learnerId] ?? [];
            const hasBase = accessInfo.activeSkus.includes('BASE') || learnerSkus.includes('BASE');
            if (!hasBase) {
                return {
                    allowed: false,
                    reason: 'Learner does not have access to this subscription.',
                    subscriptionStatus: accessInfo.status ?? 'unknown',
                    limitedMode: false,
                };
            }
            return {
                allowed: true,
                subscriptionStatus: accessInfo.status ?? 'active',
                limitedMode: false,
            };
        }
        catch (error) {
            // Fail open in case of service unavailability (but log error)
            console.error('[BillingAccess] Error checking session access:', error);
            return {
                allowed: true, // Fail open
                reason: 'Unable to verify subscription status',
            };
        }
    }
    /**
     * Check if a learner has access to a specific add-on SKU.
     */
    async hasAddon(params) {
        const { tenantId, learnerId, sku } = params;
        try {
            const accessInfo = await this.getSubscriptionAccessInfo(tenantId);
            // Check if add-on is active for this learner
            const learnerSkus = accessInfo.learnerSkus[learnerId] ?? [];
            const hasAddon = learnerSkus.includes(sku) || accessInfo.activeSkus.includes(sku);
            // TODO: Check trial status from billing-svc
            return {
                hasAddon,
                isTrialing: false, // Would need additional API call
            };
        }
        catch (error) {
            console.error('[BillingAccess] Error checking addon access:', error);
            return { hasAddon: false };
        }
    }
    /**
     * Check if a tenant is in limited mode.
     */
    async isLimitedMode(params) {
        try {
            const accessInfo = await this.getSubscriptionAccessInfo(params.tenantId);
            return accessInfo.limitedMode;
        }
        catch (error) {
            console.error('[BillingAccess] Error checking limited mode:', error);
            return false; // Fail open
        }
    }
    /**
     * Get full subscription access info for a tenant.
     * Results are cached for performance.
     */
    async getSubscriptionAccessInfo(tenantId) {
        const cacheKey = `tenant:${tenantId}`;
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Fetch from billing-svc
        const response = await this.fetchWithTimeout(`${this.config.billingServiceUrl}/internal/billing/access/${tenantId}`);
        if (!response.ok) {
            if (response.status === 404) {
                // No subscription found
                const noSub = {
                    hasActiveSubscription: false,
                    status: null,
                    limitedMode: false,
                    activeSkus: [],
                    learnerSkus: {},
                };
                this.cache.set(cacheKey, noSub, this.config.cacheTtlMs);
                return noSub;
            }
            throw new Error(`Billing service error: ${response.status}`);
        }
        const data = (await response.json());
        this.cache.set(cacheKey, data, this.config.cacheTtlMs);
        return data;
    }
    /**
     * Invalidate cache for a tenant (call after subscription changes)
     */
    invalidateCache(tenantId) {
        this.cache.invalidate(`tenant:${tenantId}`);
    }
    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
    }
    // ─────────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────────
    async fetchWithTimeout(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
            return await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FASTIFY PLUGIN HELPER
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Create a Fastify preHandler hook for billing access checks.
 * Use this to protect routes that require active subscription.
 */
export function createBillingAccessHook(client) {
    return async (request, reply) => {
        const tenantId = request.headers['x-tenant-id'];
        const learnerId = request.headers['x-learner-id'];
        if (!tenantId) {
            return reply.code(400).send({ error: 'Missing x-tenant-id header' });
        }
        // If learnerId is provided, check session access
        if (learnerId) {
            const result = await client.canStartSession({ tenantId, learnerId });
            if (!result.allowed) {
                return reply.code(402).send({
                    error: 'SUBSCRIPTION_REQUIRED',
                    message: result.reason,
                    limitedMode: result.limitedMode,
                });
            }
        }
        else {
            // Just check limited mode for tenant-level access
            const isLimited = await client.isLimitedMode({ tenantId });
            if (isLimited) {
                return reply.code(402).send({
                    error: 'SUBSCRIPTION_PAST_DUE',
                    message: 'Your subscription is past due. Please update your payment method.',
                    limitedMode: true,
                });
            }
        }
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// EXPRESS MIDDLEWARE HELPER
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Create an Express middleware for billing access checks.
 */
export function createBillingAccessMiddleware(client) {
    return async (req, res, next) => {
        const tenantId = req.headers['x-tenant-id'];
        const learnerId = req.headers['x-learner-id'];
        if (!tenantId) {
            return res.status(400).json({ error: 'Missing x-tenant-id header' });
        }
        if (learnerId) {
            const result = await client.canStartSession({ tenantId, learnerId });
            if (!result.allowed) {
                return res.status(402).json({
                    error: 'SUBSCRIPTION_REQUIRED',
                    message: result.reason,
                    limitedMode: result.limitedMode,
                });
            }
        }
        else {
            const isLimited = await client.isLimitedMode({ tenantId });
            if (isLimited) {
                return res.status(402).json({
                    error: 'SUBSCRIPTION_PAST_DUE',
                    message: 'Your subscription is past due. Please update your payment method.',
                    limitedMode: true,
                });
            }
        }
        next();
    };
}
//# sourceMappingURL=index.js.map