/**
 * SOC 2 Evidence API Client
 *
 * Client-side functions for the compliance-evidence-svc.
 */

import type {
  AuditPackageView,
  CollectionRunView,
  CollectorView,
  ControlSummary,
  ControlView,
  CreatePackageRequest,
  EvidenceListResponse,
  EvidenceRecord,
} from './soc2-types';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use Next.js API route proxy
    return '/api/soc2';
  }
  // Server-side
  return process.env.COMPLIANCE_EVIDENCE_SVC_URL ?? 'http://localhost:3092';
}

async function soc2Fetch<T>(path: string, options?: RequestInit & { accessToken?: string }): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({ message: res.statusText }))) as {
      message?: string;
    };
    throw new Error(errorData.message ?? `SOC 2 API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ══════════════════════════════════════════════════════════════════════════════
// Controls
// ══════════════════════════════════════════════════════════════════════════════

export async function getControls(params?: {
  category?: string;
  section?: string;
  accessToken?: string;
}): Promise<ControlView[]> {
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  if (params?.section) search.set('section', params.section);
  const qs = search.toString();
  return soc2Fetch<ControlView[]>(`/api/controls${qs ? `?${qs}` : ''}`, {
    accessToken: params?.accessToken,
  });
}

export async function getControl(
  id: string,
  accessToken?: string,
): Promise<ControlView & { recentEvidence: EvidenceRecord[] }> {
  return soc2Fetch(`/api/controls/${id}`, { accessToken });
}

export async function getControlSummary(accessToken?: string): Promise<ControlSummary[]> {
  return soc2Fetch<ControlSummary[]>('/api/controls/summary', { accessToken });
}

// ══════════════════════════════════════════════════════════════════════════════
// Evidence
// ══════════════════════════════════════════════════════════════════════════════

export async function getEvidence(params?: {
  controlId?: string;
  collectorId?: string;
  category?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  accessToken?: string;
}): Promise<EvidenceListResponse> {
  const search = new URLSearchParams();
  if (params?.controlId) search.set('controlId', params.controlId);
  if (params?.collectorId) search.set('collectorId', params.collectorId);
  if (params?.category) search.set('category', params.category);
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.offset) search.set('offset', String(params.offset));
  const qs = search.toString();
  return soc2Fetch<EvidenceListResponse>(`/api/evidence${qs ? `?${qs}` : ''}`, {
    accessToken: params?.accessToken,
  });
}

export async function getEvidenceDownloadUrl(
  id: string,
  accessToken?: string,
): Promise<{ url: string }> {
  return soc2Fetch(`/api/evidence/${id}/download`, { accessToken });
}

// ══════════════════════════════════════════════════════════════════════════════
// Collectors
// ══════════════════════════════════════════════════════════════════════════════

export async function getCollectors(accessToken?: string): Promise<CollectorView[]> {
  return soc2Fetch<CollectorView[]>('/api/collectors', { accessToken });
}

export async function getCollectorRuns(
  collectorId: string,
  accessToken?: string,
): Promise<CollectionRunView[]> {
  return soc2Fetch<CollectionRunView[]>(`/api/collectors/${collectorId}/runs`, { accessToken });
}

export async function triggerCollector(
  collectorId: string,
  accessToken?: string,
): Promise<{ message: string }> {
  return soc2Fetch(`/api/collectors/${collectorId}/trigger`, {
    method: 'POST',
    accessToken,
  });
}

export async function triggerAllCollectors(accessToken?: string): Promise<{ message: string }> {
  return soc2Fetch('/api/collectors/trigger-all', {
    method: 'POST',
    accessToken,
  });
}

export async function updateCollectorSchedule(
  collectorId: string,
  update: { cronExpr?: string; enabled?: boolean },
  accessToken?: string,
): Promise<{ message: string }> {
  return soc2Fetch(`/api/collectors/${collectorId}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify(update),
    accessToken,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Audit Packages
// ══════════════════════════════════════════════════════════════════════════════

export async function createAuditPackage(
  request: CreatePackageRequest,
  accessToken?: string,
): Promise<AuditPackageView> {
  return soc2Fetch('/api/packages', {
    method: 'POST',
    body: JSON.stringify(request),
    accessToken,
  });
}

export async function getAuditPackages(accessToken?: string): Promise<AuditPackageView[]> {
  return soc2Fetch<AuditPackageView[]>('/api/packages', { accessToken });
}

export async function getAuditPackageDownloadUrl(
  id: string,
  accessToken?: string,
): Promise<{ url: string }> {
  return soc2Fetch(`/api/packages/${id}/download`, { accessToken });
}
