/**
 * Billing API Client
 *
 * Typed API calls for billing, subscriptions, checkout, and Stripe portal.
 * Maps to billing-svc endpoints at /billing/*.
 *
 * @packageDocumentation
 */

import { apiClient } from './client';

import type { Subscription, Invoice } from '@/lib/billing-types';

// ============================================================================
// Types
// ============================================================================

/** Backend-compatible checkout session request (matches billing-common CheckoutSessionRequest) */
export interface CheckoutSessionRequest {
  learnerIds: string[];
  selectedSkus: string[];
  billingPeriod: 'monthly' | 'yearly';
  couponCode?: string;
  successUrl: string;
  cancelUrl: string;
}

/** Backend checkout session response */
export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

/** Coupon validation result */
export interface CouponValidationResult {
  valid: boolean;
  coupon: {
    id: string;
    code: string;
    percentOff: number | null;
    amountOffCents: number | null;
  } | null;
  error?: string;
  discountAmountCents?: number;
  discountPercent?: number;
}

/** Portal session response */
export interface PortalSessionResponse {
  url: string;
}

// ============================================================================
// Billing API Functions
// ============================================================================

/**
 * Create a Stripe Checkout session for subscription purchase.
 * Calls POST /billing/checkout-session
 */
export async function createCheckoutSession(
  request: CheckoutSessionRequest
): Promise<CheckoutSessionResponse> {
  return apiClient.post<CheckoutSessionResponse>('/billing/checkout-session', request);
}

/**
 * Get current subscription for the authenticated tenant.
 * Calls GET /billing/subscription
 */
export async function getSubscription(): Promise<Subscription | null> {
  try {
    return await apiClient.get<Subscription>('/billing/subscription');
  } catch (error: unknown) {
    // 404 means no subscription exists
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Cancel subscription (at period end by default).
 * Calls POST /billing/cancel
 */
export async function cancelSubscription(immediate = false): Promise<Subscription> {
  return apiClient.post<Subscription>('/billing/cancel', { immediate });
}

/**
 * Create a Stripe Billing Portal session for self-service management.
 * Calls POST /billing/portal-session
 */
export async function createPortalSession(returnUrl: string): Promise<PortalSessionResponse> {
  return apiClient.post<PortalSessionResponse>('/billing/portal-session', { returnUrl });
}

/**
 * Validate a coupon code.
 * Calls POST /billing/apply-coupon
 */
export async function validateCoupon(
  code: string,
  skus?: string[]
): Promise<CouponValidationResult> {
  return apiClient.post<CouponValidationResult>('/billing/apply-coupon', { code, skus });
}

/**
 * Get invoice history.
 * Calls GET /billing/invoices
 */
export async function getInvoices(limit?: number, startingAfter?: string): Promise<Invoice[]> {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (startingAfter) params.set('startingAfter', startingAfter);
  const qs = params.toString();
  return apiClient.get<Invoice[]>(`/billing/invoices${qs ? `?${qs}` : ''}`);
}

/**
 * Get upcoming invoice preview.
 * Calls GET /billing/upcoming
 */
export async function getUpcomingInvoice(): Promise<unknown> {
  try {
    return await apiClient.get('/billing/upcoming');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export const billingApi = {
  createCheckoutSession,
  getSubscription,
  cancelSubscription,
  createPortalSession,
  validateCoupon,
  getInvoices,
  getUpcomingInvoice,
};
