/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unused-vars */
/**
 * Procurement Service
 *
 * Business logic for the quote → PO → contract → invoice lifecycle.
 * Handles district procurement flows from initial quote through renewal.
 */

import type { PrismaClient } from '../generated/prisma-client';
import {
  QuoteRepository,
  QuoteLineItemRepository,
  PurchaseOrderRepository,
  DistrictInvoiceRepository,
  RenewalTaskRepository,
} from '../repositories';
import type {
  Quote,
  QuoteLineItem,
  QuoteWithLineItems,
  PurchaseOrder,
  DistrictInvoice,
  RenewalTask,
  CreateQuoteInput,
  CreateQuoteLineItemInput,
  UpdateQuoteInput,
  CreatePurchaseOrderInput,
  ContractActivationResult,
  DistrictBillingOverview,
  QuoteSummary,
} from '../types';
import {
  QuoteStatus,
  POStatus,
  DistrictInvoiceStatus,
  RenewalTaskStatus,
  CreateDistrictInvoiceInput,
  formatCents,
  daysUntilRenewal,
} from '../types';

// ============================================================================
// Errors
// ============================================================================

export class ProcurementError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProcurementError';
  }
}

// ============================================================================
// Procurement Service
// ============================================================================

export class ProcurementService {
  private quoteRepo: QuoteRepository;
  private lineItemRepo: QuoteLineItemRepository;
  private poRepo: PurchaseOrderRepository;
  private invoiceRepo: DistrictInvoiceRepository;
  private renewalRepo: RenewalTaskRepository;

  constructor(private prisma: PrismaClient) {
    this.quoteRepo = new QuoteRepository(prisma);
    this.lineItemRepo = new QuoteLineItemRepository(prisma);
    this.poRepo = new PurchaseOrderRepository(prisma);
    this.invoiceRepo = new DistrictInvoiceRepository(prisma);
    this.renewalRepo = new RenewalTaskRepository(prisma);
  }

  // ==========================================================================
  // Quote Management
  // ==========================================================================

  /**
   * Create a new quote for a district
   */
  async createQuote(input: CreateQuoteInput): Promise<Quote> {
    // Validate billing account exists and is a district
    const billingAccount = await this.prisma.billingAccount.findUnique({
      where: { id: input.billingAccountId },
    });

    if (!billingAccount) {
      throw new ProcurementError('Billing account not found', 'BILLING_ACCOUNT_NOT_FOUND');
    }

    if (billingAccount.accountType !== 'DISTRICT') {
      throw new ProcurementError(
        'Quotes are only supported for district accounts',
        'INVALID_ACCOUNT_TYPE'
      );
    }

    return this.quoteRepo.create(input);
  }

  /**
   * Add a line item to a quote
   */
  async addQuoteLineItem(input: CreateQuoteLineItemInput): Promise<QuoteLineItem> {
    // Validate quote exists and is in DRAFT status
    const quote = await this.quoteRepo.findById(input.quoteId);
    if (!quote) {
      throw new ProcurementError('Quote not found', 'QUOTE_NOT_FOUND');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new ProcurementError('Can only add line items to draft quotes', 'QUOTE_NOT_DRAFT');
    }

    return this.lineItemRepo.create(input);
  }

