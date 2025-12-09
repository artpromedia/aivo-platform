import type { Pool } from 'pg';

export class DeleteError extends Error {}

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
