/**
 * React Query Hooks for Billing & Subscription Management
 *
 * These hooks fetch data from the billing API service and fall back
 * to mock data in development mode when the API is unavailable.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import {
  isDevMode,
  getMockSubscription,
  getMockPlans,
  getMockPaymentMethods,
  getMockInvoices,
  getMockBillingDetails,
  getMockPlanChangePreview,
  getMockCoupon,
  getMockAvailableChildren,
} from './mock-data';
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
} from './billing-types';

// Query keys for cache management
export const billingQueryKeys = {
  subscription: ['subscription'] as const,
  plans: ['plans'] as const,
  paymentMethods: ['payment-methods'] as const,
  invoices: (limit?: number) => ['invoices', { limit }] as const,
  billingDetails: ['billing-details'] as const,
  planPreview: (planId: string) => ['plan-preview', planId] as const,
  coupon: (code: string) => ['coupon', code] as const,
  availableChildren: ['available-children'] as const,
};

/**
 * Hook to fetch current subscription
 */
export function useSubscription() {
  return useQuery({
    queryKey: billingQueryKeys.subscription,
    queryFn: async (): Promise<Subscription | null> => {
      try {
        const data = await api.get<Subscription>('/billing/subscription');
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock subscription data');
          return getMockSubscription();
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch available plans
 */
export function usePlans() {
  return useQuery({
    queryKey: billingQueryKeys.plans,
    queryFn: async (): Promise<Plan[]> => {
      try {
        const data = await api.get<Plan[]>('/billing/plans');
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock plans data');
          return getMockPlans();
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
    staleTime: 30 * 60 * 1000, // 30 minutes - plans don't change often
  });
}

/**
 * Hook to fetch payment methods
 */
export function usePaymentMethods() {
  return useQuery({
    queryKey: billingQueryKeys.paymentMethods,
    queryFn: async (): Promise<PaymentMethod[]> => {
      try {
        const data = await api.get<PaymentMethod[]>('/billing/payment-methods');
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock payment methods data');
          return getMockPaymentMethods();
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch invoices/payment history
 */
export function useInvoices(limit?: number) {
  return useQuery({
    queryKey: billingQueryKeys.invoices(limit),
    queryFn: async (): Promise<Invoice[]> => {
      try {
        const params = limit ? `?limit=${limit}` : '';
        const data = await api.get<Invoice[]>(`/billing/invoices${params}`);
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock invoices data');
          const invoices = getMockInvoices();
          return limit ? invoices.slice(0, limit) : invoices;
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch complete billing details
 */
export function useBillingDetails() {
  return useQuery({
    queryKey: billingQueryKeys.billingDetails,
    queryFn: async (): Promise<BillingDetails> => {
      try {
        const data = await api.get<BillingDetails>('/billing/details');
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock billing details data');
          return getMockBillingDetails();
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch plan change preview
 */
export function usePlanChangePreview(newPlanId: string | null) {
  return useQuery({
    queryKey: billingQueryKeys.planPreview(newPlanId || ''),
    queryFn: async (): Promise<PlanChangePreview | null> => {
      if (!newPlanId) return null;

      try {
        const data = await api.get<PlanChangePreview>(`/billing/plans/${newPlanId}/preview`);
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock plan preview data');
          return getMockPlanChangePreview('plan-premium', newPlanId);
        }
        throw error;
      }
    },
    enabled: !!newPlanId,
    retry: isDevMode() ? 0 : 3,
    staleTime: 1 * 60 * 1000, // 1 minute - preview can change
  });
}

/**
 * Hook to validate a coupon code
 */
export function useCouponValidation(code: string | null) {
  return useQuery({
    queryKey: billingQueryKeys.coupon(code || ''),
    queryFn: async (): Promise<Coupon | null> => {
      if (!code) return null;

      try {
        const data = await api.get<Coupon>(`/billing/coupons/${code}/validate`);
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock coupon validation');
          return getMockCoupon(code);
        }
        // Return null for invalid coupons instead of throwing
        return null;
      }
    },
    enabled: !!code && code.length >= 3,
    retry: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch available children (not yet on subscription)
 */
export function useAvailableChildren() {
  return useQuery({
    queryKey: billingQueryKeys.availableChildren,
    queryFn: async (): Promise<{ id: string; name: string; grade: number }[]> => {
      try {
        const data = await api.get<{ id: string; name: string; grade: number }[]>(
          '/billing/available-children'
        );
        return data;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[DEV] Using mock available children data');
          return getMockAvailableChildren();
        }
        throw error;
      }
    },
    retry: isDevMode() ? 0 : 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Hook to create a Stripe checkout session for upgrading/subscribing
 */
export function useCreateCheckout() {
  return useMutation({
    mutationFn: async ({
      planId,
      billingPeriod,
      couponCode,
    }: {
      planId: string;
      billingPeriod: BillingPeriod;
      couponCode?: string;
    }): Promise<CheckoutSession> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating checkout session creation');
        return {
          sessionId: 'cs_test_' + Math.random().toString(36).substr(2, 24),
          url: 'https://checkout.stripe.com/test',
          expiresAt: Date.now() + 30 * 60 * 1000,
        };
      }

      return api.post<CheckoutSession>('/billing/checkout', {
        planId,
        billingPeriod,
        couponCode,
      });
    },
  });
}

/**
 * Hook to change subscription plan
 */
export function useChangePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      newPlanId,
      billingPeriod,
    }: {
      newPlanId: string;
      billingPeriod?: BillingPeriod;
    }): Promise<Subscription> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating plan change');
        const mockSub = getMockSubscription();
        mockSub.planId = newPlanId;
        return mockSub;
      }

      return api.post<Subscription>('/billing/subscription/change-plan', {
        newPlanId,
        billingPeriod,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails });
    },
  });
}

/**
 * Hook to cancel subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reason,
      feedback,
      cancelImmediately,
    }: {
      reason?: string;
      feedback?: string;
      cancelImmediately?: boolean;
    }): Promise<Subscription> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating subscription cancellation');
        const mockSub = getMockSubscription();
        mockSub.cancelAtPeriodEnd = true;
        mockSub.canceledAt = new Date().toISOString();
        return mockSub;
      }

      return api.post<Subscription>('/billing/subscription/cancel', {
        reason,
        feedback,
        cancelImmediately,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails });
    },
  });
}

/**
 * Hook to resume a canceled subscription
 */
export function useResumeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<Subscription> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating subscription resumption');
        const mockSub = getMockSubscription();
        mockSub.cancelAtPeriodEnd = false;
        mockSub.canceledAt = undefined;
        return mockSub;
      }

      return api.post<Subscription>('/billing/subscription/resume', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails });
    },
  });
}

/**
 * Hook to manage subscription seats (add/remove children)
 */
export function useManageSeats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changes: SeatChangeRequest[]): Promise<Subscription> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating seat management');
        const mockSub = getMockSubscription();
        // Simulate adding/removing seats
        for (const change of changes) {
          if (change.action === 'add') {
            mockSub.usedSeats += 1;
            mockSub.seats.push({
              id: `seat-new-${Date.now()}`,
              childId: change.childId,
              childName: change.childName,
              assignedAt: new Date().toISOString(),
              status: 'active',
            });
          } else if (change.action === 'remove') {
            mockSub.usedSeats = Math.max(0, mockSub.usedSeats - 1);
            mockSub.seats = mockSub.seats.filter(s => s.childId !== change.childId);
          }
        }
        return mockSub;
      }

      return api.post<Subscription>('/billing/subscription/seats', { changes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.availableChildren });
    },
  });
}

/**
 * Hook to add a new payment method
 */
export function useAddPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stripePaymentMethodId,
      setAsDefault,
    }: {
      stripePaymentMethodId: string;
      setAsDefault?: boolean;
    }): Promise<PaymentMethod> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating add payment method');
        return {
          id: 'pm-new-' + Date.now(),
          stripePaymentMethodId,
          type: 'card',
          brand: 'visa',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2028,
          isDefault: setAsDefault || false,
        };
      }

      return api.post<PaymentMethod>('/billing/payment-methods', {
        stripePaymentMethodId,
        setAsDefault,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.paymentMethods });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails });
    },
  });
}

