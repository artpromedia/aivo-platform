import { config } from '../config.js';

export interface TutorEntitlementResult {
  allowed: boolean;
  reason?: string;
  sessionsRemaining?: number;
}

export class EntitlementService {
  async checkTutorAccess(tenantId: string): Promise<TutorEntitlementResult> {
    try {
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
      return { allowed: data.allowed, reason: data.reason };
    } catch {
      // Fail-open in development, fail-closed in production
      if (process.env.NODE_ENV !== 'production') {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Billing service unavailable' };
    }
  }
}

export const entitlementService = new EntitlementService();
