/**
 * Enterprise Billing — Zod Request/Response Schemas
 *
 * Validation schemas for all enterprise billing endpoints.
 * All fields are explicit — no z.any().
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Contract Schemas
// ═══════════════════════════════════════════════════════════════════════════════

export const CreateContractSchema = z.object({
  /** District tenant ID */
  districtId: z.string().uuid(),
  /** Billing contract type */
  contractType: z.enum(['annual', 'monthly']),
  /** Number of student seats */
  studentCount: z.number().int().min(1).max(500000),
  /** Price per student per billing period (dollars) */
  pricePerStudent: z.number().min(0.01).max(10000),
  /** Contract start date (ISO string) */
  startDate: z.string().datetime(),
  /** Contract end date (ISO string) */
  endDate: z.string().datetime(),
  /** Payment terms */
  paymentTerms: z.enum(['NET_30', 'NET_60', 'PO']),
  /** District's purchase order number (required for PO payment terms) */
  poNumber: z.string().max(100).optional(),
  /** Primary billing contact email */
  contactEmail: z.string().email(),
  /** Primary billing contact name */
  contactName: z.string().min(1).max(255),
});

export type CreateContractInput = z.infer<typeof CreateContractSchema>;

export const ContractResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  contractNumber: z.string(),
  contractType: z.string(),
  studentCount: z.number(),
  currentStudentCount: z.number(),
  pricePerStudent: z.number(),
  totalValueCents: z.number(),
  paymentTerms: z.string(),
  poNumber: z.string().nullable(),
  contactEmail: z.string(),
  contactName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  createdAt: z.string(),
  firstInvoiceId: z.string().uuid().nullable(),
});

export type ContractResponse = z.infer<typeof ContractResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Invoice Schemas
// ═══════════════════════════════════════════════════════════════════════════════

export const RecordPaymentSchema = z.object({
  /** Payment amount in dollars */
  amount: z.number().min(0.01),
  /** Payment method */
  method: z.enum(['bank_transfer', 'check', 'ach']),
  /** External reference number (check #, wire ref, ACH trace) */
  referenceNumber: z.string().min(1).max(255),
  /** Date payment was received (ISO string) */
  paidAt: z.string().datetime(),
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

export const InvoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
});

export const InvoiceResponseSchema = z.object({
  id: z.string().uuid(),
  contractId: z.string().uuid(),
  tenantId: z.string().uuid(),
  invoiceNumber: z.string(),
  lineItems: z.array(InvoiceLineItemSchema),
  subtotal: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  currency: z.string(),
  status: z.string(),
  dueDate: z.string(),
  paidAt: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  paymentRef: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  periodStart: z.string(),
  periodEnd: z.string(),
  createdAt: z.string(),
});

export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Pilot Schemas
// ═══════════════════════════════════════════════════════════════════════════════

export const ActivatePilotSchema = z.object({
  /** Tenant ID for the district */
  tenantId: z.string().uuid(),
  /** Student seat limit for the pilot */
  studentLimit: z.number().int().min(1).max(10000).default(50),
  /** Primary contact email */
  contactEmail: z.string().email(),
  /** Primary contact name */
  contactName: z.string().min(1).max(255),
  /** Notes about the pilot */
  notes: z.string().max(5000).optional(),
});

export type ActivatePilotInput = z.infer<typeof ActivatePilotSchema>;

export const PilotStatusResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  studentLimit: z.number(),
  seatsUsed: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  daysRemaining: z.number(),
  status: z.string(),
  contactEmail: z.string(),
  notes: z.string().nullable(),
  conversionRecommendation: z.string(),
});

export type PilotStatusResponse = z.infer<typeof PilotStatusResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Usage / Sync Schemas
// ═══════════════════════════════════════════════════════════════════════════════

export const UsageResponseSchema = z.object({
  contractId: z.string().uuid(),
  tenantId: z.string().uuid(),
  contractedStudents: z.number(),
  currentStudents: z.number(),
  utilizationPercent: z.number(),
  overageDetected: z.boolean(),
  overageInvoiceId: z.string().uuid().nullable(),
});

export type UsageResponse = z.infer<typeof UsageResponseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Route Param Schemas
// ═══════════════════════════════════════════════════════════════════════════════

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

export const TenantIdParamSchema = z.object({
  tenantId: z.string().uuid(),
});
