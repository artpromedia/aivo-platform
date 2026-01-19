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
// ROUTES
// ════════════════════════════════════════════════════════════════════════════════

interface AdminStatsRoutesOptions {
  pool: Pool;
}

// ════════════════════════════════════════════════════════════════════════════════
// DATABASE QUERY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

async function getAiCallLogStats(pool: Pool, from: string, to: string): Promise<AiCallLogStats> {
  const fromDate = `${from}T00:00:00Z`;
  const toDate = `${to}T23:59:59Z`;

  // Get total calls and timing stats
  const basicStatsResult = await pool.query<{
    total_calls: string;
    avg_latency_ms: string;
    p95_latency_ms: string;
    avg_cost_cents: string;
    total_cost_cents: string;
  }>(`
    SELECT 
      COUNT(*)::text as total_calls,
      COALESCE(AVG(latency_ms), 0)::text as avg_latency_ms,
      COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::text as p95_latency_ms,
      COALESCE(AVG(cost_cents_estimate), 0)::text as avg_cost_cents,
      COALESCE(SUM(cost_cents_estimate), 0)::text as total_cost_cents
    FROM ai_call_logs 
    WHERE created_at BETWEEN $1 AND $2
  `, [fromDate, toDate]);

  // Get calls by agent type
  const agentTypeResult = await pool.query<{ agent_type: string; count: string }>(`
    SELECT agent_type, COUNT(*)::text as count
    FROM ai_call_logs
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY agent_type
  `, [fromDate, toDate]);

  // Get safety distribution
  const safetyResult = await pool.query<{ safety_label: string; count: string }>(`
    SELECT COALESCE(safety_label, 'SAFE') as safety_label, COUNT(*)::text as count
    FROM ai_call_logs
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY safety_label
  `, [fromDate, toDate]);

  // Get calls by provider
  const providerResult = await pool.query<{ provider: string; count: string }>(`
    SELECT provider, COUNT(*)::text as count
    FROM ai_call_logs
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY provider
  `, [fromDate, toDate]);

  // Get calls by status
  const statusResult = await pool.query<{ status: string; count: string }>(`
    SELECT status, COUNT(*)::text as count
    FROM ai_call_logs
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY status
  `, [fromDate, toDate]);

  const basicStats = basicStatsResult.rows[0] || {
    total_calls: '0',
    avg_latency_ms: '0',
    p95_latency_ms: '0',
    avg_cost_cents: '0',
    total_cost_cents: '0',
  };

  const callsByAgentType: Record<string, number> = {};
  for (const row of agentTypeResult.rows) {
    callsByAgentType[row.agent_type] = Number.parseInt(row.count, 10);
  }

  const safetyDistribution: Record<string, number> = {
    SAFE: 0, LOW: 0, MEDIUM: 0, HIGH: 0,
  };
  for (const row of safetyResult.rows) {
    safetyDistribution[row.safety_label] = Number.parseInt(row.count, 10);
  }

  const callsByProvider: Record<string, number> = {};
  for (const row of providerResult.rows) {
    callsByProvider[row.provider] = Number.parseInt(row.count, 10);
  }

  const callsByStatus: { SUCCESS: number; ERROR: number } = { SUCCESS: 0, ERROR: 0 };
  for (const row of statusResult.rows) {
    if (row.status === 'SUCCESS' || row.status === 'ERROR') {
      callsByStatus[row.status] = Number.parseInt(row.count, 10);
    }
  }

  return {
    totalCalls: Number.parseInt(basicStats.total_calls, 10),
    callsByAgentType,
    safetyDistribution: safetyDistribution as Record<(typeof SAFETY_LABELS)[number], number>,
    avgLatencyMs: Math.round(parseFloat(basicStats.avg_latency_ms)),
    p95LatencyMs: Math.round(parseFloat(basicStats.p95_latency_ms)),
    avgCostCentsPerCall: parseFloat(basicStats.avg_cost_cents),
    totalCostCents: parseFloat(basicStats.total_cost_cents),
    callsByProvider,
    callsByStatus,
    periodStart: from,
    periodEnd: to,
  };
}

