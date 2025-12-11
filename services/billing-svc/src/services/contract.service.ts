/**
 * Contract Service
 *
 * Business logic for district contracts, entitlements, and billing.
 * Handles contract lifecycle, seat allocation, and entitlement generation.
 */

import type { Prisma } from '../../generated/prisma-client/index.js';

import {
  contractRepository,
  contractLineItemRepository,
  contractAllocationRepository,
  contractEntitlementRepository,
  contractInvoiceScheduleRepository,
  districtBillingProfileRepository,
  priceBookEntryRepository,
  priceBookRepository,
  productRepository,
} from '../repositories/contract.repository.js';
import { prisma } from '../prisma.js';
import type {
  Contract,
  ContractAllocation,
  ContractDetailResponse,
  ContractEntitlement,
  ContractLineItem,
  ContractStatus,
  ContractWithRelations,
  CreateContractSchema,
  CreateContractLineItemSchema,
  EntitlementCheckResult,
  FeatureKey,
  SKU,
} from '../types.js';

// ============================================================================
// SKU to Feature Key Mapping
// ============================================================================

/**
 * Maps SKUs to the feature keys they grant.
 */
const SKU_TO_FEATURES: Record<string, string[]> = {
  ORG_BASE: ['PLATFORM_ACCESS', 'TEACHER_DASHBOARD', 'TEACHER_REPORTS'],
  SEAT_K5: ['GRADE_K5', 'MODULE_ELA', 'MODULE_MATH'],
  SEAT_6_8: ['GRADE_6_8', 'MODULE_ELA', 'MODULE_MATH'],
  SEAT_9_12: ['GRADE_9_12', 'MODULE_ELA', 'MODULE_MATH'],
  ADDON_SEL: ['MODULE_SEL'],
  ADDON_SPEECH: ['MODULE_SPEECH'],
  ADDON_SCIENCE: ['MODULE_SCIENCE'],
};

/**
 * Maps SKUs to their seat entitlement keys (if applicable).
 */
const SKU_TO_SEAT_ENTITLEMENT: Record<string, string> = {
  SEAT_K5: 'LEARNER_SEATS_K5',
  SEAT_6_8: 'LEARNER_SEATS_6_8',
  SEAT_9_12: 'LEARNER_SEATS_9_12',
};

// ============================================================================
// Contract Service
// ============================================================================

export class ContractService {
  // ==========================================================================
  // Contract Creation & Management
  // ==========================================================================

  /**
   * Create a new contract with validation.
   */
  async createContract(
    data: Zod.infer<typeof CreateContractSchema>
  ): Promise<Contract> {
    // Validate billing profile exists
    const profile = await districtBillingProfileRepository.getById(
      data.billingProfileId
    );
    if (!profile) {
      throw new Error(`Billing profile ${data.billingProfileId} not found`);
    }

    // Validate price book exists
    const priceBook = await priceBookRepository.getById(data.priceBookId);
    if (!priceBook) {
      throw new Error(`Price book ${data.priceBookId} not found`);
    }

    // Validate dates
    if (data.endDate <= data.startDate) {
      throw new Error('End date must be after start date');
    }

    return contractRepository.create(data);
  }

  /**
   * Get contract with full details for display.
   */
  async getContractDetail(contractId: string): Promise<ContractDetailResponse | null> {
    const contract = await contractRepository.getByIdWithRelations(contractId);
    if (!contract) return null;

    // Calculate summary
    const seatItems = contract.lineItems.filter((li) =>
      li.sku.startsWith('SEAT_')
    );
    const totalSeats = seatItems.reduce(
      (sum, li) => sum + li.quantityCommitted,
      0
    );

    const seatsByGrade: Record<string, number> = {};
    for (const item of seatItems) {
      const grade = item.sku.replace('SEAT_', '');
      seatsByGrade[grade] = (seatsByGrade[grade] || 0) + item.quantityCommitted;
    }

    const addonItems = contract.lineItems.filter((li) =>
      li.sku.startsWith('ADDON_')
    );
    const addons = addonItems.map((li) => li.sku.replace('ADDON_', ''));

    const totalAnnualValue =
      Number(contract.totalValueCents) / 100 /
      this.getContractYears(contract.startDate, contract.endDate);

    return {
      contract,
      summary: {
        totalSeats,
        seatsByGrade,
        addons,
        totalAnnualValue,
      },
    };
  }

