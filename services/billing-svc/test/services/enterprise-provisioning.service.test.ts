import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma
vi.mock('../../src/prisma.js', () => ({
  prisma: {
    enterpriseCustomer: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    enterpriseContact: {
      create: vi.fn(),
    },
    enterpriseDeal: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    enterpriseDealActivity: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    enterpriseProvisioningBatch: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    vaultLicense: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn({
      enterpriseCustomer: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      enterpriseDeal: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      enterpriseDealActivity: { create: vi.fn() },
      enterpriseProvisioningBatch: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    })),
  },
  EnterpriseCustomerType: { DISTRICT: 'DISTRICT', SCHOOL: 'SCHOOL', STATE: 'STATE' },
  EnterpriseDealStatus: { OPEN: 'OPEN', WON: 'WON', LOST: 'LOST', NEGOTIATION: 'NEGOTIATION' },
  EnterpriseDealType: { NEW: 'NEW', RENEWAL: 'RENEWAL', EXPANSION: 'EXPANSION' },
  VaultLicenseType: { SEAT_BASED: 'SEAT_BASED', SITE: 'SITE' },
}));

// Mock license-vault
vi.mock('../../src/services/license-vault.service.js', () => ({
  getLicenseVaultService: vi.fn(() => ({
    issueLicense: vi.fn().mockResolvedValue({ license: { id: 'lic-1', displayKey: 'AIVO-XXX' } }),
    generateBulkLicenses: vi.fn().mockResolvedValue({ licenses: [{ id: 'lic-1', displayKey: 'AIVO-XXX' }] }),
  })),
}));

