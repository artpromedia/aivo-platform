/**
 * Per-Learner Consent Management Service
 *
 * Enhanced consent management that provides granular, per-learner consent
 * control for parents with:
 * - Feature-specific consent gates
 * - Batch consent operations
 * - Consent templates for quick setup
 * - Real-time consent status checks
 * - Consent expiration and renewal workflows
 *
 * @module consent-svc/services/per-learner-consent
 */

import { Pool, PoolClient } from 'pg';
import { randomBytes, createHash } from 'crypto';
import {
  Consent,
  ConsentType,
  ConsentStatus,
  ConsentSource,
  ConsentGateResult,
  ParentConsentSummary,
} from '../types.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface FeatureConsentRequirement {
  feature: string;
  requiredConsents: ConsentType[];
  description: string;
  optional?: boolean;
}

export interface ConsentTemplate {
  id: string;
  name: string;
  description: string;
  consents: ConsentType[];
  isDefault: boolean;
  tenantId?: string; // null = global template
}

export interface PerLearnerConsentStatus {
  learnerId: string;
  learnerName: string;
  consents: LearnerConsentDetail[];
  overallStatus: 'complete' | 'partial' | 'none';
  missingRequired: ConsentType[];
  canUseAI: boolean;
  canUseAssessments: boolean;
  canShareData: boolean;
  lastUpdated: Date;
}

export interface LearnerConsentDetail {
  type: ConsentType;
  status: ConsentStatus;
  required: boolean;
  description: string;
  grantedAt: Date | null;
  grantedBy: string | null;
  expiresAt: Date | null;
  canRevoke: boolean;
  dependsOn: ConsentType[];
}

export interface BatchConsentRequest {
  tenantId: string;
  parentId: string;
  learnerIds: string[];
  consents: Array<{
    type: ConsentType;
    action: 'GRANT' | 'REVOKE';
  }>;
  source: ConsentSource;
  ipAddress?: string;
  userAgent?: string;
}

export interface BatchConsentResult {
  success: boolean;
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    learnerId: string;
    consentType: ConsentType;
    action: 'GRANT' | 'REVOKE';
    success: boolean;
    error?: string;
  }>;
}

// ════════════════════════════════════════════════════════════════════════════════
// FEATURE → CONSENT MAPPINGS
// ════════════════════════════════════════════════════════════════════════════════

export const FEATURE_CONSENT_REQUIREMENTS: FeatureConsentRequirement[] = [
  {
    feature: 'ai_tutor',
    requiredConsents: ['AI_TUTOR', 'DATA_PROCESSING'],
    description: 'AI-powered tutoring and homework help',
  },
  {
    feature: 'ai_personalization',
    requiredConsents: ['AI_PERSONALIZATION', 'DATA_PROCESSING'],
    description: 'AI-driven learning path personalization',
  },
  {
    feature: 'baseline_assessment',
    requiredConsents: ['BASELINE_ASSESSMENT', 'DATA_PROCESSING'],
    description: 'Initial skills assessment',
  },
  {
    feature: 'voice_recording',
    requiredConsents: ['VOICE_RECORDING', 'DATA_PROCESSING'],
    description: 'Voice-based interactions and speech therapy',
  },
  {
    feature: 'biometric_data',
    requiredConsents: ['BIOMETRIC_DATA', 'DATA_PROCESSING'],
    description: 'Focus tracking via camera/sensors',
  },
  {
    feature: 'research',
    requiredConsents: ['RESEARCH', 'DATA_PROCESSING'],
    description: 'Educational research participation',
    optional: true,
  },
  {
    feature: 'third_party_sharing',
    requiredConsents: ['THIRD_PARTY_SHARING', 'DATA_PROCESSING'],
    description: 'Sharing data with integrated apps',
    optional: true,
  },
  {
    feature: 'marketing',
    requiredConsents: ['MARKETING'],
    description: 'Marketing communications',
    optional: true,
  },
];

// Consent dependencies - some consents require others
const CONSENT_DEPENDENCIES: Record<ConsentType, ConsentType[]> = {
  AI_TUTOR: ['DATA_PROCESSING'],
  AI_PERSONALIZATION: ['DATA_PROCESSING'],
  BASELINE_ASSESSMENT: ['DATA_PROCESSING'],
  VOICE_RECORDING: ['DATA_PROCESSING'],
  BIOMETRIC_DATA: ['DATA_PROCESSING'],
  RESEARCH: ['DATA_PROCESSING'],
  THIRD_PARTY_SHARING: ['DATA_PROCESSING'],
  MARKETING: [],
  DATA_PROCESSING: [],
};

