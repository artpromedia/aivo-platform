/**
 * Admin Data Hooks
 *
 * React Query hooks for admin dashboard data fetching.
 * Provides real-time data with proper caching, refetching, and error handling.
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

// ══════════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ══════════════════════════════════════════════════════════════════════════════

export const adminQueryKeys = {
  // Models
  models: ['admin', 'models'] as const,
  modelList: (filters?: Record<string, unknown>) => [...adminQueryKeys.models, 'list', filters] as const,
  modelDetail: (modelId: string) => [...adminQueryKeys.models, 'detail', modelId] as const,
  modelMetrics: (modelId: string, period?: string) => [...adminQueryKeys.models, 'metrics', modelId, period] as const,
  modelSummary: ['admin', 'models', 'summary'] as const,

  // Licenses
  licenses: ['admin', 'licenses'] as const,
  licenseList: (filters?: Record<string, unknown>) => [...adminQueryKeys.licenses, 'list', filters] as const,
  licenseSummary: ['admin', 'licenses', 'summary'] as const,
  revenueMetrics: (period?: string) => [...adminQueryKeys.licenses, 'revenue', period] as const,
  renewalPipeline: ['admin', 'licenses', 'renewals'] as const,

  // Health
  health: ['admin', 'health'] as const,
  healthSummary: ['admin', 'health', 'summary'] as const,
  serviceHealth: ['admin', 'health', 'services'] as const,
  serviceHealthDetail: (serviceId: string) => [...adminQueryKeys.health, 'service', serviceId] as const,
  serviceHealthHistory: (serviceId: string, period?: string) => [...adminQueryKeys.health, 'history', serviceId, period] as const,
  healthIncidents: (filters?: Record<string, unknown>) => [...adminQueryKeys.health, 'incidents', filters] as const,

  // Audit
  audit: ['admin', 'audit'] as const,
  auditLogs: (filters?: Record<string, unknown>) => [...adminQueryKeys.audit, 'logs', filters] as const,
  auditLogDetail: (logId: string) => [...adminQueryKeys.audit, 'log', logId] as const,
  auditSummary: (period?: string) => [...adminQueryKeys.audit, 'summary', period] as const,
  auditAlertRules: ['admin', 'audit', 'alert-rules'] as const,

  // Alerts
  alerts: ['admin', 'alerts'] as const,
  activeAlerts: ['admin', 'alerts', 'active'] as const,
  alertList: (filters?: Record<string, unknown>) => [...adminQueryKeys.alerts, 'list', filters] as const,
  alertDetail: (alertId: string) => [...adminQueryKeys.alerts, 'detail', alertId] as const,
  alertSummary: ['admin', 'alerts', 'summary'] as const,
  alertHistory: (alertId: string) => [...adminQueryKeys.alerts, 'history', alertId] as const,
  alertRules: ['admin', 'alerts', 'rules'] as const,

  // Orchestration
  orchestration: ['admin', 'orchestration'] as const,
  orchestrationSummary: ['admin', 'orchestration', 'summary'] as const,
  providers: ['admin', 'orchestration', 'providers'] as const,
  providerDetail: (providerId: string) => [...adminQueryKeys.orchestration, 'provider', providerId] as const,
  providerMetrics: (providerId: string, period?: string) => [...adminQueryKeys.orchestration, 'metrics', providerId, period] as const,
  failoverEvents: (filters?: Record<string, unknown>) => [...adminQueryKeys.orchestration, 'failover', filters] as const,
  costBreakdown: (period?: string) => [...adminQueryKeys.orchestration, 'costs', period] as const,
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER HOOK
// ══════════════════════════════════════════════════════════════════════════════

function useAccessToken() {
  const { data: session } = useSession();
  return (session as { accessToken?: string } | null)?.accessToken;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI MODELS HOOKS
// ══════════════════════════════════════════════════════════════════════════════

import type { ModelFilters, AIModel, ModelMetrics, ModelSummaryMetrics } from '../lib/api/models.api';

export function useAIModels(filters?: ModelFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.modelList(filters as Record<string, unknown>),
    queryFn: async () => {
      const response = await fetch('/api/dashboard/models?' + new URLSearchParams(filters as Record<string, string> ?? {}));
      if (!response.ok) throw new Error('Failed to fetch models');
      return response.json() as Promise<{ data: AIModel[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

export function useModelSummary() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.modelSummary,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/models/summary');
      if (!response.ok) throw new Error('Failed to fetch model summary');
      return response.json() as Promise<ModelSummaryMetrics>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
  });
}

export function useModelMetrics(modelId: string, period: 'hour' | 'day' | 'week' | 'month' = 'day') {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.modelMetrics(modelId, period),
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/models/${modelId}/metrics?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch model metrics');
      return response.json() as Promise<ModelMetrics>;
    },
    enabled: !!accessToken && !!modelId,
    staleTime: 30 * 1000,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// LICENSE HOOKS
// ══════════════════════════════════════════════════════════════════════════════

import type { LicenseFilters, TenantLicense, LicenseSummary, RevenueMetrics, RenewalPipeline } from '../lib/api/licenses.api';

export function useLicenseSummary() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.licenseSummary,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/licenses/summary');
      if (!response.ok) throw new Error('Failed to fetch license summary');
      return response.json() as Promise<LicenseSummary>;
    },
    enabled: !!accessToken,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useLicenses(filters?: LicenseFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.licenseList(filters as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams(filters as Record<string, string> ?? {});
      const response = await fetch('/api/dashboard/licenses?' + params);
      if (!response.ok) throw new Error('Failed to fetch licenses');
      return response.json() as Promise<{ data: TenantLicense[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
  });
}

export function useRevenueMetrics(period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month') {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.revenueMetrics(period),
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/licenses/revenue?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch revenue metrics');
      return response.json() as Promise<RevenueMetrics>;
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRenewalPipeline() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.renewalPipeline,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/licenses/renewals');
      if (!response.ok) throw new Error('Failed to fetch renewal pipeline');
      return response.json() as Promise<RenewalPipeline>;
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH HOOKS
// ══════════════════════════════════════════════════════════════════════════════

import type { HealthFilters, ServiceHealth, HealthSummary, ServiceHealthHistory, HealthIncident } from '../lib/api/health.api';

export function useHealthSummary() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.healthSummary,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/health/summary');
      if (!response.ok) throw new Error('Failed to fetch health summary');
      return response.json() as Promise<HealthSummary>;
    },
    enabled: !!accessToken,
    staleTime: 10 * 1000, // 10 seconds for real-time health
    refetchInterval: 10 * 1000,
  });
}

export function useServiceHealth(filters?: HealthFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.serviceHealth,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/health');
      if (!response.ok) throw new Error('Failed to fetch service health');
      return response.json() as Promise<ServiceHealth[]>;
    },
    enabled: !!accessToken,
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useServiceHealthHistory(serviceId: string, period: 'hour' | 'day' | 'week' | 'month' = 'day') {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.serviceHealthHistory(serviceId, period),
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/health/${serviceId}/history?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch health history');
      return response.json() as Promise<ServiceHealthHistory>;
    },
    enabled: !!accessToken && !!serviceId,
    staleTime: 30 * 1000,
  });
}

export function useHealthIncidents(filters?: { serviceId?: string; severity?: string; resolved?: boolean }) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.healthIncidents(filters),
    queryFn: async () => {
      const params = new URLSearchParams(filters as Record<string, string> ?? {});
      const response = await fetch('/api/dashboard/health/incidents?' + params);
      if (!response.ok) throw new Error('Failed to fetch health incidents');
      return response.json() as Promise<{ data: HealthIncident[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 30 * 1000,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT HOOKS
// ══════════════════════════════════════════════════════════════════════════════

import type { AuditFilters, AuditLogEntry, AuditLogSummary } from '../lib/api/audit.api';

export function useAuditLogs(filters?: AuditFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.auditLogs(filters as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (value instanceof Date) {
              params.append(key, value.toISOString());
            } else {
              params.append(key, String(value));
            }
          }
        });
      }
      const response = await fetch('/api/dashboard/audit?' + params);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json() as Promise<{ data: AuditLogEntry[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 30 * 1000,
  });
}

export function useAuditLogDetail(logId: string) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.auditLogDetail(logId),
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/audit/${logId}`);
      if (!response.ok) throw new Error('Failed to fetch audit log detail');
      return response.json() as Promise<AuditLogEntry>;
    },
    enabled: !!accessToken && !!logId,
  });
}

export function useAuditSummary(period: 'day' | 'week' | 'month' = 'day') {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.auditSummary(period),
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/audit/summary?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch audit summary');
      return response.json() as Promise<AuditLogSummary>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ALERTS HOOKS
// ══════════════════════════════════════════════════════════════════════════════

import type { AlertFilters, PlatformAlert, AlertSummary, AlertHistoryEntry } from '../lib/api/alerts.api';

export function useActiveAlerts() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.activeAlerts,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/alerts?status=active');
      if (!response.ok) throw new Error('Failed to fetch active alerts');
      return response.json() as Promise<PlatformAlert[]>;
    },
    enabled: !!accessToken,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // 30 seconds
  });
}

export function useAlerts(filters?: AlertFilters) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.alertList(filters as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams(filters as Record<string, string> ?? {});
      const response = await fetch('/api/dashboard/alerts?' + params);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json() as Promise<{ data: PlatformAlert[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 30 * 1000,
  });
}

export function useAlertSummary() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.alertSummary,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/alerts/summary');
      if (!response.ok) throw new Error('Failed to fetch alert summary');
      return response.json() as Promise<AlertSummary>;
    },
    enabled: !!accessToken,
    staleTime: 30 * 1000,
  });
}

export function useAlertHistory(alertId: string) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.alertHistory(alertId),
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/alerts/${alertId}/history`);
      if (!response.ok) throw new Error('Failed to fetch alert history');
      return response.json() as Promise<AlertHistoryEntry[]>;
    },
    enabled: !!accessToken && !!alertId,
  });
}

// Alert mutations
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, note }: { alertId: string; note?: string }) => {
      const response = await fetch(`/api/dashboard/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!response.ok) throw new Error('Failed to acknowledge alert');
      return response.json() as Promise<PlatformAlert>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.alerts });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, resolution }: { alertId: string; resolution?: string }) => {
      const response = await fetch(`/api/dashboard/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });
      if (!response.ok) throw new Error('Failed to resolve alert');
      return response.json() as Promise<PlatformAlert>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.alerts });
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATION HOOKS
// ══════════════════════════════════════════════════════════════════════════════

import type { AIProvider, OrchestrationSummary, ProviderMetrics, FailoverEvent, ProviderId } from '../lib/api/orchestration.api';

export function useOrchestrationSummary() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.orchestrationSummary,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/orchestration/summary');
      if (!response.ok) throw new Error('Failed to fetch orchestration summary');
      return response.json() as Promise<OrchestrationSummary>;
    },
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useAIProviders() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.providers,
    queryFn: async () => {
      const response = await fetch('/api/dashboard/orchestration/providers');
      if (!response.ok) throw new Error('Failed to fetch providers');
      return response.json() as Promise<AIProvider[]>;
    },
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useProviderMetrics(providerId: ProviderId, period: 'hour' | 'day' | 'week' | 'month' = 'day') {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.providerMetrics(providerId, period),
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/orchestration/providers/${providerId}/metrics?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch provider metrics');
      return response.json() as Promise<ProviderMetrics>;
    },
    enabled: !!accessToken && !!providerId,
    staleTime: 30 * 1000,
  });
}

export function useFailoverEvents(filters?: { providerId?: ProviderId; since?: Date }) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.failoverEvents(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.providerId) params.append('providerId', filters.providerId);
      if (filters?.since) params.append('since', filters.since.toISOString());
      const response = await fetch('/api/dashboard/orchestration/failover-events?' + params);
      if (!response.ok) throw new Error('Failed to fetch failover events');
      return response.json() as Promise<{ data: FailoverEvent[]; total: number }>;
    },
    enabled: !!accessToken,
    staleTime: 60 * 1000,
  });
}

export function useCostBreakdown(period: 'day' | 'week' | 'month' = 'month') {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: adminQueryKeys.costBreakdown(period),
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/orchestration/costs?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch cost breakdown');
      return response.json();
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });
}

// Switch primary provider mutation
export function useSwitchPrimaryProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ providerId, reason }: { providerId: ProviderId; reason?: string }) => {
      const response = await fetch('/api/dashboard/orchestration/switch-primary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, reason }),
      });
      if (!response.ok) throw new Error('Failed to switch primary provider');
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.orchestration });
    },
  });
}