async function getIncidentStats(pool: Pool, from: string, to: string): Promise<AiIncidentStats> {
  const fromDate = `${from}T00:00:00Z`;
  const toDate = `${to}T23:59:59Z`;

  // Get total incidents
  const totalResult = await pool.query<{ count: string }>(`
    SELECT COUNT(*)::text as count
    FROM ai_incidents
    WHERE created_at BETWEEN $1 AND $2
  `, [fromDate, toDate]);

  // Get counts by severity
  const severityResult = await pool.query<{ severity: string; count: string }>(`
    SELECT severity, COUNT(*)::text as count
    FROM ai_incidents
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY severity
  `, [fromDate, toDate]);

  // Get counts by category
  const categoryResult = await pool.query<{ category: string; count: string }>(`
    SELECT category, COUNT(*)::text as count
    FROM ai_incidents
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY category
  `, [fromDate, toDate]);

  // Get counts by status
  const statusResult = await pool.query<{ status: string; count: string }>(`
    SELECT status, COUNT(*)::text as count
    FROM ai_incidents
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY status
  `, [fromDate, toDate]);

  // Get open incidents by severity
  const openSeverityResult = await pool.query<{ severity: string; count: string }>(`
    SELECT severity, COUNT(*)::text as count
    FROM ai_incidents
    WHERE status = 'OPEN'
    GROUP BY severity
  `);

  // Get top tenants by incident count
  const topTenantsResult = await pool.query<{ tenant_id: string; count: string }>(`
    SELECT tenant_id, COUNT(*)::text as count
    FROM ai_incidents
    WHERE created_at BETWEEN $1 AND $2
    GROUP BY tenant_id
    ORDER BY count DESC
    LIMIT 5
  `, [fromDate, toDate]);

  const incidentCountsBySeverity: Record<string, number> = {
    INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0,
  };
  for (const row of severityResult.rows) {
    incidentCountsBySeverity[row.severity] = Number.parseInt(row.count, 10);
  }

  const incidentCountsByCategory: Record<string, number> = {
    SAFETY: 0, PRIVACY: 0, COMPLIANCE: 0, PERFORMANCE: 0, COST: 0,
  };
  for (const row of categoryResult.rows) {
    incidentCountsByCategory[row.category] = Number.parseInt(row.count, 10);
  }

  const incidentCountsByStatus: Record<string, number> = {
    OPEN: 0, INVESTIGATING: 0, RESOLVED: 0, DISMISSED: 0,
  };
  for (const row of statusResult.rows) {
    incidentCountsByStatus[row.status] = Number.parseInt(row.count, 10);
  }

  const openIncidentsBySeverity: Record<string, number> = {
    INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0,
  };
  for (const row of openSeverityResult.rows) {
    openIncidentsBySeverity[row.severity] = Number.parseInt(row.count, 10);
  }

  const topTenantsByIncidentCount: TenantIncidentCount[] = topTenantsResult.rows.map((row) => ({
    tenantId: row.tenant_id,
    tenantName: `Tenant ${row.tenant_id.substring(0, 8)}`, // Placeholder - would need tenant-svc lookup
    incidentCount: Number.parseInt(row.count, 10),
  }));

  return {
    totalIncidents: Number.parseInt(totalResult.rows[0]?.count || '0', 10),
    incidentCountsBySeverity: incidentCountsBySeverity as Record<(typeof INCIDENT_SEVERITIES)[number], number>,
    incidentCountsByCategory: incidentCountsByCategory as Record<(typeof INCIDENT_CATEGORIES)[number], number>,
    incidentCountsByStatus: incidentCountsByStatus as Record<(typeof INCIDENT_STATUSES)[number], number>,
    openIncidentsBySeverity: openIncidentsBySeverity as Record<(typeof INCIDENT_SEVERITIES)[number], number>,
    topTenantsByIncidentCount,
    periodStart: from,
    periodEnd: to,
  };
}