// Human-readable descriptions
const CONSENT_DESCRIPTIONS: Record<ConsentType, string> = {
  DATA_PROCESSING: 'Basic data processing for platform functionality',
  AI_TUTOR: 'AI-powered tutoring and learning assistance',
  AI_PERSONALIZATION: 'Personalized learning recommendations',
  BASELINE_ASSESSMENT: 'Skills assessment and learning diagnostics',
  VOICE_RECORDING: 'Voice interactions and speech activities',
  BIOMETRIC_DATA: 'Focus and attention tracking',
  RESEARCH: 'Participation in educational research studies',
  THIRD_PARTY_SHARING: 'Data sharing with integrated third-party apps',
  MARKETING: 'Product updates and educational content emails',
};

// Required consents that cannot be revoked while using platform
const REQUIRED_CONSENTS: ConsentType[] = ['DATA_PROCESSING'];

// ════════════════════════════════════════════════════════════════════════════════
// PER-LEARNER CONSENT SERVICE
// ════════════════════════════════════════════════════════════════════════════════

export class PerLearnerConsentService {
  constructor(private readonly pool: Pool) {}

  /**
   * Get complete consent status for all learners of a parent
   */
  async getParentConsentDashboard(
    tenantId: string,
    parentId: string
  ): Promise<PerLearnerConsentStatus[]> {
    const client = await this.pool.connect();

    try {
      // Get all learners for this parent
      const learnersResult = await client.query<{
        id: string;
        first_name: string;
        last_name: string;
      }>(
        `SELECT id, first_name, last_name
         FROM learners
         WHERE tenant_id = $1 AND parent_id = $2 AND status != 'DELETED'
         ORDER BY first_name, last_name`,
        [tenantId, parentId]
      );

      const statuses: PerLearnerConsentStatus[] = [];

      for (const learner of learnersResult.rows) {
        const status = await this.getLearnerConsentStatus(
          client,
          tenantId,
          learner.id,
          `${learner.first_name} ${learner.last_name}`
        );
        statuses.push(status);
      }

      return statuses;
    } finally {
      client.release();
    }
  }

  /**
   * Get detailed consent status for a single learner
   */
  async getLearnerConsentStatus(
    clientOrPool: PoolClient | Pool,
    tenantId: string,
    learnerId: string,
    learnerName?: string
  ): Promise<PerLearnerConsentStatus> {
    const client = 'connect' in clientOrPool ? await clientOrPool.connect() : clientOrPool;
    const shouldRelease = 'connect' in clientOrPool;

    try {
      // Get all consents for this learner
      const consentsResult = await client.query<Consent>(
        `SELECT * FROM consents
         WHERE tenant_id = $1 AND learner_id = $2
         ORDER BY consent_type`,
        [tenantId, learnerId]
      );

      const existingConsents = new Map<ConsentType, Consent>();
      for (const c of consentsResult.rows) {
        existingConsents.set(c.consent_type, c);
      }

      // Build detailed consent list
      const consentDetails: LearnerConsentDetail[] = [];
      const allConsentTypes: ConsentType[] = [
        'DATA_PROCESSING',
        'BASELINE_ASSESSMENT',
        'AI_TUTOR',
        'AI_PERSONALIZATION',
        'VOICE_RECORDING',
        'BIOMETRIC_DATA',
        'RESEARCH',
        'THIRD_PARTY_SHARING',
        'MARKETING',
      ];

      for (const type of allConsentTypes) {
        const existing = existingConsents.get(type);
        const isRequired = REQUIRED_CONSENTS.includes(type);

        consentDetails.push({
          type,
          status: existing?.status ?? 'PENDING',
          required: isRequired,
          description: CONSENT_DESCRIPTIONS[type],
          grantedAt: existing?.granted_at ?? null,
          grantedBy: existing?.granted_by_parent_id ?? null,
          expiresAt: existing?.expires_at ?? null,
          canRevoke: !isRequired || existing?.status !== 'GRANTED',
          dependsOn: CONSENT_DEPENDENCIES[type],
        });
      }

      // Determine overall status
      const grantedCount = consentDetails.filter(c => c.status === 'GRANTED').length;
      const missingRequired = consentDetails
        .filter(c => c.required && c.status !== 'GRANTED')
        .map(c => c.type);

      let overallStatus: 'complete' | 'partial' | 'none';
      if (grantedCount === 0) {
        overallStatus = 'none';
      } else if (missingRequired.length === 0 && grantedCount === allConsentTypes.length) {
        overallStatus = 'complete';
      } else {
        overallStatus = 'partial';
      }

      // Check feature capabilities
      const canUseAI = this.checkFeatureConsent('ai_tutor', existingConsents);
      const canUseAssessments = this.checkFeatureConsent('baseline_assessment', existingConsents);
      const canShareData = this.checkFeatureConsent('third_party_sharing', existingConsents);

      return {
        learnerId,
        learnerName: learnerName ?? 'Unknown',
        consents: consentDetails,
        overallStatus,
        missingRequired,
        canUseAI,
        canUseAssessments,
        canShareData,
        lastUpdated: new Date(),
      };
    } finally {
      if (shouldRelease && 'release' in client) {
        (client as PoolClient).release();
      }
    }
  }

