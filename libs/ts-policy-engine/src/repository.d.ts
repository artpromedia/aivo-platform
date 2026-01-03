/**
 * Policy Repository
 *
 * Data access layer for policy documents.
 * Handles CRUD operations and version management.
 */
import type { Pool } from 'pg';
import type { CreatePolicyDocumentInput, PolicyDocument, PolicyScopeType, UpdatePolicyDocumentInput } from './types.js';
export declare class PolicyRepository {
    private pool;
    constructor(pool: Pool);
    /**
     * Get the active GLOBAL policy document
     */
    getActiveGlobalPolicy(): Promise<PolicyDocument | null>;
    /**
     * Get the active TENANT policy document for a specific tenant
     */
    getActiveTenantPolicy(tenantId: string): Promise<PolicyDocument | null>;
    /**
     * Get a policy document by ID
     */
    getById(id: string): Promise<PolicyDocument | null>;
    /**
     * Get policy version history for a scope/tenant
     */
    getVersionHistory(scopeType: PolicyScopeType, tenantId?: string | null, limit?: number): Promise<PolicyDocument[]>;
    /**
     * List all tenant policies (for admin dashboard)
     */
    listActiveTenantPolicies(options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        policies: PolicyDocument[];
        total: number;
    }>;
    /**
     * Create a new policy document
     * Automatically calculates the next version number
     */
    create(input: CreatePolicyDocumentInput): Promise<PolicyDocument>;
    /**
     * Activate a policy document (deactivates any currently active one for same scope/tenant)
     */
    activate(id: string, activatedByUserId?: string): Promise<PolicyDocument>;
    /**
     * Deactivate a policy document
     */
    deactivate(id: string, deactivatedByUserId?: string): Promise<PolicyDocument>;
    /**
     * Update a policy document (creates audit log with previous values)
     */
    update(id: string, input: UpdatePolicyDocumentInput, updatedByUserId?: string): Promise<PolicyDocument>;
    /**
     * Create and immediately activate a new policy version
     * Convenience method for common workflow
     */
    createAndActivate(input: CreatePolicyDocumentInput, activatedByUserId?: string | null): Promise<PolicyDocument>;
    /**
     * Delete a policy document (only if not active)
     */
    delete(id: string): Promise<void>;
}
//# sourceMappingURL=repository.d.ts.map