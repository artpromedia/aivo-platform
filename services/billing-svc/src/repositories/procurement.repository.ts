/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, import/no-unresolved */
/**
 * Procurement Repository
 *
 * Data access layer for quotes, purchase orders, invoices, and renewal tasks.
 */

import type { PrismaClient } from '../generated/prisma-client';
import { Prisma } from '../generated/prisma-client';
import type {
  Quote,
  QuoteLineItem,
  QuoteWithLineItems,
  PurchaseOrder,
  DistrictInvoice,
  RenewalTask,
  RenewalTaskWithContract,
  CreateQuoteInput,
  CreateQuoteLineItemInput,
  UpdateQuoteInput,
  CreatePurchaseOrderInput,
  CreateDistrictInvoiceInput,
} from '../types';
import {
  QuoteStatus,
  POStatus,
  DistrictInvoiceStatus,
  RenewalTaskStatus,
  generateQuoteNumber,
  generateInvoiceNumber,
} from '../types';

// ============================================================================
// Quote Repository
// ============================================================================

export class QuoteRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new quote with auto-generated quote number
   */
  async create(input: CreateQuoteInput): Promise<Quote> {
    // Get next sequence number
    const count = await this.prisma.quote.count();
    const quoteNumber = generateQuoteNumber(count + 1);

    return this.prisma.quote.create({
      data: {
        ...input,
        quoteNumber,
        status: QuoteStatus.DRAFT,
        totalAmountCents: 0n,
        metadataJson: input.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as Quote;
  }

  /**
   * Find quote by ID
   */
  async findById(id: string): Promise<Quote | null> {
    return this.prisma.quote.findUnique({
      where: { id },
    }) as unknown as Quote | null;
  }

  /**
   * Find quote by quote number
   */
  async findByQuoteNumber(quoteNumber: string): Promise<Quote | null> {
    return this.prisma.quote.findUnique({
      where: { quoteNumber },
    }) as unknown as Quote | null;
  }

  /**
   * Find quote with line items
   */
  async findWithLineItems(id: string): Promise<QuoteWithLineItems | null> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    return quote as unknown as QuoteWithLineItems | null;
  }

  /**
   * List quotes for a billing account
   */
  async listByBillingAccount(
    billingAccountId: string,
    options?: {
      status?: QuoteStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Quote[]> {
    return this.prisma.quote.findMany({
      where: {
        billingAccountId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }) as unknown as Quote[];
  }

  /**
   * List quotes for a tenant
   */
  async listByTenant(
    tenantId: string,
    options?: {
      status?: QuoteStatus | QuoteStatus[];
      limit?: number;
      offset?: number;
    }
  ): Promise<Quote[]> {
    const statusFilter = options?.status
      ? Array.isArray(options.status)
        ? { in: options.status }
        : options.status
      : undefined;

    return this.prisma.quote.findMany({
      where: {
        tenantId,
        ...(statusFilter && { status: statusFilter }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }) as unknown as Quote[];
  }

  /**
   * Update quote
   */
  async update(id: string, input: UpdateQuoteInput): Promise<Quote> {
    return this.prisma.quote.update({
      where: { id },
      data: {
        ...input,
        metadataJson: input.metadataJson ?? undefined,
      },
    }) as unknown as Quote;
  }

  /**
   * Update quote status
   */
  async updateStatus(
    id: string,
    status: QuoteStatus,
    additionalData?: Partial<{
      sentAt: Date;
      acceptedAt: Date;
      convertedContractId: string;
    }>
  ): Promise<Quote> {
    return this.prisma.quote.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    }) as unknown as Quote;
  }

  /**
   * Recalculate quote total from line items
   */
  async recalculateTotal(quoteId: string): Promise<Quote> {
    const lineItems = await this.prisma.quoteLineItem.findMany({
      where: { quoteId },
    });

    const total = lineItems.reduce((sum, item) => sum + item.totalAmountCents, 0n);

    return this.prisma.quote.update({
      where: { id: quoteId },
      data: { totalAmountCents: total },
    }) as unknown as Quote;
  }

  /**
   * Find expired quotes that need status update
   */
  async findExpiredQuotes(): Promise<Quote[]> {
    const now = new Date();
    return this.prisma.quote.findMany({
      where: {
        status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] },
        validUntil: { lt: now },
      },
    }) as unknown as Quote[];
  }

  /**
   * Mark expired quotes
   */
  async markExpired(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.quote.updateMany({
      where: {
        status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] },
        validUntil: { lt: now },
      },
      data: { status: QuoteStatus.EXPIRED },
    });
    return result.count;
  }
}

