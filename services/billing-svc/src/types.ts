/**
 * Billing Service Types
 *
 * Core type definitions for billing, subscriptions, and payments.
 * These types mirror the Prisma schema and provide additional
 * application-level type safety.
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
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
// BILLING ACCOUNT TYPES
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
  metadataJson: BillingAccountMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingAccountMetadata {
  taxExempt?: boolean;
  taxId?: string;
  contractTerms?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface CreateBillingAccountInput {
  tenantId: string;
  accountType: BillingAccountType;
  ownerUserId?: string;
  displayName: string;
  provider?: PaymentProvider;
  providerCustomerId?: string;
  defaultCurrency?: string;
  billingEmail?: string;
  metadataJson?: BillingAccountMetadata;
}

// ══════════════════════════════════════════════════════════════════════════════
// PLAN TYPES
// ══════════════════════════════════════════════════════════════════════════════

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
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanMetadata {
  modules?: string[];
  maxLearners?: number;
  minSeats?: number;
  features?: string[];
  [key: string]: unknown;
}

export interface CreatePlanInput {
  sku: string;
  planType: PlanType;
  name: string;
  description?: string;
  unitPriceCents: number;
  billingPeriod?: BillingPeriod;
  isActive?: boolean;
  trialDays?: number;
  metadataJson?: PlanMetadata;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION TYPES
// ══════════════════════════════════════════════════════════════════════════════

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
  metadataJson: SubscriptionMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionMetadata {
  modules?: string[];
  contractNumber?: string;
  learnerIds?: string[];
  notes?: string;
  [key: string]: unknown;
}

export interface CreateSubscriptionInput {
  billingAccountId: string;
  planId: string;
  quantity?: number;
  startTrial?: boolean;
  metadataJson?: SubscriptionMetadata;
}

export interface SubscriptionItem {
  id: string;
  subscriptionId: string;
  planId: string;
  sku: string;
  quantity: number;
  learnerId: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// BILLING INSTRUMENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

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

export interface CreateBillingInstrumentInput {
  billingAccountId: string;
  providerPaymentMethodId: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
  instrumentType?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// INVOICE TYPES
// ══════════════════════════════════════════════════════════════════════════════

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
  metadataJson: InvoiceMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceMetadata {
  prorationInfo?: ProrationInfo;
  adjustments?: Adjustment[];
  notes?: string;
  [key: string]: unknown;
}

export interface ProrationInfo {
  prorationFactor: number;
  originalPeriodStart: string;
  originalPeriodEnd: string;
  reason: string;
}

export interface Adjustment {
  description: string;
  amountCents: number;
  reason: string;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  subscriptionId: string | null;
  description: string;
  unitPriceCents: number;
  quantity: number;
  amountCents: number;
  lineItemType: 'subscription' | 'proration' | 'credit' | 'one_time';
  metadataJson: LineItemMetadata | null;
  createdAt: Date;
}

export interface LineItemMetadata {
  prorationFactor?: number;
  originalPeriodStart?: string;
  originalPeriodEnd?: string;
  reason?: string;
  sku?: string;
  [key: string]: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// USAGE RECORD TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface UsageRecord {
  id: string;
  subscriptionId: string;
  metric: string;
  quantity: number;
  timestamp: Date;
  invoiced: boolean;
  metadataJson: Record<string, unknown> | null;
  createdAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan;
}

export interface SubscriptionWithDetails extends Subscription {
  plan: Plan;
  items: SubscriptionItem[];
  billingAccount: BillingAccount;
}

export interface InvoiceWithLineItems extends Invoice {
  lineItems: InvoiceLineItem[];
}

export interface BillingAccountWithSubscriptions extends BillingAccount {
  subscriptions: SubscriptionWithPlan[];
  instruments: BillingInstrument[];
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface WebhookEvent {
  id: string;
  type: string;
  provider: PaymentProvider;
  data: unknown;
  receivedAt: Date;
  processedAt: Date | null;
  error: string | null;
}

export type StripeWebhookEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'payment_method.attached'
  | 'payment_method.detached';

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a subscription is currently in an active trial.
 */
export function isInTrial(subscription: Subscription): boolean {
  if (subscription.status !== SubscriptionStatus.IN_TRIAL) return false;
  if (!subscription.trialEndAt) return false;
  return new Date() < subscription.trialEndAt;
}

/**
 * Check if a subscription has access (trial or active).
 */
export function hasAccess(subscription: Subscription): boolean {
  return (
    subscription.status === SubscriptionStatus.ACTIVE ||
    subscription.status === SubscriptionStatus.IN_TRIAL ||
    (subscription.status === SubscriptionStatus.CANCELED &&
      new Date() < subscription.currentPeriodEnd)
  );
}

/**
 * Calculate the number of days remaining in trial.
 */
export function trialDaysRemaining(subscription: Subscription): number {
  if (!subscription.trialEndAt) return 0;
  const now = new Date();
  const end = new Date(subscription.trialEndAt);
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Format amount in cents to display string.
 */
export function formatAmount(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/**
 * Check if plan is a parent plan type.
 */
export function isParentPlan(planType: PlanType): boolean {
  return planType === PlanType.PARENT_BASE || planType === PlanType.PARENT_ADDON;
}

/**
 * Check if plan is a district plan type.
 */
export function isDistrictPlan(planType: PlanType): boolean {
  return planType === PlanType.DISTRICT_BASE || planType === PlanType.DISTRICT_ADDON;
}

// ══════════════════════════════════════════════════════════════════════════════
// RE-EXPORT FROM TYPES DIRECTORY
// ══════════════════════════════════════════════════════════════════════════════

export * from './types/contract.types';
export * from './types/coverage-profile.types';
export * from './types/licensing.types';
export * from './types/procurement.types';
export * from './types/usage-analytics.types';
