/**
 * Trial Management Service (Sprint 11 — Task 5)
 *
 * Manages the 30-day free trial lifecycle:
 * - Trial countdown & status tracking
 * - Expiry warning notifications (7 days before)
 * - Grace period after expiry (7 days)
 * - Conversion to paid plan (Stripe checkout)
 * - Auto-downgrade to free tier after grace period
 *
 * @module services/trial-management.service
 */

import type { Redis } from 'ioredis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClient = any;

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export type TrialStatusType = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CONVERTED';

export interface TrialInfo {
  tenantId: string;
  tenantName: string;
  trialStatus: TrialStatusType | null;
  trialEndsAt: string | null;
  daysRemaining: number;
  planType: string;
  isInGracePeriod: boolean;
  gracePeriodEndsAt: string | null;
  canConvert: boolean;
  features: {
    maxLearners: number;
    maxSchools: number;
    aiModelsAvailable: string[];
    storageGB: number;
  };
}

export interface ConversionResult {
  success: boolean;
  tenantId: string;
  newPlanType: string;
  checkoutUrl?: string;
  stripeSubscriptionId?: string;
  error?: string;
}

export interface TrialManagementServiceConfig {
  prisma: PrismaClient;
  redis?: Redis | null;
  trialDurationDays?: number;
  expiryWarningDays?: number;
  gracePeriodDays?: number;
  emailServiceUrl?: string;
  appBaseUrl?: string;
  stripeSecretKey?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Plan Limits
// ══════════════════════════════════════════════════════════════════════════════

const PLAN_LIMITS: Record<string, { maxLearners: number; maxSchools: number; storageGB: number; aiModels: string[] }> = {
  FREE: {
    maxLearners: 25,
    maxSchools: 1,
    storageGB: 1,
    aiModels: ['gpt-4o-mini'],
  },
  TRIAL: {
    maxLearners: 500,
    maxSchools: 10,
    storageGB: 50,
    aiModels: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'],
  },
  STARTER: {
    maxLearners: 500,
    maxSchools: 5,
    storageGB: 25,
    aiModels: ['gpt-4o', 'gpt-4o-mini'],
  },
  PROFESSIONAL: {
    maxLearners: 5000,
    maxSchools: 50,
    storageGB: 100,
    aiModels: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'],
  },
  ENTERPRISE: {
    maxLearners: 0, // unlimited
    maxSchools: 0,
    storageGB: 500,
    aiModels: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'claude-3-opus'],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// Service Implementation
// ══════════════════════════════════════════════════════════════════════════════

export class TrialManagementService {
  private readonly prisma: PrismaClient;
  private readonly redis: Redis | null;
  private readonly trialDurationDays: number;
  private readonly expiryWarningDays: number;
  private readonly gracePeriodDays: number;
  private readonly emailServiceUrl: string;
  private readonly appBaseUrl: string;
  private readonly stripeSecretKey: string;

  constructor(config: TrialManagementServiceConfig) {
    this.prisma = config.prisma;
    this.redis = config.redis ?? null;
    this.trialDurationDays = config.trialDurationDays ?? 30;
    this.expiryWarningDays = config.expiryWarningDays ?? 7;
    this.gracePeriodDays = config.gracePeriodDays ?? 7;
    this.emailServiceUrl = config.emailServiceUrl ?? '';
    this.appBaseUrl = config.appBaseUrl ?? 'https://app.aivo.ai';
    this.stripeSecretKey = config.stripeSecretKey ?? '';
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Trial Status
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get trial information for a tenant.
   */
  async getTrialInfo(tenantId: string): Promise<TrialInfo> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const now = new Date();
    const trialEndsAt = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
    const daysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const isInGracePeriod = tenant.trialStatus === 'EXPIRED' &&
      trialEndsAt !== null &&
      now.getTime() < trialEndsAt.getTime() + this.gracePeriodDays * 24 * 60 * 60 * 1000;

    const gracePeriodEndsAt = trialEndsAt && isInGracePeriod
      ? new Date(trialEndsAt.getTime() + this.gracePeriodDays * 24 * 60 * 60 * 1000)
      : null;

    const planType = tenant.planType ?? 'FREE';
    const limits = PLAN_LIMITS[planType] ?? PLAN_LIMITS.FREE;

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      trialStatus: tenant.trialStatus,
      trialEndsAt: trialEndsAt?.toISOString() ?? null,
      daysRemaining,
      planType,
      isInGracePeriod,
      gracePeriodEndsAt: gracePeriodEndsAt?.toISOString() ?? null,
      canConvert: tenant.trialStatus === 'ACTIVE' || tenant.trialStatus === 'EXPIRING_SOON' || isInGracePeriod,
      features: {
        maxLearners: limits.maxLearners,
        maxSchools: limits.maxSchools,
        aiModelsAvailable: limits.aiModels,
        storageGB: limits.storageGB,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Trial Conversion
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Convert a trial tenant to a paid subscription.
   */
  async convertToPaid(
    tenantId: string,
    planType: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
    billingEmail?: string,
  ): Promise<ConversionResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.trialStatus === 'CONVERTED') {
      return {
        success: true,
        tenantId,
        newPlanType: tenant.planType,
        stripeSubscriptionId: tenant.stripeSubscriptionId,
      };
    }

    let checkoutUrl: string | undefined;
    let subscriptionId: string | undefined;

    // Create/update Stripe checkout if configured
    if (this.stripeSecretKey) {
      try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(this.stripeSecretKey, { apiVersion: '2024-06-20' as Stripe.LatestApiVersion });

        // Ensure Stripe customer exists
        let customerId = tenant.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: billingEmail ?? tenant.settingsJson?.adminSetup?.email ?? '',
            name: tenant.name,
            metadata: { tenantId },
          });
          customerId = customer.id;
        }

        // Create checkout session for the selected plan
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'subscription',
          line_items: [
            {
              price: this.getPriceIdForPlan(planType),
              quantity: 1,
            },
          ],
          success_url: `${this.appBaseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${this.appBaseUrl}/billing/cancel`,
          metadata: { tenantId, planType },
          subscription_data: {
            metadata: { tenantId, planType },
          },
        });

        checkoutUrl = session.url ?? undefined;

        // Update tenant with Stripe info
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: {
            stripeCustomerId: customerId,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, tenantId, newPlanType: planType, error: message };
      }
    }

    // If no Stripe, do a direct plan upgrade
    if (!this.stripeSecretKey) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          planType,
          trialStatus: 'CONVERTED',
          billingPlanId: planType.toLowerCase(),
        },
      });

      subscriptionId = `manual-${tenantId}`;
    }

    // Audit log
    await this.prisma.tenantAuditEvent.create({
      data: {
        tenantId,
        eventType: 'TRIAL_CONVERTED',
        description: `Trial converted to ${planType} plan`,
        metadata: { planType, checkoutUrl, subscriptionId },
      },
    });

    return {
      success: true,
      tenantId,
      newPlanType: planType,
      checkoutUrl,
      stripeSubscriptionId: subscriptionId,
    };
  }

  /**
   * Confirm a Stripe checkout session and activate the subscription.
   * Called after Stripe redirects back to success_url.
   */
  async confirmConversion(tenantId: string, stripeSessionId: string): Promise<ConversionResult> {
    if (!this.stripeSecretKey) {
      return { success: false, tenantId, newPlanType: 'TRIAL', error: 'Stripe not configured' };
    }

    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(this.stripeSecretKey, { apiVersion: '2024-06-20' as Stripe.LatestApiVersion });

      const session = await stripe.checkout.sessions.retrieve(stripeSessionId);

      if (session.payment_status !== 'paid') {
        return { success: false, tenantId, newPlanType: 'TRIAL', error: 'Payment not completed' };
      }

      const planType = (session.metadata?.planType ?? 'STARTER') as string;

      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          planType,
          trialStatus: 'CONVERTED',
          stripeSubscriptionId: session.subscription as string,
          billingPlanId: planType.toLowerCase(),
        },
      });

      return {
        success: true,
        tenantId,
        newPlanType: planType,
        stripeSubscriptionId: session.subscription as string,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, tenantId, newPlanType: 'TRIAL', error: message };
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Trial Lifecycle Jobs (called by cron / scheduler)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Check all active trials and update statuses.
   * Should be run daily by a cron job.
   */
  async processTrialExpirations(): Promise<{
    warned: number;
    expired: number;
    downgraded: number;
  }> {
    const now = new Date();
    const warningDate = new Date(now.getTime() + this.expiryWarningDays * 24 * 60 * 60 * 1000);
    const graceEnd = new Date(now.getTime() - this.gracePeriodDays * 24 * 60 * 60 * 1000);

    let warned = 0;
    let expired = 0;
    let downgraded = 0;

    // 1. Mark trials as EXPIRING_SOON
    const expiringSoon = await this.prisma.tenant.findMany({
      where: {
        trialStatus: 'ACTIVE',
        trialEndsAt: { lte: warningDate, gt: now },
      },
    });

    for (const tenant of expiringSoon) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { trialStatus: 'EXPIRING_SOON' },
      });

      await this.prisma.tenantAuditEvent.create({
        data: {
          tenantId: tenant.id,
          eventType: 'TRIAL_EXPIRING',
          description: `Trial expiring in ${Math.ceil((new Date(tenant.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`,
        },
      });

      // Send warning email (fire-and-forget)
      this.sendTrialWarningEmail(tenant).catch(() => {});
      warned++;
    }

    // 2. Mark expired trials
    const expiredTrials = await this.prisma.tenant.findMany({
      where: {
        trialStatus: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        trialEndsAt: { lte: now },
      },
    });

    for (const tenant of expiredTrials) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { trialStatus: 'EXPIRED' },
      });

      await this.prisma.tenantAuditEvent.create({
        data: {
          tenantId: tenant.id,
          eventType: 'TRIAL_EXPIRED',
          description: 'Trial period expired, entering grace period',
        },
      });

      this.sendTrialExpiredEmail(tenant).catch(() => {});
      expired++;
    }

    // 3. Downgrade tenants past grace period
    const pastGrace = await this.prisma.tenant.findMany({
      where: {
        trialStatus: 'EXPIRED',
        trialEndsAt: { lte: graceEnd },
      },
    });

    for (const tenant of pastGrace) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          planType: 'FREE',
          billingPlanId: 'free',
        },
      });

      // Update config to free tier limits
      await this.prisma.tenantConfig.updateMany({
        where: { tenantId: tenant.id },
        data: {
          dailyLLMCallLimit: 100,
          dailyTutorTurnLimit: 500,
          maxLearnersPerTenant: 25,
          storageQuotaGB: 1,
        },
      });

      await this.prisma.tenantAuditEvent.create({
        data: {
          tenantId: tenant.id,
          eventType: 'TRIAL_EXPIRED',
          description: 'Downgraded to FREE plan after grace period',
          metadata: { previousPlan: tenant.planType, newPlan: 'FREE' },
        },
      });

      downgraded++;
    }

    return { warned, expired, downgraded };
  }

  /**
   * Extend a trial by a given number of days.
   */
  async extendTrial(tenantId: string, additionalDays: number, reason?: string): Promise<TrialInfo> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    const currentEnd = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : new Date();
    const newEnd = new Date(currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        trialEndsAt: newEnd,
        trialStatus: 'ACTIVE',
      },
    });

    await this.prisma.tenantAuditEvent.create({
      data: {
        tenantId,
        eventType: 'TRIAL_STARTED',
        description: `Trial extended by ${additionalDays} days`,
        metadata: {
          previousEnd: currentEnd.toISOString(),
          newEnd: newEnd.toISOString(),
          reason,
        },
      },
    });

    return this.getTrialInfo(tenantId);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Helpers
  // ════════════════════════════════════════════════════════════════════════════

  private getPriceIdForPlan(planType: string): string {
    // Map plan names to Stripe price IDs (configured via env in production)
    const priceMap: Record<string, string> = {
      STARTER: process.env.STRIPE_PRICE_STARTER || 'price_starter_monthly',
      PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional_monthly',
      ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly',
    };
    return priceMap[planType] ?? 'price_starter_monthly';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async sendTrialWarningEmail(tenant: any): Promise<void> {
    if (!this.emailServiceUrl) return;

    try {
      await fetch(this.emailServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: tenant.settingsJson?.adminSetup?.email ?? '',
          template: 'trial-expiring',
          data: {
            organizationName: tenant.name,
            trialEndsAt: tenant.trialEndsAt?.toISOString(),
            upgradeUrl: `${this.appBaseUrl}/billing/upgrade`,
          },
        }),
      });
    } catch {
      // Silent fail — email is best-effort
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async sendTrialExpiredEmail(tenant: any): Promise<void> {
    if (!this.emailServiceUrl) return;

    try {
      await fetch(this.emailServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: tenant.settingsJson?.adminSetup?.email ?? '',
          template: 'trial-expired',
          data: {
            organizationName: tenant.name,
            gracePeriodDays: this.gracePeriodDays,
            upgradeUrl: `${this.appBaseUrl}/billing/upgrade`,
          },
        }),
      });
    } catch {
      // Silent fail
    }
  }
}
