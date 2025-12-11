/**
 * Audit Module
 *
 * Provides audit event emission for AI agent decisions.
 * Tracks difficulty changes, today plan changes, and policy updates.
 *
 * Usage:
 *
 * ```typescript
 * import { createAuditBuilder, auditDifficultyChange } from './audit/index.js';
 *
 * const auditBuilder = createAuditBuilder(pool);
 *
 * // Emit audit event for difficulty change
 * auditDifficultyChange(auditBuilder, context, {
 *   skillId: 'skill-123',
 *   subject: 'Math',
 *   previousLevel: 2,
 *   newLevel: 3,
 *   explanationId: 'exp-456',
 * });
 * ```
 *
 * @module ai-orchestrator/audit
 */

export {
  AuditBuilder,
  createAuditBuilder,
  DEFAULT_AUDIT_CONFIG,
  parseAuditConfigFromEnv,
  auditDifficultyChange,
  auditTodayPlanChange,
  auditPolicyChange,
} from './builder.js';

export type {
  AuditConfig,
  AuditContext,
  DifficultyChangeAuditInput,
  TodayPlanChangeAuditInput,
  PolicyChangeAuditInput,
} from './builder.js';
