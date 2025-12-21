/**
 * Entitlements Service
 *
 * Manages feature access and limits based on subscription plans:
 * - Feature flag checks
 * - Usage limit enforcement
 * - Plan-based entitlements sync
 * - Grace period handling
 */

import { PLAN_ENTITLEMENTS, type Plan, type Entitlements, type PlanFeatures, type PlanLimits } from '../config/plans.config.js';
import { stripeConfig } from '../config/stripe.config.js';
import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface UsageCheck {
  /** Current usage amount */
  used: number;
  /** Maximum allowed (null = unlimited) */
  limit: number | null;
  /** Whether limit is exceeded */
  exceeded: boolean;
  /** Remaining capacity (null = unlimited) */
  remaining: number | null;
  /** Percentage used (null if unlimited) */
  percentUsed: number | null;
}

export interface TenantEntitlements extends Entitlements {
  /** Tenant ID */
  tenantId: string;
  /** Whether subscription is active */
  isActive: boolean;
  /** Whether in grace period */
  inGracePeriod: boolean;
  /** Grace period end date (if applicable) */
  gracePeriodEndsAt: Date | null;
  /** Current period end date */
  currentPeriodEnd: Date | null;
  /** Seat usage */
  seats: {
    learnersUsed: number;
    teachersUsed: number;
    adminsUsed: number;
  };
}

