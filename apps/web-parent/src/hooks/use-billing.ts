/**
 * Billing & Subscription Hooks
 *
 * React Query hooks for billing management including subscriptions,
 * payment methods, invoices, and plan changes.
 *
 * @packageDocumentation
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import type {
  Subscription,
  Plan,
  PaymentMethod,
  Invoice,
  BillingDetails,
  PlanChangePreview,
  Coupon,
  CheckoutSession,
  BillingPortalSession,
  SeatChangeRequest,
  BillingPeriod,
} from '@/lib/billing-types';

// ============================================================================
// Query Keys
// ============================================================================

export const billingQueryKeys = {
  all: ['billing'] as const,
  subscription: () => [...billingQueryKeys.all, 'subscription'] as const,
  plans: () => [...billingQueryKeys.all, 'plans'] as const,
  paymentMethods: () => [...billingQueryKeys.all, 'payment-methods'] as const,
  invoices: (limit?: number) => [...billingQueryKeys.all, 'invoices', { limit }] as const,
  billingDetails: () => [...billingQueryKeys.all, 'details'] as const,
  planPreview: (planId: string) => [...billingQueryKeys.all, 'plan-preview', planId] as const,
  coupon: (code: string) => [...billingQueryKeys.all, 'coupon', code] as const,
  availableChildren: () => [...billingQueryKeys.all, 'available-children'] as const,
  cancelPreview: () => [...billingQueryKeys.all, 'cancel-preview'] as const,
  retentionOffers: () => [...billingQueryKeys.all, 'retention-offers'] as const,
};

// ============================================================================
// Configuration
// ============================================================================

const STALE_TIMES = {
  subscription: 5 * 60 * 1000, // 5 minutes
  plans: 30 * 60 * 1000, // 30 minutes - plans rarely change
  paymentMethods: 5 * 60 * 1000, // 5 minutes
  invoices: 5 * 60 * 1000, // 5 minutes
  preview: 1 * 60 * 1000, // 1 minute - previews can change
  coupon: 5 * 60 * 1000, // 5 minutes
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch current subscription
 */
export function useSubscription() {
  return useQuery({
    queryKey: billingQueryKeys.subscription(),
    queryFn: () => apiClient.get<Subscription>('/billing/subscription'),
    staleTime: STALE_TIMES.subscription,
    retry: 3,
  });
}

/**
 * Fetch available plans
 */
export function usePlans() {
  return useQuery({
    queryKey: billingQueryKeys.plans(),
    queryFn: () => apiClient.get<Plan[]>('/billing/plans'),
    staleTime: STALE_TIMES.plans,
    retry: 3,
  });
}

/**
 * Fetch payment methods
 */
export function usePaymentMethods() {
  return useQuery({
    queryKey: billingQueryKeys.paymentMethods(),
    queryFn: () => apiClient.get<PaymentMethod[]>('/billing/payment-methods'),
    staleTime: STALE_TIMES.paymentMethods,
    retry: 3,
  });
}

/**
 * Fetch invoices/payment history
 */
export function useInvoices(limit?: number) {
  return useQuery({
    queryKey: billingQueryKeys.invoices(limit),
    queryFn: () => {
      const params = limit ? `?limit=${limit}` : '';
      return apiClient.get<Invoice[]>(`/billing/invoices${params}`);
    },
    staleTime: STALE_TIMES.invoices,
    retry: 3,
  });
}

/**
 * Fetch complete billing details
 */
export function useBillingDetails() {
  return useQuery({
    queryKey: billingQueryKeys.billingDetails(),
    queryFn: () => apiClient.get<BillingDetails>('/billing/details'),
    staleTime: STALE_TIMES.subscription,
    retry: 3,
  });
}

/**
 * Fetch plan change preview
 */
export function usePlanChangePreview(newPlanId: string | null) {
  return useQuery({
    queryKey: billingQueryKeys.planPreview(newPlanId || ''),
    queryFn: () => apiClient.get<PlanChangePreview>(`/billing/plans/${newPlanId}/preview`),
    enabled: !!newPlanId,
    staleTime: STALE_TIMES.preview,
    retry: 3,
  });
}

/**
 * Validate a coupon code
 */
export function useCouponValidation(code: string | null) {
  return useQuery({
    queryKey: billingQueryKeys.coupon(code || ''),
    queryFn: async (): Promise<Coupon | null> => {
      if (!code) return null;
      try {
        return await apiClient.get<Coupon>(`/billing/coupons/${code}/validate`);
      } catch {
        // Return null for invalid coupons
        return null;
      }
    },
    enabled: !!code && code.length >= 3,
    retry: 0,
    staleTime: STALE_TIMES.coupon,
  });
}

/**
 * Fetch available children (not yet on subscription)
 */
export function useAvailableChildren() {
  return useQuery({
    queryKey: billingQueryKeys.availableChildren(),
    queryFn: () =>
      apiClient.get<{ id: string; name: string; grade: number }[]>('/billing/available-children'),
    staleTime: STALE_TIMES.subscription,
    retry: 3,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a Stripe checkout session.
 * Calls POST /billing/checkout-session matching the billing-svc schema.
 */
export function useCreateCheckout() {
  return useMutation({
    mutationFn: ({
      selectedSkus,
      billingPeriod,
      learnerIds,
      couponCode,
      successUrl,
      cancelUrl,
    }: {
      selectedSkus: string[];
      billingPeriod: 'monthly' | 'yearly';
      learnerIds: string[];
      couponCode?: string;
      successUrl?: string;
      cancelUrl?: string;
    }) =>
      apiClient.post<CheckoutSession>('/billing/checkout-session', {
        selectedSkus,
        billingPeriod,
        learnerIds,
        couponCode,
        successUrl: successUrl ?? `${window.location.origin}/pricing/success`,
        cancelUrl: cancelUrl ?? `${window.location.origin}/pricing/cancel`,
      }),
  });
}

/**
 * Change subscription plan
 */
export function useChangePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      newPlanId,
      billingPeriod,
    }: {
      newPlanId: string;
      billingPeriod?: BillingPeriod;
    }) =>
      apiClient.post<Subscription>('/billing/subscription/change-plan', {
        newPlanId,
        billingPeriod,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription() });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails() });
    },
  });
}

