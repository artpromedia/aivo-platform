/**
 * Billing Data Hooks
 *
 * React Query hooks for billing operations including quotes, purchase orders,
 * renewals, enterprise sales, pilot programs, license vault, and feature flags.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import type {
  Quote,
  QuoteWithLineItems,
  QuoteFilters,
  CreateQuoteInput,
  UpdateQuoteInput,
  PurchaseOrder,
  POFilters,
  ApprovePOInput,
  RejectPOInput,
  Renewal,
  RenewalFilters,
  RenewalAction,
  EnterpriseCustomer,
  CustomerFilters,
  CreateCustomerInput,
  EnterpriseDeal,
  DealFilters,
  CreateDealInput,
  DealStatus,
  PipelineAnalytics,
  PilotProgram,
  PilotFilters,
  PilotStats,
  CreatePilotInput,
  ExtendPilotInput,
  ConvertPilotInput,
  VaultLicense,
  LicenseFilters,
  IssueLicenseInput,
  VaultCode,
  GenerateCodesInput,
  VaultAuditLog,
  VaultAuditFilters,
  FeatureFlag,
  RevenueMetrics,
  MRRDataPoint,
  DateRange,
  BillingSummary,
} from '../lib/api/billing.api';

// ══════════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ══════════════════════════════════════════════════════════════════════════════

export const billingQueryKeys = {
  // Quotes
  quotes: ['billing', 'quotes'] as const,
  quoteList: (filters?: QuoteFilters) => [...billingQueryKeys.quotes, 'list', filters] as const,
  quoteDetail: (id: string) => [...billingQueryKeys.quotes, 'detail', id] as const,

  // Purchase Orders
  purchaseOrders: ['billing', 'purchase-orders'] as const,
  poList: (filters?: POFilters) => [...billingQueryKeys.purchaseOrders, 'list', filters] as const,
  poDetail: (id: string) => [...billingQueryKeys.purchaseOrders, 'detail', id] as const,

  // Renewals
  renewals: ['billing', 'renewals'] as const,
  renewalList: (filters?: RenewalFilters) =>
    [...billingQueryKeys.renewals, 'list', filters] as const,
  renewalDetail: (id: string) => [...billingQueryKeys.renewals, 'detail', id] as const,

  // Enterprise Customers
  customers: ['billing', 'customers'] as const,
  customerList: (filters?: CustomerFilters) =>
    [...billingQueryKeys.customers, 'list', filters] as const,
  customerDetail: (id: string) => [...billingQueryKeys.customers, 'detail', id] as const,

  // Enterprise Deals
  deals: ['billing', 'deals'] as const,
  dealList: (filters?: DealFilters) => [...billingQueryKeys.deals, 'list', filters] as const,
  dealDetail: (id: string) => [...billingQueryKeys.deals, 'detail', id] as const,

  // Pipeline
  pipeline: ['billing', 'pipeline'] as const,
  revenue: (range?: DateRange) => ['billing', 'revenue', range] as const,

  // Pilots
  pilots: ['billing', 'pilots'] as const,
  pilotList: (filters?: PilotFilters) => [...billingQueryKeys.pilots, 'list', filters] as const,
  pilotDetail: (id: string) => [...billingQueryKeys.pilots, 'detail', id] as const,
  pilotStats: ['billing', 'pilots', 'stats'] as const,

  // Vault Licenses
  vaultLicenses: ['billing', 'vault', 'licenses'] as const,
  vaultLicenseList: (filters?: LicenseFilters) =>
    [...billingQueryKeys.vaultLicenses, 'list', filters] as const,
  vaultLicenseDetail: (id: string) => [...billingQueryKeys.vaultLicenses, 'detail', id] as const,

  // Vault Codes
  vaultCodes: ['billing', 'vault', 'codes'] as const,
  vaultCodeList: (licenseId?: string) =>
    [...billingQueryKeys.vaultCodes, 'list', licenseId] as const,

  // Vault Audit
  vaultAudit: ['billing', 'vault', 'audit'] as const,
  vaultAuditList: (filters?: VaultAuditFilters) =>
    [...billingQueryKeys.vaultAudit, 'list', filters] as const,

  // Feature Flags
  featureFlags: ['billing', 'feature-flags'] as const,
  featureFlagDetail: (key: string) => [...billingQueryKeys.featureFlags, 'detail', key] as const,

  // Revenue Metrics
  revenueMetrics: (range?: DateRange) => ['billing', 'metrics', 'revenue', range] as const,
  mrrHistory: (range?: DateRange) => ['billing', 'metrics', 'mrr', range] as const,
  billingSummary: ['billing', 'summary'] as const,
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER HOOKS
// ══════════════════════════════════════════════════════════════════════════════

function useAccessToken() {
  const { data: session } = useSession();
  return (session as { accessToken?: string } | null)?.accessToken;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUOTES HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function useQuotes(filters?: QuoteFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.quoteList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value));
        });
      }
      const response = await fetch(`/api/billing/quotes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch quotes');
      return response.json() as Promise<{ data: Quote[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useQuote(id: string) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.quoteDetail(id),
    queryFn: async () => {
      const response = await fetch(`/api/billing/quotes/${id}`);
      if (!response.ok) throw new Error('Failed to fetch quote');
      return response.json() as Promise<QuoteWithLineItems>;
    },
    enabled: !!accessToken && !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken();

  return useMutation({
    mutationFn: async (data: CreateQuoteInput) => {
      const response = await fetch('/api/billing/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create quote');
      return response.json() as Promise<Quote>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.quotes });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateQuoteInput }) => {
      const response = await fetch(`/api/billing/quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update quote');
      return response.json() as Promise<Quote>;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.quotes });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.quoteDetail(id) });
    },
  });
}

export function useSendQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/billing/quotes/${id}/send`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to send quote');
      return response.json() as Promise<Quote>;
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.quotes });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.quoteDetail(id) });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function usePurchaseOrders(filters?: POFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.poList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value));
        });
      }
      const response = await fetch(`/api/billing/purchase-orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      return response.json() as Promise<{ data: PurchaseOrder[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function usePurchaseOrder(id: string) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.poDetail(id),
    queryFn: async () => {
      const response = await fetch(`/api/billing/purchase-orders/${id}`);
      if (!response.ok) throw new Error('Failed to fetch purchase order');
      return response.json() as Promise<PurchaseOrder>;
    },
    enabled: !!accessToken && !!id,
  });
}

export function useApprovePO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data?: ApprovePOInput }) => {
      const response = await fetch(`/api/billing/purchase-orders/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data ?? {}),
      });
      if (!response.ok) throw new Error('Failed to approve PO');
      return response.json() as Promise<PurchaseOrder>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.purchaseOrders });
    },
  });
}

export function useRejectPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RejectPOInput }) => {
      const response = await fetch(`/api/billing/purchase-orders/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to reject PO');
      return response.json() as Promise<PurchaseOrder>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.purchaseOrders });
    },
  });
}

export function useActivateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await fetch(`/api/billing/purchase-orders/${id}/activate`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to activate contract');
      return response.json() as Promise<PurchaseOrder>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.purchaseOrders });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// RENEWALS HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function useRenewals(filters?: RenewalFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.renewalList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value));
        });
      }
      const response = await fetch(`/api/billing/renewals?${params}`);
      if (!response.ok) throw new Error('Failed to fetch renewals');
      return response.json() as Promise<{ data: Renewal[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useProcessRenewal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      action,
      notes,
    }: {
      id: string;
      action: RenewalAction;
      notes?: string;
    }) => {
      const response = await fetch(`/api/billing/renewals/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to process renewal');
      return response.json() as Promise<Renewal>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.renewals });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE CUSTOMERS HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function useCustomers(filters?: CustomerFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.customerList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value));
        });
      }
      const response = await fetch(`/api/billing/customers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json() as Promise<{ data: EnterpriseCustomer[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useCustomer(id: string) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.customerDetail(id),
    queryFn: async () => {
      const response = await fetch(`/api/billing/customers/${id}`);
      if (!response.ok) throw new Error('Failed to fetch customer');
      return response.json() as Promise<EnterpriseCustomer>;
    },
    enabled: !!accessToken && !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const response = await fetch('/api/billing/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create customer');
      return response.json() as Promise<EnterpriseCustomer>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.customers });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE DEALS HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function useDeals(filters?: DealFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.dealList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value));
        });
      }
      const response = await fetch(`/api/billing/deals?${params}`);
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json() as Promise<{ data: EnterpriseDeal[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useDeal(id: string) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.dealDetail(id),
    queryFn: async () => {
      const response = await fetch(`/api/billing/deals/${id}`);
      if (!response.ok) throw new Error('Failed to fetch deal');
      return response.json() as Promise<EnterpriseDeal>;
    },
    enabled: !!accessToken && !!id,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDealInput) => {
      const response = await fetch('/api/billing/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create deal');
      return response.json() as Promise<EnterpriseDeal>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.deals });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pipeline });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateDealInput> & { status?: DealStatus; lostReason?: string };
    }) => {
      const response = await fetch(`/api/billing/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update deal');
      return response.json() as Promise<EnterpriseDeal>;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.deals });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.dealDetail(id) });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pipeline });
    },
  });
}

export function useWinDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await fetch(`/api/billing/deals/${id}/win`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to mark deal as won');
      return response.json() as Promise<EnterpriseDeal>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.deals });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pipeline });
    },
  });
}

export function useLoseDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, lostReason }: { id: string; lostReason: string }) => {
      const response = await fetch(`/api/billing/deals/${id}/lose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lostReason }),
      });
      if (!response.ok) throw new Error('Failed to mark deal as lost');
      return response.json() as Promise<EnterpriseDeal>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.deals });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pipeline });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SALES PIPELINE HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function useSalesPipeline() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.pipeline,
    queryFn: async () => {
      const response = await fetch('/api/billing/pipeline');
      if (!response.ok) throw new Error('Failed to fetch pipeline');
      return response.json() as Promise<PipelineAnalytics>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PILOT PROGRAMS HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function usePilotPrograms(filters?: PilotFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.pilotList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value));
        });
      }
      const response = await fetch(`/api/billing/pilots?${params}`);
      if (!response.ok) throw new Error('Failed to fetch pilots');
      return response.json() as Promise<{ data: PilotProgram[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function usePilotProgram(id: string) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.pilotDetail(id),
    queryFn: async () => {
      const response = await fetch(`/api/billing/pilots/${id}`);
      if (!response.ok) throw new Error('Failed to fetch pilot');
      return response.json() as Promise<PilotProgram>;
    },
    enabled: !!accessToken && !!id,
  });
}

export function usePilotStats() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.pilotStats,
    queryFn: async () => {
      const response = await fetch('/api/billing/pilots/stats');
      if (!response.ok) throw new Error('Failed to fetch pilot stats');
      return response.json() as Promise<PilotStats>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useCreatePilot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePilotInput) => {
      const response = await fetch('/api/billing/pilots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create pilot');
      return response.json() as Promise<PilotProgram>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pilots });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pilotStats });
    },
  });
}

export function useExtendPilot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExtendPilotInput }) => {
      const response = await fetch(`/api/billing/pilots/${id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to extend pilot');
      return response.json() as Promise<PilotProgram>;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pilots });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pilotDetail(id) });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pilotStats });
    },
  });
}

export function useConvertPilot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data?: ConvertPilotInput }) => {
      const response = await fetch(`/api/billing/pilots/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data ?? {}),
      });
      if (!response.ok) throw new Error('Failed to convert pilot');
      return response.json() as Promise<PilotProgram>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pilots });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pilotStats });
    },
  });
}

export function useCancelPilot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await fetch(`/api/billing/pilots/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to cancel pilot');
      return response.json() as Promise<PilotProgram>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pilots });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.pilotStats });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// LICENSE VAULT HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function useVaultLicenses(filters?: LicenseFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.vaultLicenseList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value));
        });
      }
      const response = await fetch(`/api/billing/vault/licenses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch licenses');
      return response.json() as Promise<{ data: VaultLicense[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useVaultLicense(id: string) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.vaultLicenseDetail(id),
    queryFn: async () => {
      const response = await fetch(`/api/billing/vault/licenses/${id}`);
      if (!response.ok) throw new Error('Failed to fetch license');
      return response.json() as Promise<VaultLicense>;
    },
    enabled: !!accessToken && !!id,
  });
}

export function useIssueLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: IssueLicenseInput) => {
      const response = await fetch('/api/billing/vault/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to issue license');
      return response.json() as Promise<VaultLicense>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.vaultLicenses });
    },
  });
}

export function useActivateLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/billing/vault/licenses/${id}/activate`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to activate license');
      return response.json() as Promise<VaultLicense>;
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.vaultLicenses });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.vaultLicenseDetail(id) });
    },
  });
}

export function useSuspendLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await fetch(`/api/billing/vault/licenses/${id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to suspend license');
      return response.json() as Promise<VaultLicense>;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.vaultLicenses });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.vaultLicenseDetail(id) });
    },
  });
}

export function useRevokeLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await fetch(`/api/billing/vault/licenses/${id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to revoke license');
      return response.json() as Promise<VaultLicense>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.vaultLicenses });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// VAULT CODES HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function useVaultCodes(licenseId?: string) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.vaultCodeList(licenseId),
    queryFn: async () => {
      const params = licenseId ? `?licenseId=${licenseId}` : '';
      const response = await fetch(`/api/billing/vault/codes${params}`);
      if (!response.ok) throw new Error('Failed to fetch codes');
      return response.json() as Promise<VaultCode[]>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
  });
}

export function useGenerateCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateCodesInput) => {
      const response = await fetch('/api/billing/vault/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to generate codes');
      return response.json() as Promise<VaultCode[]>;
    },
    onSuccess: (_, { licenseId }) => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.vaultCodes });
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.vaultCodeList(licenseId) });
    },
  });
}

export function useRevokeCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await fetch(`/api/billing/vault/codes/${id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to revoke code');
      return response.json() as Promise<VaultCode>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.vaultCodes });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// VAULT AUDIT HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function useVaultAuditLogs(filters?: VaultAuditFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.vaultAuditList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value));
        });
      }
      const response = await fetch(`/api/billing/vault/audit?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json() as Promise<{ data: VaultAuditLog[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 30 * 1000,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function useFeatureFlags() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.featureFlags,
    queryFn: async () => {
      const response = await fetch('/api/billing/feature-flags');
      if (!response.ok) throw new Error('Failed to fetch feature flags');
      return response.json() as Promise<FeatureFlag[]>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useFeatureFlag(key: string) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.featureFlagDetail(key),
    queryFn: async () => {
      const response = await fetch(`/api/billing/feature-flags/${key}`);
      if (!response.ok) throw new Error('Failed to fetch feature flag');
      return response.json() as Promise<FeatureFlag>;
    },
    enabled: !!accessToken && !!key,
  });
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const action = enabled ? 'start' : 'pause';
      const response = await fetch(`/api/billing/feature-flags/${id}/${action}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to update feature flag');
      return response.json() as Promise<FeatureFlag>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingQueryKeys.featureFlags });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// REVENUE METRICS HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export function useRevenueMetrics(range?: DateRange) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.revenueMetrics(range),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range) {
        params.append('startDate', range.startDate);
        params.append('endDate', range.endDate);
      }
      const response = await fetch(`/api/billing/metrics/revenue?${params}`);
      if (!response.ok) throw new Error('Failed to fetch revenue metrics');
      return response.json() as Promise<RevenueMetrics>;
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useMRRHistory(range?: DateRange) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.mrrHistory(range),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range) {
        params.append('startDate', range.startDate);
        params.append('endDate', range.endDate);
      }
      const response = await fetch(`/api/billing/metrics/mrr-history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch MRR history');
      return response.json() as Promise<MRRDataPoint[]>;
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBillingSummary() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: billingQueryKeys.billingSummary,
    queryFn: async () => {
      const response = await fetch('/api/billing/summary');
      if (!response.ok) throw new Error('Failed to fetch billing summary');
      return response.json() as Promise<BillingSummary>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
