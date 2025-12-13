import type { Pool } from 'pg';

import { config } from './config.js';
import type { 
  ExportBundle, 
  ConsentRecordExport, 
  ParentalConsentExport 
} from './types.js';
import { DSR_CONFIG } from './types.js';

export class ExportError extends Error {}

/**
 * Build a GDPR/COPPA-compliant export bundle for a learner.
 * Includes all personal data, AI interactions, and consent history.
 *
 * Export bundle version 2.0 includes:
 * - All consent records (required for GDPR Article 15)
 * - Parental consent verification history (required for COPPA)
 * - Sanitized AI interaction logs
 */
export async function buildExportBundle(
  pool: Pool,
  params: { 
    tenantId: string; 
    parentId: string; 
    learnerId: string;
    requestId: string;
  }
): Promise<ExportBundle> {
  const { tenantId, parentId, learnerId, requestId } = params;

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

  // Fetch AI call logs for the learner's sessions
  // Excludes raw input/output for privacy; includes only metadata and usage stats
  const aiCallLogsResult = await pool.query(
    `SELECT 
       acl.id, 
       acl.session_id,
       acl.model_id,
       acl.prompt_token_count,
       acl.completion_token_count,
       acl.latency_ms,
       acl.status,
       acl.created_at,
       -- Provide summarized version of input/output for transparency
       CASE WHEN LENGTH(acl.input_text) > 100 
            THEN SUBSTRING(acl.input_text, 1, 100) || '...'
            ELSE acl.input_text END AS input_summary,
       CASE WHEN LENGTH(acl.output_text) > 100 
            THEN SUBSTRING(acl.output_text, 1, 100) || '...'
            ELSE acl.output_text END AS output_summary
     FROM ai_call_logs acl
     INNER JOIN sessions s ON s.id = acl.session_id AND s.tenant_id = acl.tenant_id
     WHERE acl.tenant_id = $1 AND s.learner_id = $2
     ORDER BY acl.created_at DESC
     LIMIT $3`,
    [tenantId, learnerId, config.exportEventLimit]
  );

  // Fetch consent logs for the parent (who owns the learner)
  const consentLogsResult = await pool.query(
    `SELECT id, consent_type, consent_action, consent_version, created_at
     FROM consent_logs
     WHERE tenant_id = $1 AND parent_id = $2
     ORDER BY created_at DESC`,
    [tenantId, parentId]
  );

  // ════════════════════════════════════════════════════════════════════════════
  // CONSENT RECORDS (GDPR Article 15 / COPPA compliance)
  // ════════════════════════════════════════════════════════════════════════════

  // Fetch all consent records for this learner
  const consentRecordsResult = await pool.query(
    `SELECT 
       id, learner_id, consent_type, status, granted_at, revoked_at,
       expires_at, granted_by_user_id, text_version, updated_at as last_updated_at
     FROM consents
     WHERE tenant_id = $1 AND learner_id = $2
     ORDER BY updated_at DESC`,
    [tenantId, learnerId]
  );

  const consentRecords: ConsentRecordExport[] = consentRecordsResult.rows.map((row) => ({
    id: row.id,
    learner_id: row.learner_id,
    consent_type: row.consent_type,
    status: row.status,
    granted_at: row.granted_at ? new Date(row.granted_at).toISOString() : null,
    revoked_at: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    granted_by_user_id: row.granted_by_user_id,
    text_version: row.text_version,
    last_updated_at: new Date(row.last_updated_at).toISOString(),
  }));

  // Fetch parental consent link/verification history for COPPA compliance
  // Note: token_hash is included for audit trail (not the actual token)
  const parentalConsentsResult = await pool.query(
    `SELECT 
       pcl.parent_id,
       pcl.learner_id,
       pcl.token_hash as consent_link_token_hash,
       pcl.status,
       pcl.created_at,
       pcl.used_at,
       vm.method_type as verification_method,
       vm.status as verification_status,
       vm.completed_at as verification_completed_at
     FROM parental_consent_links pcl
     LEFT JOIN consent_verification_methods vm 
       ON vm.consent_id = pcl.consent_id AND vm.tenant_id = pcl.tenant_id
     WHERE pcl.tenant_id = $1 AND pcl.learner_id = $2
     ORDER BY pcl.created_at DESC`,
    [tenantId, learnerId]
  );

  const parentalConsents: ParentalConsentExport[] = parentalConsentsResult.rows.map((row) => ({
    parent_id: row.parent_id,
    learner_id: row.learner_id,
    consent_link_token_hash: row.consent_link_token_hash,
    status: row.status,
    created_at: new Date(row.created_at).toISOString(),
    used_at: row.used_at ? new Date(row.used_at).toISOString() : null,
    verification_method: row.verification_method,
    verification_status: row.verification_status,
    verification_completed_at: row.verification_completed_at 
      ? new Date(row.verification_completed_at).toISOString() 
      : null,
  }));

  return {
    export_info: {
      generated_at: new Date().toISOString(),
      request_id: requestId,
      learner_id: learnerId,
      export_version: DSR_CONFIG.EXPORT_VERSION,
      includes_consent_data: consentRecords.length > 0 || parentalConsents.length > 0,
    },
    learner,
    consent_records: consentRecords,
    parental_consents: parentalConsents,
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
    ai_call_logs: aiCallLogsResult.rows.map((row) => ({
      id: row.id,
      session_id: row.session_id,
      model_id: row.model_id,
      prompt_token_count: row.prompt_token_count,
      completion_token_count: row.completion_token_count,
      latency_ms: row.latency_ms,
      status: row.status,
      created_at: row.created_at?.toISOString?.() ?? new Date(row.created_at).toISOString(),
      input_summary: row.input_summary ?? null,
      output_summary: row.output_summary ?? null,
    })),
    consent_logs: consentLogsResult.rows.map((row) => ({
      id: row.id,
      consent_type: row.consent_type,
      consent_action: row.consent_action,
      consent_version: row.consent_version,
      created_at: row.created_at?.toISOString?.() ?? new Date(row.created_at).toISOString(),
    })),
  };
}
