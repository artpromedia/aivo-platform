/**
 * DSR (Data Subject Rights) API Client for Parent Portal
 * Handles GDPR data export and deletion requests
 */

import { api } from './api';

const DSR_API_URL = process.env.NEXT_PUBLIC_DSR_API_URL || '/api/dsr';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type DsrRequestType = 'EXPORT' | 'DELETE';
export type DsrRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'GRACE_PERIOD' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface DsrRequestSummary {
  id: string;
  request_type: DsrRequestType;
  status: DsrRequestStatus;
  learner_id: string;
  learner_name: string | null;
  created_at: string;
  grace_period_ends_at: string | null;
  scheduled_deletion_at: string | null;
  grace_period_days_remaining: number | null;
  can_cancel: boolean;
  download_url: string | null;
  download_expires_at: string | null;
}

export interface DsrCreateResponse {
  request_id: string;
  request_type: DsrRequestType;
  status: DsrRequestStatus;
  message: string;
  grace_period_info?: {
    grace_period_ends_at: string;
    scheduled_deletion_at: string;
    cancellation_deadline: string;
  };
}

export interface DsrRequestDetails {
  id: string;
  request_type: DsrRequestType;
  status: DsrRequestStatus;
  learner_id: string;
  reason: string | null;
  created_at: string;
  completed_at: string | null;
  grace_period_ends_at: string | null;
  scheduled_deletion_at: string | null;
  grace_period_days_remaining: number | null;
  can_cancel: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface DsrAuditEntry {
  action: string;
  timestamp: string;
}

export interface DsrExportBundle {
  exportedAt: string;
  learnerId: string;
  profile: Record<string, unknown>;
  learningHistory: Record<string, unknown>[];
  assessments: Record<string, unknown>[];
  achievements: Record<string, unknown>[];
  consents: Record<string, unknown>[];
}

export interface RateLimitStatus {
  allowed: boolean;
  requests_today: number;
  max_requests_per_day: number;
  reset_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * List all DSR requests for the current user
 */
export async function listDsrRequests(): Promise<DsrRequestSummary[]> {
  const response = await api.get<{ requests: DsrRequestSummary[] }>(`${DSR_API_URL}/v2/dsr/requests`);
  return response.requests;
}

/**
 * Get details of a specific DSR request
 */
export async function getDsrRequest(requestId: string): Promise<{
  request: DsrRequestDetails;
  audit_trail: DsrAuditEntry[];
  export?: DsrExportBundle;
}> {
  return api.get(`${DSR_API_URL}/v2/dsr/requests/${requestId}`);
}

/**
 * Create an EXPORT request (data portability)
 */
export async function createExportRequest(learnerId: string, reason?: string): Promise<DsrCreateResponse & { export?: DsrExportBundle }> {
  return api.post(`${DSR_API_URL}/v2/dsr/export`, {
    learnerId,
    reason,
  });
}

/**
 * Create a DELETE request (right to erasure)
 * Requires acknowledgement of 30-day grace period
 */
export async function createDeleteRequest(
  learnerId: string,
  acknowledgeGracePeriod: boolean,
  reason?: string
): Promise<DsrCreateResponse> {
  return api.post(`${DSR_API_URL}/v2/dsr/delete`, {
    learnerId,
    acknowledgeGracePeriod,
    reason,
  });
}

/**
 * Cancel a deletion request during grace period
 */
export async function cancelDeleteRequest(requestId: string, reason?: string): Promise<{
  message: string;
  request: { id: string; status: string; cancelled_at: string };
}> {
  return api.post(`${DSR_API_URL}/v2/dsr/requests/${requestId}/cancel`, { reason });
}

/**
 * Download export data and track the download
 */
export async function downloadExportData(requestId: string): Promise<DsrExportBundle> {
  return api.get(`${DSR_API_URL}/v2/dsr/requests/${requestId}/download`);
}

/**
 * Check current rate limit status
 */
export async function checkRateLimits(): Promise<{
  export: RateLimitStatus;
  delete: RateLimitStatus;
}> {
  return api.get(`${DSR_API_URL}/v2/dsr/rate-limit`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format grace period days remaining for display
 */
export function formatGracePeriod(days: number | null): string {
  if (days === null) return '';
  if (days <= 0) return 'Deletion scheduled';
  if (days === 1) return '1 day remaining';
  return `${days} days remaining`;
}

/**
 * Check if a request can still be cancelled
 */
export function canCancelRequest(request: DsrRequestSummary | DsrRequestDetails): boolean {
  return (
    request.status === 'GRACE_PERIOD' &&
    request.grace_period_ends_at !== null &&
    new Date(request.grace_period_ends_at) > new Date()
  );
}

/**
 * Get status badge color for display
 */
export function getStatusColor(status: DsrRequestStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'green';
    case 'GRACE_PERIOD':
      return 'yellow';
    case 'IN_PROGRESS':
    case 'PENDING':
      return 'blue';
    case 'FAILED':
      return 'red';
    case 'CANCELLED':
      return 'gray';
    default:
      return 'gray';
  }
}