  /**
   * Add line items from price book
   */
  async addLineItemsFromPriceBook(
    quoteId: string,
    items: { sku: string; quantity: number; discountPercent?: number }[]
  ): Promise<QuoteLineItem[]> {
    const quote = await this.quoteRepo.findById(quoteId);
    if (!quote) {
      throw new ProcurementError('Quote not found', 'QUOTE_NOT_FOUND');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new ProcurementError('Can only add line items to draft quotes', 'QUOTE_NOT_DRAFT');
    }

    // Get price book entries
    const priceBookId = quote.priceBookId;
    if (!priceBookId) {
      throw new ProcurementError('Quote has no price book associated', 'NO_PRICE_BOOK');
    }

    const entries = await this.prisma.priceBookEntry.findMany({
      where: {
        priceBookId,
        sku: { in: items.map((i) => i.sku) },
      },
      include: { product: true },
    });

    const entryMap = new Map(entries.map((e) => [e.sku, e]));

    const lineItems: QuoteLineItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = entryMap.get(item.sku);

      if (!entry) {
        throw new ProcurementError(`SKU ${item.sku} not found in price book`, 'SKU_NOT_FOUND', {
          sku: item.sku,
        });
      }

      const listPriceCents = Math.round(Number(entry.unitPrice) * 100);
      const discountMultiplier = item.discountPercent ? (100 - item.discountPercent) / 100 : 1;
      const unitPriceCents = Math.round(listPriceCents * discountMultiplier);

      const lineItem = await this.lineItemRepo.create({
        quoteId,
        sku: item.sku,
        description: entry.product.name,
        quantity: item.quantity,
        listPriceCents,
        unitPriceCents,
        discountPercent: item.discountPercent,
        sortOrder: i,
        metadataJson: {
          productName: entry.product.name,
          category: entry.product.category,
        },
      });

      lineItems.push(lineItem);
    }

