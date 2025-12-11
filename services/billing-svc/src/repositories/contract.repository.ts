/**
 * Contract Repository
 *
 * Data access layer for district contracts, products, price books,
 * and entitlements. Provides CRUD operations and complex queries.
 */

import type { Prisma } from '../../generated/prisma-client/index.js';

import { prisma } from '../prisma.js';
import type {
  Contract,
  ContractAllocation,
  ContractEntitlement,
  ContractInvoiceSchedule,
  ContractLineItem,
  ContractStatus,
  ContractWithRelations,
  CreateContractAllocationSchema,
  CreateContractEntitlementSchema,
  CreateContractLineItemSchema,
  CreateContractSchema,
  CreateDistrictBillingProfileSchema,
  CreateInvoiceScheduleSchema,
  CreatePriceBookEntrySchema,
  CreatePriceBookSchema,
  CreateProductSchema,
  DistrictBillingProfile,
  PriceBook,
  PriceBookEntry,
  Product,
} from '../types.js';

// ============================================================================
// Product Repository
// ============================================================================

export class ProductRepository {
  /**
   * Create a new product/SKU.
   */
  async create(data: Zod.infer<typeof CreateProductSchema>): Promise<Product> {
    return prisma.product.create({
      data: {
        ...data,
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as Product;
  }

  /**
   * Get a product by ID.
   */
  async getById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id },
    }) as unknown as Product | null;
  }

  /**
   * Get a product by SKU.
   */
  async getBySku(sku: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { sku },
    }) as unknown as Product | null;
  }

  /**
   * List all active products.
   */
  async listActive(): Promise<Product[]> {
    return prisma.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }) as unknown as Product[];
  }

  /**
   * List products by category.
   */
  async listByCategory(category: string): Promise<Product[]> {
    return prisma.product.findMany({
      where: { category, isActive: true },
      orderBy: { sortOrder: 'asc' },
    }) as unknown as Product[];
  }

  /**
   * Update a product.
   */
  async update(
    id: string,
    data: Partial<Zod.infer<typeof CreateProductSchema>>
  ): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: {
        ...data,
        metadataJson: data.metadataJson ?? undefined,
      },
    }) as unknown as Product;
  }

  /**
   * Soft-delete a product by deactivating it.
   */
  async deactivate(id: string): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    }) as unknown as Product;
  }
}

// ============================================================================
// Price Book Repository
// ============================================================================

