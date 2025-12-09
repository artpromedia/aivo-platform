/**
 * Compliance Dashboard Types
 *
 * Types for AI usage stats, incident stats, DSR stats, and compliance reports.
 */

import type { IncidentCategory, IncidentSeverity, IncidentStatus, SafetyLabel } from './types';

// ══════════════════════════════════════════════════════════════════════════════
// AI CALL LOG STATS
// ══════════════════════════════════════════════════════════════════════════════

export interface AiCallLogStats {
  totalCalls: number;
  callsByAgentType: Record<string, number>;
  safetyDistribution: Record<SafetyLabel, number>;
  avgLatencyMs: number;
  p95LatencyMs: number;
  avgCostCentsPerCall: number;
  totalCostCents: number;
  callsByProvider: Record<string, number>;
  callsByStatus: { SUCCESS: number; ERROR: number };
  periodStart: string;
  periodEnd: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INCIDENT STATS
// ══════════════════════════════════════════════════════════════════════════════

export interface TenantIncidentCount {
  tenantId: string;
  tenantName: string;
  incidentCount: number;
}

export interface AiIncidentStats {
  totalIncidents: number;
  incidentCountsBySeverity: Record<IncidentSeverity, number>;
  incidentCountsByCategory: Record<IncidentCategory, number>;
  incidentCountsByStatus: Record<IncidentStatus, number>;
  openIncidentsBySeverity: Record<IncidentSeverity, number>;
  topTenantsByIncidentCount: TenantIncidentCount[];
  periodStart: string;
  periodEnd: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// DSR STATS
// ══════════════════════════════════════════════════════════════════════════════

export type DsrRequestType = 'EXPORT' | 'DELETE';
export type DsrRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'FAILED';

export interface DsrStats {
  totalRequests: number;
  countsByType: Partial<Record<DsrRequestType, number>>;
  countsByStatus: Partial<Record<DsrRequestStatus, number>>;
  recentRequests: DsrRequestSummary[];
  periodStart: string;
  periodEnd: string;
}

export interface DsrRequestSummary {
  id: string;
  tenantId: string;
  tenantName?: string;
  requestType: DsrRequestType;
  status: DsrRequestStatus;
  learnerId: string;
  createdAt: string;
  completedAt: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// POLICY STATS
// ══════════════════════════════════════════════════════════════════════════════

export interface ActivePolicySummary {
  globalPolicy: {
    id: string;
    name: string;
    version: number;
    updatedAt: string;
  } | null;
  tenantOverrideCount: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE REPORT (aggregated)
// ══════════════════════════════════════════════════════════════════════════════

export interface ComplianceReport {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  aiStats: AiCallLogStats;
  incidentStats: AiIncidentStats;
  dsrStats: DsrStats;
  policyStatus: ActivePolicySummary;
}

// ══════════════════════════════════════════════════════════════════════════════
// DATE RANGE FILTER
// ══════════════════════════════════════════════════════════════════════════════

export type DateRangePreset = '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  from: string; // ISO date string
  to: string; // ISO date string
}

export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  const toDate = now.toISOString().split('T')[0] ?? '';
  let from: string;

  switch (preset) {
    case '7d':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '';
      break;
    case '30d':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '';
      break;
    case '90d':
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '';
      break;
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '';
  }

  return { from, to: toDate };
}
