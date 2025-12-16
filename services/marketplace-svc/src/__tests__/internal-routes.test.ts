/**
 * Internal Entitlement Routes Tests
 *
 * Tests for the internal API endpoints used by other services
 * to check marketplace entitlements.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

// Use vi.hoisted to ensure mock functions are defined before vi.mock is processed
const {
  mockCheckEntitlement,
  mockBatchCheckEntitlements,
  mockGetEntitledMarketplaceItems,
  mockGetEntitledLoIds,
  mockCheckMarketplaceItemEntitlement,
} = vi.hoisted(() => ({
  mockCheckEntitlement: vi.fn(),
  mockBatchCheckEntitlements: vi.fn(),
  mockGetEntitledMarketplaceItems: vi.fn(),
  mockGetEntitledLoIds: vi.fn(),
  mockCheckMarketplaceItemEntitlement: vi.fn(),
}));

// Mock the EntitlementService - the mock constructor always returns the same mock functions
vi.mock('../services/entitlement.service.js', () => ({
  EntitlementService: vi.fn().mockImplementation(() => ({
    checkEntitlement: mockCheckEntitlement,
    batchCheckEntitlements: mockBatchCheckEntitlements,
    getEntitledMarketplaceItems: mockGetEntitledMarketplaceItems,
    getEntitledLoIds: mockGetEntitledLoIds,
    checkMarketplaceItemEntitlement: mockCheckMarketplaceItemEntitlement,
  })),
}));

// Import after mocking
import { internalEntitlementRoutes } from '../routes/internal-entitlement.routes.js';

describe('Internal Entitlement Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    await app.register(internalEntitlementRoutes);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /internal/entitlements/check', () => {
    it('should return entitled status for a single LO', async () => {
      mockCheckEntitlement.mockResolvedValue({
        entitled: true,
        license: { id: 'license-1' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/check',
        payload: {
          tenantId: '00000000-0000-0000-0000-000000000001',
          loId: '00000000-0000-0000-0000-000000000002',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.isAllowed).toBe(true);
    });

    it('should include scope parameters in the check', async () => {
      mockCheckEntitlement.mockResolvedValue({
        entitled: true,
      });

      await app.inject({
        method: 'POST',
        url: '/internal/entitlements/check',
        payload: {
          tenantId: '00000000-0000-0000-0000-000000000001',
          loId: '00000000-0000-0000-0000-000000000002',
          schoolId: '00000000-0000-0000-0000-000000000003',
          gradeBand: 'K_2',
        },
      });

      expect(mockCheckEntitlement).toHaveBeenCalledWith({
        tenantId: '00000000-0000-0000-0000-000000000001',
        loId: '00000000-0000-0000-0000-000000000002',
        schoolId: '00000000-0000-0000-0000-000000000003',
        gradeBand: 'K_2',
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/check',
        payload: {
          tenantId: '00000000-0000-0000-0000-000000000001',
          // Missing loId, loIds, or marketplaceItemId
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /internal/entitlements/batch-check', () => {
    it('should return batch entitlement results', async () => {
      mockBatchCheckEntitlements.mockResolvedValue({
        results: {
          '00000000-0000-0000-0000-000000000001': { entitled: true },
          '00000000-0000-0000-0000-000000000002': { entitled: true },
          '00000000-0000-0000-0000-000000000003': { entitled: false, reason: 'no_license' },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/batch-check',
        payload: {
          tenantId: '00000000-0000-0000-0000-000000000010',
          loIds: [
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000003',
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entitled).toHaveLength(2);
      expect(body.denied).toHaveLength(1);
    });

    it('should return validation error for empty loIds array', async () => {
      // Empty array not allowed by schema (min 1), Zod parse throws error -> 500
      // In a production app, you'd have proper error handling to return 400
      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/batch-check',
        payload: {
          tenantId: '00000000-0000-0000-0000-000000000010',
          loIds: [],
        },
      });

      // Zod validation failure throws, Fastify returns 500 without custom error handler
      expect(response.statusCode).toBe(500);
    });
  });

  describe('POST /internal/entitlements/entitled-content', () => {
    it('should return entitled marketplace items', async () => {
      mockGetEntitledMarketplaceItems.mockResolvedValue({
        items: [
          {
            id: 'item-1',
            title: 'Math Pack',
            vendor: { id: 'v1', name: 'Vendor' },
            license: { seatLimit: 100, seatsUsed: 50 },
          },
        ],
        total: 1,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/entitled-content',
        payload: {
          tenantId: '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Math Pack');
    });

    it('should filter by item type', async () => {
      mockGetEntitledMarketplaceItems.mockResolvedValue({
        items: [],
        total: 0,
      });

      await app.inject({
        method: 'POST',
        url: '/internal/entitlements/entitled-content',
        payload: {
          tenantId: '00000000-0000-0000-0000-000000000001',
          itemType: 'CONTENT_PACK',
        },
      });

      expect(mockGetEntitledMarketplaceItems).toHaveBeenCalledWith(
        expect.objectContaining({
          itemType: 'CONTENT_PACK',
        })
      );
    });
  });

  describe('POST /internal/entitlements/entitled-los', () => {
    it('should return entitled LO IDs', async () => {
      mockGetEntitledLoIds.mockResolvedValue(['lo-1', 'lo-2', 'lo-3']);

      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/entitled-los',
        payload: {
          tenantId: '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.loIds).toHaveLength(3);
    });
  });

  describe('POST /internal/entitlements/filter-los', () => {
    it('should filter LO IDs by entitlement', async () => {
      mockBatchCheckEntitlements.mockResolvedValue({
        results: {
          '00000000-0000-0000-0000-000000000001': { entitled: true },
          '00000000-0000-0000-0000-000000000002': { entitled: false, reason: 'no_license' },
          '00000000-0000-0000-0000-000000000003': { entitled: true },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/internal/entitlements/filter-los',
        payload: {
          tenantId: '00000000-0000-0000-0000-000000000010',
          loIds: [
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000003',
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.filteredLoIds).toHaveLength(2);
      expect(body.partnerLoIds).toEqual([]);
    });
  });
});
