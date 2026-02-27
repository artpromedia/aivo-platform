/**
 * Tutor Feature Entitlements
 *
 * Manages access control for AI tutor features based on
 * subscription add-ons. Checks if a tenant has purchased
 * the tutor add-on for specific subjects.
 */

import { prisma } from '../prisma.js';

export interface TutorEntitlement {
  allowed: boolean;
  subjects: string[];
  hasBundle: boolean;
  reason?: string;
}

export class TutorEntitlementsService {
  private readonly cache = new Map<string, { result: TutorEntitlement; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60_000;

  /**
   * Check if a tenant has access to the AI tutor feature
   */
  async checkTutorAccess(tenantId: string, subject?: string): Promise<TutorEntitlement> {
    const cacheKey = `${tenantId}:${subject ?? 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    // Find active subscriptions with tutor add-on plans
    const billingAccount = await prisma.billingAccount.findFirst({
      where: { tenantId },
    });

    if (!billingAccount) {
      const result: TutorEntitlement = {
        allowed: false,
        subjects: [],
        hasBundle: false,
        reason: 'No billing account found',
      };
      this.cache.set(cacheKey, { result, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return result;
    }

    // Fetch tutor add-on subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        billingAccountId: billingAccount.id,
        status: { in: ['ACTIVE', 'IN_TRIAL'] },
        plan: {
          sku: { startsWith: 'ADDON_TUTOR' },
        },
      },
      include: { plan: true },
    });

    if (subscriptions.length === 0) {
      const result: TutorEntitlement = {
        allowed: false,
        subjects: [],
        hasBundle: false,
        reason: 'No active tutor add-on subscription',
      };
      this.cache.set(cacheKey, { result, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return result;
    }

    // Extract enabled subjects
    const enabledSubjects = new Set<string>();
    let hasBundle = false;

    for (const sub of subscriptions) {
      const metadata = sub.plan.metadataJson as Record<string, unknown>;
      if (metadata?.isBundle) {
        hasBundle = true;
        const bundleSubjects = (metadata.subjects as string[]) ?? [];
        for (const s of bundleSubjects) enabledSubjects.add(s);
      } else {
        const planSubject = metadata?.subject as string;
        if (planSubject) enabledSubjects.add(planSubject);
      }
    }

    const subjects = Array.from(enabledSubjects);

    // If a specific subject is requested, check it
    if (subject && !enabledSubjects.has(subject)) {
      const result: TutorEntitlement = {
        allowed: false,
        subjects,
        hasBundle,
        reason: `Tutor add-on not active for subject: ${subject}`,
      };
      this.cache.set(cacheKey, { result, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return result;
    }

    const result: TutorEntitlement = {
      allowed: true,
      subjects,
      hasBundle,
    };
    this.cache.set(cacheKey, { result, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return result;
  }

  /**
   * Invalidate cache for a tenant
   */
  invalidateCache(tenantId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}

export const tutorEntitlementsService = new TutorEntitlementsService();