export class PriceBookRepository {
  /**
   * Create a new price book.
   */
  async create(
    data: Zod.infer<typeof CreatePriceBookSchema>
  ): Promise<PriceBook> {
    return prisma.priceBook.create({
      data: {
        ...data,
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as PriceBook;
  }

  /**
   * Get a price book by ID.
   */
  async getById(id: string): Promise<PriceBook | null> {
    return prisma.priceBook.findUnique({
      where: { id },
    }) as unknown as PriceBook | null;
  }

  /**
   * Get the default price book.
   */
  async getDefault(): Promise<PriceBook | null> {
    return prisma.priceBook.findFirst({
      where: { isDefault: true, isActive: true },
    }) as unknown as PriceBook | null;
  }

  /**
   * List all active price books.
   */
  async listActive(): Promise<PriceBook[]> {
    return prisma.priceBook.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }) as unknown as PriceBook[];
  }

  /**
   * Get a price book with its entries.
   */
  async getWithEntries(id: string): Promise<(PriceBook & { entries: PriceBookEntry[] }) | null> {
    return prisma.priceBook.findUnique({
      where: { id },
      include: { entries: true },
    }) as unknown as (PriceBook & { entries: PriceBookEntry[] }) | null;
  }

  /**
   * Update a price book.
   */
  async update(
    id: string,
    data: Partial<Zod.infer<typeof CreatePriceBookSchema>>
  ): Promise<PriceBook> {
    return prisma.priceBook.update({
      where: { id },
      data: {
        ...data,
        metadataJson: data.metadataJson ?? undefined,
      },
    }) as unknown as PriceBook;
  }

  /**
   * Set a price book as default (and unset others).
   */
  async setDefault(id: string): Promise<PriceBook> {
    // Unset current default
    await prisma.priceBook.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    // Set new default
    return prisma.priceBook.update({
      where: { id },
      data: { isDefault: true },
    }) as unknown as PriceBook;
  }
}

// ============================================================================
// Price Book Entry Repository
// ============================================================================

export class PriceBookEntryRepository {
  /**
   * Create a new price book entry.
   */
  async create(
    data: Zod.infer<typeof CreatePriceBookEntrySchema>
  ): Promise<PriceBookEntry> {
    return prisma.priceBookEntry.create({
      data: {
        ...data,
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as PriceBookEntry;
  }

  /**
   * Get entries by price book ID.
   */
  async listByPriceBook(priceBookId: string): Promise<PriceBookEntry[]> {
    return prisma.priceBookEntry.findMany({
      where: { priceBookId },
      include: { product: true },
      orderBy: { sku: 'asc' },
    }) as unknown as PriceBookEntry[];
  }

  /**
   * Get entry for a specific SKU in a price book.
   */
  async getBySku(
    priceBookId: string,
    sku: string
  ): Promise<PriceBookEntry | null> {
    return prisma.priceBookEntry.findFirst({
      where: { priceBookId, sku },
      include: { product: true },
    }) as unknown as PriceBookEntry | null;
  }

  /**
   * Update a price book entry.
   */
  async update(
    id: string,
    data: Partial<Zod.infer<typeof CreatePriceBookEntrySchema>>
  ): Promise<PriceBookEntry> {
    return prisma.priceBookEntry.update({
      where: { id },
      data: {
        ...data,
        metadataJson: data.metadataJson ?? undefined,
      },
    }) as unknown as PriceBookEntry;
  }

  /**
   * Delete a price book entry.
   */
  async delete(id: string): Promise<void> {
    await prisma.priceBookEntry.delete({ where: { id } });
  }
}

// ============================================================================
// District Billing Profile Repository
// ============================================================================

export class DistrictBillingProfileRepository {
  /**
   * Create a district billing profile.
   */
  async create(
    data: Zod.infer<typeof CreateDistrictBillingProfileSchema>
  ): Promise<DistrictBillingProfile> {
    return prisma.districtBillingProfile.create({
      data: {
        ...data,
        billingAddressJson: data.billingAddressJson,
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as DistrictBillingProfile;
  }

  /**
   * Get profile by ID.
   */
  async getById(id: string): Promise<DistrictBillingProfile | null> {
    return prisma.districtBillingProfile.findUnique({
      where: { id },
    }) as unknown as DistrictBillingProfile | null;
  }

  /**
   * Get profile by billing account ID.
   */
  async getByBillingAccountId(
    billingAccountId: string
  ): Promise<DistrictBillingProfile | null> {
    return prisma.districtBillingProfile.findUnique({
      where: { billingAccountId },
    }) as unknown as DistrictBillingProfile | null;
  }

  /**
   * Get profile by tenant ID.
   */
  async getByTenantId(tenantId: string): Promise<DistrictBillingProfile | null> {
    return prisma.districtBillingProfile.findUnique({
      where: { tenantId },
    }) as unknown as DistrictBillingProfile | null;
  }

  /**
   * Update a billing profile.
   */
  async update(
    id: string,
    data: Partial<Zod.infer<typeof CreateDistrictBillingProfileSchema>>
  ): Promise<DistrictBillingProfile> {
    return prisma.districtBillingProfile.update({
      where: { id },
      data: {
        ...data,
        billingAddressJson: data.billingAddressJson ?? undefined,
        metadataJson: data.metadataJson ?? undefined,
      },
    }) as unknown as DistrictBillingProfile;
  }
}

// ============================================================================
// Contract Repository
// ============================================================================

export class ContractRepository {
  private static readonly INCLUDE_FULL = {
    billingProfile: true,
    priceBook: true,
    lineItems: {
      include: {
        product: true,
        allocations: true,
      },
    },
    entitlements: true,
    invoiceSchedules: true,
  };

  /**
   * Generate a unique contract number.
   */
  async generateContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.contract.count({
      where: {
        contractNumber: {
          startsWith: `CONT-${year}-`,
        },
      },
    });
    return `CONT-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Create a new contract.
   */
  async create(data: Zod.infer<typeof CreateContractSchema>): Promise<Contract> {
    const contractNumber = await this.generateContractNumber();

    return prisma.contract.create({
      data: {
        ...data,
        contractNumber,
        status: 'DRAFT',
        totalValueCents: BigInt(0),
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as Contract;
  }

  /**
   * Get a contract by ID.
   */
  async getById(id: string): Promise<Contract | null> {
    return prisma.contract.findUnique({
      where: { id },
    }) as unknown as Contract | null;
  }

  /**
   * Get a contract by ID with all relations.
   */
  async getByIdWithRelations(id: string): Promise<ContractWithRelations | null> {
    return prisma.contract.findUnique({
      where: { id },
      include: ContractRepository.INCLUDE_FULL,
    }) as unknown as ContractWithRelations | null;
  }

  /**
   * Get a contract by contract number.
   */
  async getByContractNumber(
    contractNumber: string
  ): Promise<Contract | null> {
    return prisma.contract.findUnique({
      where: { contractNumber },
    }) as unknown as Contract | null;
  }

  /**
   * List contracts for a tenant.
   */
  async listByTenant(tenantId: string): Promise<Contract[]> {
    return prisma.contract.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    }) as unknown as Contract[];
  }

  /**
   * List contracts by status.
   */
  async listByStatus(status: ContractStatus): Promise<Contract[]> {
    return prisma.contract.findMany({
      where: { status },
      orderBy: { endDate: 'asc' },
    }) as unknown as Contract[];
  }

  /**
   * List contracts expiring within N days.
   */
  async listExpiringSoon(days: number): Promise<Contract[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: cutoff },
      },
      orderBy: { endDate: 'asc' },
    }) as unknown as Contract[];
  }

  /**
   * Get active contract for a tenant.
   */
  async getActiveForTenant(tenantId: string): Promise<Contract | null> {
    return prisma.contract.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: ContractRepository.INCLUDE_FULL,
    }) as unknown as Contract | null;
  }

  /**
   * Update contract status.
   */
  async updateStatus(
    id: string,
    status: ContractStatus,
    signedAt?: Date
  ): Promise<Contract> {
    return prisma.contract.update({
      where: { id },
      data: { status, signedAt },
    }) as unknown as Contract;
  }

  /**
   * Update contract total value (recalculated from line items).
   */
  async recalculateTotalValue(id: string): Promise<Contract> {
    const lineItems = await prisma.contractLineItem.findMany({
      where: { contractId: id },
    });

    const totalValueCents = lineItems.reduce(
      (sum, item) => sum + BigInt(item.totalValueCents),
      BigInt(0)
    );

    return prisma.contract.update({
      where: { id },
      data: { totalValueCents },
    }) as unknown as Contract;
  }

  /**
   * Update contract metadata.
   */
  async update(
    id: string,
    data: Partial<Zod.infer<typeof CreateContractSchema>>
  ): Promise<Contract> {
    return prisma.contract.update({
      where: { id },
      data: {
        ...data,
        metadataJson: data.metadataJson ?? undefined,
      },
    }) as unknown as Contract;
  }
}

// ============================================================================
// Contract Line Item Repository
// ============================================================================

export class ContractLineItemRepository {
  /**
   * Create a line item.
   */
  async create(
    data: Zod.infer<typeof CreateContractLineItemSchema>
  ): Promise<ContractLineItem> {
    // Calculate total value
    const totalValueCents = BigInt(
      Math.round(data.unitPrice * data.quantityCommitted * 100)
    );

    return prisma.contractLineItem.create({
      data: {
        ...data,
        totalValueCents,
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as ContractLineItem;
  }

  /**
   * Get line items for a contract.
   */
  async listByContract(contractId: string): Promise<ContractLineItem[]> {
    return prisma.contractLineItem.findMany({
      where: { contractId },
      include: {
        product: true,
        allocations: true,
      },
      orderBy: { sku: 'asc' },
    }) as unknown as ContractLineItem[];
  }

  /**
   * Get a line item by ID.
   */
  async getById(id: string): Promise<ContractLineItem | null> {
    return prisma.contractLineItem.findUnique({
      where: { id },
      include: {
        product: true,
        allocations: true,
      },
    }) as unknown as ContractLineItem | null;
  }

  /**
   * Update a line item.
   */
  async update(
    id: string,
    data: Partial<Zod.infer<typeof CreateContractLineItemSchema>>
  ): Promise<ContractLineItem> {
    // Recalculate total if quantity or price changed
    const existing = await prisma.contractLineItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Line item ${id} not found`);
    }

    const quantity = data.quantityCommitted ?? existing.quantityCommitted;
    const unitPrice = data.unitPrice ?? Number(existing.unitPrice);
    const totalValueCents = BigInt(Math.round(unitPrice * quantity * 100));

    return prisma.contractLineItem.update({
      where: { id },
      data: {
        ...data,
        totalValueCents,
        metadataJson: data.metadataJson ?? undefined,
      },
    }) as unknown as ContractLineItem;
  }

  /**
   * Delete a line item.
   */
  async delete(id: string): Promise<void> {
    await prisma.contractLineItem.delete({ where: { id } });
  }
}

// ============================================================================
// Contract Allocation Repository
// ============================================================================

export class ContractAllocationRepository {
  /**
   * Create an allocation.
   */
  async create(
    data: Zod.infer<typeof CreateContractAllocationSchema>
  ): Promise<ContractAllocation> {
    return prisma.contractAllocation.create({
      data: {
        ...data,
        quantityUsed: 0,
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as ContractAllocation;
  }

  /**
   * Get allocations for a line item.
   */
  async listByLineItem(lineItemId: string): Promise<ContractAllocation[]> {
    return prisma.contractAllocation.findMany({
      where: { lineItemId },
    }) as unknown as ContractAllocation[];
  }

  /**
   * Get allocations for a school.
   */
  async listBySchool(schoolId: string): Promise<ContractAllocation[]> {
    return prisma.contractAllocation.findMany({
      where: { schoolId },
      include: {
        lineItem: {
          include: {
            contract: true,
            product: true,
          },
        },
      },
    }) as unknown as ContractAllocation[];
  }

  /**
   * Update allocation used count.
   */
  async updateUsage(id: string, quantityUsed: number): Promise<ContractAllocation> {
    return prisma.contractAllocation.update({
      where: { id },
      data: { quantityUsed },
    }) as unknown as ContractAllocation;
  }

  /**
   * Increment allocation used count.
   */
  async incrementUsage(id: string, increment: number): Promise<ContractAllocation> {
    return prisma.contractAllocation.update({
      where: { id },
      data: {
        quantityUsed: { increment },
      },
    }) as unknown as ContractAllocation;
  }

  /**
   * Delete an allocation.
   */
  async delete(id: string): Promise<void> {
    await prisma.contractAllocation.delete({ where: { id } });
  }
}

// ============================================================================
// Contract Entitlement Repository
// ============================================================================

export class ContractEntitlementRepository {
  /**
   * Create an entitlement.
   */
  async create(
    data: Zod.infer<typeof CreateContractEntitlementSchema>
  ): Promise<ContractEntitlement> {
    return prisma.contractEntitlement.create({
      data: {
        ...data,
        isActive: true,
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as ContractEntitlement;
  }

  /**
   * Get entitlements for a contract.
   */
  async listByContract(contractId: string): Promise<ContractEntitlement[]> {
    return prisma.contractEntitlement.findMany({
      where: { contractId },
      orderBy: { featureKey: 'asc' },
    }) as unknown as ContractEntitlement[];
  }

  /**
   * Get active entitlements for a tenant.
   */
  async listActiveByTenant(tenantId: string): Promise<ContractEntitlement[]> {
    const now = new Date();
    return prisma.contractEntitlement.findMany({
      where: {
        tenantId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { featureKey: 'asc' },
    }) as unknown as ContractEntitlement[];
  }

  /**
   * Check if tenant has a specific entitlement.
   */
  async hasEntitlement(
    tenantId: string,
    featureKey: string
  ): Promise<{ hasAccess: boolean; quantity: number | null }> {
    const now = new Date();
    const entitlement = await prisma.contractEntitlement.findFirst({
      where: {
        tenantId,
        featureKey,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    return {
      hasAccess: !!entitlement,
      quantity: entitlement?.quantity ?? null,
    };
  }

  /**
   * Deactivate an entitlement.
   */
  async deactivate(id: string): Promise<ContractEntitlement> {
    return prisma.contractEntitlement.update({
      where: { id },
      data: { isActive: false },
    }) as unknown as ContractEntitlement;
  }

  /**
   * Deactivate all entitlements for a contract.
   */
  async deactivateByContract(contractId: string): Promise<number> {
    const result = await prisma.contractEntitlement.updateMany({
      where: { contractId },
      data: { isActive: false },
    });
    return result.count;
  }
}

// ============================================================================
// Contract Invoice Schedule Repository
// ============================================================================

export class ContractInvoiceScheduleRepository {
  /**
   * Create an invoice schedule entry.
   */
  async create(
    data: Zod.infer<typeof CreateInvoiceScheduleSchema>
  ): Promise<ContractInvoiceSchedule> {
    return prisma.contractInvoiceSchedule.create({
      data: {
        ...data,
        amountCents: BigInt(data.amountCents),
        status: 'PENDING',
        metadataJson: data.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as ContractInvoiceSchedule;
  }

  /**
   * Get schedules for a contract.
   */
  async listByContract(contractId: string): Promise<ContractInvoiceSchedule[]> {
    return prisma.contractInvoiceSchedule.findMany({
      where: { contractId },
      orderBy: { scheduledDate: 'asc' },
    }) as unknown as ContractInvoiceSchedule[];
  }

  /**
   * Get pending invoices due before a date.
   */
  async listPendingDue(beforeDate: Date): Promise<ContractInvoiceSchedule[]> {
    return prisma.contractInvoiceSchedule.findMany({
      where: {
        status: 'PENDING',
        scheduledDate: { lte: beforeDate },
      },
      include: { contract: true },
      orderBy: { scheduledDate: 'asc' },
    }) as unknown as ContractInvoiceSchedule[];
  }

  /**
   * Update schedule status.
   */
  async updateStatus(
    id: string,
    status: string,
    invoiceId?: string
  ): Promise<ContractInvoiceSchedule> {
    return prisma.contractInvoiceSchedule.update({
      where: { id },
      data: { status, invoiceId },
    }) as unknown as ContractInvoiceSchedule;
  }
}

// ============================================================================
// Repository Instances (singleton pattern)
// ============================================================================

export const productRepository = new ProductRepository();
export const priceBookRepository = new PriceBookRepository();
export const priceBookEntryRepository = new PriceBookEntryRepository();
export const districtBillingProfileRepository = new DistrictBillingProfileRepository();
export const contractRepository = new ContractRepository();
export const contractLineItemRepository = new ContractLineItemRepository();
export const contractAllocationRepository = new ContractAllocationRepository();
export const contractEntitlementRepository = new ContractEntitlementRepository();
export const contractInvoiceScheduleRepository = new ContractInvoiceScheduleRepository();