// ============================================================================
// Quote Line Item Repository
// ============================================================================

export class QuoteLineItemRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a line item and update quote total
   */
  async create(input: CreateQuoteLineItemInput): Promise<QuoteLineItem> {
    const totalAmountCents = BigInt(input.unitPriceCents) * BigInt(input.quantity);

    const lineItem = await this.prisma.quoteLineItem.create({
      data: {
        ...input,
        listPriceCents: BigInt(input.listPriceCents),
        unitPriceCents: BigInt(input.unitPriceCents),
        totalAmountCents,
        discountPercent: input.discountPercent ?? null,
        metadataJson: input.metadataJson ?? Prisma.JsonNull,
      },
    });

    // Update quote total
    await this.updateQuoteTotal(input.quoteId);

    return lineItem as unknown as QuoteLineItem;
  }

  /**
   * Update a line item
   */
  async update(
    id: string,
    input: Partial<Omit<CreateQuoteLineItemInput, 'quoteId'>>
  ): Promise<QuoteLineItem> {
    const existing = await this.prisma.quoteLineItem.findUnique({
      where: { id },
    });
    if (!existing) throw new Error(`Line item ${id} not found`);

    const unitPriceCents =
      input.unitPriceCents !== undefined ? BigInt(input.unitPriceCents) : existing.unitPriceCents;
    const quantity = input.quantity ?? existing.quantity;
    const totalAmountCents = unitPriceCents * BigInt(quantity);

    const lineItem = await this.prisma.quoteLineItem.update({
      where: { id },
      data: {
        ...input,
        listPriceCents:
          input.listPriceCents !== undefined ? BigInt(input.listPriceCents) : undefined,
        unitPriceCents:
          input.unitPriceCents !== undefined ? BigInt(input.unitPriceCents) : undefined,
        totalAmountCents,
        metadataJson: input.metadataJson ?? undefined,
      },
    });

    // Update quote total
    await this.updateQuoteTotal(existing.quoteId);

    return lineItem as unknown as QuoteLineItem;
  }

  /**
   * Delete a line item
   */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.quoteLineItem.findUnique({
      where: { id },
    });
    if (!existing) return;

    await this.prisma.quoteLineItem.delete({ where: { id } });
    await this.updateQuoteTotal(existing.quoteId);
  }

  /**
   * List line items for a quote
   */
  async listByQuote(quoteId: string): Promise<QuoteLineItem[]> {
    return this.prisma.quoteLineItem.findMany({
      where: { quoteId },
      orderBy: { sortOrder: 'asc' },
    }) as unknown as QuoteLineItem[];
  }

  /**
   * Update quote total after line item changes
   */
  private async updateQuoteTotal(quoteId: string): Promise<void> {
    const lineItems = await this.prisma.quoteLineItem.findMany({
      where: { quoteId },
    });

    const total = lineItems.reduce((sum, item) => sum + item.totalAmountCents, 0n);

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { totalAmountCents: total },
    });
  }
}

// ============================================================================
// Purchase Order Repository
// ============================================================================

