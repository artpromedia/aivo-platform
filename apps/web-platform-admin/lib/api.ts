/**
 * Platform Admin API Client
 *
 * Client functions for tenants, AI incidents, and related entities.
 * Server-side only (uses internal service URLs).
 */

import type {
  AiCallLog,
  AiCallLogWithLinkReason,
  AiIncident,
  AiIncidentListItem,
  CreateTenantInput,
  Entitlement,
  FeatureFlag,
  IncidentFilters,
  PaginatedResponse,
  Tenant,
  TenantAiActivitySummary,
  TenantListItem,
  UpdateIncidentInput,
} from './types';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const TENANT_SVC_URL = process.env.TENANT_SVC_URL ?? 'http://localhost:4002';
const AI_ORCHESTRATOR_URL = process.env.AI_ORCHESTRATOR_URL ?? 'http://localhost:4010';

// ══════════════════════════════════════════════════════════════════════════════
// GENERIC FETCH
// ══════════════════════════════════════════════════════════════════════════════

interface FetchOptions extends RequestInit {
  accessToken?: string;
}

async function apiFetch<T>(baseUrl: string, path: string, options?: FetchOptions): Promise<T> {
  const url = `${baseUrl}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
  };

  const res = await fetch(url, {
    ...(options ?? {}),
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({ message: res.statusText }))) as {
      message?: string;
    };
    throw new Error(errorData.message ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ══════════════════════════════════════════════════════════════════════════════
// TENANT API
// ══════════════════════════════════════════════════════════════════════════════

export async function listTenants(
  accessToken: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<TenantListItem>> {
  return apiFetch<PaginatedResponse<TenantListItem>>(
    TENANT_SVC_URL,
    `/admin/tenants?page=${page}&pageSize=${pageSize}`,
    { accessToken }
  );
}

export async function getTenant(accessToken: string, tenantId: string): Promise<Tenant> {
  return apiFetch<Tenant>(TENANT_SVC_URL, `/admin/tenants/${tenantId}`, { accessToken });
}

export async function createTenant(accessToken: string, input: CreateTenantInput): Promise<Tenant> {
  return apiFetch<Tenant>(TENANT_SVC_URL, '/admin/tenants', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function updateTenantStatus(
  accessToken: string,
  tenantId: string,
  status: 'ACTIVE' | 'SUSPENDED'
): Promise<Tenant> {
  return apiFetch<Tenant>(TENANT_SVC_URL, `/admin/tenants/${tenantId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS API
// ══════════════════════════════════════════════════════════════════════════════

export async function getTenantFeatureFlags(
  accessToken: string,
  tenantId: string
): Promise<FeatureFlag[]> {
  return apiFetch<FeatureFlag[]>(TENANT_SVC_URL, `/admin/tenants/${tenantId}/feature-flags`, {
    accessToken,
  });
}

export async function updateFeatureFlag(
  accessToken: string,
  tenantId: string,
  flagKey: string,
  enabled: boolean,
  rolloutPercentage?: number
): Promise<FeatureFlag> {
  return apiFetch<FeatureFlag>(
    TENANT_SVC_URL,
    `/admin/tenants/${tenantId}/feature-flags/${flagKey}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ enabled, rolloutPercentage }),
      accessToken,
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ENTITLEMENTS API
// ══════════════════════════════════════════════════════════════════════════════

export async function getTenantEntitlements(
  accessToken: string,
  tenantId: string
): Promise<Entitlement[]> {
  return apiFetch<Entitlement[]>(TENANT_SVC_URL, `/admin/tenants/${tenantId}/entitlements`, {
    accessToken,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INCIDENTS API
// ══════════════════════════════════════════════════════════════════════════════

export async function listIncidents(
  accessToken: string,
  filters?: IncidentFilters,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<AiIncidentListItem>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.tenantId) params.set('tenantId', filters.tenantId);
  if (filters?.search) params.set('search', filters.search);

  return apiFetch<PaginatedResponse<AiIncidentListItem>>(
    AI_ORCHESTRATOR_URL,
    `/admin/incidents?${params.toString()}`,
    { accessToken }
  );
}

export async function getIncident(accessToken: string, incidentId: string): Promise<AiIncident> {
  return apiFetch<AiIncident>(AI_ORCHESTRATOR_URL, `/admin/incidents/${incidentId}`, {
    accessToken,
  });
}

export async function updateIncident(
  accessToken: string,
  incidentId: string,
  input: UpdateIncidentInput
): Promise<AiIncident> {
  return apiFetch<AiIncident>(AI_ORCHESTRATOR_URL, `/admin/incidents/${incidentId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function getIncidentAiCalls(
  accessToken: string,
  incidentId: string
): Promise<AiCallLogWithLinkReason[]> {
  return apiFetch<AiCallLogWithLinkReason[]>(
    AI_ORCHESTRATOR_URL,
    `/admin/incidents/${incidentId}/calls`,
    { accessToken }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI ACTIVITY API (for tenant detail)
// ══════════════════════════════════════════════════════════════════════════════

export async function getTenantAiActivity(
  accessToken: string,
  tenantId: string,
  days = 30
): Promise<TenantAiActivitySummary> {
  return apiFetch<TenantAiActivitySummary>(
    AI_ORCHESTRATOR_URL,
    `/admin/tenants/${tenantId}/ai-activity?days=${days}`,
    { accessToken }
  );
}

export async function getTenantAiCalls(
  accessToken: string,
  tenantId: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<AiCallLog>> {
  return apiFetch<PaginatedResponse<AiCallLog>>(
    AI_ORCHESTRATOR_URL,
    `/admin/tenants/${tenantId}/ai-calls?page=${page}&pageSize=${pageSize}`,
    { accessToken }
  );
}

export async function getTenantIncidents(
  accessToken: string,
  tenantId: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<AiIncidentListItem>> {
  return apiFetch<PaginatedResponse<AiIncidentListItem>>(
    AI_ORCHESTRATOR_URL,
    `/admin/incidents?tenantId=${tenantId}&page=${page}&pageSize=${pageSize}`,
    { accessToken }
  );
}