  /**
   * Grant or revoke a single consent for a learner
   */
  async updateConsent(params: {
    tenantId: string;
    learnerId: string;
    parentId: string;
    consentType: ConsentType;
    action: 'GRANT' | 'REVOKE';
    source: ConsentSource;
    ipAddress?: string;
    userAgent?: string;
    consentTextVersion?: string;
  }): Promise<{ success: boolean; consent: Consent | null; error?: string }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verify parent owns learner
      const ownershipCheck = await client.query(
        `SELECT id FROM learners
         WHERE tenant_id = $1 AND id = $2 AND parent_id = $3`,
        [params.tenantId, params.learnerId, params.parentId]
      );

      if (ownershipCheck.rowCount === 0) {
        return { success: false, consent: null, error: 'Learner not found or access denied' };
      }

      // Check dependencies for GRANT
      if (params.action === 'GRANT') {
        const dependencies = CONSENT_DEPENDENCIES[params.consentType];
        for (const dep of dependencies) {
          const depCheck = await client.query<{ status: ConsentStatus }>(
            `SELECT status FROM consents
             WHERE tenant_id = $1 AND learner_id = $2 AND consent_type = $3`,
            [params.tenantId, params.learnerId, dep]
          );

          if (depCheck.rowCount === 0 || depCheck.rows[0].status !== 'GRANTED') {
            return {
              success: false,
              consent: null,
              error: `Cannot grant ${params.consentType} without ${dep} consent`,
            };
          }
        }
      }

      // Check if we can revoke
      if (params.action === 'REVOKE' && REQUIRED_CONSENTS.includes(params.consentType)) {
        // Check if any dependent consents would break
        const dependents = Object.entries(CONSENT_DEPENDENCIES)
          .filter(([_, deps]) => deps.includes(params.consentType))
          .map(([type]) => type);

        for (const dep of dependents) {
          const depCheck = await client.query<{ status: ConsentStatus }>(
            `SELECT status FROM consents
             WHERE tenant_id = $1 AND learner_id = $2 AND consent_type = $3 AND status = 'GRANTED'`,
            [params.tenantId, params.learnerId, dep]
          );

          if (depCheck.rowCount && depCheck.rowCount > 0) {
            return {
              success: false,
              consent: null,
              error: `Cannot revoke ${params.consentType} while ${dep} consent is active`,
            };
          }
        }
      }

      const now = new Date();
      const newStatus: ConsentStatus = params.action === 'GRANT' ? 'GRANTED' : 'REVOKED';

