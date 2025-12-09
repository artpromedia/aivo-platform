/**
 * Payment Service Types
 *
 * Type definitions for payment processing, Stripe integration,
 * and webhook handling.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS (mirrored from billing-svc for consistency)
// ══════════════════════════════════════════════════════════════════════════════

export enum BillingAccountType {
  PARENT_CONSUMER = 'PARENT_CONSUMER',
  DISTRICT = 'DISTRICT',
  PLATFORM_INTERNAL = 'PLATFORM_INTERNAL',
}

export enum SubscriptionStatus {
  IN_TRIAL = 'IN_TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
  PAUSED = 'PAUSED',
}

export enum PlanType {
  PARENT_BASE = 'PARENT_BASE',
  PARENT_ADDON = 'PARENT_ADDON',
  DISTRICT_BASE = 'DISTRICT_BASE',
  DISTRICT_ADDON = 'DISTRICT_ADDON',
}

export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  MANUAL_INVOICE = 'MANUAL_INVOICE',
  TEST_FAKE = 'TEST_FAKE',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  VOID = 'VOID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
}

// ══════════════════════════════════════════════════════════════════════════════
// DATABASE ENTITY TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface BillingAccount {
  id: string;
  tenantId: string;
  accountType: BillingAccountType;
  ownerUserId: string | null;
  displayName: string;
  provider: PaymentProvider;
  providerCustomerId: string | null;
  defaultCurrency: string;
  billingEmail: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  sku: string;
  planType: PlanType;
  name: string;
  description: string | null;
  unitPriceCents: number;
  billingPeriod: BillingPeriod;
  isActive: boolean;
  trialDays: number;
  metadataJson: PlanMetadata | null;
  stripePriceId?: string; // Stripe Price ID for this plan
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanMetadata {
  modules?: string[];
  maxLearners?: number;
  minSeats?: number;
  stripePriceId?: string;
  [key: string]: unknown;
}

export interface Subscription {
  id: string;
  billingAccountId: string;
  planId: string;
  status: SubscriptionStatus;
  quantity: number;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  endedAt: Date | null;
  providerSubscriptionId: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingInstrument {
  id: string;
  billingAccountId: string;
  providerPaymentMethodId: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  instrumentType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  billingAccountId: string;
  providerInvoiceId: string | null;
  invoiceNumber: string | null;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  status: InvoiceStatus;
  periodStart: Date;
  periodEnd: Date;
  issuedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  pdfUrl: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT EVENT TYPES (for audit logging)
// ══════════════════════════════════════════════════════════════════════════════

export interface PaymentEvent {
  id: string;
  provider: PaymentProvider;
  eventType: string;
  providerEventId: string;
  billingAccountId: string | null;
  subscriptionId: string | null;
  invoiceId: string | null;
  payload: Record<string, unknown>;
  processedAt: Date | null;
  error: string | null;
  createdAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// API REQUEST/RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

// POST /payments/accounts/:billingAccountId/customer
export interface EnsureCustomerResponse {
  customerId: string;
  isNew: boolean;
}

// POST /payments/accounts/:billingAccountId/payment-method/attach
export interface AttachPaymentMethodRequest {
  paymentMethodId: string; // Stripe PM id (pm_xxx) or token
  setAsDefault?: boolean;
}

export interface AttachPaymentMethodResponse {
  instrumentId: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
}

// POST /payments/subscriptions
export interface CreateSubscriptionRequest {
  billingAccountId: string;
  planSku: string;
  quantity?: number;
  trialDays?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  trialStartAt: string | null;
  trialEndAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

// POST /payments/subscriptions/:subscriptionId/cancel
export interface CancelSubscriptionRequest {
  cancelImmediately?: boolean;
}

export interface CancelSubscriptionResponse {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  status: SubscriptionStatus;
}

// ══════════════════════════════════════════════════════════════════════════════
// STRIPE WEBHOOK EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type StripeWebhookEventType =
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'invoice.finalized'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'payment_method.attached'
  | 'payment_method.detached'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed';

// ══════════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ServiceError {
  error: string;
  code?: string;
  statusCode: number;
}

export function isServiceError(obj: unknown): obj is ServiceError {
  return typeof obj === 'object' && obj !== null && 'error' in obj;
}
