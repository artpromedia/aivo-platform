/**
 * Internal Entitlement Routes Tests
 *
 * Tests for the internal API endpoints used by other services
 * to check marketplace entitlements.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

import { internalEntitlementRoutes } from '../routes/internal-entitlement.routes.js';
import { EntitlementService } from '../services/entitlement.service.js';

// Mock the EntitlementService
vi.mock('../services/entitlement.service.js', () => ({
  EntitlementService: vi.fn().mockImplementation(() => ({
    checkEntitlement: vi.fn(),
    batchCheckEntitlements: vi.fn(),
    getEntitledMarketplaceItems: vi.fn(),
    getEntitledLoIds: vi.fn(),
  })),
}));

describe('Internal Entitlement Routes', () => {
  let app: FastifyInstance;
  let mockService: ReturnType<typeof EntitlementService.prototype>;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    await app.register(internalEntitlementRoutes);

    // Get mock instance
    mockService = new EntitlementService() as ReturnType<
      typeof EntitlementService.prototype
    >;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /internal/entitlements/check', () => {
    it('should return entitled status for a single LO', async () => {
      mockService.checkEntitlement = vi.fn().mockResolvedValue({
        entitled: true,
        licenseId: 'license-1',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/check',
        payload: {
          tenantId: 'tenant-1',
          loId: 'lo-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entitled).toBe(true);
    });

    it('should include scope parameters in the check', async () => {
      mockService.checkEntitlement = vi.fn().mockResolvedValue({
        entitled: true,
      });

      await app.inject({
        method: 'POST',
        url: '/internal/entitlements/check',
        payload: {
          tenantId: 'tenant-1',
          loId: 'lo-123',
          schoolId: 'school-A',
          gradeBand: 'K-2',
        },
      });

      expect(mockService.checkEntitlement).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        loId: 'lo-123',
        schoolId: 'school-A',
        gradeBand: 'K-2',
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/check',
        payload: {
          // Missing tenantId and loId
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /internal/entitlements/batch-check', () => {
    it('should return batch entitlement results', async () => {
      mockService.batchCheckEntitlements = vi.fn().mockResolvedValue({
        entitled: ['lo-1', 'lo-2'],
        denied: [{ loId: 'lo-3', reason: 'no_license' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/batch-check',
        payload: {
          tenantId: 'tenant-1',
          loIds: ['lo-1', 'lo-2', 'lo-3'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entitled).toHaveLength(2);
      expect(body.denied).toHaveLength(1);
    });

    it('should handle empty loIds array', async () => {
      mockService.batchCheckEntitlements = vi.fn().mockResolvedValue({
        entitled: [],
        denied: [],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/batch-check',
        payload: {
          tenantId: 'tenant-1',
          loIds: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entitled).toEqual([]);
      expect(body.denied).toEqual([]);
    });
  });

  describe('POST /internal/entitlements/entitled-content', () => {
    it('should return entitled marketplace items', async () => {
      mockService.getEntitledMarketplaceItems = vi.fn().mockResolvedValue([
        {
          id: 'item-1',
          title: 'Math Pack',
          vendor: { id: 'v1', name: 'Vendor' },
          license: { seatLimit: 100, seatsUsed: 50 },
        },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/entitled-content',
        payload: {
          tenantId: 'tenant-1',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Math Pack');
    });

    it('should filter by item type', async () => {
      mockService.getEntitledMarketplaceItems = vi.fn().mockResolvedValue([]);

      await app.inject({
        method: 'POST',
        url: '/internal/entitlements/entitled-content',
        payload: {
          tenantId: 'tenant-1',
          itemType: 'CONTENT_PACK',
        },
      });

      expect(mockService.getEntitledMarketplaceItems).toHaveBeenCalledWith(
        expect.objectContaining({
          itemType: 'CONTENT_PACK',
        }),
      );
    });
  });

  describe('POST /internal/entitlements/entitled-los', () => {
    it('should return entitled LO IDs', async () => {
      mockService.getEntitledLoIds = vi.fn().mockResolvedValue([
        'lo-1',
        'lo-2',
        'lo-3',
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/entitled-los',
        payload: {
          tenantId: 'tenant-1',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.loIds).toHaveLength(3);
    });
  });

  describe('POST /internal/entitlements/filter-los', () => {
    it('should filter LO IDs by entitlement', async () => {
      mockService.batchCheckEntitlements = vi.fn().mockResolvedValue({
        entitled: ['lo-1', 'lo-3'],
        denied: [{ loId: 'lo-2', reason: 'no_license' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/filter-los',
        payload: {
          tenantId: 'tenant-1',
          loIds: ['lo-1', 'lo-2', 'lo-3'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entitled).toEqual(['lo-1', 'lo-3']);
    });
  });
});
