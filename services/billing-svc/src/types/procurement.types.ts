/* eslint-disable no-redeclare */
/**
 * District Procurement Types
 *
 * Type definitions for quotes, purchase orders, invoices, and renewal workflows.
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const QuoteStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CONVERTED: 'CONVERTED',
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const POStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;
export type POStatus = (typeof POStatus)[keyof typeof POStatus];

export const DistrictInvoiceStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  VOID: 'VOID',
  DISPUTED: 'DISPUTED',
} as const;
export type DistrictInvoiceStatus =
  (typeof DistrictInvoiceStatus)[keyof typeof DistrictInvoiceStatus];

export const RenewalTaskStatus = {
  SCHEDULED: 'SCHEDULED',
  DUE: 'DUE',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  NOT_RENEWING: 'NOT_RENEWING',
  CHURNED: 'CHURNED',
} as const;
export type RenewalTaskStatus = (typeof RenewalTaskStatus)[keyof typeof RenewalTaskStatus];

// ============================================================================
// Quote Types
// ============================================================================

export interface Quote {
  id: string;
  billingAccountId: string;
  tenantId: string;
  quoteNumber: string;
  name: string | null;
  status: QuoteStatus;
  validUntil: Date;
  currency: string;
  totalAmountCents: bigint;
  priceBookId: string | null;
  proposedStartDate: Date | null;
  proposedEndDate: Date | null;
  paymentTermsDays: number;
  sentAt: Date | null;
  acceptedAt: Date | null;
  createdBy: string | null;
  convertedContractId: string | null;
  metadataJson: QuoteMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuoteMetadata {
  internalNotes?: string;
  districtContact?: {
    name: string;
    email: string;
    phone?: string;
  };
  revision?: number;
  previousQuoteId?: string;
  tags?: string[];
}

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  sku: string;
  description: string;
  quantity: number;
  listPriceCents: bigint;
  unitPriceCents: bigint;
  discountPercent: number | null;
  totalAmountCents: bigint;
  sortOrder: number;
  metadataJson: QuoteLineItemMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuoteLineItemMetadata {
  productName?: string;
  category?: string;
  gradeBands?: string[];
  notes?: string;
}

export interface QuoteWithLineItems extends Quote {
  lineItems: QuoteLineItem[];
}

// ============================================================================
// Quote Input Schemas
// ============================================================================

export const CreateQuoteSchema = z.object({
  billingAccountId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().max(200).optional(),
  validUntil: z.coerce.date(),
  currency: z.string().length(3).default('USD'),
  priceBookId: z.string().uuid().optional(),
  proposedStartDate: z.coerce.date().optional(),
  proposedEndDate: z.coerce.date().optional(),
  paymentTermsDays: z.number().int().positive().default(30),
  createdBy: z.string().uuid().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>;

export const CreateQuoteLineItemSchema = z.object({
  quoteId: z.string().uuid(),
  sku: z.string().min(1),
  description: z.string().min(1).max(500),
  quantity: z.number().int().positive(),
  listPriceCents: z.number().int().nonnegative(),
  unitPriceCents: z.number().int().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional(),
  sortOrder: z.number().int().default(0),
  metadataJson: z.record(z.unknown()).optional(),
});

export type CreateQuoteLineItemInput = z.infer<typeof CreateQuoteLineItemSchema>;

export const UpdateQuoteSchema = z.object({
  name: z.string().max(200).optional(),
  validUntil: z.coerce.date().optional(),
  proposedStartDate: z.coerce.date().optional(),
  proposedEndDate: z.coerce.date().optional(),
  paymentTermsDays: z.number().int().positive().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

export type UpdateQuoteInput = z.infer<typeof UpdateQuoteSchema>;

// ============================================================================
// Purchase Order Types
// ============================================================================

export interface PurchaseOrder {
  id: string;
  billingAccountId: string;
  tenantId: string;
  poNumber: string;
  quoteId: string | null;
  status: POStatus;
  amountCents: bigint;
  currency: string;
  validFrom: Date;
  validTo: Date;
  attachmentsJson: POAttachment[] | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  contractId: string | null;
  metadataJson: POMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface POAttachment {
  fileName: string;
  url: string;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface POMetadata {
  districtDepartment?: string;
  districtBudgetCode?: string;
  districtApprover?: string;
  notes?: string;
}

export interface PurchaseOrderWithQuote extends PurchaseOrder {
  quote?: QuoteWithLineItems | null;
}

// ============================================================================
// Purchase Order Input Schemas
// ============================================================================

export const CreatePurchaseOrderSchema = z.object({
  billingAccountId: z.string().uuid(),
  tenantId: z.string().uuid(),
  poNumber: z.string().min(1).max(100),
  quoteId: z.string().uuid().optional(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default('USD'),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  attachmentsJson: z
    .array(
      z.object({
        fileName: z.string(),
        url: z.string().url(),
        mimeType: z.string().optional(),
        uploadedAt: z.string(),
        uploadedBy: z.string().optional(),
      })
    )
    .optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;

export const ReviewPurchaseOrderSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewedBy: z.string().uuid(),
  reviewNotes: z.string().max(1000).optional(),
});

export type ReviewPurchaseOrderInput = z.infer<typeof ReviewPurchaseOrderSchema>;

// ============================================================================
// District Invoice Types
// ============================================================================

export interface DistrictInvoice {
  id: string;
  billingAccountId: string;
  contractId: string;
  invoiceNumber: string;
  status: DistrictInvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  amountDueCents: bigint;
  amountPaidCents: bigint;
  currency: string;
  poNumber: string | null;
  externalSystemId: string | null;
  externalSystemName: string | null;
  sentAt: Date | null;
  paidAt: Date | null;
  paymentReference: string | null;
  pdfUrl: string | null;
  metadataJson: InvoiceMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceMetadata {
  lineItems?: InvoiceLineItemSummary[];
  remindersSent?: number;
  lastReminderAt?: string;
  disputeDetails?: string;
  notes?: string;
}

export interface InvoiceLineItemSummary {
  sku: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

// ============================================================================
// District Invoice Input Schemas
// ============================================================================

export const CreateDistrictInvoiceSchema = z.object({
  billingAccountId: z.string().uuid(),
  contractId: z.string().uuid(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  amountDueCents: z.number().int().positive(),
  currency: z.string().length(3).default('USD'),
  poNumber: z.string().optional(),
  metadataJson: z.record(z.unknown()).optional(),
});

export type CreateDistrictInvoiceInput = z.infer<typeof CreateDistrictInvoiceSchema>;

export const UpdateDistrictInvoiceStatusSchema = z.object({
  status: z.nativeEnum(DistrictInvoiceStatus),
  paymentReference: z.string().optional(),
  externalSystemId: z.string().optional(),
  externalSystemName: z.string().optional(),
});

export type UpdateDistrictInvoiceStatusInput = z.infer<typeof UpdateDistrictInvoiceStatusSchema>;

// ============================================================================
// Renewal Task Types
// ============================================================================

export interface RenewalTask {
  id: string;
  contractId: string;
  tenantId: string;
  status: RenewalTaskStatus;
  dueDate: Date;
  contractEndDate: Date;
  renewalQuoteId: string | null;
  renewalContractId: string | null;
  assignedTo: string | null;
  notesJson: RenewalTaskNotes | null;
  lastReminderAt: Date | null;
  reminderCount: number;
  churnReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RenewalTaskNotes {
  activities?: RenewalActivity[];
  customerFeedback?: string;
  renewalStrategy?: string;
}

export interface RenewalActivity {
  date: string;
  action: string;
  by: string;
  notes?: string;
}

export interface RenewalTaskWithContract extends RenewalTask {
  contract: {
    contractNumber: string;
    name: string | null;
    totalValueCents: bigint;
    status: string;
  };
  tenant?: {
    name: string;
  };
}

// ============================================================================
// Renewal Task Input Schemas
// ============================================================================

export const UpdateRenewalTaskSchema = z.object({
  status: z.nativeEnum(RenewalTaskStatus).optional(),
  assignedTo: z.string().uuid().optional(),
  churnReason: z.string().max(500).optional(),
  activity: z
    .object({
      action: z.string(),
      by: z.string(),
      notes: z.string().optional(),
    })
    .optional(),
});

export type UpdateRenewalTaskInput = z.infer<typeof UpdateRenewalTaskSchema>;

// ============================================================================
// Aggregated Types
// ============================================================================

/**
 * District billing overview for district admin dashboard
 */
