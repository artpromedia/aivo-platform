import type { Pool } from 'pg';

export class DeleteError extends Error {}

/**
 * Delete mode for GDPR Article 17 compliance.
 * - SOFT: De-identify PII but preserve records for analytics integrity
 * - HARD: Completely remove all records (full Article 17 compliance)
 */
export type DeleteMode = 'SOFT' | 'HARD';

/**
 * Result of a hard delete operation for audit logging
 */
export interface HardDeleteResult {
  learnerId: string;
  tenantId: string;
  deletedAt: Date;
  recordsDeleted: {
    learner: number;
    events: number;
    sessions: number;
    recommendations: number;
    aiCallLogs: number;
    assessments: number;
    goals: number;
    achievements: number;
    messages: number;
  };
}

/**
 * De-identify a learner's data for COPPA/GDPR deletion requests.
 *
 * This performs "soft delete" by:
 * - Nullifying PII fields (names, emails, etc.)
 * - Marking the learner as DELETED
 * - Stripping rich payloads from events and sessions
 * - Anonymizing AI call logs
 * - Preserving record structure for billing/analytics integrity
 */
export async function deidentifyLearner(
  pool: Pool,
  params: { tenantId: string; learnerId: string; parentId: string }
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rowCount } = await client.query(
      `UPDATE learners
         SET first_name = NULL,
             last_name = NULL,
             email = NULL,
             phone = NULL,
             zip_code = NULL,
             status = 'DELETED',
             deleted_at = COALESCE(deleted_at, now())
       WHERE tenant_id = $1 AND id = $2 AND parent_id = $3`,
      [params.tenantId, params.learnerId, params.parentId]
    );
    if (rowCount === 0) {
      throw new DeleteError('Learner not found for parent');
    }

    // Drop rich payloads but keep high-level records so analytics relying on counts remain intact.
    await client.query(
      `UPDATE events
         SET metadata = NULL
       WHERE tenant_id = $1 AND learner_id = $2`,
      [params.tenantId, params.learnerId]
    );

    await client.query(
      `UPDATE sessions
         SET summary = NULL
       WHERE tenant_id = $1 AND learner_id = $2`,
      [params.tenantId, params.learnerId]
    );

    await client.query(
      `UPDATE recommendations
         SET rationale = NULL
       WHERE tenant_id = $1 AND learner_id = $2`,
      [params.tenantId, params.learnerId]
    );

    // Anonymize AI call logs: strip input/output but preserve usage metrics for billing
    await client.query(
      `UPDATE ai_call_logs acl
         SET input_text = NULL,
             output_text = NULL,
             input_tokens = NULL,
             output_tokens = NULL
       FROM sessions s
       WHERE acl.session_id = s.id 
         AND acl.tenant_id = s.tenant_id
         AND acl.tenant_id = $1 
         AND s.learner_id = $2`,
      [params.tenantId, params.learnerId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Completely delete a learner's data for full GDPR Article 17 compliance.
 *
 * CRITICAL: This performs HARD DELETE and is IRREVERSIBLE.
 *
 * This completely removes all records including:
 * - Learner profile
 * - Events and session data
 * - Recommendations and learning paths
 * - AI conversation logs
 * - Assessments and progress
 * - Goals and achievements
 * - Messages and notifications
 *
 * Use cases:
 * - Full GDPR Article 17 "Right to Erasure" requests
 * - Complete data purge after account termination
 * - Compliance with strict data minimization requirements
 *
 * For analytics preservation, use deidentifyLearner() instead.
 */
export async function hardDeleteLearner(
  pool: Pool,
  params: { tenantId: string; learnerId: string; parentId: string }
): Promise<HardDeleteResult> {
  const client = await pool.connect();
  const deletedAt = new Date();
  const recordsDeleted = {
    learner: 0,
    events: 0,
    sessions: 0,
    recommendations: 0,
    aiCallLogs: 0,
    assessments: 0,
    goals: 0,
    achievements: 0,
    messages: 0,
  };

  try {
    await client.query('BEGIN');

    // Verify learner exists and belongs to parent
    const verifyResult = await client.query(
      `SELECT id FROM learners
       WHERE tenant_id = $1 AND id = $2 AND parent_id = $3`,
      [params.tenantId, params.learnerId, params.parentId]
    );

    if (verifyResult.rowCount === 0) {
      throw new DeleteError('Learner not found for parent');
    }

    // Delete in order respecting foreign key constraints
    // Start with leaf tables, work up to the learner record

    // 1. Delete messages and notifications
    const messagesResult = await client.query(
      `DELETE FROM messages WHERE tenant_id = $1 AND learner_id = $2`,
      [params.tenantId, params.learnerId]
    );
    recordsDeleted.messages = messagesResult.rowCount ?? 0;

    // 2. Delete achievements and gamification data
    const achievementsResult = await client.query(
      `DELETE FROM learner_achievements WHERE tenant_id = $1 AND learner_id = $2`,
      [params.tenantId, params.learnerId]
    );
    recordsDeleted.achievements = achievementsResult.rowCount ?? 0;

    // 3. Delete goals
    const goalsResult = await client.query(
      `DELETE FROM goals WHERE tenant_id = $1 AND learner_id = $2`,
      [params.tenantId, params.learnerId]
    );
    recordsDeleted.goals = goalsResult.rowCount ?? 0;

    // 4. Delete assessment results
    const assessmentsResult = await client.query(
      `DELETE FROM assessment_results WHERE tenant_id = $1 AND learner_id = $2`,
      [params.tenantId, params.learnerId]
    );
    recordsDeleted.assessments = assessmentsResult.rowCount ?? 0;

    // 5. Delete AI call logs (via session join)
    const aiLogsResult = await client.query(
      `DELETE FROM ai_call_logs acl
       USING sessions s
       WHERE acl.session_id = s.id
         AND acl.tenant_id = s.tenant_id
         AND acl.tenant_id = $1
         AND s.learner_id = $2`,
      [params.tenantId, params.learnerId]
    );
    recordsDeleted.aiCallLogs = aiLogsResult.rowCount ?? 0;

    // 6. Delete recommendations
    const recommendationsResult = await client.query(
      `DELETE FROM recommendations WHERE tenant_id = $1 AND learner_id = $2`,
      [params.tenantId, params.learnerId]
    );
    recordsDeleted.recommendations = recommendationsResult.rowCount ?? 0;

    // 7. Delete sessions
    const sessionsResult = await client.query(
      `DELETE FROM sessions WHERE tenant_id = $1 AND learner_id = $2`,
      [params.tenantId, params.learnerId]
    );
    recordsDeleted.sessions = sessionsResult.rowCount ?? 0;

    // 8. Delete events
    const eventsResult = await client.query(
      `DELETE FROM events WHERE tenant_id = $1 AND learner_id = $2`,
      [params.tenantId, params.learnerId]
    );
    recordsDeleted.events = eventsResult.rowCount ?? 0;

    // 9. Finally, delete the learner record itself
    const learnerResult = await client.query(
      `DELETE FROM learners WHERE tenant_id = $1 AND id = $2 AND parent_id = $3`,
      [params.tenantId, params.learnerId, params.parentId]
    );
    recordsDeleted.learner = learnerResult.rowCount ?? 0;

    await client.query('COMMIT');

    // Log deletion event for audit trail
    console.info(JSON.stringify({
      event: 'gdpr_hard_delete_completed',
      tenantId: params.tenantId,
      learnerId: params.learnerId,
      deletedAt: deletedAt.toISOString(),
      recordsDeleted,
      compliance: 'GDPR_ARTICLE_17',
    }));

    return {
      learnerId: params.learnerId,
      tenantId: params.tenantId,
      deletedAt,
      recordsDeleted,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Delete a learner's data with the specified mode.
 *
 * @param pool - Database connection pool
 * @param params - Learner identification
 * @param mode - SOFT (de-identify) or HARD (complete deletion)
 */
export async function deleteLearner(
  pool: Pool,
  params: { tenantId: string; learnerId: string; parentId: string },
  mode: DeleteMode = 'SOFT'
): Promise<HardDeleteResult | void> {
  if (mode === 'HARD') {
    return hardDeleteLearner(pool, params);
  } else {
    return deidentifyLearner(pool, params);
  }
}
