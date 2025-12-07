import type { Pool } from 'pg';

import { config } from './config.js';
import type { ExportBundle } from './types.js';

export class ExportError extends Error {}

export async function buildExportBundle(
  pool: Pool,
  params: { tenantId: string; parentId: string; learnerId: string }
): Promise<ExportBundle> {
  const { tenantId, parentId, learnerId } = params;

  const learnerResult = await pool.query(
    `SELECT id, tenant_id, parent_id, first_name, last_name, grade_level, status, created_at, deleted_at
     FROM learners
     WHERE tenant_id = $1 AND id = $2 AND parent_id = $3`,
    [tenantId, learnerId, parentId]
  );
  if (learnerResult.rows.length === 0) {
    throw new ExportError('Learner not found for parent');
  }

  const learnerRow = learnerResult.rows[0];
  const learner = {
    id: learnerRow.id,
    tenant_id: learnerRow.tenant_id,
    parent_id: learnerRow.parent_id,
    first_name: learnerRow.first_name,
    last_name: learnerRow.last_name,
    grade_level: learnerRow.grade_level,
    status: learnerRow.status,
    created_at:
      learnerRow.created_at?.toISOString?.() ?? new Date(learnerRow.created_at).toISOString(),
    deleted_at: learnerRow.deleted_at ? new Date(learnerRow.deleted_at).toISOString() : null,
  };

  const assessmentsResult = await pool.query(
    `SELECT id, baseline_score, taken_at
     FROM assessments
     WHERE tenant_id = $1 AND learner_id = $2
     ORDER BY taken_at ASC`,
    [tenantId, learnerId]
  );

  const sessionsResult = await pool.query(
    `SELECT id, started_at, ended_at, summary
     FROM sessions
     WHERE tenant_id = $1 AND learner_id = $2
     ORDER BY started_at DESC
     LIMIT 200`,
    [tenantId, learnerId]
  );

  const eventsResult = await pool.query(
    `SELECT id, event_type, created_at, metadata - 'raw_payload' - 'actor_email' - 'actor_name' AS metadata
     FROM events
     WHERE tenant_id = $1 AND learner_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [tenantId, learnerId, config.exportEventLimit]
  );

  const recommendationsResult = await pool.query(
    `SELECT id, content, rationale, created_at
     FROM recommendations
     WHERE tenant_id = $1 AND learner_id = $2
     ORDER BY created_at DESC`,
    [tenantId, learnerId]
  );

  const subscriptionsResult = await pool.query(
    `SELECT id, plan, status, started_at, ends_at
     FROM subscriptions
     WHERE tenant_id = $1 AND learner_id = $2 AND parent_id = $3`,
    [tenantId, learnerId, parentId]
  );

  return {
    learner,
    assessments: assessmentsResult.rows.map((row) => ({
      id: row.id,
      baseline_score: row.baseline_score,
      taken_at: row.taken_at?.toISOString?.() ?? new Date(row.taken_at).toISOString(),
    })),
    sessions: sessionsResult.rows.map((row) => ({
      id: row.id,
      started_at: row.started_at?.toISOString?.() ?? new Date(row.started_at).toISOString(),
      ended_at: row.ended_at ? new Date(row.ended_at).toISOString() : null,
      summary: row.summary,
    })),
    events: eventsResult.rows.map((row) => ({
      id: row.id,
      event_type: row.event_type,
      created_at: row.created_at?.toISOString?.() ?? new Date(row.created_at).toISOString(),
      metadata: row.metadata ?? null,
    })),
    recommendations: recommendationsResult.rows.map((row) => ({
      id: row.id,
      content: row.content,
      rationale: row.rationale,
      created_at: row.created_at?.toISOString?.() ?? new Date(row.created_at).toISOString(),
    })),
    subscriptions: subscriptionsResult.rows.map((row) => ({
      id: row.id,
      plan: row.plan,
      status: row.status,
      started_at: row.started_at?.toISOString?.() ?? new Date(row.started_at).toISOString(),
      ends_at: row.ends_at ? new Date(row.ends_at).toISOString() : null,
    })),
  };
}