async function getDsrStats(pool: Pool, from: string, to: string): Promise<DsrStats> {
  const fromDate = `${from}T00:00:00Z`;
  const toDate = `${to}T23:59:59Z`;

  // Note: DSR requests may be in a different database/service (dsr-svc)
  // This query assumes a dsr_requests table exists in this database
  // If not, this will return empty results which is acceptable
  
  try {
    // Get total requests
    const totalResult = await pool.query<{ count: string }>(`
      SELECT COUNT(*)::text as count
      FROM dsr_requests
      WHERE created_at BETWEEN $1 AND $2
    `, [fromDate, toDate]);

    // Get counts by type
    const typeResult = await pool.query<{ request_type: string; count: string }>(`
      SELECT request_type, COUNT(*)::text as count
      FROM dsr_requests
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY request_type
    `, [fromDate, toDate]);

    // Get counts by status
    const statusResult = await pool.query<{ status: string; count: string }>(`
      SELECT status, COUNT(*)::text as count
      FROM dsr_requests
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY status
    `, [fromDate, toDate]);

    // Get recent requests
    const recentResult = await pool.query<{
      id: string;
      tenant_id: string;
      request_type: string;
      status: string;
      learner_id: string;
      created_at: Date;
      completed_at: Date | null;
    }>(`
      SELECT id, tenant_id, request_type, status, learner_id, created_at, completed_at
      FROM dsr_requests
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at DESC
      LIMIT 10
    `, [fromDate, toDate]);

    const countsByType: Record<string, number> = {};
    for (const row of typeResult.rows) {
      countsByType[row.request_type] = Number.parseInt(row.count, 10);
    }

    const countsByStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      countsByStatus[row.status] = Number.parseInt(row.count, 10);
    }

    const recentRequests = recentResult.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: `Tenant ${row.tenant_id.substring(0, 8)}`,
      requestType: row.request_type,
      status: row.status,
      learnerId: row.learner_id,
      createdAt: row.created_at.toISOString(),
      completedAt: row.completed_at?.toISOString() || null,
    }));

    return {
      totalRequests: Number.parseInt(totalResult.rows[0]?.count || '0', 10),
      countsByType,
      countsByStatus,
      recentRequests,
      periodStart: from,
      periodEnd: to,
    };
  } catch {
    // Table may not exist - return empty stats
    return {
      totalRequests: 0,
      countsByType: {},
      countsByStatus: {},
      recentRequests: [],
      periodStart: from,
      periodEnd: to,
    };
  }
}

async function getPolicySummary(pool: Pool): Promise<ActivePolicySummary> {
  try {
    // Get global policy
    const globalResult = await pool.query<{
      id: string;
      name: string;
      version: number;
      updated_at: Date;
    }>(`
      SELECT id, name, version, updated_at
      FROM policy_documents
      WHERE scope_type = 'GLOBAL' AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    // Get tenant override count
    const overrideResult = await pool.query<{ count: string }>(`
      SELECT COUNT(*)::text as count
      FROM policy_documents
      WHERE scope_type = 'TENANT' AND is_active = true
    `);

    const globalRow = globalResult.rows[0];
    return {
      globalPolicy: globalRow
        ? {
            id: globalRow.id,
            name: globalRow.name,
            version: globalRow.version,
            updatedAt: globalRow.updated_at.toISOString(),
          }
        : null,
      tenantOverrideCount: Number.parseInt(overrideResult.rows[0]?.count || '0', 10),
    };
  } catch {
    // Table may not exist - return empty summary
    return {
      globalPolicy: null,
      tenantOverrideCount: 0,
    };
  }
}

export const registerAdminStatsRoutes: FastifyPluginAsync<AdminStatsRoutesOptions> = async (
  fastify: FastifyInstance,
  opts
) => {
  const { pool } = opts;

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
    const stats = await getAiCallLogStats(pool, from, to);
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
    const stats = await getIncidentStats(pool, from, to);
    reply.code(200).send(stats);
  });

  /**
   * GET /admin/policies/active-summary
   *
   * Returns a summary of active policies (global + tenant override count).
   */
  fastify.get('/admin/policies/active-summary', async (_request, reply) => {
    const summary = await getPolicySummary(pool);
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

    // Execute all queries in parallel for efficiency
    const [aiStats, incidentStats, dsrStats, policyStatus] = await Promise.all([
      getAiCallLogStats(pool, from, to),
      getIncidentStats(pool, from, to),
      getDsrStats(pool, from, to),
      getPolicySummary(pool),
    ]);

    const report: ComplianceReport = {
      generatedAt: new Date().toISOString(),
      periodStart: from,
      periodEnd: to,
      aiStats,
      incidentStats,
      dsrStats,
      policyStatus,
    };

    reply.code(200).send(report);
  });
};