      // Upsert consent record
      const result = await client.query<Consent>(
        `INSERT INTO consents (
          id, tenant_id, learner_id, consent_type, status,
          granted_by_parent_id, granted_at, revoked_at, source,
          consent_text_version, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10, $10
        )
        ON CONFLICT (tenant_id, learner_id, consent_type)
        DO UPDATE SET
          status = EXCLUDED.status,
          granted_by_parent_id = CASE WHEN EXCLUDED.status = 'GRANTED' THEN EXCLUDED.granted_by_parent_id ELSE consents.granted_by_parent_id END,
          granted_at = CASE WHEN EXCLUDED.status = 'GRANTED' THEN EXCLUDED.granted_at ELSE consents.granted_at END,
          revoked_at = CASE WHEN EXCLUDED.status = 'REVOKED' THEN EXCLUDED.revoked_at ELSE NULL END,
          source = EXCLUDED.source,
          consent_text_version = COALESCE(EXCLUDED.consent_text_version, consents.consent_text_version),
          updated_at = EXCLUDED.updated_at
        RETURNING *`,
        [
          params.tenantId,
          params.learnerId,
          params.consentType,
          newStatus,
          params.parentId,
          params.action === 'GRANT' ? now : null,
          params.action === 'REVOKE' ? now : null,
          params.source,
          params.consentTextVersion ?? null,
          now,
        ]
      );

      // Create audit log
      await client.query(
        `INSERT INTO consent_audit_logs (
          id, consent_id, previous_status, new_status,
          changed_by_user_id, change_reason, ip_address, user_agent, changed_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
        )`,
        [
          result.rows[0].id,
          params.action === 'GRANT' ? 'PENDING' : 'GRANTED',
          newStatus,
          params.parentId,
          `Parent ${params.action === 'GRANT' ? 'granted' : 'revoked'} consent`,
          params.ipAddress ?? null,
          params.userAgent ?? null,
          now,
        ]
      );

      // Create immutable consent log
      await client.query(
        `INSERT INTO consent_logs (
          id, tenant_id, learner_id, parent_user_id, consent_type,
          status, source, consent_text_version, ip_address, user_agent, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )`,
        [
          params.tenantId,
          params.learnerId,
          params.parentId,
          params.consentType,
          params.action === 'GRANT' ? 'GRANTED' : 'REVOKED',
          params.source,
          params.consentTextVersion ?? '1.0',
          params.ipAddress ?? null,
          params.userAgent ?? null,
          now,
        ]
      );

      await client.query('COMMIT');

