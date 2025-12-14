/**
 * AI Incident Service
 *
 * Enhanced incident logging and management for safety events.
 * Extends the existing logging infrastructure with:
 * - New incident categories (SELF_HARM, DIAGNOSIS_ATTEMPT, etc.)
 * - Admin review workflow
 * - Incident aggregation for recurring issues
 */

import { randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

import type {
  AiAgentType,
  IncidentCategory,
  IncidentInput,
  IncidentSeverity,
} from '../types/aiRequest.js';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface AiIncidentRecord {
  id: string;
  tenantId: string;
  learnerId?: string;
  userId?: string;
  agentType: AiAgentType;
  severity: IncidentSeverity;
  category: IncidentCategory;
  inputSummary: string;
  outputSummary?: string;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedByUserId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
}

export interface IncidentFilters {
  tenantId?: string;
  severity?: IncidentSeverity;
  category?: IncidentCategory;
  status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  from?: Date;
  to?: Date;
  learnerId?: string;
  agentType?: AiAgentType;
}

export interface IncidentListResult {
  incidents: AiIncidentRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReviewIncidentInput {
  incidentId: string;
  reviewedByUserId: string;
  status: 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  notes?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// INCIDENT SERVICE
// ────────────────────────────────────────────────────────────────────────────

/**
 * AI Incident Service - Manages safety incidents.
 */
export class AiIncidentService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Log a new AI incident.
   *
   * @param incident - Incident data to log
   * @returns Created incident record
   */
  async logIncident(incident: IncidentInput): Promise<AiIncidentRecord> {
    const id = randomUUID();
    const now = new Date();

    const query = `
      INSERT INTO ai_incidents (
        id, tenant_id, severity, category, status,
        title, description,
        first_seen_at, last_seen_at, occurrence_count,
        created_by_system, metadata_json,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'OPEN',
        $5, $6,
        $7, $7, 1,
        TRUE, $8,
        $7, $7
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING *
    `;

    const title = generateIncidentTitle(incident);
    const description = generateIncidentDescription(incident);

    const result = await this.pool.query(query, [
      id,
      incident.tenantId,
      incident.severity,
      mapCategoryToDb(incident.category),
      title,
      description,
      now,
      JSON.stringify({
        ...incident.metadata,
        learnerId: incident.learnerId,
        userId: incident.userId,
        agentType: incident.agentType,
        inputSummary: incident.inputSummary,
        outputSummary: incident.outputSummary,
      }),
    ]);

    const row = result.rows[0];

    // Emit event for real-time notifications (future: NATS integration)
    this.emitIncidentCreated(id, incident);

    return mapRowToIncident(row);
  }

  /**
   * Find similar open incident for aggregation.
   * Used to group repeated similar incidents.
   */
  async findSimilarOpenIncident(
    tenantId: string,
    category: IncidentCategory,
    agentType: AiAgentType,
    windowHours = 24
  ): Promise<AiIncidentRecord | null> {
    const query = `
      SELECT * FROM ai_incidents
      WHERE tenant_id = $1
        AND category = $2
        AND status = 'OPEN'
        AND metadata_json->>'agentType' = $3
        AND created_at > NOW() - INTERVAL '${windowHours} hours'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [tenantId, mapCategoryToDb(category), agentType]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToIncident(result.rows[0]);
  }

  /**
   * Increment occurrence count for an existing incident.
   */
  async incrementIncidentOccurrence(incidentId: string): Promise<void> {
    const query = `
      UPDATE ai_incidents
      SET 
        occurrence_count = occurrence_count + 1,
        last_seen_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `;

    await this.pool.query(query, [incidentId]);
  }

  /**
   * Get incidents with filtering and pagination.
   */
  async listIncidents(
    filters: IncidentFilters,
    page = 1,
    pageSize = 50
  ): Promise<IncidentListResult> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(filters.tenantId);
    }

    if (filters.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(filters.severity);
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(mapCategoryToDb(filters.category));
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.from) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.from);
    }

    if (filters.to) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.to);
    }

    if (filters.learnerId) {
      conditions.push(`metadata_json->>'learnerId' = $${paramIndex++}`);
      params.push(filters.learnerId);
    }

    if (filters.agentType) {
      conditions.push(`metadata_json->>'agentType' = $${paramIndex++}`);
      params.push(filters.agentType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ai_incidents ${whereClause}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM ai_incidents
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataResult = await this.pool.query(dataQuery, [...params, pageSize, offset]);

    return {
      incidents: dataResult.rows.map(mapRowToIncident),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get a single incident by ID.
   */
  async getIncident(incidentId: string): Promise<AiIncidentRecord | null> {
    const query = `SELECT * FROM ai_incidents WHERE id = $1`;
    const result = await this.pool.query(query, [incidentId]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToIncident(result.rows[0]);
  }

  /**
   * Mark an incident as reviewed.
   */
  async reviewIncident(input: ReviewIncidentInput): Promise<AiIncidentRecord | null> {
    const query = `
      UPDATE ai_incidents
      SET 
        status = $2,
        resolved_at = CASE WHEN $2 IN ('RESOLVED', 'DISMISSED') THEN NOW() ELSE NULL END,
        resolved_by_user_id = $3,
        resolution_notes = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      input.incidentId,
      input.status,
      input.reviewedByUserId,
      input.notes ?? null,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToIncident(result.rows[0]);
  }

  /**
   * Get summary statistics for incidents.
   */
  async getIncidentStats(
    tenantId?: string,
    from?: Date,
    to?: Date
  ): Promise<{
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    total: number;
  }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(tenantId);
    }

    if (from) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(from);
    }

    if (to) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        COUNT(*) as total,
        severity,
        category,
        status
      FROM ai_incidents
      ${whereClause}
      GROUP BY severity, category, status
    `;

    const result = await this.pool.query(query, params);

    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let total = 0;

    for (const row of result.rows) {
      const count = parseInt(row.total, 10);
      total += count;

      bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + count;
      byCategory[row.category] = (byCategory[row.category] ?? 0) + count;
      byStatus[row.status] = (byStatus[row.status] ?? 0) + count;
    }

    return { bySeverity, byCategory, byStatus, total };
  }

  /**
   * Emit incident created event (stub for future NATS integration).
   */
  private emitIncidentCreated(incidentId: string, incident: IncidentInput): void {
    // TODO: Emit to NATS JetStream
    console.log(
      JSON.stringify({
        event: 'AIIncidentCreated',
        incidentId,
        tenantId: incident.tenantId,
        severity: incident.severity,
        category: incident.category,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Map our incident category to DB enum.
 */
function mapCategoryToDb(category: IncidentCategory): string {
  const mapping: Record<IncidentCategory, string> = {
    SELF_HARM: 'SAFETY',
    DIAGNOSIS_ATTEMPT: 'COMPLIANCE',
    EXPLICIT_CONTENT: 'SAFETY',
    HOMEWORK_ANSWER_BLOCKED: 'COMPLIANCE',
    PII_DETECTED: 'PRIVACY',
    ABUSE_DETECTED: 'SAFETY',
    VIOLENCE_DETECTED: 'SAFETY',
    AI_FAILURE: 'PERFORMANCE',
    COST_ANOMALY: 'COST',
    LATENCY_ANOMALY: 'PERFORMANCE',
    OTHER: 'SAFETY',
  };

  return mapping[category] ?? 'SAFETY';
}

/**
 * Generate incident title from input.
 */
function generateIncidentTitle(incident: IncidentInput): string {
  const titleMap: Record<string, string> = {
    SELF_HARM: 'Self-harm content detected',
    DIAGNOSIS_ATTEMPT: 'Diagnosis attempt detected',
    EXPLICIT_CONTENT: 'Explicit content detected',
    HOMEWORK_ANSWER_BLOCKED: 'Direct homework answer blocked',
    PII_DETECTED: 'PII detected in input',
    ABUSE_DETECTED: 'Potential abuse disclosure',
    VIOLENCE_DETECTED: 'Violence-related content detected',
    AI_FAILURE: 'AI provider failure',
    COST_ANOMALY: 'Unusual cost detected',
    LATENCY_ANOMALY: 'High latency detected',
    OTHER: 'Safety event detected',
  };

  return `[${incident.agentType}] ${titleMap[incident.category] ?? 'Safety event'}`;
}

/**
 * Generate incident description from input.
 */
function generateIncidentDescription(incident: IncidentInput): string {
  const parts: string[] = [];

  parts.push(`Category: ${incident.category}`);
  parts.push(`Severity: ${incident.severity}`);
  parts.push(`Agent: ${incident.agentType}`);

  if (incident.learnerId) {
    parts.push(`Learner ID: ${incident.learnerId}`);
  }

  parts.push(`Input summary: ${incident.inputSummary}`);

  if (incident.outputSummary) {
    parts.push(`Output summary: ${incident.outputSummary}`);
  }

  return parts.join('\n');
}

/**
 * Map database row to incident record.
 */
function mapRowToIncident(row: Record<string, unknown>): AiIncidentRecord {
  const metadata = (row.metadata_json as Record<string, unknown>) ?? {};

  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    learnerId: metadata.learnerId as string | undefined,
    userId: metadata.userId as string | undefined,
    agentType: (metadata.agentType as AiAgentType) ?? 'OTHER',
    severity: row.severity as IncidentSeverity,
    category: mapDbCategoryToIncident(row.category as string),
    inputSummary: (metadata.inputSummary as string) ?? '',
    outputSummary: metadata.outputSummary as string | undefined,
    createdAt: new Date(row.created_at as string),
    reviewedAt: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
    reviewedByUserId: row.resolved_by_user_id as string | undefined,
    notes: row.resolution_notes as string | undefined,
    metadata,
    status: row.status as 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED',
  };
}

/**
 * Map DB category back to our category type.
 */
function mapDbCategoryToIncident(dbCategory: string): IncidentCategory {
  // For now, we store in broader categories
  // The specific category is preserved in metadata
  return 'OTHER';
}

// ────────────────────────────────────────────────────────────────────────────
// FACTORY
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create an incident service instance.
 */
export function createIncidentService(pool: Pool): AiIncidentService {
  return new AiIncidentService(pool);
}
