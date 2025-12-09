/**
 * Compliance API Client
 *
 * Client functions for fetching compliance dashboard stats.
 * Server-side only (uses internal service URLs).
 */

import type {
  AiCallLogStats,
  AiIncidentStats,
  ComplianceReport,
  DateRange,
  DsrStats,
  ActivePolicySummary,
} from './compliance-types';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const AI_ORCHESTRATOR_URL = process.env.AI_ORCHESTRATOR_URL ?? 'http://localhost:4010';
const DSR_SVC_URL = process.env.DSR_SVC_URL ?? 'http://localhost:4020';

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
// AI CALL LOG STATS
// ══════════════════════════════════════════════════════════════════════════════

export async function getAiCallLogStats(
  accessToken: string,
  dateRange: DateRange
): Promise<AiCallLogStats> {
  const params = new URLSearchParams({
    from: dateRange.from,
    to: dateRange.to,
  });
  return apiFetch<AiCallLogStats>(
    AI_ORCHESTRATOR_URL,
    `/admin/ai/call-logs/stats?${params.toString()}`,
    { accessToken }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INCIDENT STATS
// ══════════════════════════════════════════════════════════════════════════════

export async function getAiIncidentStats(
  accessToken: string,
  dateRange: DateRange
): Promise<AiIncidentStats> {
  const params = new URLSearchParams({
    from: dateRange.from,
    to: dateRange.to,
  });
  return apiFetch<AiIncidentStats>(
    AI_ORCHESTRATOR_URL,
    `/admin/ai/incidents/stats?${params.toString()}`,
    { accessToken }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DSR STATS
// ══════════════════════════════════════════════════════════════════════════════

export async function getDsrStats(accessToken: string, dateRange: DateRange): Promise<DsrStats> {
  const params = new URLSearchParams({
    from: dateRange.from,
    to: dateRange.to,
  });
  return apiFetch<DsrStats>(DSR_SVC_URL, `/admin/dsr/stats?${params.toString()}`, { accessToken });
}

// ══════════════════════════════════════════════════════════════════════════════
// POLICY STATUS
// ══════════════════════════════════════════════════════════════════════════════

export async function getActivePolicySummary(accessToken: string): Promise<ActivePolicySummary> {
  return apiFetch<ActivePolicySummary>(AI_ORCHESTRATOR_URL, '/admin/policies/active-summary', {
    accessToken,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// FULL COMPLIANCE REPORT
// ══════════════════════════════════════════════════════════════════════════════

export async function getComplianceReport(
  accessToken: string,
  dateRange: DateRange
): Promise<ComplianceReport> {
  const params = new URLSearchParams({
    from: dateRange.from,
    to: dateRange.to,
  });
  return apiFetch<ComplianceReport>(
    AI_ORCHESTRATOR_URL,
    `/admin/compliance/report?${params.toString()}`,
    { accessToken }
  );
}
