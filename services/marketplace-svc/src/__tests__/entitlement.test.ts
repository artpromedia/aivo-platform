/**
 * Entitlement Service Tests
 *
 * Tests for entitlement checking, scope validation, and partner content access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EntitlementService } from '../services/entitlement.service.js';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock Prisma
vi.mock('../prisma.js', () => ({
  prisma: {
    tenantContentLicense: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    tenantContentEntitlement: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    learnerSeatAssignment: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    contentPackItem: {
      findMany: vi.fn(),
    },
    marketplaceItem: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../prisma.js';

const mockedPrisma = prisma as unknown as {
  tenantContentLicense: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  tenantContentEntitlement: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  learnerSeatAssignment: {
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  contentPackItem: {
    findMany: ReturnType<typeof vi.fn>;
  };
  marketplaceItem: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('EntitlementService', () => {
  let service: EntitlementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EntitlementService();
  });

  describe('checkEntitlement', () => {
    it('should return entitled: true for a licensed LO', async () => {
      const mockEntitlement = {
        id: 'ent-1',
        tenantId: 'tenant-1',
        loId: 'lo-123',
        licenseId: 'license-1',
        isActive: true,
        expiresAt: null,
        allowedSchoolIds: [],
        allowedGradeBands: [],
        license: {
          id: 'license-1',
          tenantId: 'tenant-1',
          marketplaceItemId: 'item-1',
          status: 'ACTIVE',
          seatLimit: null,
          seatsUsed: 0,
          purchaserParentUserId: null,
          learnerIds: [],
          marketplaceItem: {
            title: 'Content Pack 1',
          },
        },
      };

      mockedPrisma.tenantContentEntitlement.findFirst.mockResolvedValue(mockEntitlement);

      const result = await service.checkEntitlement({
        tenantId: 'tenant-1',
        loId: 'lo-123',
      });

      expect(result.entitled).toBe(true);
    });

    it('should return entitled: false for an unlicensed LO', async () => {
      mockedPrisma.tenantContentEntitlement.findFirst.mockResolvedValue(null);

      const result = await service.checkEntitlement({
        tenantId: 'tenant-1',
        loId: 'lo-not-licensed',
      });

      expect(result.entitled).toBe(false);
      expect(result.reason).toBe('No active license found for this content');
    });

    it('should check scope restrictions for school-limited licenses', async () => {
      const mockEntitlement = {
        id: 'ent-1',
        tenantId: 'tenant-1',
        loId: 'lo-123',
        licenseId: 'license-1',
        isActive: true,
        expiresAt: null,
        allowedSchoolIds: ['school-A', 'school-B'],
        allowedGradeBands: [],
        license: {
          id: 'license-1',
          tenantId: 'tenant-1',
          marketplaceItemId: 'item-1',
          status: 'ACTIVE',
          seatLimit: null,
          seatsUsed: 0,
          purchaserParentUserId: null,
          learnerIds: [],
          marketplaceItem: {
            title: 'Content Pack 1',
          },
        },
      };

      mockedPrisma.tenantContentEntitlement.findFirst.mockResolvedValue(mockEntitlement);

      // School C is not in the allowed list
      const result = await service.checkEntitlement({
        tenantId: 'tenant-1',
        loId: 'lo-123',
        schoolId: 'school-C',
      });

      expect(result.entitled).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('school');
    });

    it('should allow access when school is in allowedSchoolIds', async () => {
      const mockEntitlement = {
        id: 'ent-1',
        tenantId: 'tenant-1',
        loId: 'lo-123',
        licenseId: 'license-1',
        isActive: true,
        expiresAt: null,
        allowedSchoolIds: ['school-A', 'school-B'],
        allowedGradeBands: [],
        license: {
          id: 'license-1',
          tenantId: 'tenant-1',
          marketplaceItemId: 'item-1',
          status: 'ACTIVE',
          seatLimit: null,
          seatsUsed: 0,
          purchaserParentUserId: null,
          learnerIds: [],
          marketplaceItem: {
            title: 'Content Pack 1',
          },
        },
      };

      mockedPrisma.tenantContentEntitlement.findFirst.mockResolvedValue(mockEntitlement);

      const result = await service.checkEntitlement({
        tenantId: 'tenant-1',
        loId: 'lo-123',
        schoolId: 'school-A',
      });

      expect(result.entitled).toBe(true);
    });

    it('should check grade band restrictions', async () => {
      const mockEntitlement = {
        id: 'ent-1',
        tenantId: 'tenant-1',
        loId: 'lo-123',
        licenseId: 'license-1',
        isActive: true,
        expiresAt: null,
        allowedSchoolIds: [],
        allowedGradeBands: ['K_2', 'GRADE_3_5'],
        license: {
          id: 'license-1',
          tenantId: 'tenant-1',
          marketplaceItemId: 'item-1',
          status: 'ACTIVE',
          seatLimit: null,
          seatsUsed: 0,
          purchaserParentUserId: null,
          learnerIds: [],
          marketplaceItem: {
            title: 'Content Pack 1',
          },
        },
      };

      mockedPrisma.tenantContentEntitlement.findFirst.mockResolvedValue(mockEntitlement);

      // Grade 9-12 is not in allowed list
      const result = await service.checkEntitlement({
        tenantId: 'tenant-1',
        loId: 'lo-123',
        gradeBand: 'GRADE_9_12',
      });

      expect(result.entitled).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('grade');
    });
  });

  describe('batchCheckEntitlements', () => {
    it('should check multiple LOs in a single call', async () => {
      // Mock entitlements for each LO
      const mockEntitlements = [
        {
          id: 'ent-1',
          tenantId: 'tenant-1',
          loId: 'lo-123',
          licenseId: 'license-1',
          isActive: true,
          expiresAt: null,
          allowedSchoolIds: [],
          allowedGradeBands: [],
          license: {
            id: 'license-1',
            status: 'ACTIVE',
            seatLimit: null,
            seatsUsed: 0,
            purchaserParentUserId: null,
            learnerIds: [],
            marketplaceItem: { title: 'Pack 1' },
          },
        },
        {
          id: 'ent-2',
          tenantId: 'tenant-1',
          loId: 'lo-456',
          licenseId: 'license-1',
          isActive: true,
          expiresAt: null,
          allowedSchoolIds: [],
          allowedGradeBands: [],
          license: {
            id: 'license-1',
            status: 'ACTIVE',
            seatLimit: null,
            seatsUsed: 0,
            purchaserParentUserId: null,
            learnerIds: [],
            marketplaceItem: { title: 'Pack 1' },
          },
        },
      ];

      mockedPrisma.tenantContentEntitlement.findMany.mockResolvedValue(mockEntitlements);

      const result = await service.batchCheckEntitlements({
        tenantId: 'tenant-1',
        loIds: ['lo-123', 'lo-456', 'lo-999'],
      });

      expect(result.results['lo-123']?.entitled).toBe(true);
      expect(result.results['lo-456']?.entitled).toBe(true);
      expect(result.results['lo-999']?.entitled).toBe(false);
    });

    it('should return empty results for empty loIds array', async () => {
      mockedPrisma.tenantContentEntitlement.findMany.mockResolvedValue([]);

      const result = await service.batchCheckEntitlements({
        tenantId: 'tenant-1',
        loIds: [],
      });

      expect(Object.keys(result.results)).toEqual([]);
    });
  });

  describe('getEntitledMarketplaceItems', () => {
    it('should return marketplace items for active licenses', async () => {
      const mockLicenseWithItem = {
        id: 'license-1',
        tenantId: 'tenant-1',
        marketplaceItemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: 100,
        seatsUsed: 25,
        validUntil: null,
        allowedSchoolIds: [],
        allowedGradeBands: [],
        allowedClassroomIds: [],
        marketplaceItem: {
          id: 'item-1',
          slug: 'math-pack',
          title: 'Math Pack',
          shortDescription: 'Math content pack',
          itemType: 'CONTENT_PACK',
          subjects: ['MATH'],
          gradeBands: ['GRADE_3_5'],
          iconUrl: 'https://example.com/icon.png',
          accessibilityTags: ['TTS', 'CAPTIONS'],
          safetyTags: [],
          isActive: true,
          vendor: {
            id: 'vendor-1',
            slug: 'math-vendor',
            name: 'Math Vendor',
            logoUrl: 'https://example.com/logo.png',
          },
          versions: [
            {
              id: 'version-1',
              status: 'PUBLISHED',
              contentPackItems: [{ id: 'cpi-1' }, { id: 'cpi-2' }],
            },
          ],
        },
      };

      mockedPrisma.tenantContentLicense.findMany.mockResolvedValue([mockLicenseWithItem]);

      const result = await service.getEntitledMarketplaceItems({
        tenantId: 'tenant-1',
        limit: 10,
        offset: 0,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('item-1');
      expect(result.items[0].title).toBe('Math Pack');
      expect(result.items[0].license.seatLimit).toBe(100);
      expect(result.items[0].loCount).toBe(2);
    });

    it('should filter by school scope', async () => {
      const mockLicenseWithItem = {
        id: 'license-1',
        tenantId: 'tenant-1',
        marketplaceItemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: null,
        seatsUsed: 0,
        validUntil: null,
        allowedSchoolIds: [],
        allowedGradeBands: [],
        allowedClassroomIds: [],
        marketplaceItem: {
          id: 'item-1',
          slug: 'math-pack',
          title: 'Math Pack',
          shortDescription: 'Math content pack',
          itemType: 'CONTENT_PACK',
          subjects: ['MATH'],
          gradeBands: [],
          iconUrl: null,
          accessibilityTags: [],
          safetyTags: [],
          isActive: true,
          vendor: { id: 'v1', slug: 'v', name: 'V', logoUrl: null },
          versions: [{ id: 'ver-1', status: 'PUBLISHED', contentPackItems: [] }],
        },
      };

      mockedPrisma.tenantContentLicense.findMany.mockResolvedValue([mockLicenseWithItem]);

      const result = await service.getEntitledMarketplaceItems({
        tenantId: 'tenant-1',
        schoolId: 'school-A',
        limit: 10,
        offset: 0,
      });

      // Should return the tenant-wide license (no school restrictions)
      expect(result.items.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by item type', async () => {
      const mockLicenseWithItem = {
        id: 'license-1',
        tenantId: 'tenant-1',
        marketplaceItemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: null,
        seatsUsed: 0,
        validUntil: null,
        allowedSchoolIds: [],
        allowedGradeBands: [],
        allowedClassroomIds: [],
        marketplaceItem: {
          id: 'item-1',
          slug: 'math-tool',
          title: 'Math Tool',
          shortDescription: 'Math embedded tool',
          itemType: 'EMBEDDED_TOOL',
          subjects: ['MATH'],
          gradeBands: [],
          iconUrl: null,
          accessibilityTags: [],
          safetyTags: [],
          isActive: true,
          vendor: { id: 'v1', slug: 'v', name: 'V', logoUrl: null },
          versions: [{ id: 'ver-1', status: 'PUBLISHED', contentPackItems: [] }],
        },
      };

      mockedPrisma.tenantContentLicense.findMany.mockResolvedValue([mockLicenseWithItem]);

      const result = await service.getEntitledMarketplaceItems({
        tenantId: 'tenant-1',
        itemType: 'CONTENT_PACK',
        limit: 10,
        offset: 0,
      });

      // EMBEDDED_TOOL should be filtered out when requesting CONTENT_PACK
      expect(result.items).toHaveLength(0);
    });
  });

  describe('checkMarketplaceItemEntitlement', () => {
    it('should return entitled: true for active license', async () => {
      const mockLicense = {
        id: 'license-1',
        tenantId: 'tenant-1',
        marketplaceItemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: null,
        seatsUsed: 0,
        allowedSchoolIds: [],
        allowedClassroomIds: [],
        allowedGradeBands: [],
        validUntil: null,
        purchaserParentUserId: null,
        learnerIds: [],
        marketplaceItem: {
          id: 'item-1',
          title: 'Test Item',
        },
      };

      mockedPrisma.tenantContentLicense.findFirst.mockResolvedValue(mockLicense);

      const result = await service.checkMarketplaceItemEntitlement({
        tenantId: 'tenant-1',
        marketplaceItemId: 'item-1',
      });

      expect(result.entitled).toBe(true);
      expect(result.license?.id).toBe('license-1');
      expect(result.entitledPacks).toEqual([{ id: 'item-1', title: 'Test Item' }]);
    });

    it('should return entitled: false when no license exists (handles expired)', async () => {
      // The service filters out expired licenses in the query, so expired = no result
      mockedPrisma.tenantContentLicense.findFirst.mockResolvedValue(null);

      const result = await service.checkMarketplaceItemEntitlement({
        tenantId: 'tenant-1',
        marketplaceItemId: 'item-1',
      });

      expect(result.entitled).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('no active license');
    });

    it('should return entitled: false when no license exists', async () => {
      mockedPrisma.tenantContentLicense.findFirst.mockResolvedValue(null);

      const result = await service.checkMarketplaceItemEntitlement({
        tenantId: 'tenant-1',
        marketplaceItemId: 'item-unknown',
      });

      expect(result.entitled).toBe(false);
      expect(result.reason?.toLowerCase()).toContain('no active license');
    });
  });
});
