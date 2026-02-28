/**
 * Entitlement Service Unit Tests
 *
 * Tests for tutor access control via billing-svc integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ══════════════════════════════════════════════════════════════════════════════

vi.mock('../config.js', () => ({
  config: {
    billingSvcUrl: 'http://localhost:3150',
  },
}));

// ══════════════════════════════════════════════════════════════════════════════
// IMPORTS (after mocks)
// ══════════════════════════════════════════════════════════════════════════════

import { EntitlementService } from './entitlement.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('EntitlementService', () => {
  let service: EntitlementService;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EntitlementService();
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  // ── checkTutorEntitlement ───────────────────────────────────────────────

  describe('checkTutorEntitlement', () => {
    it('returns hasAccess true for active subscription', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            hasAccess: true,
            plan: 'PRO',
            trialEndsAt: null,
          }),
          { status: 200 },
        ),
      );

      const result = await service.checkTutorEntitlement('tenant-001', 'MATH');

      expect(result.hasAccess).toBe(true);
      expect(result.plan).toBe('PRO');
      expect(result.upgradeUrl).toContain('ADDON_TUTOR_MATH');
    });

    it('returns hasAccess false for expired subscription', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            hasAccess: false,
            reason: 'Subscription expired',
          }),
          { status: 200 },
        ),
      );

      const result = await service.checkTutorEntitlement('tenant-001', 'MATH');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Subscription expired');
    });

    it('returns hasAccess true for bundle subscription', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            hasAccess: true,
            plan: 'BUNDLE',
          }),
          { status: 200 },
        ),
      );

      const result = await service.checkTutorEntitlement('tenant-001', 'SCIENCE');
      expect(result.hasAccess).toBe(true);
    });

    it('returns hasAccess true with trial info', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            hasAccess: true,
            plan: 'TRIAL',
            trialEndsAt: '2026-03-01T00:00:00Z',
          }),
          { status: 200 },
        ),
      );

      const result = await service.checkTutorEntitlement('tenant-001', 'MATH');

      expect(result.hasAccess).toBe(true);
      expect(result.trialEndsAt).toBe('2026-03-01T00:00:00Z');
    });

    it('fail-open in development when billing service is unavailable', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Service Unavailable', { status: 503 }),
      );

      process.env.NODE_ENV = 'development';
      const result = await service.checkTutorEntitlement('tenant-001', 'MATH');

      expect(result.hasAccess).toBe(true);
    });

    it('fail-closed in production when billing service is unavailable', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Service Unavailable', { status: 503 }),
      );

      process.env.NODE_ENV = 'production';
      const result = await service.checkTutorEntitlement('tenant-001', 'MATH');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Unable to verify subscription');
    });

    it('fail-open in development when fetch throws', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      process.env.NODE_ENV = 'development';
      const result = await service.checkTutorEntitlement('tenant-001', 'MATH');

      expect(result.hasAccess).toBe(true);
    });

    it('fail-closed in production when fetch throws', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      process.env.NODE_ENV = 'production';
      const result = await service.checkTutorEntitlement('tenant-001', 'MATH');

      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Billing service unavailable');
    });

    it('constructs correct feature name from subject', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ hasAccess: true }), { status: 200 }),
      );

      await service.checkTutorEntitlement('tenant-001', 'science');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('feature=TUTOR_SCIENCE'),
        expect.anything(),
      );
    });

    it('uses upgrade URL from billing-svc response when available', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            hasAccess: false,
            upgradeUrl: '/custom-upgrade-path',
          }),
          { status: 200 },
        ),
      );

      const result = await service.checkTutorEntitlement('tenant-001', 'MATH');
      expect(result.upgradeUrl).toBe('/custom-upgrade-path');
    });
  });

  // ── checkTutorAccess (convenience wrapper) ──────────────────────────────

  describe('checkTutorAccess', () => {
    it('delegates to checkTutorEntitlement for subject-specific check', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ hasAccess: true }), { status: 200 }),
      );

      const result = await service.checkTutorAccess('tenant-001', 'MATH');
      expect(result.allowed).toBe(true);
    });

    it('checks base aiTutor feature when no subject provided', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ hasAccess: { allowed: true } }),
          { status: 200 },
        ),
      );

      const result = await service.checkTutorAccess('tenant-001');
      expect(result.allowed).toBe(true);

      // Should call the check-feature endpoint, not the internal entitlements endpoint
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/entitlements/check-feature'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('aiTutor'),
        }),
      );
    });

    it('returns allowed false when base feature is denied', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ hasAccess: { allowed: false, reason: 'Free plan' } }),
          { status: 200 },
        ),
      );

      const result = await service.checkTutorAccess('tenant-001');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Free plan');
    });
  });
});
