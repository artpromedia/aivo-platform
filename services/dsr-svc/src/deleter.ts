import type { Pool } from 'pg';

export class DeleteError extends Error {}

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

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
