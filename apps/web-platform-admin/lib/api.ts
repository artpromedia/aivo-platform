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
  CreatePolicyInput,
  CreateTenantInput,
  EffectivePolicy,
  Entitlement,
  FeatureFlag,
  IncidentFilters,
  PaginatedResponse,
  PolicyDocument,
  Tenant,
  TenantAiActivitySummary,
  TenantListItem,
  UpdateIncidentInput,
  UpdatePolicyInput,
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

// ══════════════════════════════════════════════════════════════════════════════
// POLICY API
// ══════════════════════════════════════════════════════════════════════════════

const POLICY_SVC_URL = process.env.POLICY_SVC_URL ?? AI_ORCHESTRATOR_URL;

/**
 * Get the effective (merged) policy for a tenant
 */
export async function getTenantEffectivePolicy(
  accessToken: string,
  tenantId: string
): Promise<EffectivePolicy> {
  return apiFetch<EffectivePolicy>(POLICY_SVC_URL, `/admin/policies/effective/${tenantId}`, {
    accessToken,
  });
}

/**
 * Get the global policy
 */
export async function getGlobalPolicy(accessToken: string): Promise<PolicyDocument | null> {
  return apiFetch<PolicyDocument | null>(POLICY_SVC_URL, '/admin/policies/global', { accessToken });
}

/**
 * Get tenant-specific policy override (if any)
 */
export async function getTenantPolicy(
  accessToken: string,
  tenantId: string
): Promise<PolicyDocument | null> {
  return apiFetch<PolicyDocument | null>(POLICY_SVC_URL, `/admin/policies/tenant/${tenantId}`, {
    accessToken,
  });
}

/**
 * List all policy documents (for global management)
 */
export async function listPolicies(
  accessToken: string,
  scopeType?: 'GLOBAL' | 'TENANT',
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<PolicyDocument>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (scopeType) params.set('scopeType', scopeType);

  return apiFetch<PaginatedResponse<PolicyDocument>>(
    POLICY_SVC_URL,
    `/admin/policies?${params.toString()}`,
    { accessToken }
  );
}

/**
 * Create a new policy document
 */
export async function createPolicy(
  accessToken: string,
  input: CreatePolicyInput
): Promise<PolicyDocument> {
  return apiFetch<PolicyDocument>(POLICY_SVC_URL, '/admin/policies', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

/**
 * Update an existing policy document
 */
export async function updatePolicy(
  accessToken: string,
  policyId: string,
  input: UpdatePolicyInput
): Promise<PolicyDocument> {
  return apiFetch<PolicyDocument>(POLICY_SVC_URL, `/admin/policies/${policyId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

/**
 * Activate a policy document (deactivates others of the same scope)
 */
export async function activatePolicy(
  accessToken: string,
  policyId: string
): Promise<PolicyDocument> {
  return apiFetch<PolicyDocument>(POLICY_SVC_URL, `/admin/policies/${policyId}/activate`, {
    method: 'POST',
    accessToken,
  });
}

/**
 * Create or update a tenant policy override
 */
export async function upsertTenantPolicy(
  accessToken: string,
  tenantId: string,
  policyJson: CreatePolicyInput['policyJson']
): Promise<PolicyDocument> {
  return apiFetch<PolicyDocument>(POLICY_SVC_URL, `/admin/policies/tenant/${tenantId}`, {
    method: 'PUT',
    body: JSON.stringify({ policyJson }),
    accessToken,
  });
}

/**
 * Delete a tenant policy override (revert to global defaults)
 */
export async function deleteTenantPolicy(accessToken: string, tenantId: string): Promise<void> {
  await apiFetch<Record<string, never>>(POLICY_SVC_URL, `/admin/policies/tenant/${tenantId}`, {
    method: 'DELETE',
    accessToken,
  });
}
