import { config } from '../config.js';

export interface TutorEntitlementResult {
  hasAccess: boolean;
  plan?: string;
  trialEndsAt?: string;
  upgradeUrl: string;
  reason?: string;
}

export class EntitlementService {
  /**
   * Check if a tenant has access to a tutor for a specific subject.
   * Calls billing-svc internal entitlements endpoint:
   *   GET /internal/entitlements/check?tenantId={tenantId}&feature=TUTOR_{subject}
   *
   * This checks both base plan features (aiTutor on PRO+) and
   * add-on subscriptions (ADDON_TUTOR_*_MONTHLY, ADDON_TUTOR_BUNDLE_MONTHLY).
   */
  async checkTutorEntitlement(tenantId: string, subject: string): Promise<TutorEntitlementResult> {
    const feature = `TUTOR_${subject.toUpperCase()}`;
    const upgradeUrl = `/billing/add-ons?highlight=ADDON_TUTOR_${subject.toUpperCase()}`;

    try {
      const response = await fetch(
        `${config.billingSvcUrl}/internal/entitlements/check?tenantId=${encodeURIComponent(tenantId)}&feature=${encodeURIComponent(feature)}`,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        // If billing service is unavailable, fail-open in dev
        if (process.env.NODE_ENV !== 'production') {
          return { hasAccess: true, upgradeUrl };
        }
        return { hasAccess: false, upgradeUrl, reason: 'Unable to verify subscription' };
      }

      const data = (await response.json()) as {
        hasAccess: boolean;
        plan?: string;
        trialEndsAt?: string;
        reason?: string;
        upgradeUrl?: string;
      };

      return {
        hasAccess: data.hasAccess,
        plan: data.plan,
        trialEndsAt: data.trialEndsAt,
        upgradeUrl: data.upgradeUrl ?? upgradeUrl,
        reason: data.reason,
      };
    } catch {
      // Fail-open in development, fail-closed in production
      if (process.env.NODE_ENV !== 'production') {
        return { hasAccess: true, upgradeUrl };
      }
      return { hasAccess: false, upgradeUrl, reason: 'Billing service unavailable' };
    }
  }

  /**
   * Convenience method matching the Sprint 2 API used by session routes.
   * Returns `{ allowed, reason }` for backwards compatibility.
   */
  async checkTutorAccess(tenantId: string, subject?: string): Promise<{ allowed: boolean; reason?: string }> {
    if (!subject) {
      // If no subject, check base ai_tutor feature on the plan
      try {
        const response = await fetch(
          `${config.billingSvcUrl}/entitlements/check-feature`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-tenant-id': tenantId,
              'x-user-id': 'system',
            },
            body: JSON.stringify({ feature: 'aiTutor' }),
          },
        );

        if (!response.ok) {
          if (process.env.NODE_ENV !== 'production') return { allowed: true };
          return { allowed: false, reason: 'Unable to verify subscription' };
        }

        const data = (await response.json()) as { hasAccess: { allowed: boolean; reason?: string } };
        return { allowed: data.hasAccess.allowed, reason: data.hasAccess.reason };
      } catch {
        if (process.env.NODE_ENV !== 'production') return { allowed: true };
        return { allowed: false, reason: 'Billing service unavailable' };
      }
    }

    // Subject-specific check via internal entitlements endpoint
    const result = await this.checkTutorEntitlement(tenantId, subject);
    return { allowed: result.hasAccess, reason: result.reason };
  }
}

export const entitlementService = new EntitlementService();

/**
 * Standalone function matching Sprint 3 spec:
 * checkTutorEntitlement(tenantId, subject)
 */
export async function checkTutorEntitlement(
  tenantId: string,
  subject: string,
): Promise<TutorEntitlementResult> {
  return entitlementService.checkTutorEntitlement(tenantId, subject);
}