export class PurchaseOrderRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new purchase order
   */
  async create(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    return this.prisma.purchaseOrder.create({
      data: {
        ...input,
        amountCents: BigInt(input.amountCents),
        status: POStatus.PENDING,
        attachmentsJson: input.attachmentsJson ?? Prisma.JsonNull,
        metadataJson: input.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as PurchaseOrder;
  }

  /**
   * Find purchase order by ID
   */
  async findById(id: string): Promise<PurchaseOrder | null> {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
    }) as unknown as PurchaseOrder | null;
  }

  /**
   * Find purchase order by PO number within a tenant
   */
  async findByPONumber(tenantId: string, poNumber: string): Promise<PurchaseOrder | null> {
    return this.prisma.purchaseOrder.findUnique({
      where: {
        tenantId_poNumber: { tenantId, poNumber },
      },
    }) as unknown as PurchaseOrder | null;
  }

  /**
   * Find PO with quote details
   */
  async findWithQuote(id: string): Promise<PurchaseOrder & { quote?: QuoteWithLineItems }> {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        quote: {
          include: {
            lineItems: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    return po as unknown as PurchaseOrder & { quote?: QuoteWithLineItems };
  }

  /**
   * List purchase orders for a tenant
   */
  async listByTenant(
    tenantId: string,
    options?: {
      status?: POStatus | POStatus[];
      limit?: number;
      offset?: number;
    }
  ): Promise<PurchaseOrder[]> {
    const statusFilter = options?.status
      ? Array.isArray(options.status)
        ? { in: options.status }
        : options.status
      : undefined;

    return this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        ...(statusFilter && { status: statusFilter }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }) as unknown as PurchaseOrder[];
  }

  /**
   * List pending POs for internal review
   */
  async listPending(options?: { limit?: number; offset?: number }): Promise<PurchaseOrder[]> {
    return this.prisma.purchaseOrder.findMany({
      where: { status: POStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }) as unknown as PurchaseOrder[];
  }

  /**
   * Review (approve/reject) a purchase order
   */
  async review(
    id: string,
    status: POStatus.APPROVED | POStatus.REJECTED,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<PurchaseOrder> {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
      },
    }) as unknown as PurchaseOrder;
  }

  /**
   * Link PO to contract after activation
   */
  async linkToContract(id: string, contractId: string): Promise<PurchaseOrder> {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        contractId,
        status: POStatus.CLOSED,
      },
    }) as unknown as PurchaseOrder;
  }

  /**
   * Add attachment to PO
   */
  async addAttachment(
    id: string,
    attachment: { fileName: string; url: string; mimeType?: string; uploadedBy?: string }
  ): Promise<PurchaseOrder> {
    const po = await this.findById(id);
    if (!po) throw new Error(`PO ${id} not found`);

    const existingAttachments = (po.attachmentsJson as unknown[]) ?? [];
    const newAttachment = {
      ...attachment,
      uploadedAt: new Date().toISOString(),
    };

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        attachmentsJson: [...existingAttachments, newAttachment],
      },
    }) as unknown as PurchaseOrder;
  }
}

// ============================================================================
// District Invoice Repository
// ============================================================================

