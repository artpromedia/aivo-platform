/**
 * Policy Repository
 *
 * Data access layer for policy documents.
 * Handles CRUD operations and version management.
 */
// ════════════════════════════════════════════════════════════════════════════════
// MAPPER
// ════════════════════════════════════════════════════════════════════════════════
function mapRow(row) {
    return {
        id: row.id,
        scope_type: row.scope_type,
        tenant_id: row.tenant_id,
        version: row.version,
        name: row.name,
        is_active: row.is_active,
        policy_json: row.policy_json,
        description: row.description,
        created_by_user_id: row.created_by_user_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
// ════════════════════════════════════════════════════════════════════════════════
// REPOSITORY CLASS
// ════════════════════════════════════════════════════════════════════════════════
export class PolicyRepository {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    // ────────────────────────────────────────────────────────────────────────────
    // READ OPERATIONS
    // ────────────────────────────────────────────────────────────────────────────
    /**
     * Get the active GLOBAL policy document
     */
    async getActiveGlobalPolicy() {
        const { rows } = await this.pool.query(`SELECT * FROM policy_documents 
       WHERE scope_type = 'GLOBAL' AND is_active = true 
       LIMIT 1`);
        return rows.length > 0 ? mapRow(rows[0]) : null;
    }
    /**
     * Get the active TENANT policy document for a specific tenant
     */
    async getActiveTenantPolicy(tenantId) {
        const { rows } = await this.pool.query(`SELECT * FROM policy_documents 
       WHERE scope_type = 'TENANT' AND tenant_id = $1 AND is_active = true 
       LIMIT 1`, [tenantId]);
        return rows.length > 0 ? mapRow(rows[0]) : null;
    }
    /**
     * Get a policy document by ID
     */
    async getById(id) {
        const { rows } = await this.pool.query(`SELECT * FROM policy_documents WHERE id = $1`, [id]);
        return rows.length > 0 ? mapRow(rows[0]) : null;
    }
    /**
     * Get policy version history for a scope/tenant
     */
    async getVersionHistory(scopeType, tenantId = null, limit = 10) {
        const { rows } = await this.pool.query(`SELECT * FROM policy_documents 
       WHERE scope_type = $1 AND (tenant_id = $2 OR (tenant_id IS NULL AND $2 IS NULL))
       ORDER BY version DESC
       LIMIT $3`, [scopeType, tenantId, limit]);
        return rows.map(mapRow);
    }
    /**
     * List all tenant policies (for admin dashboard)
     */
    async listActiveTenantPolicies(options = {}) {
        const limit = options.limit ?? 50;
        const offset = options.offset ?? 0;
        const [countResult, dataResult] = await Promise.all([
            this.pool.query(`SELECT COUNT(*) FROM policy_documents WHERE scope_type = 'TENANT' AND is_active = true`),
            this.pool.query(`SELECT * FROM policy_documents 
         WHERE scope_type = 'TENANT' AND is_active = true
         ORDER BY updated_at DESC
         LIMIT $1 OFFSET $2`, [limit, offset]),
        ]);
        return {
            policies: dataResult.rows.map(mapRow),
            total: parseInt(countResult.rows[0]?.count ?? '0', 10),
        };
    }
    // ────────────────────────────────────────────────────────────────────────────
    // WRITE OPERATIONS
    // ────────────────────────────────────────────────────────────────────────────
    /**
     * Create a new policy document
     * Automatically calculates the next version number
     */
    async create(input) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Get next version number
            const versionResult = await client.query(`SELECT COALESCE(MAX(version), 0) as max_version 
         FROM policy_documents 
         WHERE scope_type = $1 AND (tenant_id = $2 OR (tenant_id IS NULL AND $2 IS NULL))`, [input.scopeType, input.tenantId ?? null]);
            const nextVersion = (versionResult.rows[0]?.max_version ?? 0) + 1;
            // Insert new document
            const { rows } = await client.query(`INSERT INTO policy_documents (
          scope_type, tenant_id, version, name, is_active, 
          policy_json, description, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, false, $5, $6, $7)
        RETURNING *`, [
                input.scopeType,
                input.tenantId ?? null,
                nextVersion,
                input.name,
                JSON.stringify(input.policyJson),
                input.description ?? null,
                input.createdByUserId ?? null,
            ]);
            // Log the creation
            await client.query(`INSERT INTO policy_audit_logs (policy_document_id, action, performed_by_user_id, new_values)
         VALUES ($1, 'CREATED', $2, $3)`, [rows[0].id, input.createdByUserId ?? null, JSON.stringify(input.policyJson)]);
            await client.query('COMMIT');
            return mapRow(rows[0]);
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Activate a policy document (deactivates any currently active one for same scope/tenant)
     */
    async activate(id, activatedByUserId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Get the document to activate
            const { rows: docRows } = await client.query(`SELECT * FROM policy_documents WHERE id = $1`, [id]);
            if (docRows.length === 0) {
                throw new Error('Policy document not found');
            }
            const doc = docRows[0];
            // Deactivate any currently active policy for same scope/tenant
            await client.query(`UPDATE policy_documents 
         SET is_active = false, updated_at = now()
         WHERE scope_type = $1 
           AND (tenant_id = $2 OR (tenant_id IS NULL AND $2 IS NULL))
           AND is_active = true
           AND id != $3`, [doc.scope_type, doc.tenant_id, id]);
            // Activate the target document
            const { rows } = await client.query(`UPDATE policy_documents 
         SET is_active = true, updated_at = now()
         WHERE id = $1
         RETURNING *`, [id]);
            // Log the activation
            await client.query(`INSERT INTO policy_audit_logs (policy_document_id, action, performed_by_user_id)
         VALUES ($1, 'ACTIVATED', $2)`, [id, activatedByUserId ?? null]);
            await client.query('COMMIT');
            return mapRow(rows[0]);
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Deactivate a policy document
     */
    async deactivate(id, deactivatedByUserId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(`UPDATE policy_documents 
         SET is_active = false, updated_at = now()
         WHERE id = $1
         RETURNING *`, [id]);
            if (rows.length === 0) {
                throw new Error('Policy document not found');
            }
            // Log the deactivation
            await client.query(`INSERT INTO policy_audit_logs (policy_document_id, action, performed_by_user_id)
         VALUES ($1, 'DEACTIVATED', $2)`, [id, deactivatedByUserId ?? null]);
            await client.query('COMMIT');
            return mapRow(rows[0]);
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Update a policy document (creates audit log with previous values)
     */
    async update(id, input, updatedByUserId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Get current values for audit log
            const { rows: currentRows } = await client.query(`SELECT * FROM policy_documents WHERE id = $1`, [id]);
            if (currentRows.length === 0) {
                throw new Error('Policy document not found');
            }
            const current = currentRows[0];
            // Build update query dynamically
            const updates = ['updated_at = now()'];
            const params = [];
            let paramIndex = 1;
            if (input.name !== undefined) {
                updates.push(`name = $${paramIndex++}`);
                params.push(input.name);
            }
            if (input.policyJson !== undefined) {
                updates.push(`policy_json = $${paramIndex++}`);
                params.push(JSON.stringify(input.policyJson));
            }
            if (input.description !== undefined) {
                updates.push(`description = $${paramIndex++}`);
                params.push(input.description);
            }
            params.push(id);
            const { rows } = await client.query(`UPDATE policy_documents SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, params);
            // Log the update with before/after values
            await client.query(`INSERT INTO policy_audit_logs (
          policy_document_id, action, performed_by_user_id, previous_values, new_values
        )
        VALUES ($1, 'UPDATED', $2, $3, $4)`, [
                id,
                updatedByUserId ?? null,
                JSON.stringify({
                    name: current.name,
                    policy_json: current.policy_json,
                    description: current.description,
                }),
                JSON.stringify({
                    name: input.name ?? current.name,
                    policy_json: input.policyJson ?? current.policy_json,
                    description: input.description ?? current.description,
                }),
            ]);
            await client.query('COMMIT');
            return mapRow(rows[0]);
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Create and immediately activate a new policy version
     * Convenience method for common workflow
     */
    async createAndActivate(input, activatedByUserId) {
        const doc = await this.create(input);
        return this.activate(doc.id, activatedByUserId ?? input.createdByUserId ?? undefined);
    }
    /**
     * Delete a policy document (only if not active)
     */
    async delete(id) {
        const { rowCount } = await this.pool.query(`DELETE FROM policy_documents WHERE id = $1 AND is_active = false`, [id]);
        if (rowCount === 0) {
            throw new Error('Policy document not found or is currently active');
        }
    }
}
//# sourceMappingURL=repository.js.map