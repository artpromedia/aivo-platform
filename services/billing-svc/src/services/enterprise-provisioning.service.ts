/**
 * Enterprise Provisioning Service
 *
 * Handles enterprise sales workflows including:
 * - Customer management
 * - Deal/opportunity tracking
 * - Bulk license provisioning
 * - Sales analytics
 */

import { prisma } from '../prisma.js';
import type {
  EnterpriseCustomerType,
  EnterpriseDealStatus,
  EnterpriseDealType,
  VaultLicenseType,
} from '../prisma.js';
import { getLicenseVaultService } from './license-vault.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CreateCustomerParams {
  name: string;
  type: EnterpriseCustomerType;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  billingContactEmail?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  taxId?: string;
  notes?: string;
}

interface UpdateCustomerParams {
  name?: string;
  type?: EnterpriseCustomerType;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  billingContactEmail?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  taxId?: string;
  notes?: string;
  isActive?: boolean;
}

interface AddContactParams {
  customerId: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  isPrimary?: boolean;
  notes?: string;
}

interface CreateDealParams {
  customerId: string;
  name: string;
  type: EnterpriseDealType;
  seats: number;
  pricePerSeatCents: number;
  termMonths?: number;
  startDate?: string;
  expectedCloseDate?: string;
  probability?: number;
  discountPercent?: number;
  discountReason?: string;
  products?: string[];
  notes?: string;
  externalCrmId?: string;
}

interface UpdateDealParams {
  name?: string;
  type?: EnterpriseDealType;
  status?: EnterpriseDealStatus;
  seats?: number;
  pricePerSeatCents?: number;
  termMonths?: number;
  startDate?: string;
  endDate?: string;
  expectedCloseDate?: string;
  probability?: number;
  discountPercent?: number;
  discountReason?: string;
  products?: string[];
  notes?: string;
  lostReason?: string;
  externalCrmId?: string;
}

interface AddDealActivityParams {
  dealId: string;
  activityType: string;
  description: string;
}

interface CreateProvisioningBatchParams {
  dealId: string;
  name: string;
  licenseCount: number;
  licenseType?: VaultLicenseType;
  seatsPerLicense?: number;
  durationDays?: number;
  features?: string[];
}

interface ListCustomersParams {
  type?: EnterpriseCustomerType;
  salesRepId?: string;
  isActive?: boolean;
  search?: string;
  limit: number;
  offset: number;
}

interface ListDealsParams {
  customerId?: string;
  ownerId?: string;
  status?: EnterpriseDealStatus;
  type?: EnterpriseDealType;
  minValue?: number;
  maxValue?: number;
  limit: number;
  offset: number;
}

interface ListBatchesParams {
  dealId?: string;
  status?: string;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class EnterpriseProvisioningService {
  // ───────────────────────────────────────────────────────────────────────────
  // CUSTOMER MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create a new enterprise customer
   */
  async createCustomer(
    params: CreateCustomerParams,
    salesRepId: string,
  ) {
    const customer = await prisma.enterpriseCustomer.create({
      data: {
        name: params.name,
        type: params.type,
        primaryContactName: params.primaryContactName,
        primaryContactEmail: params.primaryContactEmail,
        primaryContactPhone: params.primaryContactPhone,
        billingContactEmail: params.billingContactEmail,
        addressLine1: params.addressLine1,
        addressLine2: params.addressLine2,
        city: params.city,
        state: params.state,
        postalCode: params.postalCode,
        country: params.country ?? 'US',
        website: params.website,
        taxId: params.taxId,
        notes: params.notes,
        salesRepId,
      },
      include: {
        contacts: true,
        deals: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return customer;
  }

  /**
   * Get a customer by ID
   */
  async getCustomer(customerId: string) {
    const customer = await prisma.enterpriseCustomer.findUnique({
      where: { id: customerId },
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' },
        },
        deals: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { licenses: true, provisioningBatches: true },
            },
          },
        },
      },
    });