/**
 * Hook to remove a payment method
 */
export function useRemovePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethodId: string): Promise<void> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating remove payment method');
        return;
      }

      return api.delete(`/billing/payment-methods/${paymentMethodId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.paymentMethods });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails });
    },
  });
}

/**
 * Hook to set default payment method
 */
export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethodId: string): Promise<void> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating set default payment method');
        return;
      }

      return api.put(`/billing/payment-methods/${paymentMethodId}/default`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.paymentMethods });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails });
    },
  });
}

/**
 * Hook to create Stripe billing portal session
 */
export function useCreateBillingPortal() {
  return useMutation({
    mutationFn: async (): Promise<BillingPortalSession> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating billing portal creation');
        return {
          url: 'https://billing.stripe.com/test',
        };
      }

      return api.post<BillingPortalSession>('/billing/portal', {});
    },
  });
}

/**
 * Hook to download an invoice PDF
 */
export function useDownloadInvoice() {
  return useMutation({
    mutationFn: async ({
      invoiceId,
      invoiceDescription,
    }: {
      invoiceId: string;
      invoiceDescription: string;
    }): Promise<void> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating invoice download');
        // Create a fake PDF download in dev mode
        const blob = new Blob(['Mock Invoice PDF Content'], { type: 'application/pdf' });
        const url = globalThis.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        globalThis.URL.revokeObjectURL(url);
        return;
      }

      const blob = await api.getBlob(`/billing/invoices/${invoiceId}/pdf`);
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
 * Hook to update billing period (monthly/yearly)
 */
export function useUpdateBillingPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billingPeriod: BillingPeriod): Promise<Subscription> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating billing period update');
        const mockSub = getMockSubscription();
        mockSub.billingPeriod = billingPeriod;
        return mockSub;
      }

      return api.put<Subscription>('/billing/subscription/billing-period', {
        billingPeriod,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails });
    },
  });
}

/**
 * Hook to apply a coupon to existing subscription
 */
export function useApplyCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (couponCode: string): Promise<{ discount: number; message: string }> => {
      if (isDevMode()) {
        console.warn('[DEV] Simulating coupon application');
        const coupon = getMockCoupon(couponCode);
        if (!coupon) {
          throw new Error('Invalid coupon code');
        }
        return {
          discount: coupon.percentOff ? coupon.percentOff : (coupon.amountOff || 0),
          message: `Coupon "${coupon.name}" applied successfully!`,
        };
      }

      return api.post<{ discount: number; message: string }>('/billing/subscription/apply-coupon', {
        couponCode,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.billingDetails });
    },
  });
}
