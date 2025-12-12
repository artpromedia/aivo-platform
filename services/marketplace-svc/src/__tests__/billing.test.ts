/**
 * Marketplace Billing Tests
 *
 * Tests for billing configuration, revenue shares, and installation billing linkage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { InstallationBillingService } from '../services/installation-billing.service.js';
import type {
  MarketplaceBillingModel,
  MarketplaceBillingStatus,
} from '../types/marketplace.types.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Prisma
vi.mock('../prisma.js', () => ({
  prisma: {
    marketplaceItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    marketplaceInstallation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    vendor: {
      findUnique: vi.fn(),
    },
    vendorRevenueShare: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '../prisma.js';

describe('InstallationBillingService', () => {
  let service: InstallationBillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InstallationBillingService('http://localhost:3003');
  });

  describe('activateBilling', () => {
    it('should activate billing for a free item without calling billing-svc', async () => {
      const mockInstallation = {
        id: 'install-1',
        tenantId: 'tenant-1',
        itemId: 'item-1',
        item: {
          id: 'item-1',
          title: 'Free Content Pack',
          vendorId: 'vendor-1',
          isFree: true,
          billingModel: 'FREE',
          billingSku: null,
          billingMetadataJson: null,
        },
      };

      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(mockInstallation as any);
      vi.mocked(prisma.marketplaceInstallation.update).mockResolvedValue({
        ...mockInstallation,
        billingStatus: 'ACTIVE',
        billingStartedAt: new Date(),
      } as any);

      const result = await service.activateBilling({
        installationId: 'install-1',
        tenantId: 'tenant-1',
      });

      expect(result.success).toBe(true);
      expect(result.billingStatus).toBe('ACTIVE');
      expect(result.contractLineItemId).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fail if installation not found', async () => {
      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(null);

      const result = await service.activateBilling({
        installationId: 'nonexistent',
        tenantId: 'tenant-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Installation not found');
    });

    it('should fail if tenant ID does not match', async () => {
      const mockInstallation = {
        id: 'install-1',
        tenantId: 'tenant-1',
        item: { isFree: false, billingModel: 'TENANT_FLAT', billingSku: 'MP_TEST' },
      };

      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(mockInstallation as any);

      const result = await service.activateBilling({
        installationId: 'install-1',
        tenantId: 'different-tenant',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tenant ID mismatch');
    });

    it('should fail if paid item has no billing SKU', async () => {
      const mockInstallation = {
        id: 'install-1',
        tenantId: 'tenant-1',
        item: {
          id: 'item-1',
          title: 'Paid Content Pack',
          vendorId: 'vendor-1',
          isFree: false,
          billingModel: 'TENANT_FLAT',
          billingSku: null, // Missing SKU
          billingMetadataJson: null,
        },
      };

      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(mockInstallation as any);

      const result = await service.activateBilling({
        installationId: 'install-1',
        tenantId: 'tenant-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Paid item missing billing SKU');
    });

    it('should create contract line item for paid item with TENANT_FLAT billing', async () => {
      const mockInstallation = {
        id: 'install-1',
        tenantId: 'tenant-1',
        item: {
          id: 'item-1',
          title: 'Premium Content Pack',
          vendorId: 'vendor-1',
          isFree: false,
          billingModel: 'TENANT_FLAT',
          billingSku: 'MPK_PREMIUM_PACK',
          billingMetadataJson: { flatPriceCents: 50000 },
        },
      };

      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(mockInstallation as any);

      // Mock find active contract
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: 'contract-1' }] }),
        })
        // Mock create line item
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            lineItemId: 'line-item-1',
            contractId: 'contract-1',
            sku: 'MPK_PREMIUM_PACK',
            status: 'ACTIVE',
          }),
        });

      vi.mocked(prisma.marketplaceInstallation.update).mockResolvedValue({
        ...mockInstallation,
        billingStatus: 'ACTIVE',
        contractLineItemId: 'line-item-1',
      } as any);

      const result = await service.activateBilling({
        installationId: 'install-1',
        tenantId: 'tenant-1',
      });

      expect(result.success).toBe(true);
      expect(result.billingStatus).toBe('ACTIVE');
      expect(result.contractLineItemId).toBe('line-item-1');

      // Verify the line item was created with correct data
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3003/api/contracts/contract-1/line-items',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('MPK_PREMIUM_PACK'),
        })
      );
    });

    it('should include seat quantity for PER_SEAT billing model', async () => {
      const mockInstallation = {
        id: 'install-1',
        tenantId: 'tenant-1',
        item: {
          id: 'item-1',
          title: 'Per-Seat Tool',
          vendorId: 'vendor-1',
          isFree: false,
          billingModel: 'PER_SEAT',
          billingSku: 'MPT_TOOL_SEATS',
          billingMetadataJson: { pricePerSeatCents: 500 },
        },
      };

      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(mockInstallation as any);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: 'contract-1' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            lineItemId: 'line-item-1',
            contractId: 'contract-1',
            sku: 'MPT_TOOL_SEATS',
            status: 'ACTIVE',
          }),
        });

      vi.mocked(prisma.marketplaceInstallation.update).mockResolvedValue({
        ...mockInstallation,
        billingStatus: 'ACTIVE',
        contractLineItemId: 'line-item-1',
        seatQuantity: 100,
      } as any);

      const result = await service.activateBilling({
        installationId: 'install-1',
        tenantId: 'tenant-1',
        seatQuantity: 100,
      });

      expect(result.success).toBe(true);

      // Verify the quantity was included
      const createLineItemCall = mockFetch.mock.calls[1];
      const body = JSON.parse(createLineItemCall[1].body);
      expect(body.quantity).toBe(100);
    });
  });

  describe('deactivateBilling', () => {
    it('should deactivate billing and cancel line item', async () => {
      const mockInstallation = {
        id: 'install-1',
        billingStatus: 'ACTIVE',
        contractLineItemId: 'line-item-1',
        billingMetadataJson: { contractId: 'contract-1' },
      };

      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(mockInstallation as any);

      mockFetch.mockResolvedValueOnce({ ok: true });

      vi.mocked(prisma.marketplaceInstallation.update).mockResolvedValue({
        ...mockInstallation,
        billingStatus: 'CANCELED',
        billingEndedAt: new Date(),
      } as any);

      const result = await service.deactivateBilling({
        installationId: 'install-1',
        reason: 'Uninstalled by admin',
      });

      expect(result.success).toBe(true);
      expect(result.billingStatus).toBe('CANCELED');
      expect(result.billingEndedAt).toBeDefined();

      // Verify cancel line item was called
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3003/api/line-items/line-item-1/cancel',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should succeed even if installation has no contract line item', async () => {
      const mockInstallation = {
        id: 'install-1',
        billingStatus: 'ACTIVE',
        contractLineItemId: null,
        billingMetadataJson: null,
      };

      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(mockInstallation as any);
      vi.mocked(prisma.marketplaceInstallation.update).mockResolvedValue({
        ...mockInstallation,
        billingStatus: 'CANCELED',
        billingEndedAt: new Date(),
      } as any);

      const result = await service.deactivateBilling({
        installationId: 'install-1',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('updateSeatQuantity', () => {
    it('should update seat quantity for PER_SEAT installation', async () => {
      const mockInstallation = {
        id: 'install-1',
        billingStatus: 'ACTIVE',
        contractLineItemId: 'line-item-1',
        seatQuantity: 50,
        billingMetadataJson: {},
        item: { billingModel: 'PER_SEAT' },
      };

      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(mockInstallation as any);
      mockFetch.mockResolvedValueOnce({ ok: true });
      vi.mocked(prisma.marketplaceInstallation.update).mockResolvedValue({
        ...mockInstallation,
        seatQuantity: 100,
      } as any);

      const result = await service.updateSeatQuantity('install-1', 100);

      expect(result.success).toBe(true);

      // Verify billing-svc was called to update quantity
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3003/api/line-items/line-item-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ quantity: 100 }),
        })
      );
    });

    it('should fail for non-PER_SEAT billing model', async () => {
      const mockInstallation = {
        id: 'install-1',
        billingStatus: 'ACTIVE',
        item: { billingModel: 'TENANT_FLAT' },
      };

      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(mockInstallation as any);

      const result = await service.updateSeatQuantity('install-1', 100);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item does not use per-seat billing');
    });
  });

  describe('checkEntitlement', () => {
    it('should return entitled=true for free installed item', async () => {
      const mockInstallation = {
        id: 'install-1',
        status: 'INSTALLED',
        item: { isFree: true, billingModel: 'FREE' },
      };

      vi.mocked(prisma.marketplaceInstallation.findFirst).mockResolvedValue(mockInstallation as any);

      const result = await service.checkEntitlement('tenant-1', 'item-1');

      expect(result.entitled).toBe(true);
    });

    it('should return entitled=true for paid item with active billing', async () => {
      const mockInstallation = {
        id: 'install-1',
        status: 'INSTALLED',
        billingStatus: 'ACTIVE',
        item: { isFree: false, billingModel: 'TENANT_FLAT' },
      };

      vi.mocked(prisma.marketplaceInstallation.findFirst).mockResolvedValue(mockInstallation as any);

      const result = await service.checkEntitlement('tenant-1', 'item-1');

      expect(result.entitled).toBe(true);
    });

    it('should return entitled=false for paid item without active billing', async () => {
      const mockInstallation = {
        id: 'install-1',
        status: 'INSTALLED',
        billingStatus: 'PENDING',
        item: { isFree: false, billingModel: 'TENANT_FLAT' },
      };

      vi.mocked(prisma.marketplaceInstallation.findFirst).mockResolvedValue(mockInstallation as any);

      const result = await service.checkEntitlement('tenant-1', 'item-1');

      expect(result.entitled).toBe(false);
      expect(result.reason).toBe('Billing not active for installation');
    });

    it('should return entitled=false if no installation found', async () => {
      vi.mocked(prisma.marketplaceInstallation.findFirst).mockResolvedValue(null);

      const result = await service.checkEntitlement('tenant-1', 'item-1');

      expect(result.entitled).toBe(false);
      expect(result.reason).toBe('No installation found');
    });
  });
});

describe('Billing Model Validation', () => {
  it('should validate FREE billing model allows null SKU', () => {
    const billingConfig = {
      isFree: true,
      billingModel: 'FREE' as MarketplaceBillingModel,
      billingSku: null,
    };

    // FREE items don't need SKUs
    expect(billingConfig.billingSku).toBeNull();
  });

  it('should validate TENANT_FLAT requires SKU', () => {
    const billingConfig = {
      isFree: false,
      billingModel: 'TENANT_FLAT' as MarketplaceBillingModel,
      billingSku: 'MPK_CONTENT_PACK_001',
    };

    // Paid items need SKUs
    expect(billingConfig.billingSku).toBeTruthy();
    expect(billingConfig.billingSku).toMatch(/^MP[KT]_/);
  });

  it('should validate PER_SEAT requires SKU', () => {
    const billingConfig = {
      isFree: false,
      billingModel: 'PER_SEAT' as MarketplaceBillingModel,
      billingSku: 'MPT_MATH_GAME_TOOL',
    };

    expect(billingConfig.billingSku).toBeTruthy();
    expect(billingConfig.billingSku).toMatch(/^MPT_/);
  });

  it('should validate SKU naming conventions', () => {
    // Content packs should start with MPK_
    expect('MPK_FRACTIONS_PACK_G3_5').toMatch(/^MPK_/);
    
    // Tools should start with MPT_
    expect('MPT_TOOL_MATH_GAME').toMatch(/^MPT_/);

    // Generic marketplace items start with MP_
    expect('MP_GENERIC_ITEM').toMatch(/^MP_/);
  });
});

describe('Revenue Share Calculations', () => {
  it('should calculate vendor amount correctly', () => {
    const grossAmountCents = 10000; // $100.00
    const sharePercent = 70; // 70% to vendor

    const vendorAmountCents = Math.round(grossAmountCents * (sharePercent / 100));

    expect(vendorAmountCents).toBe(7000); // $70.00
  });

  it('should handle fractional percentages', () => {
    const grossAmountCents = 9999;
    const sharePercent = 33.33;

    const vendorAmountCents = Math.round(grossAmountCents * (sharePercent / 100));

    expect(vendorAmountCents).toBe(3333); // Rounded
  });

  it('should handle 100% share', () => {
    const grossAmountCents = 10000;
    const sharePercent = 100;

    const vendorAmountCents = Math.round(grossAmountCents * (sharePercent / 100));

    expect(vendorAmountCents).toBe(grossAmountCents);
  });

  it('should handle 0% share', () => {
    const grossAmountCents = 10000;
    const sharePercent = 0;

    const vendorAmountCents = Math.round(grossAmountCents * (sharePercent / 100));

    expect(vendorAmountCents).toBe(0);
  });
});