      return { success: true, consent: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch update consents for multiple learners
   */
  async batchUpdateConsents(request: BatchConsentRequest): Promise<BatchConsentResult> {
    const results: BatchConsentResult['results'] = [];
    let successful = 0;
    let failed = 0;

    for (const learnerId of request.learnerIds) {
      for (const consent of request.consents) {
        try {
          const result = await this.updateConsent({
            tenantId: request.tenantId,
            learnerId,
            parentId: request.parentId,
            consentType: consent.type,
            action: consent.action,
            source: request.source,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
          });

          results.push({
            learnerId,
            consentType: consent.type,
            action: consent.action,
            success: result.success,
            error: result.error,
          });

          if (result.success) {
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
          results.push({
            learnerId,
            consentType: consent.type,
            action: consent.action,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return {
      success: failed === 0,
      totalProcessed: results.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Apply a consent template to learners
   */
  async applyConsentTemplate(params: {
    tenantId: string;
    parentId: string;
    learnerIds: string[];
    templateId: string;
    source: ConsentSource;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<BatchConsentResult> {
    // Get template
    const template = await this.getConsentTemplate(params.templateId, params.tenantId);
    if (!template) {
      return {
        success: false,
        totalProcessed: 0,
        successful: 0,
        failed: params.learnerIds.length,
        results: params.learnerIds.map(id => ({
          learnerId: id,
          consentType: 'DATA_PROCESSING',
          action: 'GRANT' as const,
          success: false,
          error: 'Template not found',
        })),
      };
    }

    return this.batchUpdateConsents({
      tenantId: params.tenantId,
      parentId: params.parentId,
      learnerIds: params.learnerIds,
      consents: template.consents.map(type => ({ type, action: 'GRANT' })),
      source: params.source,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Check if a feature is allowed based on current consents
   */
  async checkFeatureAccess(
    tenantId: string,
    learnerId: string,
    feature: string
  ): Promise<ConsentGateResult> {
    const requirement = FEATURE_CONSENT_REQUIREMENTS.find(r => r.feature === feature);
    if (!requirement) {
      return {
        allowed: true,
        missingConsents: [],
        message: 'Feature does not require consent',
      };
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query<{ consent_type: ConsentType; status: ConsentStatus }>(
        `SELECT consent_type, status FROM consents
         WHERE tenant_id = $1 AND learner_id = $2
         AND consent_type = ANY($3)`,
        [tenantId, learnerId, requirement.requiredConsents]
      );

      const grantedConsents = new Set(
        result.rows
          .filter(r => r.status === 'GRANTED')
          .map(r => r.consent_type)
      );

      const missingConsents = requirement.requiredConsents.filter(
        c => !grantedConsents.has(c)
      );

      if (missingConsents.length === 0) {
        return {
          allowed: true,
          missingConsents: [],
          message: 'All required consents granted',
        };
      }

      return {
        allowed: false,
        missingConsents,
        message: `Missing consent for: ${missingConsents.join(', ')}`,
        consentUrl: `/consent?learner=${learnerId}&required=${missingConsents.join(',')}`,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get consent templates
   */
  async getConsentTemplates(tenantId?: string): Promise<ConsentTemplate[]> {
    const result = await this.pool.query<{
      id: string;
      name: string;
      description: string;
      consents: ConsentType[];
      is_default: boolean;
      tenant_id: string | null;
    }>(
      `SELECT * FROM consent_templates
       WHERE tenant_id IS NULL OR tenant_id = $1
       ORDER BY is_default DESC, name`,
      [tenantId ?? null]
    );

    return result.rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      consents: r.consents,
      isDefault: r.is_default,
      tenantId: r.tenant_id ?? undefined,
    }));
  }

  /**
   * Get a specific consent template
   */
  private async getConsentTemplate(
    templateId: string,
    tenantId: string
  ): Promise<ConsentTemplate | null> {
    const result = await this.pool.query<{
      id: string;
      name: string;
      description: string;
      consents: ConsentType[];
      is_default: boolean;
      tenant_id: string | null;
    }>(
      `SELECT * FROM consent_templates
       WHERE id = $1 AND (tenant_id IS NULL OR tenant_id = $2)`,
      [templateId, tenantId]
    );

    if (result.rowCount === 0) return null;

    const r = result.rows[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      consents: r.consents,
      isDefault: r.is_default,
      tenantId: r.tenant_id ?? undefined,
    };
  }

  /**
   * Check if specific consents are granted
   */
  private checkFeatureConsent(
    feature: string,
    consents: Map<ConsentType, Consent>
  ): boolean {
    const requirement = FEATURE_CONSENT_REQUIREMENTS.find(r => r.feature === feature);
    if (!requirement) return true;

    return requirement.requiredConsents.every(type => {
      const consent = consents.get(type);
      return consent?.status === 'GRANTED';
    });
  }

  /**
   * Get consents that are expiring soon
   */
  async getExpiringConsents(
    tenantId: string,
    parentId: string,
    daysThreshold: number = 30
  ): Promise<Array<{ learnerId: string; learnerName: string; consent: LearnerConsentDetail }>> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + daysThreshold);

    const result = await this.pool.query<{
      learner_id: string;
      first_name: string;
      last_name: string;
      consent_type: ConsentType;
      status: ConsentStatus;
      expires_at: Date;
    }>(
      `SELECT c.learner_id, l.first_name, l.last_name,
              c.consent_type, c.status, c.expires_at
       FROM consents c
       JOIN learners l ON c.learner_id = l.id AND c.tenant_id = l.tenant_id
       WHERE c.tenant_id = $1
         AND l.parent_id = $2
         AND c.status = 'GRANTED'
         AND c.expires_at IS NOT NULL
         AND c.expires_at <= $3
       ORDER BY c.expires_at`,
      [tenantId, parentId, expirationDate]
    );

    return result.rows.map(r => ({
      learnerId: r.learner_id,
      learnerName: `${r.first_name} ${r.last_name}`,
      consent: {
        type: r.consent_type,
        status: r.status,
        required: REQUIRED_CONSENTS.includes(r.consent_type),
        description: CONSENT_DESCRIPTIONS[r.consent_type],
        grantedAt: null,
        grantedBy: null,
        expiresAt: r.expires_at,
        canRevoke: true,
        dependsOn: CONSENT_DEPENDENCIES[r.consent_type],
      },
    }));
  }
}

export default PerLearnerConsentService;
