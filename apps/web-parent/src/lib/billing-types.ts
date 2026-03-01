/**
 * Billing Types and Interfaces
 *
 * Types for subscription management, Stripe integration,
 * and multi-child pricing support.
 */

// Subscription status types
export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'incomplete'
  | 'paused';

export type BillingPeriod = 'MONTHLY' | 'YEARLY';

// Plan definition
export interface Plan {
  id: string;
  sku: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  pricePerSeatMonthly: number;
  pricePerSeatYearly: number;
  baseSeats: number; // Number of seats included in base price
  maxSeats: number;
  modules: string[];
  features: string[];
  popular?: boolean;
  stripeProductId?: string;
  stripePriceMonthlyId?: string;
  stripePriceYearlyId?: string;
}

// Subscription with seat management
export interface Subscription {
  id: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  planId: string;
  plan?: Plan;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStartDate?: string;
  trialEndDate?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  // Seat management
  totalSeats: number;
  usedSeats: number;
  seats: SubscriptionSeat[];
  // Pricing
  pricePerPeriod: number;
  nextBillingAmount: number;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Individual seat for a child
export interface SubscriptionSeat {
  id: string;
  childId: string;
  childName: string;
  childAvatar?: string;
  grade?: number;
  assignedAt: string;
  status: 'active' | 'pending' | 'removed';
}

// Payment method
export interface PaymentMethod {
  id: string;
  stripePaymentMethodId?: string;
  type: 'card' | 'bank_account';
  // Card details
  brand?: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  // Status
  isDefault: boolean;
  isExpiring?: boolean;
  billingAddress?: BillingAddress;
}

// Billing address
export interface BillingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Invoice/Payment history
export interface Invoice {
  id: string;
  stripeInvoiceId?: string;
  date: string;
  dueDate?: string;
  amount: number;
  amountPaid: number;
  amountDue: number;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  description: string;
  lineItems: InvoiceLineItem[];
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  period?: {
    start: string;
    end: string;
  };
}

// Billing details summary
export interface BillingDetails {
  subscription: Subscription | null;
  paymentMethods: PaymentMethod[];
  defaultPaymentMethod: PaymentMethod | null;
  billingAddress: BillingAddress | null;
  nextInvoice?: {
    date: string;
    amount: number;
    items: InvoiceLineItem[];
  };
}

// Seat change request
export interface SeatChangeRequest {
  action: 'add' | 'remove';
  childId: string;
  childName: string;
  effectiveDate?: string;
}

// Upgrade/downgrade preview
export interface PlanChangePreview {
  currentPlan: Plan;
  newPlan: Plan;
  proratedAmount: number;
  newPricePerPeriod: number;
  effectiveDate: string;
  creditApplied: number;
  amountDue: number;
  lineItems: InvoiceLineItem[];
}

// Stripe checkout session
export interface CheckoutSession {
  sessionId: string;
  url: string;
  expiresAt: number;
}

// Stripe billing portal session
export interface BillingPortalSession {
  url: string;
}

// API response types
export interface BillingApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Coupon/Discount
export interface Coupon {
  id: string;
  code: string;
  name: string;
  percentOff?: number;
  amountOff?: number;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  validUntil?: string;
  isValid: boolean;
}

// Usage tracking for metered billing (future)
export interface UsageRecord {
  id: string;
  childId: string;
  childName: string;
  period: string;
  lessonsCompleted: number;
  minutesActive: number;
  modulesAccessed: string[];
}

// Per-item summary for seat pricing preview
export interface SubscriptionItemSummary {
  sku: string;
  displayName: string;
  unitPriceCents: number;
  active: boolean;
}
