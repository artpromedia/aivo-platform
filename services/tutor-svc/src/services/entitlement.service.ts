import { config } from '../config.js';

export interface TutorEntitlementResult {
  allowed: boolean;
  reason?: string;
  sessionsRemaining?: number;
}

export class EntitlementService {
  /**
   * Check tutor access for a tenant, optionally for a specific subject.
   * Calls billing-svc entitlements API to verify the ai_tutor feature
   * and optionally checks for subject-specific ADDON_TUTOR subscriptions.
   */
  async checkTutorAccess(tenantId: string, subject?: string): Promise<TutorEntitlementResult> {
    try {
      // Check base ai_tutor feature access
      const response = await fetch(
        `${config.billingSvcUrl}/api/v1/billing/entitlements/${tenantId}/features/ai_tutor`,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        // If billing service is unavailable, allow access (fail-open for dev)
        if (process.env.NODE_ENV !== 'production') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Unable to verify subscription' };
      }

      const data = (await response.json()) as { allowed: boolean; reason?: string };

      if (!data.allowed) {
        return { allowed: false, reason: data.reason ?? 'Tutor feature not available on your plan' };
      }

      // If subject specified, also check subject-specific add-on
      if (subject) {
        return this.checkSubjectAccess(tenantId, subject);
      }

      return { allowed: true };
    } catch {
      // Fail-open in development, fail-closed in production
      if (process.env.NODE_ENV !== 'production') {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Billing service unavailable' };
    }
  }

  /**
   * Check subject-specific tutor add-on access.
   * Queries billing-svc for ADDON_TUTOR subscriptions matching the subject.
   */
  private async checkSubjectAccess(tenantId: string, subject: string): Promise<TutorEntitlementResult> {
    try {
      const response = await fetch(
        `${config.billingSvcUrl}/api/v1/billing/entitlements/${tenantId}/tutor/${subject.toLowerCase()}`,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        // Subject-level check is optional — allow if billing doesn't support it
        if (response.status === 404) {
          return { allowed: true };
        }
        if (process.env.NODE_ENV !== 'production') {
          return { allowed: true };
        }
        return { allowed: false, reason: `Unable to verify ${subject} tutor access` };
      }

      const data = (await response.json()) as { allowed: boolean; reason?: string; sessionsRemaining?: number };
      return {
        allowed: data.allowed,
        reason: data.reason,
        sessionsRemaining: data.sessionsRemaining,
      };
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Billing service unavailable' };
    }
  }
}

export const entitlementService = new EntitlementService();