describe('EnterpriseProvisioningService', () => {
  let service: any;
  const { prisma } = vi.mocked(await import('../../src/prisma.js'));

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../src/services/enterprise-provisioning.service.js');
    service = mod.enterpriseProvisioningService ?? mod;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Customer Management', () => {
    it('should create an enterprise customer', async () => {
      const mockCustomer = {
        id: 'ec-1',
        name: 'Test District',
        type: 'DISTRICT',
        tenantId: 'tenant-1',
        createdAt: new Date(),
      };
      (prisma.enterpriseCustomer.create as any).mockResolvedValue(mockCustomer);

      const result = await service.createCustomer(
        { name: 'Test District', type: 'DISTRICT', tenantId: 'tenant-1' },
        'sales-rep-1'
      );
      expect(result).toBeDefined();
    });

    it('should get customer by ID', async () => {
      const mockCustomer = { id: 'ec-1', name: 'Test District' };
      (prisma.enterpriseCustomer.findUnique as any).mockResolvedValue(mockCustomer);

      const result = await service.getCustomer('ec-1');
      expect(result).toBeDefined();
    });

    it('should list customers with pagination', async () => {
      (prisma.enterpriseCustomer.findMany as any).mockResolvedValue([]);
      (prisma.enterpriseCustomer.count as any).mockResolvedValue(0);

      const result = await service.listCustomers({ skip: 0, take: 10 });
      expect(result).toBeDefined();
    });

    it('should update customer details', async () => {
      const updated = { id: 'ec-1', name: 'Updated District' };
      (prisma.enterpriseCustomer.update as any).mockResolvedValue(updated);

      const result = await service.updateCustomer('ec-1', { name: 'Updated District' });
      expect(result).toBeDefined();
    });

    it('should add a contact to a customer', async () => {
      const contact = { id: 'contact-1', name: 'John Doe', email: 'john@example.com' };
      (prisma.enterpriseContact.create as any).mockResolvedValue(contact);

      const result = await service.addContact({
        customerId: 'ec-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'CTO',
      });
      expect(result).toBeDefined();
    });
  });

  describe('Deal Management', () => {
    it('should create a deal', async () => {
      const deal = { id: 'deal-1', value: 50000, status: 'OPEN' };
      (prisma.enterpriseDeal.create as any).mockResolvedValue(deal);

      const result = await service.createDeal(
        { customerId: 'ec-1', value: 50000, type: 'NEW', title: 'Test Deal' },
        'owner-1'
      );
      expect(result).toBeDefined();
    });

    it('should get deal by ID', async () => {
      const deal = { id: 'deal-1', value: 50000 };
      (prisma.enterpriseDeal.findUnique as any).mockResolvedValue(deal);

      const result = await service.getDeal('deal-1');
      expect(result).toBeDefined();
    });

    it('should list deals with filters', async () => {
      (prisma.enterpriseDeal.findMany as any).mockResolvedValue([]);
      (prisma.enterpriseDeal.count as any).mockResolvedValue(0);

      const result = await service.listDeals({ status: 'OPEN' });
      expect(result).toBeDefined();
    });

    it('should update deal details', async () => {
      (prisma.enterpriseDeal.findUnique as any).mockResolvedValue({ id: 'deal-1', status: 'OPEN' });
      (prisma.enterpriseDeal.update as any).mockResolvedValue({ id: 'deal-1', value: 60000 });

      const result = await service.updateDeal('deal-1', { value: 60000 }, 'user-1');
      expect(result).toBeDefined();
    });

    it('should add activity to deal', async () => {
      (prisma.enterpriseDealActivity.create as any).mockResolvedValue({
        id: 'act-1',
        type: 'NOTE',
        description: 'Follow-up call',
      });

      const result = await service.addDealActivity(
        { dealId: 'deal-1', type: 'NOTE', description: 'Follow-up call' },
        'user-1'
      );
      expect(result).toBeDefined();
    });

    it('should get deal activities', async () => {
      (prisma.enterpriseDealActivity.findMany as any).mockResolvedValue([]);

      const result = await service.getDealActivities('deal-1');
      expect(result).toBeDefined();
    });

    it('should win a deal', async () => {
      (prisma.enterpriseDeal.findUnique as any).mockResolvedValue({ id: 'deal-1', status: 'OPEN' });
      (prisma.enterpriseDeal.update as any).mockResolvedValue({ id: 'deal-1', status: 'WON' });
      (prisma.enterpriseDealActivity.create as any).mockResolvedValue({});

      const result = await service.winDeal('deal-1', 'user-1');
      expect(result).toBeDefined();
    });

    it('should lose a deal', async () => {
      (prisma.enterpriseDeal.findUnique as any).mockResolvedValue({ id: 'deal-1', status: 'OPEN' });
      (prisma.enterpriseDeal.update as any).mockResolvedValue({ id: 'deal-1', status: 'LOST' });
      (prisma.enterpriseDealActivity.create as any).mockResolvedValue({});

      const result = await service.loseDeal('deal-1', 'Price too high', 'user-1');
      expect(result).toBeDefined();
    });
  });

  describe('Bulk Provisioning', () => {
    it('should create a provisioning batch', async () => {
      (prisma.enterpriseProvisioningBatch.create as any).mockResolvedValue({
        id: 'batch-1',
        status: 'PENDING',
      });

      const result = await service.createProvisioningBatch(
        {
          dealId: 'deal-1',
          tenantId: 'tenant-1',
          licenseType: 'SEAT_BASED',
          quantity: 10,
          seatsPerLicense: 50,
          validDays: 365,
        },
        'user-1'
      );
      expect(result).toBeDefined();
    });

    it('should list provisioning batches', async () => {
      (prisma.enterpriseProvisioningBatch.findMany as any).mockResolvedValue([]);
      (prisma.enterpriseProvisioningBatch.count as any).mockResolvedValue(0);

      const result = await service.listProvisioningBatches({ skip: 0, take: 10 });
      expect(result).toBeDefined();
    });

    it('should get batch details', async () => {
      (prisma.enterpriseProvisioningBatch.findUnique as any).mockResolvedValue({
        id: 'batch-1',
        status: 'COMPLETED',
      });

      const result = await service.getProvisioningBatch('batch-1');
      expect(result).toBeDefined();
    });

    it('should get batch licenses', async () => {
      (prisma.vaultLicense.findMany as any).mockResolvedValue([]);
      (prisma.vaultLicense.count as any).mockResolvedValue(0);

      const result = await service.getBatchLicenses('batch-1');
      expect(result).toBeDefined();
    });
  });

  describe('Analytics', () => {
    it('should get pipeline analytics', async () => {
      (prisma.enterpriseDeal.findMany as any).mockResolvedValue([]);
      (prisma.enterpriseDeal.count as any).mockResolvedValue(0);

      const result = await service.getPipelineAnalytics('user-1');
      expect(result).toBeDefined();
    });

    it('should get revenue analytics', async () => {
      (prisma.enterpriseDeal.findMany as any).mockResolvedValue([]);

      const result = await service.getRevenueAnalytics('2025-01-01', '2025-12-31');
      expect(result).toBeDefined();
    });
  });
});
