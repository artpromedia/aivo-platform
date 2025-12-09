import { randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

import type { AiLoggingConfig } from './config.js';
import type {
  AiIncident,
  CreateIncidentInput,
  IncidentCategory,
  IncidentSeverity,
  LinkCallToIncidentInput,
  LinkReason,
  LogAiCallInput,
} from './types.js';

/**
 * AI Call Logger - Persists AI call logs and incidents to PostgreSQL.
 *
 * Design principles:
 * - Fire-and-forget async writes (configurable) - don't block the critical path
 * - Graceful error handling - log errors but don't fail user requests
 * - Multi-tenant isolation - all queries include tenant_id
 *
 * For high-throughput scenarios, consider:
 * - Batching writes (collect logs in memory, flush periodically)
 * - Using a queue (Redis, SQS) for decoupled async processing
 * - Connection pooling via PgBouncer
 */
export class AiCallLogger {
  private pool: Pool;
  private config: AiLoggingConfig;

  constructor(pool: Pool, config: AiLoggingConfig) {
    this.pool = pool;
    this.config = config;
  }

  /**
   * Log an AI call to the database.
   *
   * @param input - AI call data to log
   * @returns The newly created log ID, or null on error
   *
   * Performance note: By default this runs async (fire-and-forget).
   * Set config.logging.asyncWrites = false for synchronous writes.
   */
  async logAiCall(input: LogAiCallInput): Promise<string | null> {
    if (!this.config.logging.enabled) {
      return null;
    }

    const id = randomUUID();
    const maxLen = this.config.logging.maxSummaryLength;

    try {
      await this.pool.query(
        `INSERT INTO ai_call_logs (
          id, tenant_id, agent_type, model_name, provider, version, request_id,
          started_at, completed_at, latency_ms,
          tokens_prompt, tokens_completion, estimated_cost_usd,
          safety_status, status, error_code, error_message,
          user_id, learner_id, session_id, use_case,
          prompt_summary, response_summary,
          safety_label, safety_metadata_json, cost_cents_estimate
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20, $21,
          $22, $23,
          $24, $25, $26
        )`,
        [
          id,
          input.tenantId,
          input.agentType,
          input.modelName,
          input.provider,
          input.version,
          input.requestId,
          input.startedAt,
          input.completedAt,
          input.latencyMs,
          input.inputTokens,
          input.outputTokens,
          input.costCentsEstimate / 100, // Convert cents to USD for existing column
          mapSafetyLabelToStatus(input.safetyLabel),
          input.status,
          input.errorCode ?? null,
          input.errorMessage ?? null,
          input.userId ?? null,
          input.learnerId ?? null,
          input.sessionId ?? null,
          input.useCase ?? null,
          truncate(input.promptSummary, maxLen),
          truncate(input.responseSummary, maxLen),
          input.safetyLabel,
          JSON.stringify(input.safetyMetadata ?? {}),
          input.costCentsEstimate,
        ]
      );

      return id;
    } catch (err) {
      console.error('[AiCallLogger] Failed to insert ai_call_logs row:', err);
      return null;
    }
  }

  /**
   * Create a new incident.
   *
   * @param input - Incident data
   * @returns The newly created incident, or null on error
   */
  async createIncident(input: CreateIncidentInput): Promise<AiIncident | null> {
    const id = randomUUID();
    const now = new Date();

    try {
      const result = await this.pool.query<AiIncidentRow>(
        `INSERT INTO ai_incidents (
          id, tenant_id, severity, category, status,
          title, description,
          first_seen_at, last_seen_at, occurrence_count,
          created_by_system, created_by_user_id,
          metadata_json, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'OPEN',
          $5, $6,
          $7, $7, 1,
          $8, $9,
          $10, $7, $7
        ) RETURNING *`,
        [
          id,
          input.tenantId,
          input.severity,
          input.category,
          input.title,
          input.description ?? null,
          now,
          input.createdBySystem ?? true,
          input.createdByUserId ?? null,
          JSON.stringify(input.metadataJson ?? {}),
        ]
      );

      return mapRowToIncident(result.rows[0]);
    } catch (err) {
      console.error('[AiCallLogger] Failed to create incident:', err);
      return null;
    }
  }

  /**
   * Find an open incident matching criteria within the aggregation window.
   *
   * @param tenantId - Tenant ID
   * @param category - Incident category
   * @param titlePattern - Optional title pattern to match (LIKE query)
   * @returns Matching incident or null
   */
  async findOpenIncident(
    tenantId: string,
    category: IncidentCategory,
    titlePattern?: string
  ): Promise<AiIncident | null> {
    const windowHours = this.config.incidents.aggregationWindowHours;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    try {
      let query = `
        SELECT * FROM ai_incidents
        WHERE tenant_id = $1
          AND category = $2
          AND status IN ('OPEN', 'INVESTIGATING')
          AND created_at >= $3
      `;
      const params: unknown[] = [tenantId, category, windowStart];

      if (titlePattern) {
        query += ` AND title LIKE $4`;
        params.push(`%${titlePattern}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT 1`;

      const result = await this.pool.query<AiIncidentRow>(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return mapRowToIncident(result.rows[0]);
    } catch (err) {
      console.error('[AiCallLogger] Failed to find open incident:', err);
      return null;
    }
  }

  /**
   * Update an incident's last_seen_at and increment occurrence_count.
   *
   * @param incidentId - Incident ID to update
   * @returns Updated incident or null on error
   */
  async updateIncidentOccurrence(incidentId: string): Promise<AiIncident | null> {
    const now = new Date();

    try {
      const result = await this.pool.query<AiIncidentRow>(
        `UPDATE ai_incidents
         SET last_seen_at = $1, occurrence_count = occurrence_count + 1, updated_at = $1
         WHERE id = $2
         RETURNING *`,
        [now, incidentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapRowToIncident(result.rows[0]);
    } catch (err) {
      console.error('[AiCallLogger] Failed to update incident occurrence:', err);
      return null;
    }
  }

  /**
   * Link an AI call log to an incident.
   *
   * @param input - Link data
   * @returns True if linked successfully, false otherwise
   */
  async linkCallToIncident(input: LinkCallToIncidentInput): Promise<boolean> {
    const id = randomUUID();

    try {
      await this.pool.query(
        `INSERT INTO ai_incident_ai_calls (id, incident_id, ai_call_log_id, link_reason, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (incident_id, ai_call_log_id) DO NOTHING`,
        [id, input.incidentId, input.aiCallLogId, input.linkReason, new Date()]
      );
      return true;
    } catch (err) {
      console.error('[AiCallLogger] Failed to link call to incident:', err);
      return false;
    }
  }

  /**
   * Create or update an incident and link the call log.
   *
   * This is the main entry point for auto-incident creation.
   * It handles aggregation logic (find existing vs. create new).
   *
   * @param tenantId - Tenant ID
   * @param aiCallLogId - The call log ID that triggered this
   * @param severity - Incident severity
   * @param category - Incident category
   * @param title - Incident title (used for grouping similar incidents)
   * @param description - Incident description
   * @param metadata - Additional context
   * @param linkReason - Why this call is linked (default: TRIGGER)
   * @returns The incident (created or updated), or null on error
   */
  async createOrUpdateIncident(
    tenantId: string,
    aiCallLogId: string,
    severity: IncidentSeverity,
    category: IncidentCategory,
    title: string,
    description: string,
    metadata: Record<string, unknown> = {},
    linkReason: LinkReason = 'TRIGGER'
  ): Promise<AiIncident | null> {
    // Try to find an existing open incident for this tenant/category
    const existingIncident = await this.findOpenIncident(tenantId, category, title);

    let incident: AiIncident | null;

    if (existingIncident) {
      // Update existing incident
      incident = await this.updateIncidentOccurrence(existingIncident.id);
    } else {
      // Create new incident
      incident = await this.createIncident({
        tenantId,
        severity,
        category,
        title,
        description,
        metadataJson: metadata,
        createdBySystem: true,
      });
    }

    if (incident) {
      // Link the call log to the incident
      await this.linkCallToIncident({
        incidentId: incident.id,
        aiCallLogId,
        linkReason,
      });
    }

    return incident;
  }

  /**
   * Dispose of the database connection pool.
   */
  async dispose(): Promise<void> {
    await this.pool.end();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

interface AiIncidentRow {
  id: string;
  tenant_id: string;
  severity: string;
  category: string;
  status: string;
  title: string;
  description: string | null;
  first_seen_at: Date;
  last_seen_at: Date;
  occurrence_count: number;
  created_by_system: boolean;
  created_by_user_id: string | null;
  assigned_to_user_id: string | null;
  resolved_at: Date | null;
  resolved_by_user_id: string | null;
  resolution_notes: string | null;
  metadata_json: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

function mapRowToIncident(row: AiIncidentRow): AiIncident {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    severity: row.severity as IncidentSeverity,
    category: row.category as IncidentCategory,
    status: row.status as 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED',
    title: row.title,
    description: row.description,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    occurrenceCount: row.occurrence_count,
    createdBySystem: row.created_by_system,
    createdByUserId: row.created_by_user_id,
    assignedToUserId: row.assigned_to_user_id,
    resolvedAt: row.resolved_at,
    resolvedByUserId: row.resolved_by_user_id,
    resolutionNotes: row.resolution_notes,
    metadataJson: row.metadata_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSafetyLabelToStatus(label: string): 'OK' | 'BLOCKED' | 'NEEDS_REVIEW' {
  switch (label) {
    case 'SAFE':
    case 'LOW':
      return 'OK';
    case 'MEDIUM':
      return 'NEEDS_REVIEW';
    case 'HIGH':
      return 'BLOCKED';
    default:
      return 'NEEDS_REVIEW';
  }
}

function truncate(str: string | undefined, maxLen: number): string | null {
  if (!str) return null;
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}