export interface DistrictBillingOverview {
  tenant: {
    id: string;
    name: string;
  };
  activeContract: {
    id: string;
    contractNumber: string;
    name: string | null;
    startDate: Date;
    endDate: Date;
    status: string;
    totalValueCents: bigint;
  } | null;
  seatUsage: {
    gradeBand: string;
    committed: number;
    allocated: number;
    available: number;
    utilizationPercent: number;
  }[];
  invoices: {
    outstanding: {
      count: number;
      totalCents: bigint;
    };
    overdue: {
      count: number;
      totalCents: bigint;
    };
    recent: DistrictInvoice[];
  };
  renewal: {
    daysUntilEnd: number;
    renewalTaskStatus: RenewalTaskStatus | null;
  } | null;
}

/**
 * Quote summary for listings
 */
export interface QuoteSummary {
  id: string;
  quoteNumber: string;
  name: string | null;
  status: QuoteStatus;
  validUntil: Date;
  totalAmountCents: bigint;
  tenantName?: string;
  createdAt: Date;
}

/**
 * Contract activation result
 */
export interface ContractActivationResult {
  success: boolean;
  contractId: string;
  contractNumber: string;
  entitlementsCreated: number;
  errors?: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a quote number in format Q-YYYY-NNNNN
 */
export function generateQuoteNumber(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequenceNumber).padStart(5, '0');
  return `Q-${year}-${padded}`;
}

/**
 * Generate an invoice number in format INV-YYYY-NNNNN
 */
export function generateInvoiceNumber(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequenceNumber).padStart(5, '0');
  return `INV-${year}-${padded}`;
}

/**
 * Check if a quote is still valid
 */
export function isQuoteValid(quote: Quote): boolean {
  if (quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.DRAFT) {
    return false;
  }
  return new Date() <= quote.validUntil;
}

/**
 * Check if an invoice is overdue
 */
export function isInvoiceOverdue(invoice: DistrictInvoice): boolean {
  if (
    invoice.status === DistrictInvoiceStatus.PAID ||
    invoice.status === DistrictInvoiceStatus.VOID
  ) {
    return false;
  }
  return new Date() > invoice.dueDate;
}

/**
 * Calculate days until contract renewal
 */
export function daysUntilRenewal(endDate: Date): number {
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format cents to currency string
 */
export function formatCents(cents: bigint | number, currency = 'USD'): string {
  const amount = typeof cents === 'bigint' ? Number(cents) : cents;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}