/**
 * Cancel subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reason,
      feedback,
      cancelImmediately,
    }: {
      reason?: string;
      feedback?: string;
      cancelImmediately?: boolean;
    }) =>
      apiClient.post<Subscription>('/billing/subscription/cancel', {
        reason,
        feedback,
        cancelImmediately,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription() });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails() });
    },
  });
}

/**
 * Resume a canceled subscription
 */
export function useResumeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<Subscription>('/billing/subscription/resume', {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription() });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails() });
    },
  });
}

/**
 * Manage subscription seats (add/remove children)
 */
export function useManageSeats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (changes: SeatChangeRequest[]) =>
      apiClient.post<Subscription>('/billing/subscription/seats', { changes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription() });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails() });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.availableChildren() });
    },
  });
}

/**
 * Add a new payment method
 */
export function useAddPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stripePaymentMethodId,
      setAsDefault,
    }: {
      stripePaymentMethodId: string;
      setAsDefault?: boolean;
    }) =>
      apiClient.post<PaymentMethod>('/billing/payment-methods', {
        stripePaymentMethodId,
        setAsDefault,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.paymentMethods() });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails() });
    },
  });
}

/**
 * Remove a payment method
 */
export function useRemovePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentMethodId: string) =>
      apiClient.delete(`/billing/payment-methods/${paymentMethodId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.paymentMethods() });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails() });
    },
  });
}

/**
 * Set default payment method
 */
export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentMethodId: string) =>
      apiClient.put(`/billing/payment-methods/${paymentMethodId}/default`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.paymentMethods() });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails() });
    },
  });
}

/**
 * Create Stripe billing portal session.
 * Calls POST /billing/portal-session matching the billing-svc route.
 */
export function useCreateBillingPortal() {
  return useMutation({
    mutationFn: ({ returnUrl }: { returnUrl?: string } = {}) =>
      apiClient.post<BillingPortalSession>('/billing/portal-session', {
        returnUrl: returnUrl ?? window.location.href,
      }),
  });
}

/**
 * Download an invoice PDF
 */
export function useDownloadInvoice() {
  return useMutation({
    mutationFn: async ({
      invoiceId,
      invoiceDescription,
    }: {
      invoiceId: string;
      invoiceDescription: string;
    }) => {
      const blob = await apiClient.getBlob(`/billing/invoices/${invoiceId}/pdf`);
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceDescription.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);
    },
  });
}

/**
 * Update billing period (monthly/yearly)
 */
export function useUpdateBillingPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (billingPeriod: BillingPeriod) =>
      apiClient.put<Subscription>('/billing/subscription/billing-period', { billingPeriod }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription() });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails() });
    },
  });
}

/**
 * Apply a coupon to existing subscription
 */
export function useApplyCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (couponCode: string) =>
      apiClient.post<{ discount: number; message: string }>('/billing/subscription/apply-coupon', {
        couponCode,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription() });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails() });
    },
  });
}

// ============================================================================
// Cancel-Survey Hooks
// ============================================================================

interface CancelPreview {
  accessEndDate: string;
  refundAmount: number;
  currency: string;
  prorated: boolean;
}

interface RetentionOffer {
  id: string;
  type: 'discount' | 'pause' | 'downgrade' | 'extend_trial';
  title: string;
  description: string;
  discountPercent?: number;
  durationMonths?: number;
  pauseWeeks?: number;
}

/**
 * Fetch cancel-preview data (credits, end-date, refund).
 * Enabled on demand — call `refetch()` when the cancel modal opens.
 */
export function useCancelPreview() {
  return useQuery({
    queryKey: billingQueryKeys.cancelPreview(),
    queryFn: () => apiClient.get<CancelPreview>('/billing/cancel-preview'),
    enabled: false,
    staleTime: STALE_TIMES.preview,
  });
}

/**
 * Fetch retention offers for the current user.
 * Enabled on demand — call `refetch()` when the cancel modal opens.
 */
export function useRetentionOffers() {
  return useQuery({
    queryKey: billingQueryKeys.retentionOffers(),
    queryFn: () => apiClient.get<RetentionOffer[]>('/billing/retention-offers'),
    enabled: false,
    staleTime: STALE_TIMES.preview,
  });
}

/**
 * Accept a retention offer (discount, pause, etc.)
 */
export function useAcceptRetentionOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (offerId: string) =>
      apiClient.post<{ accepted: boolean }>('/billing/retention-offers/accept', { offerId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription() });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails() });
    },
  });
}

/**
 * Submit cancellation feedback (reason + free-text) independently of the
 * cancel mutation itself so it is recorded even on partial failures.
 */
export function useSubmitCancellationFeedback() {
  return useMutation({
    mutationFn: ({ reason, feedback }: { reason: string; feedback: string }) =>
      apiClient.post('/billing/subscription/feedback', { reason, feedback }),
  });
}