    return lineItems;
  }

  /**
   * Update a quote
   */
  async updateQuote(quoteId: string, input: UpdateQuoteInput): Promise<Quote> {
    const quote = await this.quoteRepo.findById(quoteId);
    if (!quote) {
      throw new ProcurementError('Quote not found', 'QUOTE_NOT_FOUND');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new ProcurementError('Can only update draft quotes', 'QUOTE_NOT_DRAFT');
    }

    return this.quoteRepo.update(quoteId, input);
  }

  /**
   * Mark quote as sent to district
   */
  async markQuoteSent(quoteId: string): Promise<Quote> {
    const quote = await this.quoteRepo.findWithLineItems(quoteId);
    if (!quote) {
      throw new ProcurementError('Quote not found', 'QUOTE_NOT_FOUND');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new ProcurementError('Can only send draft quotes', 'QUOTE_NOT_DRAFT');
    }

    if (quote.lineItems.length === 0) {
      throw new ProcurementError('Cannot send a quote with no line items', 'QUOTE_EMPTY');
    }

    return this.quoteRepo.updateStatus(quoteId, QuoteStatus.SENT, {
      sentAt: new Date(),
    });
  }

  /**
   * Mark quote as accepted by district
   */
  async markQuoteAccepted(quoteId: string): Promise<Quote> {
    const quote = await this.quoteRepo.findById(quoteId);
    if (!quote) {
      throw new ProcurementError('Quote not found', 'QUOTE_NOT_FOUND');
    }

    if (quote.status !== QuoteStatus.SENT) {
      throw new ProcurementError('Can only accept sent quotes', 'QUOTE_NOT_SENT');
    }

    // Check if quote is still valid
    if (new Date() > quote.validUntil) {
      await this.quoteRepo.updateStatus(quoteId, QuoteStatus.EXPIRED);
      throw new ProcurementError('Quote has expired', 'QUOTE_EXPIRED');
    }

    return this.quoteRepo.updateStatus(quoteId, QuoteStatus.ACCEPTED, {
      acceptedAt: new Date(),
    });
  }

  /**
   * Mark quote as rejected by district
   */
  async markQuoteRejected(quoteId: string, reason?: string): Promise<Quote> {
    const quote = await this.quoteRepo.findById(quoteId);
    if (!quote) {
      throw new ProcurementError('Quote not found', 'QUOTE_NOT_FOUND');
    }

    if (quote.status !== QuoteStatus.SENT) {
      throw new ProcurementError('Can only reject sent quotes', 'QUOTE_NOT_SENT');
    }

    // Add rejection reason to metadata
    const metadata = (quote.metadataJson ?? {}) as Record<string, unknown>;
    metadata.rejectionReason = reason;

    await this.quoteRepo.update(quoteId, { metadataJson: metadata });
    return this.quoteRepo.updateStatus(quoteId, QuoteStatus.REJECTED);
  }

  /**
   * Get quote with line items
   */
  async getQuote(quoteId: string): Promise<QuoteWithLineItems | null> {
    return this.quoteRepo.findWithLineItems(quoteId);
  }

  /**
   * List quotes for a billing account
   */
  async listQuotes(
    billingAccountId: string,
    options?: { status?: QuoteStatus; limit?: number; offset?: number }
  ): Promise<Quote[]> {
    return this.quoteRepo.listByBillingAccount(billingAccountId, options);
  }

  /**
   * List quotes visible to district (SENT, ACCEPTED, REJECTED)
   */
  async listQuotesForDistrict(tenantId: string): Promise<QuoteSummary[]> {
    const quotes = await this.quoteRepo.listByTenant(tenantId, {
      status: [QuoteStatus.SENT, QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.CONVERTED],
    });

    return quotes.map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      name: q.name,
      status: q.status,
      validUntil: q.validUntil,
      totalAmountCents: q.totalAmountCents,
      createdAt: q.createdAt,
    }));
  }

  // ==========================================================================
  // Purchase Order Management
  // ==========================================================================

  /**
   * Submit a purchase order (district action)
   */
  async submitPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    // Check for duplicate PO number
    const existing = await this.poRepo.findByPONumber(input.tenantId, input.poNumber);
    if (existing) {
      throw new ProcurementError(
        `PO number ${input.poNumber} already exists`,
        'DUPLICATE_PO_NUMBER'
      );
    }

    // If linked to a quote, validate quote status
    if (input.quoteId) {
      const quote = await this.quoteRepo.findById(input.quoteId);
      if (!quote) {
        throw new ProcurementError('Quote not found', 'QUOTE_NOT_FOUND');
      }

      if (quote.status !== QuoteStatus.ACCEPTED && quote.status !== QuoteStatus.SENT) {
        throw new ProcurementError(
          'Can only attach PO to sent or accepted quotes',
          'INVALID_QUOTE_STATUS'
        );
      }

      // Mark quote as accepted if not already
      if (quote.status === QuoteStatus.SENT) {
        await this.quoteRepo.updateStatus(quote.id, QuoteStatus.ACCEPTED, {
          acceptedAt: new Date(),
        });
      }
    }

    return this.poRepo.create(input);
  }

  /**
   * Review a purchase order (internal Aivo action)
   */
  async reviewPurchaseOrder(
    poId: string,
    status: POStatus.APPROVED | POStatus.REJECTED,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<PurchaseOrder> {
    const po = await this.poRepo.findById(poId);
    if (!po) {
      throw new ProcurementError('Purchase order not found', 'PO_NOT_FOUND');
    }

    if (po.status !== POStatus.PENDING) {
      throw new ProcurementError('Can only review pending purchase orders', 'PO_NOT_PENDING');
    }

    return this.poRepo.review(poId, status, reviewedBy, reviewNotes);
  }

  /**
   * Get purchase order
   */
  async getPurchaseOrder(poId: string): Promise<PurchaseOrder | null> {
    return this.poRepo.findById(poId);
  }

  /**
   * List purchase orders for a tenant
   */
  async listPurchaseOrders(
    tenantId: string,
    options?: { status?: POStatus | POStatus[]; limit?: number }
  ): Promise<PurchaseOrder[]> {
    return this.poRepo.listByTenant(tenantId, options);
  }

  /**
   * List pending POs for internal review
   */
  async listPendingPurchaseOrders(): Promise<PurchaseOrder[]> {
    return this.poRepo.listPending();
  }

  // ==========================================================================
  // Contract Activation
  // ==========================================================================

  /**
   * Activate a contract from an approved PO
   * Creates entitlements and links everything together
   */
  async activateContractFromPO(
    poId: string,
    contractData: {
      name?: string;
      startDate: Date;
      endDate: Date;
      createdBy: string;
    }
  ): Promise<ContractActivationResult> {
    const po = await this.poRepo.findWithQuote(poId);
    if (!po) {
      throw new ProcurementError('Purchase order not found', 'PO_NOT_FOUND');
    }

    if (po.status !== POStatus.APPROVED) {
      throw new ProcurementError(
        'Can only activate contracts from approved POs',
        'PO_NOT_APPROVED'
      );
    }

    if (!po.quote) {
      throw new ProcurementError(
        'PO must be linked to a quote for contract activation',
        'PO_NO_QUOTE'
      );
    }

    const quote = po.quote;

    // Get billing profile for the tenant
    const billingProfile = await this.prisma.districtBillingProfile.findFirst({
      where: { tenantId: po.tenantId },
    });

    if (!billingProfile) {
      throw new ProcurementError('District billing profile not found', 'BILLING_PROFILE_NOT_FOUND');
    }

    // Transaction: create contract, line items, entitlements, link PO
    const result = await this.prisma.$transaction(async (tx) => {
      // Generate contract number
      const contractCount = await tx.contract.count();
      const contractNumber = `DST-${new Date().getFullYear()}-${String(contractCount + 1).padStart(5, '0')}`;

      // Create contract
      const contract = await tx.contract.create({
        data: {
          billingProfileId: billingProfile.id,
          tenantId: po.tenantId,
          contractNumber,
          name: contractData.name ?? quote.name ?? `Contract from ${quote.quoteNumber}`,
          startDate: contractData.startDate,
          endDate: contractData.endDate,
          status: 'ACTIVE',
          priceBookId: quote.priceBookId!,
          poNumber: po.poNumber,
          paymentType: 'PO',
          totalValueCents: quote.totalAmountCents,
          currency: quote.currency,
          signedAt: new Date(),
          createdBy: contractData.createdBy,
          autoRenewal: false,
          renewalNoticeDays: 90,
        },
      });

      // Create contract line items from quote line items
      const lineItems = quote.lineItems;
      for (const item of lineItems) {
        // Get product
        const product = await tx.product.findFirst({
          where: { sku: item.sku },
        });

        if (!product) {
          throw new ProcurementError(`Product not found for SKU ${item.sku}`, 'PRODUCT_NOT_FOUND', {
            sku: item.sku,
          });
        }

        await tx.contractLineItem.create({
          data: {
            contractId: contract.id,
            productId: product.id,
            sku: item.sku,
            description: item.description,
            billingPeriod: 'ANNUAL',
            quantityCommitted: item.quantity,
            listPricePerUnit: Number(item.listPriceCents) / 100,
            unitPrice: Number(item.unitPriceCents) / 100,
            discountPercent: item.discountPercent,
            totalValueCents: item.totalAmountCents,
            startDate: contractData.startDate,
            endDate: contractData.endDate,
          },
        });
      }

      // Create seat entitlements for seat SKUs
      let entitlementsCreated = 0;
      const seatSkuMap: Record<string, string> = {
        SEAT_K5: 'K_2',
        SEAT_6_8: 'G6_8',
        SEAT_9_12: 'G9_12',
      };

      for (const item of lineItems) {
        const gradeBand = seatSkuMap[item.sku];
        if (gradeBand) {
          // Get line item ID
          const lineItem = await tx.contractLineItem.findFirst({
            where: { contractId: contract.id, sku: item.sku },
          });

          await tx.seatEntitlement.create({
            data: {
              tenantId: po.tenantId,
              contractId: contract.id,
              lineItemId: lineItem!.id,
              sku: item.sku,
              gradeBand: gradeBand as 'K_2' | 'G3_5' | 'G6_8' | 'G9_12',
              quantityCommitted: item.quantity,
              quantityAllocated: 0,
              overageAllowed: true,
              overageLimit: Math.ceil(item.quantity * 0.1), // 10% overage allowed
              overageCount: 0,
              enforcement: 'SOFT',
              startDate: contractData.startDate,
              endDate: contractData.endDate,
              isActive: true,
            },
          });
          entitlementsCreated++;
        }
      }

      // Create feature entitlements (platform access, modules)
      await tx.contractEntitlement.create({
        data: {
          contractId: contract.id,
          tenantId: po.tenantId,
          featureKey: 'PLATFORM_ACCESS',
          isActive: true,
          startDate: contractData.startDate,
          endDate: contractData.endDate,
        },
      });
      entitlementsCreated++;

      // Link PO to contract
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          contractId: contract.id,
          status: 'CLOSED',
        },
      });

      // Mark quote as converted
      await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: 'CONVERTED',
          convertedContractId: contract.id,
        },
      });

      // Create renewal task
      const renewalDueDate = new Date(contractData.endDate);
      renewalDueDate.setDate(renewalDueDate.getDate() - 90);

      await tx.renewalTask.create({
        data: {
          contractId: contract.id,
          tenantId: po.tenantId,
          status: 'SCHEDULED',
          dueDate: renewalDueDate,
          contractEndDate: contractData.endDate,
        },
      });

      return {
        success: true,
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        entitlementsCreated,
      };
    });

    return result;
  }

  // ==========================================================================
  // Invoice Management
  // ==========================================================================

  /**
   * Generate a draft invoice for a contract
   */
  async generateInvoice(
    contractId: string,
    options?: {
      issueDate?: Date;
      dueDate?: Date;
      description?: string;
    }
  ): Promise<DistrictInvoice> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        lineItems: true,
        billingProfile: true,
      },
    });

    if (!contract) {
      throw new ProcurementError('Contract not found', 'CONTRACT_NOT_FOUND');
    }

    const issueDate = options?.issueDate ?? new Date();
    const dueDate =
      options?.dueDate ??
      new Date(
        issueDate.getTime() + contract.billingProfile.paymentTermsDays * 24 * 60 * 60 * 1000
      );

    // Create line item summary for metadata
    const lineItemSummary = contract.lineItems.map((item) => ({
      sku: item.sku,
      description: item.description,
      quantity: item.quantityCommitted,
      unitPriceCents: Math.round(Number(item.unitPrice) * 100),
      totalCents: Number(item.totalValueCents),
    }));

    return this.invoiceRepo.create({
      billingAccountId: contract.billingProfile.billingAccountId,
      contractId,
      issueDate,
      dueDate,
      amountDueCents: Number(contract.totalValueCents),
      currency: contract.currency,
      poNumber: contract.poNumber ?? undefined,
      metadataJson: {
        lineItems: lineItemSummary,
        contractNumber: contract.contractNumber,
      },
    });
  }

  /**
   * Send an invoice to the district
   */
  async sendInvoice(invoiceId: string): Promise<DistrictInvoice> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) {
      throw new ProcurementError('Invoice not found', 'INVOICE_NOT_FOUND');
    }

    if (invoice.status !== DistrictInvoiceStatus.DRAFT) {
      throw new ProcurementError('Can only send draft invoices', 'INVOICE_NOT_DRAFT');
    }

    return this.invoiceRepo.updateStatus(invoiceId, DistrictInvoiceStatus.SENT, {
      sentAt: new Date(),
    });
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(invoiceId: string, paymentReference?: string): Promise<DistrictInvoice> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) {
      throw new ProcurementError('Invoice not found', 'INVOICE_NOT_FOUND');
    }

    return this.invoiceRepo.recordPayment(
      invoiceId,
      Number(invoice.amountDueCents),
      paymentReference
    );
  }

  /**
   * Void an invoice
   */
  async voidInvoice(invoiceId: string, reason?: string): Promise<DistrictInvoice> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) {
      throw new ProcurementError('Invoice not found', 'INVOICE_NOT_FOUND');
    }

    if (invoice.status === DistrictInvoiceStatus.PAID) {
      throw new ProcurementError('Cannot void a paid invoice', 'INVOICE_ALREADY_PAID');
    }

    // Add void reason to metadata
    const metadata = (invoice.metadataJson ?? {}) as Record<string, unknown>;
    metadata.voidReason = reason;
    metadata.voidedAt = new Date().toISOString();

    await this.prisma.districtInvoice.update({
      where: { id: invoiceId },
      data: { metadataJson: metadata },
    });

    return this.invoiceRepo.updateStatus(invoiceId, DistrictInvoiceStatus.VOID);
  }

  /**
   * Get invoice
   */
  async getInvoice(invoiceId: string): Promise<DistrictInvoice | null> {
    return this.invoiceRepo.findById(invoiceId);
  }

  /**
   * List invoices for a billing account
   */
  async listInvoices(
    billingAccountId: string,
    options?: { status?: DistrictInvoiceStatus | DistrictInvoiceStatus[] }
  ): Promise<DistrictInvoice[]> {
    return this.invoiceRepo.listByBillingAccount(billingAccountId, options);
  }

  // ==========================================================================
  // Renewal Management
  // ==========================================================================

  /**
   * Create a renewal quote from an existing contract
   */
  async createRenewalQuote(
    contractId: string,
    options?: {
      validDays?: number;
      priceAdjustmentPercent?: number;
    }
  ): Promise<Quote> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        lineItems: true,
        billingProfile: true,
      },
    });

    if (!contract) {
      throw new ProcurementError('Contract not found', 'CONTRACT_NOT_FOUND');
    }

    // Calculate proposed dates (start day after current contract ends)
    const proposedStartDate = new Date(contract.endDate);
    proposedStartDate.setDate(proposedStartDate.getDate() + 1);

    const proposedEndDate = new Date(proposedStartDate);
    proposedEndDate.setFullYear(proposedEndDate.getFullYear() + 1);

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (options?.validDays ?? 30));

    // Create renewal quote
    const quote = await this.quoteRepo.create({
      billingAccountId: contract.billingProfile.billingAccountId,
      tenantId: contract.tenantId,
      name: `Renewal - ${contract.name ?? contract.contractNumber}`,
      validUntil,
      currency: contract.currency,
      priceBookId: contract.priceBookId,
      proposedStartDate,
      proposedEndDate,
      paymentTermsDays: contract.billingProfile.paymentTermsDays,
      metadataJson: {
        renewalOf: contractId,
        originalContractNumber: contract.contractNumber,
      },
    });

    // Copy line items with optional price adjustment
    const priceMultiplier = options?.priceAdjustmentPercent
      ? 1 + options.priceAdjustmentPercent / 100
      : 1;

    for (let i = 0; i < contract.lineItems.length; i++) {
      const item = contract.lineItems[i];
      const listPriceCents = Math.round(Number(item.listPricePerUnit) * 100);
      const unitPriceCents = Math.round(Number(item.unitPrice) * 100 * priceMultiplier);

      await this.lineItemRepo.create({
        quoteId: quote.id,
        sku: item.sku,
        description: item.description,
        quantity: item.quantityCommitted,
        listPriceCents,
        unitPriceCents,
        discountPercent: item.discountPercent ? Number(item.discountPercent) : undefined,
        sortOrder: i,
      });
    }

    // Link to renewal task if exists
    const renewalTask = await this.renewalRepo.findByContract(contractId);
    if (renewalTask) {
      await this.renewalRepo.update(renewalTask.id, {
        renewalQuoteId: quote.id,
        status: RenewalTaskStatus.IN_PROGRESS,
      });
      await this.renewalRepo.addActivity(renewalTask.id, {
        action: 'Renewal quote created',
        by: 'SYSTEM',
        notes: `Quote ${quote.quoteNumber} generated`,
      });
    }

    return quote;
  }

  /**
   * Get renewal task for a contract
   */
  async getRenewalTask(contractId: string): Promise<RenewalTask | null> {
    return this.renewalRepo.findByContract(contractId);
  }

  /**
   * Update renewal task
   */
  async updateRenewalTask(
    taskId: string,
    updates: {
      status?: RenewalTaskStatus;
      assignedTo?: string;
      churnReason?: string;
    }
  ): Promise<RenewalTask> {
    return this.renewalRepo.update(taskId, updates);
  }

  /**
   * Add activity to renewal task
   */
  async addRenewalActivity(
    taskId: string,
    activity: { action: string; by: string; notes?: string }
  ): Promise<RenewalTask> {
    return this.renewalRepo.addActivity(taskId, activity);
  }

  // ==========================================================================
  // District Dashboard
  // ==========================================================================

  /**
   * Get billing overview for district admin dashboard
   */
  async getDistrictBillingOverview(tenantId: string): Promise<DistrictBillingOverview> {
    // Get tenant info
    // Note: In real implementation, this would query tenant-svc
    const tenant = { id: tenantId, name: 'District' };

    // Get active contract
    const activeContract = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      orderBy: { startDate: 'desc' },
    });

    // Get seat usage
    const seatEntitlements = activeContract
      ? await this.prisma.seatEntitlement.findMany({
          where: {
            contractId: activeContract.id,
            isActive: true,
          },
        })
      : [];

    const seatUsage = seatEntitlements.map((e) => ({
      gradeBand: e.gradeBand,
      committed: e.quantityCommitted,
      allocated: e.quantityAllocated,
      available: Math.max(0, e.quantityCommitted - e.quantityAllocated),
      utilizationPercent:
        e.quantityCommitted > 0 ? Math.round((e.quantityAllocated / e.quantityCommitted) * 100) : 0,
    }));

    // Get billing account for invoice lookup
    const billingProfile = await this.prisma.districtBillingProfile.findFirst({
      where: { tenantId },
    });

    // Get invoice stats
    let invoiceStats = {
      outstanding: { count: 0, totalCents: 0n },
      overdue: { count: 0, totalCents: 0n },
      recent: [] as DistrictInvoice[],
    };

    if (billingProfile) {
      const stats = await this.invoiceRepo.getStats(billingProfile.billingAccountId);
      const recentInvoices = await this.invoiceRepo.listByBillingAccount(
        billingProfile.billingAccountId,
        { limit: 5 }
      );

      invoiceStats = {
        outstanding: stats.outstanding,
        overdue: stats.overdue,
        recent: recentInvoices,
      };
    }

    // Get renewal info
    let renewalInfo = null;
    if (activeContract) {
      const renewalTask = await this.renewalRepo.findByContract(activeContract.id);
      renewalInfo = {
        daysUntilEnd: daysUntilRenewal(activeContract.endDate),
        renewalTaskStatus: renewalTask?.status ?? null,
      };
    }

    return {
      tenant,
      activeContract: activeContract
        ? {
            id: activeContract.id,
            contractNumber: activeContract.contractNumber,
            name: activeContract.name,
            startDate: activeContract.startDate,
            endDate: activeContract.endDate,
            status: activeContract.status,
            totalValueCents: activeContract.totalValueCents,
          }
        : null,
      seatUsage,
      invoices: invoiceStats,
      renewal: renewalInfo,
    };
  }

  // ==========================================================================
  // Background Jobs
  // ==========================================================================

  /**
   * Process expired quotes
   */
  async processExpiredQuotes(): Promise<number> {
    return this.quoteRepo.markExpired();
  }

  /**
   * Process overdue invoices
   */
  async processOverdueInvoices(): Promise<number> {
    return this.invoiceRepo.markOverdue();
  }

  /**
   * Process due renewal tasks
   */
  async processDueRenewalTasks(): Promise<number> {
    return this.renewalRepo.markDue();
  }

  /**
   * Get renewal metrics for internal dashboard
   */
  async getRenewalMetrics(): Promise<{
    scheduled: number;
    due: number;
    inProgress: number;
    completedThisMonth: number;
    churnedThisMonth: number;
  }> {
    return this.renewalRepo.getMetrics();
  }
}