  /**
   * Activate a contract (moves from DRAFT/PENDING to ACTIVE).
   */
  async activateContract(
    contractId: string,
    signedAt?: Date
  ): Promise<Contract> {
    const contract = await contractRepository.getByIdWithRelations(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    if (contract.status !== 'DRAFT' && contract.status !== 'PENDING') {
      throw new Error(
        `Cannot activate contract in status ${contract.status}`
      );
    }

    if (contract.lineItems.length === 0) {
      throw new Error('Cannot activate contract with no line items');
    }

    // Generate entitlements
    await this.generateEntitlementsFromContract(contract);

    // Generate invoice schedule
    await this.generateInvoiceSchedule(contract);

    // Update status
    return contractRepository.updateStatus(
      contractId,
      'ACTIVE',
      signedAt ?? new Date()
    );
  }

  /**
   * Suspend a contract (e.g., for non-payment).
   */
  async suspendContract(contractId: string): Promise<Contract> {
    const contract = await contractRepository.getById(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    if (contract.status !== 'ACTIVE') {
      throw new Error(`Cannot suspend contract in status ${contract.status}`);
    }

    // Deactivate entitlements
    await contractEntitlementRepository.deactivateByContract(contractId);

    return contractRepository.updateStatus(contractId, 'SUSPENDED');
  }

  /**
   * Reactivate a suspended contract.
   */
  async reactivateContract(contractId: string): Promise<Contract> {
    const contract = await contractRepository.getByIdWithRelations(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    if (contract.status !== 'SUSPENDED') {
      throw new Error(
        `Cannot reactivate contract in status ${contract.status}`
      );
    }

    // Re-enable entitlements
    const now = new Date();
    for (const ent of contract.entitlements) {
      if (ent.endDate >= now) {
        await prisma.contractEntitlement.update({
          where: { id: ent.id },
          data: { isActive: true },
        });
      }
    }

    return contractRepository.updateStatus(contractId, 'ACTIVE');
  }

  /**
   * Cancel a contract.
   */
  async cancelContract(contractId: string, reason?: string): Promise<Contract> {
    const contract = await contractRepository.getById(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    // Deactivate entitlements
    await contractEntitlementRepository.deactivateByContract(contractId);

    // Cancel pending invoices
    const schedules = await contractInvoiceScheduleRepository.listByContract(
      contractId
    );
    for (const schedule of schedules) {
      if (schedule.status === 'PENDING') {
        await contractInvoiceScheduleRepository.updateStatus(
          schedule.id,
          'CANCELLED'
        );
      }
    }

    // Update contract with cancellation info
    const metadata = (contract.metadataJson as Record<string, unknown>) || {};
    await contractRepository.update(contractId, {
      metadataJson: {
        ...metadata,
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
      },
    });

    return contractRepository.updateStatus(contractId, 'CANCELLED');
  }

  // ==========================================================================
  // Line Item Management
  // ==========================================================================

  /**
   * Add a line item to a contract.
   */
  async addLineItem(
    data: Zod.infer<typeof CreateContractLineItemSchema>
  ): Promise<ContractLineItem> {
    const contract = await contractRepository.getById(data.contractId);
    if (!contract) {
      throw new Error(`Contract ${data.contractId} not found`);
    }

    if (contract.status !== 'DRAFT') {
      throw new Error(
        'Can only add line items to contracts in DRAFT status'
      );
    }

    // Validate product exists
    const product = await productRepository.getById(data.productId);
    if (!product) {
      throw new Error(`Product ${data.productId} not found`);
    }

    // Create line item
    const lineItem = await contractLineItemRepository.create(data);

    // Recalculate contract total
    await contractRepository.recalculateTotalValue(data.contractId);

    return lineItem;
  }

  /**
   * Add line item from price book entry (convenience method).
   */
  async addLineItemFromPriceBook(
    contractId: string,
    sku: string,
    quantity: number,
    discountPercent?: number,
    discountReason?: string
  ): Promise<ContractLineItem> {
    const contract = await contractRepository.getByIdWithRelations(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    // Get price from price book
    const entry = await priceBookEntryRepository.getBySku(
      contract.priceBookId,
      sku
    );
    if (!entry) {
      throw new Error(
        `SKU ${sku} not found in price book ${contract.priceBookId}`
      );
    }

    // Calculate discounted price
    const listPrice = Number(entry.unitPrice);
    const discount = discountPercent ?? 0;
    const unitPrice = listPrice * (1 - discount / 100);

    const product = await productRepository.getBySku(sku);
    if (!product) {
      throw new Error(`Product with SKU ${sku} not found`);
    }

    return this.addLineItem({
      contractId,
      productId: product.id,
      sku,
      description: product.name,
      billingPeriod: entry.billingPeriod,
      quantityCommitted: quantity,
      listPricePerUnit: listPrice,
      unitPrice,
      discountPercent: discount > 0 ? discount : undefined,
      discountReason,
      startDate: contract.startDate,
      endDate: contract.endDate,
    });
  }

  /**
   * Update a line item quantity.
   */
  async updateLineItemQuantity(
    lineItemId: string,
    quantity: number
  ): Promise<ContractLineItem> {
    const lineItem = await contractLineItemRepository.getById(lineItemId);
    if (!lineItem) {
      throw new Error(`Line item ${lineItemId} not found`);
    }

    const contract = await contractRepository.getById(lineItem.contractId);
    if (!contract || contract.status !== 'DRAFT') {
      throw new Error('Can only update line items on DRAFT contracts');
    }

    const updated = await contractLineItemRepository.update(lineItemId, {
      quantityCommitted: quantity,
    });

    // Recalculate contract total
    await contractRepository.recalculateTotalValue(lineItem.contractId);

    return updated;
  }

  /**
   * Remove a line item from a contract.
   */
  async removeLineItem(lineItemId: string): Promise<void> {
    const lineItem = await contractLineItemRepository.getById(lineItemId);
    if (!lineItem) {
      throw new Error(`Line item ${lineItemId} not found`);
    }

    const contract = await contractRepository.getById(lineItem.contractId);
    if (!contract || contract.status !== 'DRAFT') {
      throw new Error('Can only remove line items from DRAFT contracts');
    }

    await contractLineItemRepository.delete(lineItemId);

    // Recalculate contract total
    await contractRepository.recalculateTotalValue(lineItem.contractId);
  }

  // ==========================================================================
  // Seat Allocation
  // ==========================================================================

  /**
   * Allocate seats from a line item to a school.
   */
  async allocateSeatsToSchool(
    lineItemId: string,
    schoolId: string,
    quantity: number
  ): Promise<ContractAllocation> {
    const lineItem = await contractLineItemRepository.getById(lineItemId);
    if (!lineItem) {
      throw new Error(`Line item ${lineItemId} not found`);
    }

    // Check available capacity
    const allocations = await contractAllocationRepository.listByLineItem(
      lineItemId
    );
    const totalAllocated = allocations.reduce(
      (sum, a) => sum + a.quantityAllocated,
      0
    );
    const available = lineItem.quantityCommitted - totalAllocated;

    if (quantity > available) {
      throw new Error(
        `Cannot allocate ${quantity} seats. Only ${available} available.`
      );
    }

    // Check if allocation already exists for this school
    const existing = allocations.find((a) => a.schoolId === schoolId);
    if (existing) {
      // Update existing allocation
      return contractAllocationRepository.update(existing.id, {
        quantityAllocated: existing.quantityAllocated + quantity,
      });
    }

    return contractAllocationRepository.create({
      lineItemId,
      schoolId,
      quantityAllocated: quantity,
    });
  }

  /**
   * Get seat allocation summary for a contract.
   */
  async getSeatAllocationSummary(contractId: string): Promise<{
    bySku: Record<string, { committed: number; allocated: number; used: number }>;
    bySchool: Record<string, { allocated: number; used: number }>;
  }> {
    const contract = await contractRepository.getByIdWithRelations(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    const bySku: Record<
      string,
      { committed: number; allocated: number; used: number }
    > = {};
    const bySchool: Record<string, { allocated: number; used: number }> = {};

    for (const lineItem of contract.lineItems) {
      if (!lineItem.sku.startsWith('SEAT_')) continue;

      const allocations = await contractAllocationRepository.listByLineItem(
        lineItem.id
      );

      const allocated = allocations.reduce(
        (sum, a) => sum + a.quantityAllocated,
        0
      );
      const used = allocations.reduce((sum, a) => sum + a.quantityUsed, 0);

      bySku[lineItem.sku] = {
        committed: lineItem.quantityCommitted,
        allocated,
        used,
      };

      for (const alloc of allocations) {
        if (!bySchool[alloc.schoolId]) {
          bySchool[alloc.schoolId] = { allocated: 0, used: 0 };
        }
        bySchool[alloc.schoolId].allocated += alloc.quantityAllocated;
        bySchool[alloc.schoolId].used += alloc.quantityUsed;
      }
    }

    return { bySku, bySchool };
  }

  // ==========================================================================
  // Entitlement Generation & Checking
  // ==========================================================================

  /**
   * Generate entitlements from contract line items.
   */
  async generateEntitlementsFromContract(
    contract: ContractWithRelations
  ): Promise<ContractEntitlement[]> {
    const entitlements: ContractEntitlement[] = [];
    const featuresSeen = new Set<string>();

    for (const lineItem of contract.lineItems) {
      // Get feature keys for this SKU
      const features = SKU_TO_FEATURES[lineItem.sku] || [];

      for (const featureKey of features) {
        // Avoid duplicates
        if (featuresSeen.has(featureKey)) continue;
        featuresSeen.add(featureKey);

        const ent = await contractEntitlementRepository.create({
          contractId: contract.id,
          tenantId: contract.tenantId,
          featureKey,
          startDate: lineItem.startDate ?? contract.startDate,
          endDate: lineItem.endDate ?? contract.endDate,
        });
        entitlements.push(ent);
      }

      // Create seat entitlement with quantity
      const seatKey = SKU_TO_SEAT_ENTITLEMENT[lineItem.sku];
      if (seatKey) {
        // Check if we already have one (for aggregation)
        const existingIdx = entitlements.findIndex(
          (e) => e.featureKey === seatKey
        );
        if (existingIdx >= 0) {
          // Update quantity
          const existing = entitlements[existingIdx];
          await prisma.contractEntitlement.update({
            where: { id: existing.id },
            data: { quantity: (existing.quantity ?? 0) + lineItem.quantityCommitted },
          });
          entitlements[existingIdx] = {
            ...existing,
            quantity: (existing.quantity ?? 0) + lineItem.quantityCommitted,
          };
        } else {
          const ent = await contractEntitlementRepository.create({
            contractId: contract.id,
            tenantId: contract.tenantId,
            featureKey: seatKey,
            quantity: lineItem.quantityCommitted,
            startDate: lineItem.startDate ?? contract.startDate,
            endDate: lineItem.endDate ?? contract.endDate,
          });
          entitlements.push(ent);
        }
      }
    }

    return entitlements;
  }

  /**
   * Check if a tenant has access to a feature.
   */
  async checkEntitlement(
    tenantId: string,
    featureKey: string
  ): Promise<EntitlementCheckResult> {
    const result = await contractEntitlementRepository.hasEntitlement(
      tenantId,
      featureKey
    );

    if (!result.hasAccess) {
      return {
        hasAccess: false,
        featureKey,
        quantity: null,
        expiresAt: null,
        contractId: null,
      };
    }

    // Get the entitlement for expiry info
    const entitlements = await contractEntitlementRepository.listActiveByTenant(
      tenantId
    );
    const ent = entitlements.find((e) => e.featureKey === featureKey);

    return {
      hasAccess: true,
      featureKey,
      quantity: ent?.quantity ?? null,
      expiresAt: ent?.endDate.toISOString() ?? null,
      contractId: ent?.contractId ?? null,
    };
  }

  /**
   * Get all active entitlements for a tenant.
   */
  async getTenantEntitlements(tenantId: string): Promise<ContractEntitlement[]> {
    return contractEntitlementRepository.listActiveByTenant(tenantId);
  }

  // ==========================================================================
  // Invoice Schedule Generation
  // ==========================================================================

  /**
   * Generate invoice schedule based on contract terms.
   */
  async generateInvoiceSchedule(
    contract: ContractWithRelations
  ): Promise<void> {
    const years = this.getContractYears(contract.startDate, contract.endDate);
    const annualAmount = Number(contract.totalValueCents) / years;

    // Generate annual invoices
    for (let i = 0; i < years; i++) {
      const scheduledDate = new Date(contract.startDate);
      scheduledDate.setFullYear(scheduledDate.getFullYear() + i);

      await contractInvoiceScheduleRepository.create({
        contractId: contract.id,
        scheduledDate,
        amountCents: BigInt(Math.round(annualAmount)),
        description: `Year ${i + 1} of ${years} - Annual Invoice`,
        metadataJson: {
          periodStart: scheduledDate.toISOString(),
          periodEnd: new Date(
            scheduledDate.getFullYear() + 1,
            scheduledDate.getMonth(),
            scheduledDate.getDate() - 1
          ).toISOString(),
        },
      });
    }
  }

  // ==========================================================================
  // Renewal & Expiry
  // ==========================================================================

  /**
   * Get contracts needing renewal notice.
   */
  async getContractsNeedingRenewalNotice(): Promise<Contract[]> {
    const contracts = await contractRepository.listByStatus('ACTIVE');

    return contracts.filter((c) => {
      const daysUntilExpiry = Math.ceil(
        (c.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= c.renewalNoticeDays;
    });
  }

  /**
   * Renew a contract (create a new contract as successor).
   */
  async renewContract(
    contractId: string,
    newEndDate: Date,
    priceBookId?: string
  ): Promise<Contract> {
    const oldContract = await contractRepository.getByIdWithRelations(
      contractId
    );
    if (!oldContract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    if (oldContract.status !== 'ACTIVE') {
      throw new Error(
        `Cannot renew contract in status ${oldContract.status}`
      );
    }

    // Create new contract starting when old one ends
    const newContract = await contractRepository.create({
      billingProfileId: oldContract.billingProfileId,
      tenantId: oldContract.tenantId,
      name: `${oldContract.name || 'Contract'} (Renewal)`,
      startDate: oldContract.endDate,
      endDate: newEndDate,
      priceBookId: priceBookId ?? oldContract.priceBookId,
      paymentType: oldContract.paymentType,
      autoRenewal: oldContract.autoRenewal,
      renewalNoticeDays: oldContract.renewalNoticeDays,
      metadataJson: {
        renewedFrom: oldContract.id,
        renewedAt: new Date().toISOString(),
      },
    });

    // Copy line items at current price book prices
    for (const lineItem of oldContract.lineItems) {
      await this.addLineItemFromPriceBook(
        newContract.id,
        lineItem.sku,
        lineItem.quantityCommitted,
        lineItem.discountPercent ?? undefined,
        lineItem.discountReason ?? undefined
      );
    }

    // Mark old contract as renewed
    await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'RENEWED' },
    });

    return newContract;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Calculate number of years in a contract.
   */
  private getContractYears(startDate: Date, endDate: Date): number {
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / msPerYear));
  }
}

// ============================================================================
// Service Instance (singleton)
// ============================================================================

export const contractService = new ContractService();
