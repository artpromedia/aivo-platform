/**
 * Admin Stats Routes
 *
 * Provides aggregated statistics for AI call logs, incidents, and compliance reporting.
 * These endpoints are used by the Platform Admin dashboard.
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import type { SAFETY_LABELS, INCIDENT_SEVERITIES, INCIDENT_CATEGORIES, INCIDENT_STATUSES } from '../logging/types.js';

// ════════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════════════════

const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface AiCallLogStats {
  totalCalls: number;
  callsByAgentType: Record<string, number>;
  safetyDistribution: Record<(typeof SAFETY_LABELS)[number], number>;
  avgLatencyMs: number;
  p95LatencyMs: number;
  avgCostCentsPerCall: number;
  totalCostCents: number;
  callsByProvider: Record<string, number>;
  callsByStatus: { SUCCESS: number; ERROR: number };
  periodStart: string;
  periodEnd: string;
}

interface TenantIncidentCount {
  tenantId: string;
  tenantName: string;
  incidentCount: number;
}

interface AiIncidentStats {
  totalIncidents: number;
  incidentCountsBySeverity: Record<(typeof INCIDENT_SEVERITIES)[number], number>;
  incidentCountsByCategory: Record<(typeof INCIDENT_CATEGORIES)[number], number>;
  incidentCountsByStatus: Record<(typeof INCIDENT_STATUSES)[number], number>;
  openIncidentsBySeverity: Record<(typeof INCIDENT_SEVERITIES)[number], number>;
  topTenantsByIncidentCount: TenantIncidentCount[];
  periodStart: string;
  periodEnd: string;
}

interface ActivePolicySummary {
  globalPolicy: {
    id: string;
    name: string;
    version: number;
    updatedAt: string;
  } | null;
  tenantOverrideCount: number;
}

interface ComplianceReport {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  aiStats: AiCallLogStats;
  incidentStats: AiIncidentStats;
  dsrStats: DsrStats;
  policyStatus: ActivePolicySummary;
}

interface DsrStats {
  totalRequests: number;
  countsByType: Record<string, number>;
  countsByStatus: Record<string, number>;
  recentRequests: {
    id: string;
    tenantId: string;
    tenantName?: string;
    requestType: string;
    status: string;
    learnerId: string;
    createdAt: string;
    completedAt: string | null;
  }[];
  periodStart: string;
  periodEnd: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// MOCK DATA GENERATORS (TODO: Replace with real queries when tables exist)
// ════════════════════════════════════════════════════════════════════════════════

function generateMockAiCallLogStats(from: string, to: string): AiCallLogStats {
  // TODO: Replace with real database aggregation query
  // SELECT COUNT(*), AVG(latency_ms), PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms,
  // SUM(cost_cents_estimate), ... FROM ai_call_logs WHERE created_at BETWEEN $1 AND $2
  return {
    totalCalls: 15782,
    callsByAgentType: {
      BASELINE: 4521,
      HOMEWORK_HELPER: 6834,
      FOCUS_MONITOR: 2145,
      SAFETY_MONITOR: 1982,
      VIRTUAL_BRAIN: 300,
    },
    safetyDistribution: {
      SAFE: 14892,
      LOW: 612,
      MEDIUM: 245,
      HIGH: 33,
    },
    avgLatencyMs: 423,
    p95LatencyMs: 1250,
    avgCostCentsPerCall: 0.12,
    totalCostCents: 1893.84,
    callsByProvider: {
      OPENAI: 12543,
      ANTHROPIC: 3239,
    },
    callsByStatus: {
      SUCCESS: 15634,
      ERROR: 148,
    },
    periodStart: from,
    periodEnd: to,
  };
}

function generateMockIncidentStats(from: string, to: string): AiIncidentStats {
  // TODO: Replace with real database aggregation query
  // SELECT severity, COUNT(*) FROM ai_incidents WHERE created_at BETWEEN $1 AND $2 GROUP BY severity
  return {
    totalIncidents: 47,
    incidentCountsBySeverity: {
      INFO: 12,
      LOW: 18,
      MEDIUM: 11,
      HIGH: 5,
      CRITICAL: 1,
    },
    incidentCountsByCategory: {
      SAFETY: 23,
      PRIVACY: 8,
      COMPLIANCE: 6,
      PERFORMANCE: 7,
      COST: 3,
    },
    incidentCountsByStatus: {
      OPEN: 14,
      INVESTIGATING: 8,
      RESOLVED: 21,
      DISMISSED: 4,
    },
    openIncidentsBySeverity: {
      INFO: 3,
      LOW: 5,
      MEDIUM: 4,
      HIGH: 2,
      CRITICAL: 0,
    },
    topTenantsByIncidentCount: [
      { tenantId: 'tenant-001', tenantName: 'Springfield School District', incidentCount: 12 },
      { tenantId: 'tenant-002', tenantName: 'Riverdale Academy', incidentCount: 8 },
      { tenantId: 'tenant-003', tenantName: 'Hillcrest Charter', incidentCount: 7 },
      { tenantId: 'tenant-004', tenantName: 'Oakwood Elementary', incidentCount: 5 },
      { tenantId: 'tenant-005', tenantName: 'Maple Grove Schools', incidentCount: 4 },
    ],
    periodStart: from,
    periodEnd: to,
  };
}

function generateMockDsrStats(from: string, to: string): DsrStats {
  // TODO: Replace with real database aggregation query from dsr_requests table
  // SELECT request_type, COUNT(*) FROM dsr_requests WHERE created_at BETWEEN $1 AND $2 GROUP BY request_type
  return {
    totalRequests: 34,
    countsByType: {
      EXPORT: 28,
      DELETE: 6,
    },
    countsByStatus: {
      PENDING: 3,
      IN_PROGRESS: 2,
      COMPLETED: 26,
      REJECTED: 2,
      FAILED: 1,
    },
    recentRequests: [
      {
        id: 'dsr-001',
        tenantId: 'tenant-001',
        tenantName: 'Springfield School District',
        requestType: 'EXPORT',
        status: 'PENDING',
        learnerId: 'learner-abc',
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      {
        id: 'dsr-002',
        tenantId: 'tenant-002',
        tenantName: 'Riverdale Academy',
        requestType: 'DELETE',
        status: 'IN_PROGRESS',
        learnerId: 'learner-def',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: null,
      },
      {
        id: 'dsr-003',
        tenantId: 'tenant-001',
        tenantName: 'Springfield School District',
        requestType: 'EXPORT',
        status: 'COMPLETED',
        learnerId: 'learner-ghi',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        completedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    periodStart: from,
    periodEnd: to,
  };
}

function generateMockPolicySummary(): ActivePolicySummary {
  // TODO: Replace with real database query
  // SELECT * FROM policy_documents WHERE scope_type = 'GLOBAL' AND is_active = true
  // SELECT COUNT(*) FROM policy_documents WHERE scope_type = 'TENANT' AND is_active = true
  return {
    globalPolicy: {
      id: 'policy-global-001',
      name: 'Global Default Policy v1',
      version: 1,
      updatedAt: new Date(Date.now() - 604800000).toISOString(),
    },
    tenantOverrideCount: 3,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════════

interface AdminStatsRoutesOptions {
  pool: Pool;
}

export const registerAdminStatsRoutes: FastifyPluginAsync<AdminStatsRoutesOptions> = async (
  fastify: FastifyInstance,
  opts
) => {
  const { pool: _pool } = opts;

  /**
   * GET /admin/ai/call-logs/stats
   *
   * Returns aggregated statistics for AI call logs within a date range.
   */
  fastify.get('/admin/ai/call-logs/stats', async (request, reply) => {
    const parsed = dateRangeSchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid date range parameters', details: parsed.error.issues });
      return;
    }

    const { from, to } = parsed.data;

    // TODO: Implement real database query
    // For now, return mock data to enable frontend development
    const stats = generateMockAiCallLogStats(from, to);
    reply.code(200).send(stats);
  });

  /**
   * GET /admin/ai/incidents/stats
   *
   * Returns aggregated statistics for AI incidents within a date range.
   */
  fastify.get('/admin/ai/incidents/stats', async (request, reply) => {
    const parsed = dateRangeSchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid date range parameters', details: parsed.error.issues });
      return;
    }

    const { from, to } = parsed.data;

    // TODO: Implement real database query
    const stats = generateMockIncidentStats(from, to);
    reply.code(200).send(stats);
  });

  /**
   * GET /admin/policies/active-summary
   *
   * Returns a summary of active policies (global + tenant override count).
   */
  fastify.get('/admin/policies/active-summary', async (_request, reply) => {
    // TODO: Implement real database query
    const summary = generateMockPolicySummary();
    reply.code(200).send(summary);
  });

  /**
   * GET /admin/compliance/report
   *
   * Returns a full compliance report aggregating AI stats, incident stats,
   * DSR stats, and policy status. Used for export functionality.
   */
  fastify.get('/admin/compliance/report', async (request, reply) => {
    const parsed = dateRangeSchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid date range parameters', details: parsed.error.issues });
      return;
    }

    const { from, to } = parsed.data;

    // TODO: Implement real database queries for each section
    const report: ComplianceReport = {
      generatedAt: new Date().toISOString(),
      periodStart: from,
      periodEnd: to,
      aiStats: generateMockAiCallLogStats(from, to),
      incidentStats: generateMockIncidentStats(from, to),
      dsrStats: generateMockDsrStats(from, to),
      policyStatus: generateMockPolicySummary(),
    };

    reply.code(200).send(report);
  });
};