export class DistrictInvoiceRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new district invoice
   */
  async create(input: CreateDistrictInvoiceInput): Promise<DistrictInvoice> {
    // Get next sequence number
    const count = await this.prisma.districtInvoice.count();
    const invoiceNumber = generateInvoiceNumber(count + 1);

    return this.prisma.districtInvoice.create({
      data: {
        ...input,
        invoiceNumber,
        status: DistrictInvoiceStatus.DRAFT,
        amountDueCents: BigInt(input.amountDueCents),
        amountPaidCents: 0n,
        metadataJson: input.metadataJson ?? Prisma.JsonNull,
      },
    }) as unknown as DistrictInvoice;
  }

  /**
   * Find invoice by ID
   */
  async findById(id: string): Promise<DistrictInvoice | null> {
    return this.prisma.districtInvoice.findUnique({
      where: { id },
    }) as unknown as DistrictInvoice | null;
  }

  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<DistrictInvoice | null> {
    return this.prisma.districtInvoice.findUnique({
      where: { invoiceNumber },
    }) as unknown as DistrictInvoice | null;
  }

  /**
   * List invoices for a contract
   */
  async listByContract(contractId: string): Promise<DistrictInvoice[]> {
    return this.prisma.districtInvoice.findMany({
      where: { contractId },
      orderBy: { issueDate: 'desc' },
    }) as unknown as DistrictInvoice[];
  }

  /**
   * List invoices for a billing account
   */
  async listByBillingAccount(
    billingAccountId: string,
    options?: {
      status?: DistrictInvoiceStatus | DistrictInvoiceStatus[];
      limit?: number;
      offset?: number;
    }
  ): Promise<DistrictInvoice[]> {
    const statusFilter = options?.status
      ? Array.isArray(options.status)
        ? { in: options.status }
        : options.status
      : undefined;

    return this.prisma.districtInvoice.findMany({
      where: {
        billingAccountId,
        ...(statusFilter && { status: statusFilter }),
      },
      orderBy: { issueDate: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }) as unknown as DistrictInvoice[];
  }

  /**
   * List outstanding invoices
   */
  async listOutstanding(billingAccountId?: string): Promise<DistrictInvoice[]> {
    return this.prisma.districtInvoice.findMany({
      where: {
        ...(billingAccountId && { billingAccountId }),
        status: { in: [DistrictInvoiceStatus.SENT, DistrictInvoiceStatus.OVERDUE] },
      },
      orderBy: { dueDate: 'asc' },
    }) as unknown as DistrictInvoice[];
  }

  /**
   * List overdue invoices
   */
  async listOverdue(): Promise<DistrictInvoice[]> {
    const now = new Date();
    return this.prisma.districtInvoice.findMany({
      where: {
        status: DistrictInvoiceStatus.SENT,
        dueDate: { lt: now },
      },
      orderBy: { dueDate: 'asc' },
    }) as unknown as DistrictInvoice[];
  }

  /**
   * Mark invoices as overdue
   */
  async markOverdue(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.districtInvoice.updateMany({
      where: {
        status: DistrictInvoiceStatus.SENT,
        dueDate: { lt: now },
      },
      data: { status: DistrictInvoiceStatus.OVERDUE },
    });
    return result.count;
  }

  /**
   * Update invoice status
   */
  async updateStatus(
    id: string,
    status: DistrictInvoiceStatus,
    additionalData?: Partial<{
      sentAt: Date;
      paidAt: Date;
      paymentReference: string;
      externalSystemId: string;
      externalSystemName: string;
    }>
  ): Promise<DistrictInvoice> {
    return this.prisma.districtInvoice.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    }) as unknown as DistrictInvoice;
  }

  /**
   * Record payment
   */
  async recordPayment(
    id: string,
    amountPaidCents: number,
    paymentReference?: string
  ): Promise<DistrictInvoice> {
    const invoice = await this.findById(id);
    if (!invoice) throw new Error(`Invoice ${id} not found`);

    const newAmountPaid = invoice.amountPaidCents + BigInt(amountPaidCents);
    const isPaidInFull = newAmountPaid >= invoice.amountDueCents;

    return this.prisma.districtInvoice.update({
      where: { id },
      data: {
        amountPaidCents: newAmountPaid,
        status: isPaidInFull ? DistrictInvoiceStatus.PAID : invoice.status,
        paidAt: isPaidInFull ? new Date() : null,
        paymentReference,
      },
    }) as unknown as DistrictInvoice;
  }

  /**
   * Get invoice statistics for a billing account
   */
  async getStats(billingAccountId: string): Promise<{
    outstanding: { count: number; totalCents: bigint };
    overdue: { count: number; totalCents: bigint };
    paid: { count: number; totalCents: bigint };
  }> {
    const invoices = await this.prisma.districtInvoice.findMany({
      where: { billingAccountId },
      select: { status: true, amountDueCents: true },
    });

    const result = {
      outstanding: { count: 0, totalCents: 0n },
      overdue: { count: 0, totalCents: 0n },
      paid: { count: 0, totalCents: 0n },
    };

    for (const inv of invoices) {
      if (inv.status === DistrictInvoiceStatus.SENT) {
        result.outstanding.count++;
        result.outstanding.totalCents += inv.amountDueCents;
      } else if (inv.status === DistrictInvoiceStatus.OVERDUE) {
        result.overdue.count++;
        result.overdue.totalCents += inv.amountDueCents;
      } else if (inv.status === DistrictInvoiceStatus.PAID) {
        result.paid.count++;
        result.paid.totalCents += inv.amountDueCents;
      }
    }

    return result;
  }
}

// ============================================================================
// Renewal Task Repository
// ============================================================================

