/**
 * Audit Event Builder
 *
 * Provides helpers for emitting audit events from AI agents.
 * Used alongside the explainability system to track changes with
 * full before/after state and optional explanation links.
 *
 * @module ai-orchestrator/audit
 */

import type { Pool } from 'pg';

import type {
  AuditActorType,
  AuditActionType,
  AuditChangeJson,
  CreateAuditEventInput,
  DifficultyChangeJson,
  TodayPlanChangeJson,
} from '@aivo/ts-types';

// ══════════════════════════════════════════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════════════════════════════════════════

export interface AuditConfig {
  /** Whether audit logging is enabled */
  enabled: boolean;
  /** Whether to emit audit events asynchronously (fire-and-forget) */
  asyncMode: boolean;
}

export const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  enabled: true,
  asyncMode: true,
};

export function parseAuditConfigFromEnv(): AuditConfig {
  return {
    enabled: process.env.AUDIT_ENABLED !== 'false',
    asyncMode: process.env.AUDIT_ASYNC_MODE !== 'false',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Audit Builder
// ══════════════════════════════════════════════════════════════════════════════

export class AuditBuilder {
  private pool: Pool;
  private config: AuditConfig;
  private pendingEvents: CreateAuditEventInput[] = [];

  constructor(pool: Pool, config: AuditConfig = DEFAULT_AUDIT_CONFIG) {
    this.pool = pool;
    this.config = config;
  }

  /**
   * Emit an audit event asynchronously (fire-and-forget).
   */
  emitAsync(input: CreateAuditEventInput): void {
    if (!this.config.enabled) return;

    if (this.config.asyncMode) {
      // Fire and forget
      this.persistAuditEvent(input).catch((err) => {
        console.error('[AuditBuilder] Failed to persist audit event:', err);
      });
    } else {
      // Queue for batch persist
      this.pendingEvents.push(input);
    }
  }

  /**
   * Emit an audit event and wait for persistence.
   */
  async emit(input: CreateAuditEventInput): Promise<string | null> {
    if (!this.config.enabled) return null;

    return this.persistAuditEvent(input);
  }

  /**
   * Flush any pending events (for non-async mode).
   */
  async flush(): Promise<void> {
    if (this.pendingEvents.length === 0) return;

    const events = [...this.pendingEvents];
    this.pendingEvents = [];

    await Promise.all(events.map((e) => this.persistAuditEvent(e)));
  }

  /**
   * Persist a single audit event to the database.
   */
  private async persistAuditEvent(input: CreateAuditEventInput): Promise<string | null> {
    try {
      const result = await this.pool.query<{ id: string }>(
        `INSERT INTO audit_events (
          tenant_id, actor_type, actor_id, actor_display_name,
          entity_type, entity_id, entity_display_name,
          action, change_json, summary, reason,
          related_explanation_id, session_id, learner_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          input.tenantId,
          input.actorType,
          input.actorId ?? null,
          input.actorDisplayName ?? null,
          input.entityType,
          input.entityId,
          input.entityDisplayName ?? null,
          input.action,
          JSON.stringify(input.changeJson),
          input.summary,
          input.reason ?? null,
          input.relatedExplanationId ?? null,
          input.sessionId ?? null,
          input.learnerId ?? null,
        ]
      );

      return result.rows[0]?.id ?? null;
    } catch (err) {
      console.error('[AuditBuilder] Database error:', err);
      return null;
    }
  }
}

/**
 * Create an audit builder instance.
 */
export function createAuditBuilder(
  pool: Pool,
  config: AuditConfig = DEFAULT_AUDIT_CONFIG
): AuditBuilder {
  return new AuditBuilder(pool, config);
}

// ══════════════════════════════════════════════════════════════════════════════
// Agent Context
// ══════════════════════════════════════════════════════════════════════════════

export interface AuditContext {
  tenantId: string;
  learnerId?: string;
  sessionId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Difficulty Change Audit
// ══════════════════════════════════════════════════════════════════════════════

export interface DifficultyChangeAuditInput {
  /** The skill or subject affected */
  skillId: string;
  /** Subject area */
  subject: string;
  /** Previous difficulty level */
  previousLevel: number;
  /** New difficulty level */
  newLevel: number;
  /** Previous band (optional) */
  previousBand?: string;
  /** New band (optional) */
  newBand?: string;
  /** Learner display name (for summary) */
  learnerName?: string;
  /** ID of the explanation event for this change */
  explanationId?: string;
}

/**
 * Emit an audit event for a difficulty change.
 */
export function auditDifficultyChange(
  builder: AuditBuilder,
  context: AuditContext,
  input: DifficultyChangeAuditInput
): void {
  const changeJson: DifficultyChangeJson = {
    before: {
      level: input.previousLevel,
      ...(input.previousBand && { band: input.previousBand }),
      subject: input.subject,
    },
    after: {
      level: input.newLevel,
      ...(input.newBand && { band: input.newBand }),
      subject: input.subject,
    },
    delta: {
      level: input.newLevel > input.previousLevel
        ? `+${input.newLevel - input.previousLevel}`
        : `${input.newLevel - input.previousLevel}`,
    },
  };

  const direction = input.newLevel > input.previousLevel ? 'increased' : 'decreased';
  const learnerRef = input.learnerName ?? 'Learner';
  const summary = `${input.subject} difficulty ${direction} from Level ${input.previousLevel} → Level ${input.newLevel}`;

  builder.emitAsync({
    tenantId: context.tenantId,
    actorType: 'AGENT',
    actorId: 'VIRTUAL_BRAIN',
    actorDisplayName: 'Virtual Brain',
    entityType: 'LEARNER_DIFFICULTY',
    entityId: `${context.learnerId}:${input.subject}`,
    entityDisplayName: `${learnerRef}'s ${input.subject} difficulty`,
    action: 'UPDATED',
    changeJson,
    summary,
    relatedExplanationId: input.explanationId ?? null,
    sessionId: context.sessionId ?? null,
    learnerId: context.learnerId ?? null,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Today Plan Change Audit
// ══════════════════════════════════════════════════════════════════════════════

export interface TodayPlanChangeAuditInput {
  /** Plan or session ID */
  planId: string;
  /** Previous activities (LO IDs) */
  previousActivities?: string[];
  /** New activities (LO IDs) */
  newActivities: string[];
  /** Plan display name */
  planDisplayName?: string;
  /** Reason for the change */
  reason?: string;
  /** ID of the explanation event for this change */
  explanationId?: string;
}

/**
 * Emit an audit event for a Today Plan change.
 */
export function auditTodayPlanChange(
  builder: AuditBuilder,
  context: AuditContext,
  input: TodayPlanChangeAuditInput
): void {
  const previousActivities = input.previousActivities ?? [];
  const added = input.newActivities.filter((a) => !previousActivities.includes(a));
  const removed = previousActivities.filter((a) => !input.newActivities.includes(a));

  const changeJson: TodayPlanChangeJson = {
    ...(previousActivities.length > 0 && {
      before: { activities: previousActivities },
    }),
    after: { activities: input.newActivities },
    ...(added.length > 0 && { added }),
    ...(removed.length > 0 && { removed }),
  };

  // Build summary
  const parts: string[] = [];
  if (added.length > 0) parts.push(`${added.length} activities added`);
  if (removed.length > 0) parts.push(`${removed.length} activities removed`);
  const summary = parts.length > 0
    ? `Today Plan updated: ${parts.join(', ')}`
    : 'Today Plan regenerated';

  builder.emitAsync({
    tenantId: context.tenantId,
    actorType: 'AGENT',
    actorId: 'LESSON_PLANNER',
    actorDisplayName: 'Lesson Planner',
    entityType: 'TODAY_PLAN',
    entityId: input.planId,
    entityDisplayName: input.planDisplayName ?? 'Today Plan',
    action: previousActivities.length > 0 ? 'UPDATED' : 'CREATED',
    changeJson,
    summary,
    reason: input.reason ?? null,
    relatedExplanationId: input.explanationId ?? null,
    sessionId: context.sessionId ?? null,
    learnerId: context.learnerId ?? null,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Policy Change Audit
// ══════════════════════════════════════════════════════════════════════════════

export interface PolicyChangeAuditInput {
  /** Policy document ID */
  policyDocumentId: string;
  /** Policy name */
  policyName: string;
  /** Action performed */
  action: 'CREATED' | 'UPDATED' | 'ACTIVATED' | 'DEACTIVATED';
  /** Previous version (for updates) */
  previousVersion?: number;
  /** New version */
  newVersion?: number;
  /** Fields that changed */
  changedFields?: string[];
  /** User who made the change */
  userId: string;
  /** User display name */
  userDisplayName?: string;
  /** Reason for the change */
  reason?: string;
}

/**
 * Emit an audit event for a policy document change.
 */
export function auditPolicyChange(
  builder: AuditBuilder,
  tenantId: string,
  input: PolicyChangeAuditInput
): void {
  const changeJson: AuditChangeJson = {
    ...(input.previousVersion !== undefined && {
      before: { version: input.previousVersion },
    }),
    after: {
      name: input.policyName,
      ...(input.newVersion !== undefined && { version: input.newVersion }),
    },
    ...(input.changedFields && { changed_fields: input.changedFields }),
  };

  const actionLabels: Record<string, string> = {
    CREATED: 'created',
    UPDATED: 'updated',
    ACTIVATED: 'activated',
    DEACTIVATED: 'deactivated',
  };

  const summary = `Policy "${input.policyName}" ${actionLabels[input.action]}${
    input.newVersion ? ` (v${input.newVersion})` : ''
  }`;

  builder.emitAsync({
    tenantId,
    actorType: 'USER',
    actorId: input.userId,
    actorDisplayName: input.userDisplayName ?? null,
    entityType: 'POLICY_DOCUMENT',
    entityId: input.policyDocumentId,
    entityDisplayName: input.policyName,
    action: input.action,
    changeJson,
    summary,
    reason: input.reason ?? null,
    relatedExplanationId: null,
    sessionId: null,
    learnerId: null,
  });
}