export interface FeatureAccessResult {
  /** Whether access is granted */
  allowed: boolean;
  /** Reason if denied */
  reason?: string | undefined;
  /** Upgrade prompt if applicable */
  upgradePrompt?: {
    requiredPlan: Plan;
    message: string;
  } | undefined;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENTITLEMENTS SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class EntitlementsService {
  private readonly cache = new Map<string, { entitlements: TenantEntitlements; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60_000; // 1 minute cache

  /**
   * Get entitlements for a tenant
   */
  async getEntitlements(tenantId: string): Promise<TenantEntitlements | null> {
    // Check cache
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.entitlements;
    }

    // Find billing account for tenant
    const billingAccount = await prisma.billingAccount.findFirst({
      where: { tenantId },
    });

    if (!billingAccount) {
      return null;
    }

    // Fetch subscription through billing account
    const subscription = await prisma.subscription.findFirst({
      where: {
        billingAccountId: billingAccount.id,
        status: { in: ['ACTIVE', 'IN_TRIAL', 'PAST_DUE'] },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get seat usage
    const [learnersUsed, teachersUsed, adminsUsed] = await Promise.all([
      this.countLearners(tenantId),
      this.countTeachers(tenantId),
      this.countAdmins(tenantId),
    ]);

    let entitlements: TenantEntitlements;

    if (subscription) {
      // Get plan SKU from subscription
      const planSku = subscription.plan.sku as Plan | undefined;
      const plan = planSku && planSku in PLAN_ENTITLEMENTS ? planSku : 'FREE';
      const planEntitlements = PLAN_ENTITLEMENTS[plan];
      
      // Check grace period
      const isActive = subscription.status === 'ACTIVE' || subscription.status === 'IN_TRIAL';
      const inGracePeriod = subscription.status === 'PAST_DUE';
      const gracePeriodEndsAt = inGracePeriod 
        ? new Date(subscription.currentPeriodEnd.getTime() + stripeConfig.gracePeriodDays * 24 * 60 * 60 * 1000)
        : null;

      entitlements = {
        ...planEntitlements,
        tenantId,
        isActive,
        inGracePeriod,
        gracePeriodEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        seats: { learnersUsed, teachersUsed, adminsUsed },
      };
    } else {
      // No active subscription - use FREE plan
      entitlements = {
        ...PLAN_ENTITLEMENTS.FREE,
        tenantId,
        isActive: true,
        inGracePeriod: false,
        gracePeriodEndsAt: null,
        currentPeriodEnd: null,
        seats: { learnersUsed, teachersUsed, adminsUsed },
      };
    }

    // Cache result
    this.cache.set(tenantId, {
      entitlements,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return entitlements;
  }

  /**
   * Check if a tenant has access to a feature
   */
  async checkFeatureAccess(
    tenantId: string,
    feature: keyof PlanFeatures
  ): Promise<FeatureAccessResult> {
    const entitlements = await this.getEntitlements(tenantId);

    if (!entitlements) {
      // No subscription - use FREE plan restrictions
      const freeEntitlements = PLAN_ENTITLEMENTS.FREE;
      if (!freeEntitlements.features[feature]) {
        const requiredPlan = this.findPlanWithFeature(feature);
        return {
          allowed: false,
          reason: `Feature "${feature}" requires a subscription`,
          upgradePrompt: requiredPlan 
            ? { requiredPlan, message: `Upgrade to ${requiredPlan} to unlock ${feature}` }
            : undefined,
        };
      }
      return { allowed: true };
    }

    // Check if subscription is active
    if (!entitlements.isActive && !entitlements.inGracePeriod) {
      return {
        allowed: false,
        reason: 'Subscription is not active',
        upgradePrompt: {
          requiredPlan: 'PRO',
          message: 'Please renew your subscription to access this feature.',
        },
      };
    }

    // Check if feature is enabled in plan
    if (!entitlements.features[feature]) {
      const requiredPlan = this.findPlanWithFeature(feature);
      return {
        allowed: false,
        reason: `Feature "${feature}" is not included in your ${entitlements.plan} plan`,
        upgradePrompt: requiredPlan 
          ? { requiredPlan, message: `Upgrade to ${requiredPlan} to unlock ${feature}` }
          : undefined,
      };
    }

    return { allowed: true };
  }

  /**
   * Check usage against a limit
   */
  async checkLimitUsage(
    tenantId: string,
    limitType: keyof PlanLimits,
    currentUsage?: number
  ): Promise<UsageCheck> {
    const entitlements = await this.getEntitlements(tenantId);
    const effectiveEntitlements = entitlements ?? { limits: PLAN_ENTITLEMENTS.FREE.limits };
    const limit = effectiveEntitlements.limits[limitType];

    // Get current usage if not provided
    const used = currentUsage ?? await this.getCurrentUsage(tenantId, limitType);

    if (limit === null) {
      // Unlimited
      return {
        used,
        limit: null,
        exceeded: false,
        remaining: null,
        percentUsed: null,
      };
    }

    return {
      used,
      limit,
      exceeded: used >= limit,
      remaining: Math.max(0, limit - used),
      percentUsed: Math.round((used / limit) * 100),
    };
  }

  /**
   * Check if tenant can add more learners
   */
  async canAddLearner(tenantId: string): Promise<FeatureAccessResult> {
    const entitlements = await this.getEntitlements(tenantId);
    const effectiveEntitlements = entitlements ?? {
      seats: { learnersUsed: 0, teachersUsed: 0, adminsUsed: 0 },
      maxLearners: PLAN_ENTITLEMENTS.FREE.maxLearners,
    };
    const { learnersUsed } = effectiveEntitlements.seats;
    const maxLearners = effectiveEntitlements.maxLearners;

    if (learnersUsed >= maxLearners) {
      const requiredPlan = this.findPlanWithMoreLearners(maxLearners);
      return {
        allowed: false,
        reason: `Maximum learner limit (${maxLearners}) reached`,
        upgradePrompt: requiredPlan 
          ? { requiredPlan, message: `Upgrade to ${requiredPlan} to add more learners` }
          : undefined,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if tenant can add more teachers
   */
  async canAddTeacher(tenantId: string): Promise<FeatureAccessResult> {
    const entitlements = await this.getEntitlements(tenantId);
    const effectiveEntitlements = entitlements ?? {
      seats: { learnersUsed: 0, teachersUsed: 0, adminsUsed: 0 },
      maxTeachers: PLAN_ENTITLEMENTS.FREE.maxTeachers,
    };
    const { teachersUsed } = effectiveEntitlements.seats;
    const maxTeachers = effectiveEntitlements.maxTeachers;

    if (teachersUsed >= maxTeachers) {
      const requiredPlan = this.findPlanWithMoreTeachers(maxTeachers);
      return {
        allowed: false,
        reason: `Maximum teacher limit (${maxTeachers}) reached`,
        upgradePrompt: requiredPlan 
          ? { requiredPlan, message: `Upgrade to ${requiredPlan} to add more teachers` }
          : undefined,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if tenant has access to a module
   */
  async hasModuleAccess(tenantId: string, module: string): Promise<boolean> {
    const entitlements = await this.getEntitlements(tenantId);
    if (!entitlements) {
      return false;
    }
    return entitlements.modules.includes(module);
  }

  /**
   * Sync entitlements after subscription change
   */
  async syncEntitlements(tenantId: string, plan: Plan): Promise<void> {
    // Invalidate cache
    this.cache.delete(tenantId);

    // Get fresh entitlements
    const entitlements = await this.getEntitlements(tenantId);

    console.log('[EntitlementsService] Synced entitlements', {
      tenantId,
      plan,
      features: entitlements 
        ? Object.keys(entitlements.features).filter(
            f => entitlements.features[f as keyof PlanFeatures]
          )
        : [],
    });
  }

  /**
   * Invalidate cache for a tenant
   */
  invalidateCache(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  /**
   * Clear all cached entitlements
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  private async countLearners(_tenantId: string): Promise<number> {
    // This would query the actual user/learner table
    // Placeholder implementation
    return 0;
  }

  private async countTeachers(_tenantId: string): Promise<number> {
    // This would query the actual user/teacher table
    return 0;
  }

  private async countAdmins(_tenantId: string): Promise<number> {
    // This would query the actual user/admin table
    return 0;
  }

  private async getCurrentUsage(_tenantId: string, _limitType: keyof PlanLimits): Promise<number> {
    // This would query actual usage metrics based on limitType
    // Placeholder implementation - returns 0 for all limit types
    return 0;
  }

  private findPlanWithFeature(feature: keyof PlanFeatures): Plan | null {
    const plans: Plan[] = ['PRO', 'PREMIUM', 'SCHOOL', 'DISTRICT'];
    for (const plan of plans) {
      if (PLAN_ENTITLEMENTS[plan].features[feature]) {
        return plan;
      }
    }
    return null;
  }

  private findPlanWithMoreLearners(currentMax: number): Plan | null {
    const plans: Plan[] = ['PRO', 'PREMIUM', 'SCHOOL', 'DISTRICT'];
    for (const plan of plans) {
      if (PLAN_ENTITLEMENTS[plan].maxLearners > currentMax) {
        return plan;
      }
    }
    return null;
  }

  private findPlanWithMoreTeachers(currentMax: number): Plan | null {
    const plans: Plan[] = ['PRO', 'PREMIUM', 'SCHOOL', 'DISTRICT'];
    for (const plan of plans) {
      if (PLAN_ENTITLEMENTS[plan].maxTeachers > currentMax) {
        return plan;
      }
    }
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const entitlementsService = new EntitlementsService();

// Convenience exports
export const getEntitlements = (tenantId: string) => entitlementsService.getEntitlements(tenantId);
export const checkFeatureAccess = (tenantId: string, feature: keyof PlanFeatures) => 
  entitlementsService.checkFeatureAccess(tenantId, feature);
export const checkLimitUsage = (tenantId: string, limitType: keyof PlanLimits, usage?: number) =>
  entitlementsService.checkLimitUsage(tenantId, limitType, usage);