export class RenewalTaskRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a renewal task for a contract
   */
  async create(
    contractId: string,
    tenantId: string,
    contractEndDate: Date,
    noticeDays: number
  ): Promise<RenewalTask> {
    const dueDate = new Date(contractEndDate);
    dueDate.setDate(dueDate.getDate() - noticeDays);

    return this.prisma.renewalTask.create({
      data: {
        contractId,
        tenantId,
        status: RenewalTaskStatus.SCHEDULED,
        dueDate,
        contractEndDate,
      },
    }) as unknown as RenewalTask;
  }

  /**
   * Find by contract ID
   */
  async findByContract(contractId: string): Promise<RenewalTask | null> {
    return this.prisma.renewalTask.findUnique({
      where: { contractId },
    }) as unknown as RenewalTask | null;
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<RenewalTask | null> {
    return this.prisma.renewalTask.findUnique({
      where: { id },
    }) as unknown as RenewalTask | null;
  }

  /**
   * Find with contract details
   */
  async findWithContract(id: string): Promise<RenewalTaskWithContract | null> {
    const task = await this.prisma.renewalTask.findUnique({
      where: { id },
      include: {
        contract: {
          select: {
            contractNumber: true,
            name: true,
            totalValueCents: true,
            status: true,
          },
        },
      },
    });
    return task as unknown as RenewalTaskWithContract | null;
  }

  /**
   * List tasks due for action
   */
  async listDue(options?: { limit?: number }): Promise<RenewalTask[]> {
    const now = new Date();
    return this.prisma.renewalTask.findMany({
      where: {
        status: RenewalTaskStatus.SCHEDULED,
        dueDate: { lte: now },
      },
      orderBy: { dueDate: 'asc' },
      take: options?.limit ?? 100,
    }) as unknown as RenewalTask[];
  }

  /**
   * List tasks by status
   */
  async listByStatus(
    status: RenewalTaskStatus | RenewalTaskStatus[],
    options?: { limit?: number; offset?: number }
  ): Promise<RenewalTask[]> {
    const statusFilter = Array.isArray(status) ? { in: status } : status;

    return this.prisma.renewalTask.findMany({
      where: { status: statusFilter },
      orderBy: { dueDate: 'asc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }) as unknown as RenewalTask[];
  }

  /**
   * List tasks assigned to a user
   */
  async listByAssignee(
    assignedTo: string,
    options?: { status?: RenewalTaskStatus }
  ): Promise<RenewalTask[]> {
    return this.prisma.renewalTask.findMany({
      where: {
        assignedTo,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { dueDate: 'asc' },
    }) as unknown as RenewalTask[];
  }

  /**
   * Update task
   */
  async update(
    id: string,
    data: Partial<{
      status: RenewalTaskStatus;
      assignedTo: string;
      renewalQuoteId: string;
      renewalContractId: string;
      churnReason: string;
      lastReminderAt: Date;
      reminderCount: number;
    }>
  ): Promise<RenewalTask> {
    return this.prisma.renewalTask.update({
      where: { id },
      data,
    }) as unknown as RenewalTask;
  }

  /**
   * Add activity note
   */
  async addActivity(
    id: string,
    activity: { action: string; by: string; notes?: string }
  ): Promise<RenewalTask> {
    const task = await this.findById(id);
    if (!task) throw new Error(`Renewal task ${id} not found`);

    const existingNotes = (task.notesJson ?? {}) as { activities?: unknown[] };
    const activities = existingNotes.activities ?? [];

    return this.prisma.renewalTask.update({
      where: { id },
      data: {
        notesJson: {
          ...existingNotes,
          activities: [...activities, { ...activity, date: new Date().toISOString() }],
        },
      },
    }) as unknown as RenewalTask;
  }

  /**
   * Mark tasks as due when due date is reached
   */
  async markDue(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.renewalTask.updateMany({
      where: {
        status: RenewalTaskStatus.SCHEDULED,
        dueDate: { lte: now },
      },
      data: { status: RenewalTaskStatus.DUE },
    });
    return result.count;
  }

  /**
   * Get renewal metrics
   */
  async getMetrics(): Promise<{
    scheduled: number;
    due: number;
    inProgress: number;
    completedThisMonth: number;
    churnedThisMonth: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [scheduled, due, inProgress, completedThisMonth, churnedThisMonth] = await Promise.all([
      this.prisma.renewalTask.count({ where: { status: RenewalTaskStatus.SCHEDULED } }),
      this.prisma.renewalTask.count({ where: { status: RenewalTaskStatus.DUE } }),
      this.prisma.renewalTask.count({ where: { status: RenewalTaskStatus.IN_PROGRESS } }),
      this.prisma.renewalTask.count({
        where: {
          status: RenewalTaskStatus.COMPLETED,
          updatedAt: { gte: startOfMonth },
        },
      }),
      this.prisma.renewalTask.count({
        where: {
          status: { in: [RenewalTaskStatus.NOT_RENEWING, RenewalTaskStatus.CHURNED] },
          updatedAt: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      scheduled,
      due,
      inProgress,
      completedThisMonth,
      churnedThisMonth,
    };
  }
}
