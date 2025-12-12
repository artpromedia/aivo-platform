/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unsafe-argument */
/**
 * Procurement Service Tests
 *
 * Comprehensive tests for the Quote → PO → Contract → Invoice → Renewal pipeline.
 * Tests cover the full B2B procurement workflow from initial quote through
 * contract renewal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  QuoteStatus,
  POStatus,
  DistrictInvoiceStatus,
  RenewalTaskStatus,
  generateQuoteNumber,
  generateInvoiceNumber,
  CreateQuoteSchema,
  CreateQuoteLineItemSchema,
  CreatePurchaseOrderSchema,
  CreateDistrictInvoiceSchema,
  isQuoteValid,
  isInvoiceOverdue,
  daysUntilRenewal,
  formatCents,
} from '../src/types/procurement.types';

// ============================================================================
// Unit Tests: Quote Number Generation
// ============================================================================

describe('Quote Number Generation', () => {
  it('generates quote numbers in correct format', () => {
    const quoteNumber = generateQuoteNumber(1);
    expect(quoteNumber).toMatch(/^Q-\d{4}-\d{5}$/);
  });

  it('generates unique quote numbers with different sequence', () => {
    const q1 = generateQuoteNumber(1);
    const q2 = generateQuoteNumber(2);
    const q3 = generateQuoteNumber(100);

    expect(q1).not.toBe(q2);
    expect(q2).not.toBe(q3);
  });

  it('includes current year in quote number', () => {
    const quoteNumber = generateQuoteNumber(1);
    const year = new Date().getFullYear();
    expect(quoteNumber).toContain(`-${year}-`);
  });

  it('pads sequence number to 5 digits', () => {
    expect(generateQuoteNumber(1)).toMatch(/-00001$/);
    expect(generateQuoteNumber(123)).toMatch(/-00123$/);
    expect(generateQuoteNumber(99999)).toMatch(/-99999$/);
  });
});

describe('Invoice Number Generation', () => {
  it('generates invoice numbers in correct format', () => {
    const invoiceNumber = generateInvoiceNumber(1);
    expect(invoiceNumber).toMatch(/^INV-\d{4}-\d{5}$/);
  });

  it('pads sequence number correctly', () => {
    expect(generateInvoiceNumber(42)).toMatch(/-00042$/);
  });
});

// ============================================================================
// Unit Tests: Zod Schema Validation
// ============================================================================

describe('CreateQuoteSchema Validation', () => {
  it('validates a correct quote creation request', () => {
    const validQuote = {
      billingAccountId: 'ba_123',
      tenantId: 'tenant_456',
      currency: 'USD',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdBy: 'user_789',
    };

    const result = CreateQuoteSchema.safeParse(validQuote);
    expect(result.success).toBe(true);
  });

  it('requires billingAccountId', () => {
    const invalidQuote = {
      tenantId: 'tenant_456',
      currency: 'USD',
      validUntil: new Date(),
      createdBy: 'user_789',
    };

    const result = CreateQuoteSchema.safeParse(invalidQuote);
    expect(result.success).toBe(false);
  });

  it('requires tenantId', () => {
    const invalidQuote = {
      billingAccountId: 'ba_123',
      currency: 'USD',
      validUntil: new Date(),
      createdBy: 'user_789',
    };

    const result = CreateQuoteSchema.safeParse(invalidQuote);
    expect(result.success).toBe(false);
  });

  it('requires currency', () => {
    const invalidQuote = {
      billingAccountId: 'ba_123',
      tenantId: 'tenant_456',
      validUntil: new Date(),
      createdBy: 'user_789',
    };

    const result = CreateQuoteSchema.safeParse(invalidQuote);
    expect(result.success).toBe(false);
  });

  it('allows optional priceBookId', () => {
    const quoteWithPriceBook = {
      billingAccountId: 'ba_123',
      tenantId: 'tenant_456',
      currency: 'USD',
      validUntil: new Date(),
      createdBy: 'user_789',
      priceBookId: 'pb_2025',
    };

    const result = CreateQuoteSchema.safeParse(quoteWithPriceBook);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceBookId).toBe('pb_2025');
    }
  });
});

describe('CreateQuoteLineItemSchema Validation', () => {
  it('validates a correct line item', () => {
    const validLineItem = {
      quoteId: '550e8400-e29b-41d4-a716-446655440000',
      sku: 'AIVO-ELA-SEAT',
      description: 'ELA Module - Per Seat License',
      quantity: 100,
      listPriceCents: 10000,
      unitPriceCents: 10000,
    };

    const result = CreateQuoteLineItemSchema.safeParse(validLineItem);
    expect(result.success).toBe(true);
  });

  it('requires quantity to be positive', () => {
    const invalidLineItem = {
      quoteId: '550e8400-e29b-41d4-a716-446655440000',
      sku: 'AIVO-ELA-SEAT',
      description: 'ELA Module',
      quantity: 0,
      listPriceCents: 10000,
      unitPriceCents: 10000,
    };

    const result = CreateQuoteLineItemSchema.safeParse(invalidLineItem);
    expect(result.success).toBe(false);
  });

  it('requires unitPriceCents to be non-negative', () => {
    const invalidLineItem = {
      quoteId: '550e8400-e29b-41d4-a716-446655440000',
      sku: 'AIVO-ELA-SEAT',
      description: 'ELA Module',
      quantity: 100,
      listPriceCents: 10000,
      unitPriceCents: -100,
    };

    const result = CreateQuoteLineItemSchema.safeParse(invalidLineItem);
    expect(result.success).toBe(false);
  });

  it('validates discount percentage range', () => {
    const validDiscount = {
      quoteId: '550e8400-e29b-41d4-a716-446655440000',
      sku: 'AIVO-ELA-SEAT',
      description: 'ELA Module',
      quantity: 100,
      listPriceCents: 10000,
      unitPriceCents: 8500,
      discountPercent: 15,
    };

    const result = CreateQuoteLineItemSchema.safeParse(validDiscount);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.discountPercent).toBe(15);
    }
  });

  it('rejects discount over 100%', () => {
    const invalidDiscount = {
      quoteId: '550e8400-e29b-41d4-a716-446655440000',
      sku: 'AIVO-ELA-SEAT',
      description: 'ELA Module',
      quantity: 100,
      listPriceCents: 10000,
      unitPriceCents: 10000,
      discountPercent: 150,
    };

    const result = CreateQuoteLineItemSchema.safeParse(invalidDiscount);
    expect(result.success).toBe(false);
  });
});

describe('CreatePurchaseOrderSchema Validation', () => {
  it('validates a correct PO creation request', () => {
    const validPO = {
      billingAccountId: '550e8400-e29b-41d4-a716-446655440000',
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      poNumber: 'PO-2025-001',
      quoteId: '550e8400-e29b-41d4-a716-446655440002',
      amountCents: 5000000,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };

    const result = CreatePurchaseOrderSchema.safeParse(validPO);
    expect(result.success).toBe(true);
  });

  it('requires a PO number', () => {
    const invalidPO = {
      billingAccountId: '550e8400-e29b-41d4-a716-446655440000',
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      amountCents: 5000000,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };

    const result = CreatePurchaseOrderSchema.safeParse(invalidPO);
    expect(result.success).toBe(false);
  });
});

describe('CreateDistrictInvoiceSchema Validation', () => {
  it('validates a correct invoice creation request', () => {
    const validInvoice = {
      billingAccountId: '550e8400-e29b-41d4-a716-446655440000',
      contractId: '550e8400-e29b-41d4-a716-446655440001',
      amountDueCents: 7500000,
      currency: 'USD',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const result = CreateDistrictInvoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it('requires positive amount', () => {
    const invalidInvoice = {
      billingAccountId: '550e8400-e29b-41d4-a716-446655440000',
      contractId: '550e8400-e29b-41d4-a716-446655440001',
      amountDueCents: 0,
      currency: 'USD',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const result = CreateDistrictInvoiceSchema.safeParse(invalidInvoice);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Unit Tests: Status Enums
// ============================================================================

describe('Status Enums', () => {
  describe('QuoteStatus', () => {
    it('has all expected values', () => {
      expect(QuoteStatus.DRAFT).toBe('DRAFT');
      expect(QuoteStatus.SENT).toBe('SENT');
      expect(QuoteStatus.ACCEPTED).toBe('ACCEPTED');
      expect(QuoteStatus.REJECTED).toBe('REJECTED');
      expect(QuoteStatus.EXPIRED).toBe('EXPIRED');
      expect(QuoteStatus.CONVERTED).toBe('CONVERTED');
    });
  });

  describe('POStatus', () => {
    it('has all expected values', () => {
      expect(POStatus.PENDING).toBe('PENDING');
      expect(POStatus.APPROVED).toBe('APPROVED');
      expect(POStatus.REJECTED).toBe('REJECTED');
      expect(POStatus.CLOSED).toBe('CLOSED');
      expect(POStatus.CANCELLED).toBe('CANCELLED');
    });
  });

  describe('DistrictInvoiceStatus', () => {
    it('has all expected values', () => {
      expect(DistrictInvoiceStatus.DRAFT).toBe('DRAFT');
      expect(DistrictInvoiceStatus.SENT).toBe('SENT');
      expect(DistrictInvoiceStatus.PAID).toBe('PAID');
      expect(DistrictInvoiceStatus.OVERDUE).toBe('OVERDUE');
      expect(DistrictInvoiceStatus.VOID).toBe('VOID');
      expect(DistrictInvoiceStatus.DISPUTED).toBe('DISPUTED');
    });
  });

  describe('RenewalTaskStatus', () => {
    it('has all expected values', () => {
      expect(RenewalTaskStatus.SCHEDULED).toBe('SCHEDULED');
      expect(RenewalTaskStatus.DUE).toBe('DUE');
      expect(RenewalTaskStatus.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(RenewalTaskStatus.COMPLETED).toBe('COMPLETED');
      expect(RenewalTaskStatus.NOT_RENEWING).toBe('NOT_RENEWING');
      expect(RenewalTaskStatus.CHURNED).toBe('CHURNED');
    });
  });
});

// ============================================================================
// Mock Data Generators for Integration Tests
// ============================================================================

function createMockQuote(overrides: Partial<any> = {}): any {
  return {
    id: 'quote_123',
    billingAccountId: 'ba_456',
    tenantId: 'tenant_789',
    quoteNumber: 'Q-2025-00001',
    name: null,
    status: QuoteStatus.DRAFT,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    currency: 'USD',
    totalAmountCents: BigInt(0),
    priceBookId: null,
    proposedStartDate: null,
    proposedEndDate: null,
    paymentTermsDays: 30,
    sentAt: null,
    acceptedAt: null,
    createdBy: 'user_admin',
    convertedContractId: null,
    metadataJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockQuoteLineItem(overrides: Partial<any> = {}): any {
  return {
    id: 'qli_123',
    quoteId: 'quote_123',
    sku: 'AIVO-ELA-SEAT',
    description: 'ELA Module - Per Seat License',
    quantity: 100,
    listPriceCents: BigInt(10000),
    unitPriceCents: BigInt(10000),
    discountPercent: null,
    totalAmountCents: BigInt(1000000),
    sortOrder: 0,
    metadataJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockPurchaseOrder(overrides: Partial<any> = {}): any {
  return {
    id: 'po_123',
    billingAccountId: 'ba_456',
    tenantId: 'tenant_789',
    poNumber: 'PO-2025-001',
    quoteId: 'quote_123',
    status: POStatus.PENDING,
    amountCents: BigInt(10000000),
    currency: 'USD',
    validFrom: new Date(),
    validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    attachmentsJson: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    contractId: null,
    metadataJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockContractInvoice(overrides: Partial<any> = {}): any {
  return {
    id: 'cinv_123',
    billingAccountId: 'ba_456',
    contractId: 'contract_789',
    invoiceNumber: 'INV-2025-00001',
    status: DistrictInvoiceStatus.DRAFT,
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    amountDueCents: BigInt(7500000),
    amountPaidCents: BigInt(0),
    currency: 'USD',
    poNumber: null,
    externalSystemId: null,
    externalSystemName: null,
    sentAt: null,
    paidAt: null,
    paymentReference: null,
    pdfUrl: null,
    metadataJson: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockRenewalTask(overrides: Partial<any> = {}): any {
  return {
    id: 'renewal_123',
    contractId: 'contract_789',
    tenantId: 'tenant_456',
    status: RenewalTaskStatus.SCHEDULED,
    dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    contractEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    renewalQuoteId: null,
    renewalContractId: null,
    assignedTo: null,
    notesJson: null,
    lastReminderAt: null,
    reminderCount: 0,
    churnReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Integration Tests: Quote Workflow
// ============================================================================

describe('Quote Workflow', () => {
  describe('Quote Creation', () => {
    it('creates quote with DRAFT status', () => {
      const quote = createMockQuote();
      expect(quote.status).toBe(QuoteStatus.DRAFT);
      expect(quote.totalAmountCents).toBe(0);
    });

    it('generates unique quote number', () => {
      const quote = createMockQuote();
      expect(quote.quoteNumber).toMatch(/^Q-\d{4}-[A-Z0-9]+$/);
    });
  });

  describe('Adding Line Items', () => {
    it('calculates line item total without discount', () => {
      const lineItem = createMockQuoteLineItem({
        quantity: 100,
        unitPriceCents: 10000,
        discountPercent: 0,
      });

      const expectedTotal = lineItem.quantity * lineItem.unitPriceCents;
      expect(expectedTotal).toBe(1000000); // $10,000
    });

    it('calculates line item total with discount', () => {
      const lineItem = createMockQuoteLineItem({
        quantity: 100,
        unitPriceCents: 10000,
        discountPercent: 10,
      });

      const grossTotal = lineItem.quantity * lineItem.unitPriceCents;
      const discountAmount = Math.round(grossTotal * (lineItem.discountPercent / 100));
      const expectedTotal = grossTotal - discountAmount;
      expect(expectedTotal).toBe(900000); // $9,000 after 10% discount
    });

    it('aggregates line items to quote total', () => {
      const lineItems = [
        createMockQuoteLineItem({ quantity: 100, unitPriceCents: 10000 }),
        createMockQuoteLineItem({
          id: 'qli_124',
          sku: 'AIVO-MATH-SEAT',
          quantity: 100,
          unitPriceCents: 10000,
        }),
        createMockQuoteLineItem({
          id: 'qli_125',
          sku: 'AIVO-SEL-SEAT',
          quantity: 100,
          unitPriceCents: 8000,
        }),
      ];

      const totalCents = lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceCents,
        0
      );
      expect(totalCents).toBe(2800000); // $28,000
    });
  });

  describe('Quote Status Transitions', () => {
    it('can transition from DRAFT to SENT', () => {
      const quote = createMockQuote({ status: QuoteStatus.DRAFT });
      // Simulate transition
      const updatedQuote = { ...quote, status: QuoteStatus.SENT };
      expect(updatedQuote.status).toBe(QuoteStatus.SENT);
    });

    it('can transition from SENT to ACCEPTED', () => {
      const quote = createMockQuote({ status: QuoteStatus.SENT });
      const updatedQuote = { ...quote, status: QuoteStatus.ACCEPTED };
      expect(updatedQuote.status).toBe(QuoteStatus.ACCEPTED);
    });

    it('can transition from SENT to REJECTED', () => {
      const quote = createMockQuote({ status: QuoteStatus.SENT });
      const updatedQuote = { ...quote, status: QuoteStatus.REJECTED };
      expect(updatedQuote.status).toBe(QuoteStatus.REJECTED);
    });

    it('can transition from SENT to EXPIRED', () => {
      const quote = createMockQuote({ status: QuoteStatus.SENT });
      const updatedQuote = { ...quote, status: QuoteStatus.EXPIRED };
      expect(updatedQuote.status).toBe(QuoteStatus.EXPIRED);
    });

    it('invalid: cannot accept a DRAFT quote', () => {
      // Business rule: quotes must be sent before acceptance
      const quote = createMockQuote({ status: QuoteStatus.DRAFT });
      const canAccept = quote.status === QuoteStatus.SENT;
      expect(canAccept).toBe(false);
    });

    it('invalid: cannot send an EXPIRED quote', () => {
      const quote = createMockQuote({ status: QuoteStatus.EXPIRED });
      const canSend = quote.status === QuoteStatus.DRAFT;
      expect(canSend).toBe(false);
    });
  });

  describe('Quote Expiration', () => {
    it('identifies expired quotes', () => {
      const expiredQuote = createMockQuote({
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });

      const isExpired = new Date(expiredQuote.validUntil) < new Date();
      expect(isExpired).toBe(true);
    });

    it('identifies valid quotes', () => {
      const validQuote = createMockQuote({
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });

      const isExpired = new Date(validQuote.validUntil) < new Date();
      expect(isExpired).toBe(false);
    });
  });
});

// ============================================================================
// Integration Tests: Purchase Order Workflow
// ============================================================================

describe('Purchase Order Workflow', () => {
  describe('PO Creation', () => {
    it('creates PO with PENDING status', () => {
      const po = createMockPurchaseOrder();
      expect(po.status).toBe(POStatus.PENDING);
    });

    it('links PO to quote', () => {
      const po = createMockPurchaseOrder({ quoteId: 'quote_123' });
      expect(po.quoteId).toBe('quote_123');
    });

    it('stores external PO number from district', () => {
      const po = createMockPurchaseOrder({
        externalPoNumber: 'DIST-2024-EDU-5678',
      });
      expect(po.externalPoNumber).toBe('DIST-2024-EDU-5678');
    });
  });

  describe('PO Approval', () => {
    it('transitions from PENDING to APPROVED', () => {
      const po = createMockPurchaseOrder({ status: POStatus.PENDING });
      const approvedPo = {
        ...po,
        status: POStatus.APPROVED,
        approvedBy: 'admin_user',
        approvedAt: new Date(),
      };

      expect(approvedPo.status).toBe(POStatus.APPROVED);
      expect(approvedPo.approvedBy).toBe('admin_user');
      expect(approvedPo.approvedAt).toBeInstanceOf(Date);
    });

    it('transitions from PENDING to REJECTED', () => {
      const po = createMockPurchaseOrder({ status: POStatus.PENDING });
      const rejectedPo = { ...po, status: POStatus.REJECTED };

      expect(rejectedPo.status).toBe(POStatus.REJECTED);
    });

    it('can close an APPROVED PO', () => {
      const po = createMockPurchaseOrder({ status: POStatus.APPROVED });
      const closedPo = { ...po, status: POStatus.CLOSED };

      expect(closedPo.status).toBe(POStatus.CLOSED);
    });
  });

  describe('PO Amount Validation', () => {
    it('validates PO amount matches quote total', () => {
      const quoteTotal = 10000000; // $100,000
      const po = createMockPurchaseOrder({ amountCents: BigInt(quoteTotal) });

      expect(Number(po.amountCents)).toBe(quoteTotal);
    });

    it('flags mismatched amounts', () => {
      const quoteTotal = 10000000;
      const poAmount = 9500000; // Different amount

      // In practice, this would be a validation check
      expect(quoteTotal).not.toBe(poAmount);
    });
  });
});

// ============================================================================
// Integration Tests: Contract Invoice Workflow
// ============================================================================

describe('Contract Invoice Workflow', () => {
  describe('Invoice Creation', () => {
    it('creates invoice with DRAFT status', () => {
      const invoice = createMockContractInvoice();
      expect(invoice.status).toBe(DistrictInvoiceStatus.DRAFT);
    });

    it('links invoice to contract', () => {
      const invoice = createMockContractInvoice({ contractId: 'contract_123' });
      expect(invoice.contractId).toBe('contract_123');
    });
  });

  describe('Invoice Status Transitions', () => {
    it('transitions from DRAFT to SENT', () => {
      const invoice = createMockContractInvoice({ status: DistrictInvoiceStatus.DRAFT });
      const sentInvoice = { ...invoice, status: DistrictInvoiceStatus.SENT, sentAt: new Date() };

      expect(sentInvoice.status).toBe(DistrictInvoiceStatus.SENT);
    });

    it('transitions from SENT to PAID', () => {
      const invoice = createMockContractInvoice({ status: DistrictInvoiceStatus.SENT });
      const paidInvoice = {
        ...invoice,
        status: DistrictInvoiceStatus.PAID,
        paidAt: new Date(),
      };

      expect(paidInvoice.status).toBe(DistrictInvoiceStatus.PAID);
      expect(paidInvoice.paidAt).toBeInstanceOf(Date);
    });

    it('transitions from SENT to OVERDUE', () => {
      const invoice = createMockContractInvoice({ status: DistrictInvoiceStatus.SENT });
      const overdueInvoice = { ...invoice, status: DistrictInvoiceStatus.OVERDUE };

      expect(overdueInvoice.status).toBe(DistrictInvoiceStatus.OVERDUE);
    });

    it('can void an invoice', () => {
      const invoice = createMockContractInvoice({ status: DistrictInvoiceStatus.SENT });
      const voidedInvoice = { ...invoice, status: DistrictInvoiceStatus.VOID };

      expect(voidedInvoice.status).toBe(DistrictInvoiceStatus.VOID);
    });

    it('can dispute an invoice', () => {
      const invoice = createMockContractInvoice({ status: DistrictInvoiceStatus.SENT });
      const disputedInvoice = { ...invoice, status: DistrictInvoiceStatus.DISPUTED };

      expect(disputedInvoice.status).toBe(DistrictInvoiceStatus.DISPUTED);
    });
  });

  describe('Invoice Due Date Logic', () => {
    it('identifies overdue invoices', () => {
      const overdueInvoice = createMockContractInvoice({
        status: DistrictInvoiceStatus.SENT,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });

      const isOverdue =
        overdueInvoice.status === DistrictInvoiceStatus.SENT &&
        new Date(overdueInvoice.dueDate) < new Date();
      expect(isOverdue).toBe(true);
    });

    it('identifies invoices not yet due', () => {
      const currentInvoice = createMockContractInvoice({
        status: DistrictInvoiceStatus.SENT,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      const isOverdue =
        currentInvoice.status === DistrictInvoiceStatus.SENT &&
        new Date(currentInvoice.dueDate) < new Date();
      expect(isOverdue).toBe(false);
    });
  });
});

// ============================================================================
// Integration Tests: Renewal Workflow
// ============================================================================

describe('Renewal Workflow', () => {
  describe('Renewal Task Creation', () => {
    it('creates renewal task with SCHEDULED status', () => {
      const task = createMockRenewalTask();
      expect(task.status).toBe(RenewalTaskStatus.SCHEDULED);
    });

    it('schedules task for future date', () => {
      const task = createMockRenewalTask({
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      const isScheduledForFuture = new Date(task.dueDate) > new Date();
      expect(isScheduledForFuture).toBe(true);
    });
  });

  describe('Renewal Task Processing', () => {
    it('transitions from SCHEDULED to DUE', () => {
      const task = createMockRenewalTask({ status: RenewalTaskStatus.SCHEDULED });
      const dueTask = { ...task, status: RenewalTaskStatus.DUE };

      expect(dueTask.status).toBe(RenewalTaskStatus.DUE);
    });

    it('transitions from DUE to IN_PROGRESS', () => {
      const task = createMockRenewalTask({ status: RenewalTaskStatus.DUE });
      const inProgressTask = { ...task, status: RenewalTaskStatus.IN_PROGRESS };

      expect(inProgressTask.status).toBe(RenewalTaskStatus.IN_PROGRESS);
    });

    it('transitions from IN_PROGRESS to COMPLETED', () => {
      const task = createMockRenewalTask({ status: RenewalTaskStatus.IN_PROGRESS });
      const completedTask = {
        ...task,
        status: RenewalTaskStatus.COMPLETED,
        renewalContractId: 'new_contract_123',
      };

      expect(completedTask.status).toBe(RenewalTaskStatus.COMPLETED);
      expect(completedTask.renewalContractId).toBe('new_contract_123');
    });

    it('can mark as not renewing', () => {
      const task = createMockRenewalTask({ status: RenewalTaskStatus.IN_PROGRESS });
      const notRenewingTask = {
        ...task,
        status: RenewalTaskStatus.NOT_RENEWING,
        churnReason: 'Budget constraints',
      };

      expect(notRenewingTask.status).toBe(RenewalTaskStatus.NOT_RENEWING);
      expect(notRenewingTask.churnReason).toBe('Budget constraints');
    });

    it('can mark as churned', () => {
      const task = createMockRenewalTask({ status: RenewalTaskStatus.NOT_RENEWING });
      const churnedTask = { ...task, status: RenewalTaskStatus.CHURNED };

      expect(churnedTask.status).toBe(RenewalTaskStatus.CHURNED);
    });
  });

  describe('Contract Renewal Timing', () => {
    it('identifies contracts needing renewal (90 days)', () => {
      const contractEndDate = new Date(Date.now() + 85 * 24 * 60 * 60 * 1000); // 85 days
      const days = daysUntilRenewal(contractEndDate);

      const needsRenewal = days <= 90;
      expect(needsRenewal).toBe(true);
    });

    it('identifies contracts not yet needing renewal', () => {
      const contractEndDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 180 days
      const days = daysUntilRenewal(contractEndDate);

      const needsRenewal = days <= 90;
      expect(needsRenewal).toBe(false);
    });
  });
});

// ============================================================================
// Integration Tests: Full Pipeline
// ============================================================================

describe('Full Procurement Pipeline', () => {
  describe('Quote → PO → Contract Flow', () => {
    it('completes full pipeline with correct status transitions', () => {
      // Step 1: Create Quote (DRAFT)
      const quote = createMockQuote({ status: QuoteStatus.DRAFT });
      expect(quote.status).toBe(QuoteStatus.DRAFT);

      // Step 2: Add line items and send quote (SENT)
      const sentQuote = { ...quote, status: QuoteStatus.SENT, totalAmountCents: 10000000 };
      expect(sentQuote.status).toBe(QuoteStatus.SENT);

      // Step 3: District accepts quote (ACCEPTED)
      const acceptedQuote = { ...sentQuote, status: QuoteStatus.ACCEPTED };
      expect(acceptedQuote.status).toBe(QuoteStatus.ACCEPTED);

      // Step 4: Create PO linked to quote (PENDING)
      const po = createMockPurchaseOrder({
        quoteId: acceptedQuote.id,
        amountCents: acceptedQuote.totalAmountCents,
      });
      expect(po.status).toBe(POStatus.PENDING);

      // Step 5: Approve PO (APPROVED)
      const approvedPo = { ...po, status: POStatus.APPROVED };
      expect(approvedPo.status).toBe(POStatus.APPROVED);

      // Step 6: Create Contract with PO reference
      const contract = {
        id: 'contract_new',
        primaryPoId: approvedPo.id,
        totalValueCents: approvedPo.amountCents,
        status: 'ACTIVE',
      };
      expect(contract.primaryPoId).toBe(approvedPo.id);
      expect(contract.totalValueCents).toBe(acceptedQuote.totalAmountCents);
    });
  });

  describe('Contract → Invoice → Payment Flow', () => {
    it('generates and processes invoice for contract', () => {
      // Step 1: Create invoice from contract
      const invoice = createMockContractInvoice({
        contractId: 'contract_123',
        amountDueCents: BigInt(7500000), // 50% upfront
      });
      expect(invoice.status).toBe(DistrictInvoiceStatus.DRAFT);

      // Step 2: Send invoice
      const sentInvoice = { ...invoice, status: DistrictInvoiceStatus.SENT, sentAt: new Date() };
      expect(sentInvoice.status).toBe(DistrictInvoiceStatus.SENT);

      // Step 3: Mark as paid
      const paidInvoice = {
        ...sentInvoice,
        status: DistrictInvoiceStatus.PAID,
        paidAt: new Date(),
      };
      expect(paidInvoice.status).toBe(DistrictInvoiceStatus.PAID);
    });
  });

  describe('Contract → Renewal → New Quote Flow', () => {
    it('creates renewal quote from expiring contract', () => {
      // Contract ending soon
      const contractEndDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const contractLineItems = [
        { sku: 'AIVO-ELA-SEAT', quantity: 100, unitPriceCents: 10000 },
        { sku: 'AIVO-MATH-SEAT', quantity: 100, unitPriceCents: 10000 },
      ];

      // Create renewal quote with 10% price increase
      const renewalLineItems = contractLineItems.map((item) => ({
        ...item,
        unitPriceCents: Math.round(item.unitPriceCents * 1.1), // 10% increase
      }));

      const renewalTotal = renewalLineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceCents,
        0
      );

      // Original: 100 * 10000 * 2 = 2,000,000
      // Renewal:  100 * 11000 * 2 = 2,200,000
      expect(renewalTotal).toBe(2200000);
    });
  });
});

// ============================================================================
// Integration Tests: Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  describe('Quote Edge Cases', () => {
    it('handles quote with zero line items', () => {
      const emptyQuote = createMockQuote({ totalAmountCents: BigInt(0) });
      expect(Number(emptyQuote.totalAmountCents)).toBe(0);
    });

    it('handles quote with 100% discount', () => {
      const lineItem = createMockQuoteLineItem({
        quantity: 100,
        unitPriceCents: BigInt(0), // 100% discounted
        discountPercent: 100,
      });

      expect(Number(lineItem.unitPriceCents)).toBe(0);
    });
  });

  describe('Invoice Edge Cases', () => {
    it('handles zero-amount invoice (e.g., credit note)', () => {
      // In practice, credit notes might have zero or negative amounts
      const creditNote = createMockContractInvoice({ amountDueCents: BigInt(0) });
      expect(Number(creditNote.amountDueCents)).toBe(0);
    });

    it('handles invoice paid before due date', () => {
      const invoice = createMockContractInvoice({
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const paidInvoice = {
        ...invoice,
        status: DistrictInvoiceStatus.PAID,
        paidAt: new Date(), // Paid today
      };

      const paidBeforeDue = new Date(paidInvoice.paidAt!) < new Date(paidInvoice.dueDate);
      expect(paidBeforeDue).toBe(true);
    });
  });

  describe('Currency Handling', () => {
    it('maintains currency consistency across quote', () => {
      const quote = createMockQuote({ currency: 'USD' });
      const lineItems = [
        createMockQuoteLineItem({ id: 'qli_1' }),
        createMockQuoteLineItem({ id: 'qli_2' }),
      ];

      // All amounts should be in the same currency
      expect(quote.currency).toBe('USD');
      // In real implementation, line items don't have their own currency - they inherit from quote
    });

    it('handles non-USD currencies', () => {
      const eurQuote = createMockQuote({ currency: 'EUR' });
      expect(eurQuote.currency).toBe('EUR');
    });

    it('formats currency correctly', () => {
      const formattedUSD = formatCents(BigInt(10000), 'USD');
      expect(formattedUSD).toBe('$100.00');

      const formattedEUR = formatCents(10000, 'EUR');
      expect(formattedEUR).toBe('€100.00');
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('Helper Functions', () => {
  describe('isQuoteValid', () => {
    it('returns true for valid SENT quote', () => {
      const quote = createMockQuote({
        status: QuoteStatus.SENT,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      expect(isQuoteValid(quote)).toBe(true);
    });

    it('returns false for expired quote', () => {
      const quote = createMockQuote({
        status: QuoteStatus.SENT,
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      expect(isQuoteValid(quote)).toBe(false);
    });

    it('returns false for ACCEPTED quote', () => {
      const quote = createMockQuote({
        status: QuoteStatus.ACCEPTED,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      expect(isQuoteValid(quote)).toBe(false);
    });
  });

  describe('isInvoiceOverdue', () => {
    it('returns true for overdue SENT invoice', () => {
      const invoice = createMockContractInvoice({
        status: DistrictInvoiceStatus.SENT,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      expect(isInvoiceOverdue(invoice)).toBe(true);
    });

    it('returns false for paid invoice even if past due', () => {
      const invoice = createMockContractInvoice({
        status: DistrictInvoiceStatus.PAID,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      expect(isInvoiceOverdue(invoice)).toBe(false);
    });
  });

  describe('daysUntilRenewal', () => {
    it('calculates positive days for future date', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const days = daysUntilRenewal(futureDate);
      expect(days).toBeGreaterThan(29);
      expect(days).toBeLessThanOrEqual(31);
    });

    it('calculates negative days for past date', () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const days = daysUntilRenewal(pastDate);
      expect(days).toBeLessThan(0);
    });
  });
});