    return customer;
  }

  /**
   * List customers with filters
   */
  async listCustomers(params: ListCustomersParams) {
    const where: Record<string, unknown> = {};

    if (params.type) where.type = params.type;
    if (params.salesRepId) where.salesRepId = params.salesRepId;
    if (typeof params.isActive === 'boolean') where.isActive = params.isActive;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { primaryContactEmail: { contains: params.search, mode: 'insensitive' } },
        { primaryContactName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.enterpriseCustomer.findMany({
        where,
        include: {
          _count: {
            select: { deals: true, contacts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      }),
      prisma.enterpriseCustomer.count({ where }),
    ]);

    return { customers, total };
  }

  /**
   * Update a customer
   */
  async updateCustomer(customerId: string, params: UpdateCustomerParams) {
    const customer = await prisma.enterpriseCustomer.update({
      where: { id: customerId },
      data: params,
      include: {
        contacts: true,
      },
    });

    return customer;
  }

  /**
   * Add a contact to a customer
   */
  async addContact(params: AddContactParams) {
    // If setting as primary, unset other primaries first
    if (params.isPrimary) {
      await prisma.enterpriseContact.updateMany({
        where: { customerId: params.customerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.enterpriseContact.create({
      data: {
        customerId: params.customerId,
        name: params.name,
        email: params.email,
        phone: params.phone,
        title: params.title,
        isPrimary: params.isPrimary ?? false,
        notes: params.notes,
      },
    });

    return contact;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DEAL MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create a new deal/opportunity
   */
  async createDeal(params: CreateDealParams, ownerId: string) {
    // Calculate total value
    const totalValueCents = params.seats * params.pricePerSeatCents;
    const termMonths = params.termMonths ?? 12;
    const arrCents = Math.round((totalValueCents / termMonths) * 12);

    // Apply discount if specified
    const discountMultiplier = params.discountPercent 
      ? (100 - params.discountPercent) / 100 
      : 1;

    const deal = await prisma.enterpriseDeal.create({
      data: {
        customerId: params.customerId,
        name: params.name,
        type: params.type,
        status: 'LEAD',
        seats: params.seats,
        pricePerSeatCents: Math.round(params.pricePerSeatCents * discountMultiplier),
        totalValueCents: Math.round(totalValueCents * discountMultiplier),
        arrCents: Math.round(arrCents * discountMultiplier),
        termMonths,
        startDate: params.startDate ? new Date(params.startDate) : undefined,
        expectedCloseDate: params.expectedCloseDate ? new Date(params.expectedCloseDate) : undefined,
        probability: params.probability,
        discountPercent: params.discountPercent,
        discountReason: params.discountReason,
        productsJson: params.products ?? [],
        notes: params.notes,
        ownerId,
        externalCrmId: params.externalCrmId,
      },
      include: {
        customer: true,
      },
    });

    // Log initial activity
    await prisma.enterpriseDealActivity.create({
      data: {
        dealId: deal.id,
        activityType: 'NOTE',
        description: 'Deal created',
        performedBy: ownerId,
      },
    });

    return deal;
  }

  /**
   * Get a deal by ID
   */
  async getDeal(dealId: string) {
    const deal = await prisma.enterpriseDeal.findUnique({
      where: { id: dealId },
      include: {
        customer: {
          include: {
            contacts: {
              where: { isActive: true },
            },
          },
        },
        licenses: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        provisioningBatches: {
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { occurredAt: 'desc' },
          take: 20,
        },
        _count: {
          select: { licenses: true },
        },
      },
    });

    return deal;
  }

  /**
   * List deals with filters
   */
  async listDeals(params: ListDealsParams) {
    const where: Record<string, unknown> = {};

    if (params.customerId) where.customerId = params.customerId;
    if (params.ownerId) where.ownerId = params.ownerId;
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    if (params.minValue !== undefined || params.maxValue !== undefined) {
      where.totalValueCents = {};
      if (params.minValue !== undefined) {
        (where.totalValueCents as Record<string, number>).gte = params.minValue;
      }
      if (params.maxValue !== undefined) {
        (where.totalValueCents as Record<string, number>).lte = params.maxValue;
      }
    }

    const [deals, total] = await Promise.all([
      prisma.enterpriseDeal.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, type: true },
          },
          _count: {
            select: { licenses: true, provisioningBatches: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      }),
      prisma.enterpriseDeal.count({ where }),
    ]);

    return { deals, total };
  }

  /**
   * Update a deal
   */
  async updateDeal(dealId: string, params: UpdateDealParams, performedBy: string) {
    const existingDeal = await prisma.enterpriseDeal.findUnique({
      where: { id: dealId },
    });

    if (!existingDeal) return null;

    // Recalculate values if seats or price changed
    let updateData: Record<string, unknown> = { ...params };

    if (params.seats !== undefined || params.pricePerSeatCents !== undefined) {
      const seats = params.seats ?? existingDeal.seats;
      const pricePerSeat = params.pricePerSeatCents ?? existingDeal.pricePerSeatCents;
      const termMonths = params.termMonths ?? existingDeal.termMonths;

      const totalValueCents = seats * pricePerSeat;
      const arrCents = Math.round((totalValueCents / termMonths) * 12);

      updateData.totalValueCents = totalValueCents;
      updateData.arrCents = arrCents;
    }

    // Handle date conversions
    if (params.startDate) updateData.startDate = new Date(params.startDate);
    if (params.endDate) updateData.endDate = new Date(params.endDate);
    if (params.expectedCloseDate) updateData.expectedCloseDate = new Date(params.expectedCloseDate);
    if (params.products) updateData.productsJson = params.products;

    // Handle status changes with timestamps
    if (params.status) {
      if (params.status === 'QUALIFIED' && existingDeal.status === 'LEAD') {
        updateData.qualifiedAt = new Date();
      }
      if (params.status === 'PROPOSAL' && !existingDeal.proposalSentAt) {
        updateData.proposalSentAt = new Date();
      }
    }

    const deal = await prisma.enterpriseDeal.update({
      where: { id: dealId },
      data: updateData,
      include: {
        customer: true,
      },
    });

    // Log status change if applicable
    if (params.status && params.status !== existingDeal.status) {
      await prisma.enterpriseDealActivity.create({
        data: {
          dealId,
          activityType: 'STATUS_CHANGE',
          description: `Status changed from ${existingDeal.status} to ${params.status}`,
          previousStatus: existingDeal.status,
          newStatus: params.status,
          performedBy,
        },
      });
    }

    return deal;
  }

  /**
   * Add an activity to a deal
   */
  async addDealActivity(params: AddDealActivityParams, performedBy: string) {
    const activity = await prisma.enterpriseDealActivity.create({
      data: {
        dealId: params.dealId,
        activityType: params.activityType,
        description: params.description,
        performedBy,
      },
    });

    return activity;
  }

  /**
   * Get activities for a deal
   */
  async getDealActivities(dealId: string) {
    const activities = await prisma.enterpriseDealActivity.findMany({
      where: { dealId },
      orderBy: { occurredAt: 'desc' },
    });

    return activities;
  }

  /**
   * Mark a deal as won
   */
  async winDeal(dealId: string, performedBy: string) {
    const deal = await prisma.enterpriseDeal.update({
      where: { id: dealId },
      data: {
        status: 'WON_PENDING',
        wonAt: new Date(),
        actualCloseDate: new Date(),
        probability: 100,
      },
      include: {
        customer: true,
      },
    });

    await prisma.enterpriseDealActivity.create({
      data: {
        dealId,
        activityType: 'STATUS_CHANGE',
        description: 'Deal marked as WON! Ready for license provisioning.',
        previousStatus: 'NEGOTIATION', // Assuming previous status
        newStatus: 'WON_PENDING',
        performedBy,
      },
    });

    return deal;
  }

  /**
   * Mark a deal as lost
   */
  async loseDeal(dealId: string, reason: string, performedBy: string) {
    const existingDeal = await prisma.enterpriseDeal.findUnique({
      where: { id: dealId },
    });

    if (!existingDeal) return null;

    const deal = await prisma.enterpriseDeal.update({
      where: { id: dealId },
      data: {
        status: 'LOST',
        lostAt: new Date(),
        lostReason: reason,
        probability: 0,
      },
      include: {
        customer: true,
      },
    });

    await prisma.enterpriseDealActivity.create({
      data: {
        dealId,
        activityType: 'STATUS_CHANGE',
        description: `Deal lost. Reason: ${reason}`,
        previousStatus: existingDeal.status,
        newStatus: 'LOST',
        performedBy,
      },
    });

    return deal;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BULK PROVISIONING
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create a provisioning batch (does not execute yet)
   */
  async createProvisioningBatch(
    params: CreateProvisioningBatchParams,
    initiatedBy: string,
    _ipAddress?: string,
    _userAgent?: string,
  ) {
    // Verify deal exists and is in a valid state
    const deal = await prisma.enterpriseDeal.findUnique({
      where: { id: params.dealId },
      include: { customer: true },
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    if (!['WON_PENDING', 'WON_ACTIVE'].includes(deal.status)) {
      throw new Error('Deal must be in WON status to provision licenses');
    }

    const batch = await prisma.enterpriseProvisioningBatch.create({
      data: {
        dealId: params.dealId,
        name: params.name,
        licenseCount: params.licenseCount,
        licenseType: params.licenseType ?? 'ENTERPRISE',
        seatsPerLicense: params.seatsPerLicense ?? 1,
        durationDays: params.durationDays,
        featuresJson: params.features ?? [],
        status: 'PENDING',
        initiatedBy,
      },
      include: {
        deal: {
          include: { customer: true },
        },
      },
    });

    return batch;
  }

  /**
   * Execute a provisioning batch (generate licenses)
   */
  async executeProvisioningBatch(
    batchId: string,
    performedBy: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const batch = await prisma.enterpriseProvisioningBatch.findUnique({
      where: { id: batchId },
      include: {
        deal: {
          include: { customer: true },
        },
      },
    });

    if (!batch) {
      return { success: false, error: 'Batch not found' };
    }

    if (batch.status !== 'PENDING') {
      return { success: false, error: `Batch is already ${batch.status}` };
    }

    // Start batch execution
    await prisma.enterpriseProvisioningBatch.update({
      where: { id: batchId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    try {
      // Get customer's tenant ID (or create one if needed)
      const tenantId = batch.deal.customer.tenantId ?? batch.deal.customer.id;

      // Generate bulk licenses using the vault service
      const vaultService = getLicenseVaultService();
      const result = await vaultService.generateBulkLicenses({
        enterpriseDealId: batch.dealId,
        tenantId,
        type: batch.licenseType,
        seatsPerLicense: batch.seatsPerLicense,
        quantity: batch.licenseCount,
        validDays: batch.durationDays ?? 365,
        features: (batch.featuresJson as string[]) ?? [],
        issuedBy: performedBy,
      });

      // Update batch as completed
      const updatedBatch = await prisma.enterpriseProvisioningBatch.update({
        where: { id: batchId },
        data: {
          status: 'COMPLETED',
          provisionedCount: result.licenses.length,
          completedAt: new Date(),
        },
      });

      // Update deal status to active if this was first provisioning
      await prisma.enterpriseDeal.update({
        where: { id: batch.dealId },
        data: { status: 'WON_ACTIVE' },
      });

      // Log activity
      await prisma.enterpriseDealActivity.create({
        data: {
          dealId: batch.dealId,
          activityType: 'NOTE',
          description: `Provisioned ${result.licenses.length} licenses in batch "${batch.name}"`,
          performedBy,
        },
      });

      return {
        success: true,
        batch: updatedBatch,
        licensesCreated: result.licenses.length,
      };
    } catch (error) {
      // Update batch as failed
      await prisma.enterpriseProvisioningBatch.update({
        where: { id: batchId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to provision licenses',
      };
    }
  }

  /**
   * List provisioning batches
   */
  async listProvisioningBatches(params: ListBatchesParams) {
    const where: Record<string, unknown> = {};

    if (params.dealId) where.dealId = params.dealId;
    if (params.status) where.status = params.status;

    const [batches, total] = await Promise.all([
      prisma.enterpriseProvisioningBatch.findMany({
        where,
        include: {
          deal: {
            select: { id: true, name: true, customer: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      }),
      prisma.enterpriseProvisioningBatch.count({ where }),
    ]);

    return { batches, total };
  }

  /**
   * Get a provisioning batch with details
   */
  async getProvisioningBatch(batchId: string) {
    const batch = await prisma.enterpriseProvisioningBatch.findUnique({
      where: { id: batchId },
      include: {
        deal: {
          include: {
            customer: true,
          },
        },
      },
    });

    return batch;
  }

  /**
   * Get licenses for a batch
   */
  async getBatchLicenses(batchId: string) {
    // Get the batch to find the deal
    const batch = await prisma.enterpriseProvisioningBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return { licenses: [], total: 0 };
    }

    // Get licenses for this deal
    const licenses = await prisma.vaultLicense.findMany({
      where: { enterpriseDealId: batch.dealId },
      orderBy: { createdAt: 'desc' },
    });

    return { licenses, total: licenses.length };
  }

  /**
   * Export licenses from a batch
   */
  async exportBatchLicenses(batchId: string, format: 'csv' | 'json') {
    const { licenses } = await this.getBatchLicenses(batchId);

    if (licenses.length === 0) {
      return { success: false, error: 'No licenses found for this batch' };
    }

    if (format === 'json') {
      return {
        success: true,
        data: licenses.map((l) => ({
          id: l.id,
          type: l.type,
          seats: l.seats,
          status: l.status,
          issuedAt: l.issuedAt,
          expiresAt: l.expiresAt,
        })),
      };
    }

    // CSV format
    const headers = ['License ID', 'Type', 'Seats', 'Status', 'Issued At', 'Expires At'];
    const rows = licenses.map((l) => [
      l.id,
      l.type,
      l.seats.toString(),
      l.status,
      l.issuedAt.toISOString(),
      l.expiresAt?.toISOString() ?? 'Never',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return { success: true, data: csv };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ANALYTICS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get sales pipeline analytics
   */
  async getPipelineAnalytics(_userId: string) {
    // Count deals by status
    const dealsByStatus = await prisma.enterpriseDeal.groupBy({
      by: ['status'],
      _count: true,
      _sum: {
        totalValueCents: true,
        arrCents: true,
      },
    });

    // Count deals by type
    const dealsByType = await prisma.enterpriseDeal.groupBy({
      by: ['type'],
      _count: true,
      _sum: {
        totalValueCents: true,
      },
    });

    // Recent wins
    const recentWins = await prisma.enterpriseDeal.findMany({
      where: {
        status: { in: ['WON_PENDING', 'WON_ACTIVE'] },
        wonAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { wonAt: 'desc' },
      take: 10,
      include: {
        customer: {
          select: { name: true, type: true },
        },
      },
    });

    // Calculate totals
    const totalPipelineValue = dealsByStatus
      .filter((d) => !['WON_ACTIVE', 'LOST', 'CHURNED'].includes(d.status))
      .reduce((sum, d) => sum + (d._sum.totalValueCents ?? 0), 0);

    const totalWonValue = dealsByStatus
      .filter((d) => ['WON_PENDING', 'WON_ACTIVE'].includes(d.status))
      .reduce((sum, d) => sum + (d._sum.totalValueCents ?? 0), 0);

    const totalARR = dealsByStatus
      .filter((d) => d.status === 'WON_ACTIVE')
      .reduce((sum, d) => sum + (d._sum.arrCents ?? 0), 0);

    return {
      dealsByStatus,
      dealsByType,
      recentWins,
      totals: {
        pipelineValueCents: totalPipelineValue,
        wonValueCents: totalWonValue,
        activeArrCents: totalARR,
      },
    };
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get won deals in period
    const wonDeals = await prisma.enterpriseDeal.findMany({
      where: {
        status: { in: ['WON_PENDING', 'WON_ACTIVE'] },
        wonAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { wonAt: 'asc' },
    });

    // Calculate monthly revenue
    const monthlyRevenue: Record<string, { revenue: number; deals: number }> = {};

    for (const deal of wonDeals) {
      if (!deal.wonAt) continue;
      const monthKey = `${deal.wonAt.getFullYear()}-${String(deal.wonAt.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = { revenue: 0, deals: 0 };
      }
      
      monthlyRevenue[monthKey].revenue += deal.totalValueCents;
      monthlyRevenue[monthKey].deals += 1;
    }

    // Customer acquisition
    const customersByType = await prisma.enterpriseCustomer.groupBy({
      by: ['type'],
      _count: true,
    });

    // Seat distribution
    const seatStats = await prisma.enterpriseDeal.aggregate({
      where: {
        status: 'WON_ACTIVE',
      },
      _sum: {
        seats: true,
      },
      _avg: {
        seats: true,
        pricePerSeatCents: true,
      },
    });

    return {
      period: { start, end },
      monthlyRevenue,
      customersByType,
      seatStats: {
        totalSeats: seatStats._sum.seats ?? 0,
        avgSeatsPerDeal: Math.round(seatStats._avg.seats ?? 0),
        avgPricePerSeatCents: Math.round(seatStats._avg.pricePerSeatCents ?? 0),
      },
      totalRevenueCents: wonDeals.reduce((sum, d) => sum + d.totalValueCents, 0),
      totalDeals: wonDeals.length,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const enterpriseProvisioningService = new EnterpriseProvisioningService();
