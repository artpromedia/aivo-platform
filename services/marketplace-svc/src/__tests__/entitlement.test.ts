/**
 * Entitlement Service Tests
 *
 * Tests for entitlement checking, scope validation, and partner content access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EntitlementService } from '../services/entitlement.service.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Prisma
vi.mock('../prisma.js', () => ({
  prisma: {
    tenantContentLicense: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    tenantContentEntitlement: {
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
      const mockLicense = {
        id: 'license-1',
        tenantId: 'tenant-1',
        itemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: null,
        allowedSchoolIds: [],
        allowedGradeBands: [],
        item: {
          contentPackItems: [{ loId: 'lo-123' }],
        },
      };

      mockedPrisma.tenantContentLicense.findMany.mockResolvedValue([
        mockLicense,
      ]);
      mockedPrisma.contentPackItem.findMany.mockResolvedValue([
        { loId: 'lo-123', itemId: 'item-1' },
      ]);

      const result = await service.checkEntitlement({
        tenantId: 'tenant-1',
        loId: 'lo-123',
      });

      expect(result.entitled).toBe(true);
    });

    it('should return entitled: false for an unlicensed LO', async () => {
      mockedPrisma.tenantContentLicense.findMany.mockResolvedValue([]);
      mockedPrisma.contentPackItem.findMany.mockResolvedValue([]);

      const result = await service.checkEntitlement({
        tenantId: 'tenant-1',
        loId: 'lo-not-licensed',
      });

      expect(result.entitled).toBe(false);
      expect(result.reason).toBe('no_license');
    });

    it('should check scope restrictions for school-limited licenses', async () => {
      const mockLicense = {
        id: 'license-1',
        tenantId: 'tenant-1',
        itemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: null,
        allowedSchoolIds: ['school-A', 'school-B'],
        allowedGradeBands: [],
        item: {
          contentPackItems: [{ loId: 'lo-123' }],
        },
      };

      mockedPrisma.tenantContentLicense.findMany.mockResolvedValue([
        mockLicense,
      ]);
      mockedPrisma.contentPackItem.findMany.mockResolvedValue([
        { loId: 'lo-123', itemId: 'item-1' },
      ]);

      // School C is not in the allowed list
      const result = await service.checkEntitlement({
        tenantId: 'tenant-1',
        loId: 'lo-123',
        schoolId: 'school-C',
      });

      expect(result.entitled).toBe(false);
      expect(result.reason).toBe('scope_mismatch');
    });

    it('should allow access when school is in allowedSchoolIds', async () => {
      const mockLicense = {
        id: 'license-1',
        tenantId: 'tenant-1',
        itemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: null,
        allowedSchoolIds: ['school-A', 'school-B'],
        allowedGradeBands: [],
        item: {
          contentPackItems: [{ loId: 'lo-123' }],
        },
      };

      mockedPrisma.tenantContentLicense.findMany.mockResolvedValue([
        mockLicense,
      ]);
      mockedPrisma.contentPackItem.findMany.mockResolvedValue([
        { loId: 'lo-123', itemId: 'item-1' },
      ]);

      const result = await service.checkEntitlement({
        tenantId: 'tenant-1',
        loId: 'lo-123',
        schoolId: 'school-A',
      });

      expect(result.entitled).toBe(true);
    });

    it('should check grade band restrictions', async () => {
      const mockLicense = {
        id: 'license-1',
        tenantId: 'tenant-1',
        itemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: null,
        allowedSchoolIds: [],
        allowedGradeBands: ['K-2', '3-5'],
        item: {
          contentPackItems: [{ loId: 'lo-123' }],
        },
      };

      mockedPrisma.tenantContentLicense.findMany.mockResolvedValue([
        mockLicense,
      ]);
      mockedPrisma.contentPackItem.findMany.mockResolvedValue([
        { loId: 'lo-123', itemId: 'item-1' },
      ]);

      // Grade 9 is not in K-2 or 3-5
      const result = await service.checkEntitlement({
        tenantId: 'tenant-1',
        loId: 'lo-123',
        gradeBand: '9-12',
      });

      expect(result.entitled).toBe(false);
      expect(result.reason).toBe('scope_mismatch');
    });
  });

  describe('batchCheckEntitlements', () => {
    it('should check multiple LOs in a single call', async () => {
      const mockLicense = {
        id: 'license-1',
        tenantId: 'tenant-1',
        itemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: null,
        allowedSchoolIds: [],
        allowedGradeBands: [],
        item: {
          contentPackItems: [{ loId: 'lo-123' }, { loId: 'lo-456' }],
        },
      };

      mockedPrisma.tenantContentLicense.findMany.mockResolvedValue([
        mockLicense,
      ]);
      mockedPrisma.contentPackItem.findMany.mockResolvedValue([
        { loId: 'lo-123', itemId: 'item-1' },
        { loId: 'lo-456', itemId: 'item-1' },
      ]);

      const result = await service.batchCheckEntitlements({
        tenantId: 'tenant-1',
        loIds: ['lo-123', 'lo-456', 'lo-999'],
      });

      expect(result.entitled).toContain('lo-123');
      expect(result.entitled).toContain('lo-456');
      expect(result.denied.some((d) => d.loId === 'lo-999')).toBe(true);
    });

    it('should return empty results for empty loIds array', async () => {
      const result = await service.batchCheckEntitlements({
        tenantId: 'tenant-1',
        loIds: [],
      });

      expect(result.entitled).toEqual([]);
      expect(result.denied).toEqual([]);
    });
  });

  describe('checkSeatAvailability', () => {
    it('should return true when no seat limit', async () => {
      const mockLicense = {
        id: 'license-1',
        seatLimit: null,
      };

      const result = await service.checkSeatAvailability('license-1');

      expect(result.hasAvailableSeats).toBe(true);
    });

    it('should return true when seats are available', async () => {
      mockedPrisma.learnerSeatAssignment.count.mockResolvedValue(5);

      const result = await service.checkSeatAvailability('license-1', {
        seatLimit: 10,
      });

      expect(result.hasAvailableSeats).toBe(true);
      expect(result.seatsUsed).toBe(5);
      expect(result.seatsRemaining).toBe(5);
    });

    it('should return false when all seats are used', async () => {
      mockedPrisma.learnerSeatAssignment.count.mockResolvedValue(10);

      const result = await service.checkSeatAvailability('license-1', {
        seatLimit: 10,
      });

      expect(result.hasAvailableSeats).toBe(false);
      expect(result.seatsUsed).toBe(10);
      expect(result.seatsRemaining).toBe(0);
    });
  });

  describe('getEntitledMarketplaceItems', () => {
    it('should return marketplace items for active licenses', async () => {
      const mockLicense = {
        id: 'license-1',
        tenantId: 'tenant-1',
        itemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: 100,
        allowedSchoolIds: [],
        allowedGradeBands: [],
        expiresAt: null,
      };

      const mockItem = {
        id: 'item-1',
        vendorId: 'vendor-1',
        title: 'Math Pack',
        itemType: 'CONTENT_PACK',
        iconUrl: 'https://example.com/icon.png',
        accessibilityTags: ['TTS', 'CAPTIONS'],
        contentPackItems: [{ loId: 'lo-1' }, { loId: 'lo-2' }],
        vendor: {
          id: 'vendor-1',
          name: 'Math Vendor',
          logoUrl: 'https://example.com/logo.png',
        },
      };

      mockedPrisma.tenantContentLicense.findMany.mockResolvedValue([
        mockLicense,
      ]);
      mockedPrisma.marketplaceItem.findMany.mockResolvedValue([mockItem]);
      mockedPrisma.learnerSeatAssignment.count.mockResolvedValue(25);

      const result = await service.getEntitledMarketplaceItems({
        tenantId: 'tenant-1',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-1');
      expect(result[0].title).toBe('Math Pack');
      expect(result[0].license.seatLimit).toBe(100);
      expect(result[0].license.seatsUsed).toBe(25);
      expect(result[0].loCount).toBe(2);
    });

    it('should filter by school scope', async () => {
      const licenseTenantWide = {
        id: 'license-1',
        tenantId: 'tenant-1',
        itemId: 'item-1',
        status: 'ACTIVE',
        allowedSchoolIds: [],
      };

      const licenseSchoolSpecific = {
        id: 'license-2',
        tenantId: 'tenant-1',
        itemId: 'item-2',
        status: 'ACTIVE',
        allowedSchoolIds: ['school-A'],
      };

      mockedPrisma.tenantContentLicense.findMany.mockResolvedValue([
        licenseTenantWide,
        licenseSchoolSpecific,
      ]);

      const result = await service.getEntitledMarketplaceItems({
        tenantId: 'tenant-1',
        schoolId: 'school-B', // Not school-A
      });

      // Should only include tenant-wide license
      expect(
        mockedPrisma.tenantContentLicense.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should filter by item type', async () => {
      await service.getEntitledMarketplaceItems({
        tenantId: 'tenant-1',
        itemType: 'CONTENT_PACK',
      });

      expect(
        mockedPrisma.tenantContentLicense.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            item: expect.objectContaining({
              itemType: 'CONTENT_PACK',
            }),
          }),
        }),
      );
    });
  });

  describe('checkMarketplaceItemEntitlement', () => {
    it('should return entitled: true for active license', async () => {
      const mockLicense = {
        id: 'license-1',
        tenantId: 'tenant-1',
        itemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: null,
        allowedSchoolIds: [],
        allowedGradeBands: [],
        expiresAt: null,
      };

      mockedPrisma.tenantContentLicense.findFirst.mockResolvedValue(mockLicense);

      const result = await service.checkMarketplaceItemEntitlement({
        tenantId: 'tenant-1',
        marketplaceItemId: 'item-1',
      });

      expect(result.entitled).toBe(true);
      expect(result.licenseId).toBe('license-1');
    });

    it('should return entitled: false for expired license', async () => {
      const expiredDate = new Date(Date.now() - 86400000); // Yesterday
      const mockLicense = {
        id: 'license-1',
        tenantId: 'tenant-1',
        itemId: 'item-1',
        status: 'ACTIVE',
        seatLimit: null,
        allowedSchoolIds: [],
        allowedGradeBands: [],
        expiresAt: expiredDate,
      };

      mockedPrisma.tenantContentLicense.findFirst.mockResolvedValue(mockLicense);

      const result = await service.checkMarketplaceItemEntitlement({
        tenantId: 'tenant-1',
        marketplaceItemId: 'item-1',
      });

      expect(result.entitled).toBe(false);
      expect(result.reason).toBe('license_expired');
    });

    it('should return entitled: false when no license exists', async () => {
      mockedPrisma.tenantContentLicense.findFirst.mockResolvedValue(null);

      const result = await service.checkMarketplaceItemEntitlement({
        tenantId: 'tenant-1',
        marketplaceItemId: 'item-unknown',
      });

      expect(result.entitled).toBe(false);
      expect(result.reason).toBe('no_license');
    });
  });
});
